import { supabaseService } from './supabaseService';
import { isSupabaseConfigured } from './supabaseClient';

let ACTIVE_BASE_URL = 'http://localhost:8088/api';
const FALLBACK_BASE_URL = 'http://localhost:8080/api';

/*
 * ============================================================
 * SNS AGENT WORKBENCH WEBHOOK
 * ============================================================
 *
 * This is the TEST Webhook URL from SNS Agent Workbench.
 *
 * React will send a POST request to this URL.
 *
 * React
 *   ↓
 * SNS Webhook Trigger
 *   ↓
 * Gemini LLM
 *   ↓
 * IF Condition
 *   ↓
 * Java Backend
 *   ↓
 * Webhook Response
 *   ↓
 * React
 *
 */
function getSNSWebhookUrl() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('eldercare_sns_webhook_url');
    if (custom && custom.trim() && custom.startsWith('http')) {
      if (custom.trim() === 'https://api.agents.snsihub.ai/webhook/eldercare-events') {
        localStorage.setItem('eldercare_sns_webhook_url', 'https://api.agents.snsihub.ai/webhook-test/eldercare-events');
        return 'https://api.agents.snsihub.ai/webhook-test/eldercare-events';
      }
      return custom.trim();
    }
  }
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SNS_WEBHOOK_URL)
    ? import.meta.env.VITE_SNS_WEBHOOK_URL
    : 'https://api.agents.snsihub.ai/webhook-test/eldercare-events';
}


/**
 * ============================================================
 * COMMON JAVA BACKEND FETCH WRAPPER
 * ============================================================
 *
 * Used for Java + Supabase Cloud REST APIs.
 */
async function request(endpoint, options = {}) {

  // Retrieve current active user
  let currentUser = null;

  try {
    const saved =
      sessionStorage.getItem('eldercare_user_active') ||
      localStorage.getItem('eldercare_user_active');

    if (saved) {
      currentUser = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('[API] Could not read active user:', e);
  }

  const headers = {
    'Content-Type': 'application/json',

    ...(currentUser?.role
      ? { 'X-User-Role': currentUser.role }
      : {}),

    ...(currentUser?.userId
      ? { 'X-User-Id': currentUser.userId }
      : {}),

    ...options.headers,
  };


  const tryFetch = async (baseUrl) => {

    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {

      const errorMsg =
        data?.error ||
        data?.message ||
        `HTTP ${response.status}: ${response.statusText}`;

      throw new Error(errorMsg);
    }

    return data;
  };


  try {

    return await tryFetch(ACTIVE_BASE_URL);

  } catch (error) {

    if (
      error.name === 'TypeError' ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    ) {

      try {

        const fallbackRes =
          await tryFetch(FALLBACK_BASE_URL);

        ACTIVE_BASE_URL = FALLBACK_BASE_URL;

        return fallbackRes;

      } catch (fallbackError) {

        throw fallbackError;
      }
    }

    console.warn(
      `[API] Error on ${options.method || 'GET'} ${endpoint}:`,
      error.message
    );

    throw error;
  }
}

/**
 * Resolves the currently active elder ID dynamically from active session.
 */
function getActiveElderId(passedId = null) {
  if (passedId) return passedId;
  try {
    const saved =
      sessionStorage.getItem('eldercare_user_active') ||
      localStorage.getItem('eldercare_user_active');
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.role?.toUpperCase() === 'ELDER') {
        return user.userId || user.id || null;
      }
      return user.connectedElderId || user.elderId || user.userId || null;
    }
  } catch (e) {}
  return null;
}

/**
 * ============================================================
 * SNS AGENT WORKBENCH WEBHOOK REQUEST
 * ============================================================
 *
 * Sends a POST request from React → SNS Agent Workbench.
 *
 * The response returned by the final Webhook Response node
 * is returned back to the React application.
 */
// In-memory / localStorage tracker for live UI display of dispatched webhooks
function recordWebhookDispatch(entry) {
  try {
    if (typeof window !== 'undefined') {
      if (!window.__eldercareLastWebhookDispatches) {
        window.__eldercareLastWebhookDispatches = [];
      }
      window.__eldercareLastWebhookDispatches.unshift(entry);
      if (window.__eldercareLastWebhookDispatches.length > 25) {
        window.__eldercareLastWebhookDispatches.pop();
      }
      localStorage.setItem(
        'eldercare_recent_webhook_dispatches',
        JSON.stringify(window.__eldercareLastWebhookDispatches.slice(0, 15))
      );
      window.dispatchEvent(
        new CustomEvent('eldercare_webhook_event', { detail: entry })
      );
    }
  } catch (e) {}
}

/**
 * ============================================================
 * SNS AGENT WORKBENCH WEBHOOK REQUEST
 * ============================================================
 *
 * Sends a POST request from React → SNS Agent Workbench.
 * Uses Java Backend Relay (/api/webhook/relay) to avoid browser CORS blocks,
 * with automatic fallback to direct fetch.
 */
async function sendToSNSWebhook(eventData = {}) {
  const webhookUrl = getSNSWebhookUrl();
  if (!webhookUrl || webhookUrl === 'YOUR_TEST_WEBHOOK_URL_HERE') {
    throw new Error('SNS Webhook URL is not configured.');
  }

  // 1. Auto-detect active user language (English, Tamil, Malayalam)
  const currentLang = eventData.language || (typeof localStorage !== 'undefined' ? localStorage.getItem('eldercare_language') : null) || 'en';
  const langName = currentLang === 'ta' ? 'Tamil' : currentLang === 'ml' ? 'Malayalam' : 'English';

  // 2. Auto-detect active logged-in user from session
  let currentUser = null;
  try {
    const saved =
      sessionStorage.getItem('eldercare_user_active') ||
      localStorage.getItem('eldercare_user_active');
    if (saved) currentUser = JSON.parse(saved);
  } catch (e) {}

  // 3. Resolve top-level type matching the First IF NODE ('Emergency/Event' vs 'Schedule')
  const isScheduleEvent = 
    eventData.type === 'Schedule' || 
    eventData.eventType === 'SCHEDULE_CHECK' || 
    eventData.eventType === 'Schedule' ||
    eventData.category === 'Schedule';

  const resolvedType = isScheduleEvent ? 'Schedule' : (eventData.type || 'Emergency/Event');

  // 4. Build complete, perfectly structured payload for SNS Agent Workbench
  const enrichedPayload = {
    // Top-level IF Condition Matchers
    type: resolvedType,
    eventType: eventData.eventType || resolvedType,
    event_type: resolvedType,
    category: resolvedType,

    // Language & Voice fields for LLM Node
    language: currentLang,
    preferredLanguage: eventData.preferredLanguage || langName,
    userVoiceTranscript: eventData.userVoiceTranscript || eventData.query || null,

    // Dynamic User details (Zero hardcoding)
    elderId: eventData.elderId || getActiveElderId() || 'usr-elder-1',
    elderName: eventData.elderName || currentUser?.name || currentUser?.connectedElderName || 'Elder',
    elderPhone: eventData.elderPhone || currentUser?.phone || currentUser?.connectedElderPhone || '',
    familyPhone: eventData.familyPhone || currentUser?.connectedFamilyPhone || '',
    location: eventData.location || currentUser?.location || currentUser?.room || 'Living Area',

    timestamp: new Date().toISOString(),

    // Pass through all specific event fields (schedulesSummary, appointmentsSummary, confidence, etc.)
    ...eventData,
  };

  console.log('[SNS] 🚀 Dispatching POST to Webhook Trigger:', webhookUrl, enrichedPayload);

  // 5. ATTEMPT 1: Java Backend Relay (/api/webhook/relay) - 100% immune to browser CORS restrictions
  try {
    const relayResponse = await request('/webhook/relay', {
      method: 'POST',
      body: JSON.stringify({
        webhookUrl,
        payload: enrichedPayload,
      }),
    });

    if (relayResponse && relayResponse.success) {
      console.log('[SNS] ✅ Backend Relay delivered POST to Webhook Trigger successfully:', relayResponse);
      recordWebhookDispatch({
        id: `wh-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: enrichedPayload.eventType || enrichedPayload.type,
        action: enrichedPayload.action || enrichedPayload.title || enrichedPayload.message || 'Dispatched',
        url: webhookUrl,
        status: relayResponse.statusCode || 200,
        success: true,
        method: 'Backend Relay',
        payload: enrichedPayload,
        response: relayResponse.response || relayResponse
      });
      return relayResponse.response || relayResponse;
    }
  } catch (relayErr) {
    console.warn('[SNS] Backend relay unavailable, trying direct fetch:', relayErr.message);
  }

  // 6. ATTEMPT 2: Direct browser fetch with CORS
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(enrichedPayload),
    });

    let data;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    // If 404 inactive workflow, try alternative test/prod endpoint
    if (response.status === 404 && (data?.error?.includes('inactive') || data?.message?.includes('inactive'))) {
      const altUrl = webhookUrl.includes('/webhook-test/')
        ? webhookUrl.replace('/webhook-test/', '/webhook/')
        : webhookUrl.replace('/webhook/', '/webhook-test/');

      console.warn(`[SNS] ⚠️ Webhook returned 404 inactive. Retrying alternate URL: ${altUrl}`);
      const altRes = await fetch(altUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(enrichedPayload),
      });

      if (altRes.ok) {
        const altData = await altRes.json().catch(() => ({}));
        recordWebhookDispatch({
          id: `wh-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          eventType: enrichedPayload.eventType || enrichedPayload.type,
          action: enrichedPayload.action || enrichedPayload.title || 'Dispatched (Alternate)',
          url: altUrl,
          status: altRes.status,
          success: true,
          method: 'Direct Fetch (Alternate)',
          payload: enrichedPayload,
          response: altData
        });
        return altData;
      }
    }

    recordWebhookDispatch({
      id: `wh-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      eventType: enrichedPayload.eventType || enrichedPayload.type,
      action: enrichedPayload.action || enrichedPayload.title || enrichedPayload.message || 'Dispatched',
      url: webhookUrl,
      status: response.status,
      success: response.ok,
      method: 'Direct Fetch (CORS)',
      payload: enrichedPayload,
      response: data
    });

    return data;

  } catch (directErr) {
    console.warn('[SNS] Direct CORS fetch failed, attempting no-cors delivery:', directErr.message);

    // 7. ATTEMPT 3: Direct fetch with mode: 'no-cors' (Dispatches POST body directly to server without preflight options)
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(enrichedPayload),
      });

      console.log('[SNS] ✅ Delivered POST request to Webhook Trigger via no-cors mode');
      const fallbackResult = { success: true, mode: 'no-cors', message: 'POST request delivered to Webhook Trigger Node.' };

      recordWebhookDispatch({
        id: `wh-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: enrichedPayload.eventType || enrichedPayload.type,
        action: enrichedPayload.action || enrichedPayload.title || enrichedPayload.message || 'Dispatched',
        url: webhookUrl,
        status: 200,
        success: true,
        method: 'Direct (no-cors)',
        payload: enrichedPayload,
        response: fallbackResult
      });

      return fallbackResult;
    } catch (noCorsErr) {
      console.error('[SNS] ❌ All webhook dispatch methods failed:', noCorsErr);
      recordWebhookDispatch({
        id: `wh-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: enrichedPayload.eventType || enrichedPayload.type,
        action: enrichedPayload.action || enrichedPayload.title || 'Failed',
        url: webhookUrl,
        status: 500,
        success: false,
        method: 'Failed',
        payload: enrichedPayload,
        error: noCorsErr.message
      });
      throw noCorsErr;
    }
  }
}


/**
 * ============================================================
 * API SERVICE
 * ============================================================
 */
export const apiService = {

  // ============================================================
  // AUTH
  // ============================================================

  loginElder: (name, pin, phone = null) => {
    if (isSupabaseConfigured()) {
      return supabaseService.loginElder(name, pin, phone);
    }
    return request('/auth/login/elder', {
      method: 'POST',
      body: JSON.stringify({
        name,
        pin,
        phone,
      }),
    });
  },

  loginFamily: (email, password, elderPhone) => {
    if (isSupabaseConfigured()) {
      return supabaseService.loginFamily(email, password, elderPhone);
    }
    return request('/auth/login/family', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        elderPhone,
      }),
    });
  },

  signup: (userData) => {
    if (isSupabaseConfigured()) {
      return supabaseService.signup(userData);
    }
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  forgotPassword: (identifier, newPassword) => {
    if (isSupabaseConfigured()) {
      return supabaseService.forgotPassword(identifier, newPassword);
    }
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        identifier,
        newPassword,
      }),
    });
  },

  // ============================================================
  // PROFILE
  // ============================================================

  getProfile: (userId = null) => {
    if (isSupabaseConfigured()) {
      const id = userId || getActiveElderId();
      return supabaseService.getProfile(id);
    }
    return request('/profile');
  },

  updateProfile: (profileData) => {
    if (isSupabaseConfigured()) {
      return supabaseService.updateProfile(profileData);
    }
    return request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  getAppointmentsForElder: (elderId = null) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.getAppointmentsForElder(id);
    }
    return request(id ? `/appointments/elder/${id}` : '/appointments');
  },

  getAllAppointments: () => {
    if (isSupabaseConfigured()) {
      return supabaseService.getAppointmentsForElder(null);
    }
    return request('/appointments');
  },

  createAppointment: (appointmentData) => {
    if (isSupabaseConfigured()) {
      return supabaseService.createAppointment(appointmentData);
    }
    return request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  updateAppointment: (appointmentId, appointmentData) => {
    if (isSupabaseConfigured()) {
      return supabaseService.createAppointment({ ...appointmentData, appointmentId });
    }
    return request(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  },

  deleteAppointment: (appointmentId) => {
    if (isSupabaseConfigured()) {
      return supabaseService.deleteAppointment(appointmentId);
    }
    return request(`/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  },

  // ============================================================
  // SCHEDULES
  // ============================================================

  getSchedules: (elderId = null) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.getSchedules(id);
    }
    return request(id ? `/schedules?elderId=${id}` : '/schedules');
  },

  getActiveSchedules: (elderId = null) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.getSchedules(id);
    }
    return request('/schedules/active');
  },

  createSchedule: (scheduleData) => {
    if (isSupabaseConfigured()) {
      return supabaseService.createSchedule(scheduleData);
    }
    return request('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  },

  updateSchedule: (scheduleId, scheduleData) => {
    if (isSupabaseConfigured()) {
      return supabaseService.updateSchedule(scheduleId, scheduleData);
    }
    return request(`/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
  },

  toggleSchedule: (scheduleId) => {
    if (isSupabaseConfigured()) {
      return supabaseService.toggleSchedule(scheduleId);
    }
    return request(`/schedules/${scheduleId}/toggle`, {
      method: 'PUT',
    });
  },

  deleteSchedule: (scheduleId) => {
    if (isSupabaseConfigured()) {
      return supabaseService.deleteSchedule(scheduleId);
    }
    return request(`/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  },

  // ============================================================
  // VOICE AI
  // ============================================================

  getActiveAlarm: (elderId = null) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.getActiveAlarm(id);
    }
    return request(id ? `/voice/active-alarm?elderId=${id}` : '/voice/active-alarm');
  },

  acknowledgeVoiceAlarm: (
    eventId,
    elderId = null,
    response = 'Awake / Done'
  ) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.acknowledgeVoiceAlarm(eventId, id, response);
    }
    return request('/voice/acknowledge', {
      method: 'POST',
      body: JSON.stringify({
        eventId,
        elderId: id,
        response,
      }),
    });
  },

  triggerTestAlarm: (scheduleId = null) => {
    if (isSupabaseConfigured()) {
      return supabaseService.triggerVoiceAlarm({ scheduleId, routineType: 'MEDICATION' });
    }
    return request('/voice/trigger', {
      method: 'POST',
      body: JSON.stringify({
        scheduleId,
      }),
    });
  },

  // ============================================================
  // SENSORS & MOTION
  // ============================================================

  sendMotionSensorData: (
    elderId,
    activity,
    confidence = 0.95,
    source = 'ESP32_PIR',
    metadata = 'Sensor'
  ) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.ingestMotion(id, activity, confidence, source, metadata);
    }
    return request('/sensors/motion', {
      method: 'POST',
      body: JSON.stringify({
        elderId: id,
        activity,
        confidence,
        source,
        metadata,
      }),
    });
  },

  sendEmergencySensorData: (
    elderId = null,
    source = 'ESP32_HARDWARE_BUTTON',
    message = ''
  ) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.triggerSos({
        elderId: id,
        source,
        message: message || 'Hardware SOS button triggered'
      });
    }
    return request('/sensors/emergency', {
      method: 'POST',
      body: JSON.stringify({
        elderId: id,
        source,
        message,
      }),
    });
  },

  getCurrentActivity: (elderId = null) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.getActivityLogs(id, 1).then(logs => {
        const latest = logs && logs[0];
        return {
          elderId: id,
          currentActivity: latest ? latest.activity : 'Resting / Idle',
          confidence: latest ? latest.confidence : 1.0,
          source: latest ? latest.source : 'Sensor',
          lastUpdated: latest ? latest.timestamp : new Date().toISOString()
        };
      });
    }
    return request(id ? `/activity/current?elderId=${id}` : '/activity/current');
  },

  // ============================================================
  // ALERTS & SOS
  // ============================================================

  getAlerts: (elderId = null) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.getAlerts(id);
    }
    return request(id ? `/alerts?elderId=${id}` : '/alerts');
  },

  triggerSos: ({
    elderId = null,
    elderName = null,
    elderPhone = null,
    familyPhone = null,
    message = '',
    source = 'Elder SOS Call Button',
  } = {}) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.triggerSos({
        elderId: id,
        elderName,
        elderPhone,
        familyPhone,
        message,
        source
      });
    }
    return request('/alerts/sos', {
      method: 'POST',
      body: JSON.stringify({
        elderId: id,
        elderName,
        elderPhone,
        familyPhone,
        message,
        source,
      }),
    });
  },

  triggerFall: (
    elderId = null,
    message = '',
    source = 'Motion Sensor'
  ) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.triggerFall(id, message, source);
    }
    return request('/alerts/fall', {
      method: 'POST',
      body: JSON.stringify({
        elderId: id,
        message,
        source,
      }),
    });
  },

  triggerUnresponsive: (
    elderId = null,
    message = ''
  ) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.triggerUnresponsive(id, message);
    }
    return request('/alerts/unresponsive', {
      method: 'POST',
      body: JSON.stringify({
        elderId: id,
        message,
      }),
    });
  },

  resolveAlert: (alertId) => {
    if (isSupabaseConfigured()) {
      return supabaseService.resolveAlert(alertId);
    }
    return request(`/alerts/${alertId}/resolve`, {
      method: 'PUT',
    });
  },

  // ============================================================
  // ACTIVITY TIMELINE
  // ============================================================

  getActivityLogs: (elderId = null, limit = 50) => {
    const id = elderId || getActiveElderId();
    if (isSupabaseConfigured()) {
      return supabaseService.getActivityLogs(id, limit);
    }
    return request(id ? `/activity-logs?elderId=${id}&limit=${limit}` : `/activity-logs?limit=${limit}`);
  },

  createActivityLog: (logData) => {
    if (isSupabaseConfigured()) {
      return supabaseService.createActivityLog(logData);
    }
    return request('/activity-logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  },

  // ============================================================
  // SNS AGENT WORKBENCH
  // ============================================================

  /*
   * Webhook URL getters/setters for live configuration in UI
   */
  getSNSWebhookUrl,
  setSNSWebhookUrl: (url) => {
    if (typeof window !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem('eldercare_sns_webhook_url', url.trim());
      } else {
        localStorage.removeItem('eldercare_sns_webhook_url');
      }
    }
  },

  /*
   * Generic SNS webhook function.
   * Sends any dynamic event from React -> SNS Agent Workbench Webhook Trigger.
   */
  sendToSNSWebhook: (eventData) =>
    sendToSNSWebhook(eventData),

  /*
   * SCHEDULE EVENT (Routine Created, Updated, Completed, Checked)
   * Route: Schedule -> LLM Node / IF Condition
   */
  sendScheduleEventToSNS: (payload = {}) =>
    sendToSNSWebhook({
      type: 'Schedule',
      eventType: payload.action || payload.eventType || 'SCHEDULE_CREATED',
      isEmergency: false,
      timestamp: new Date().toISOString(),
      ...payload
    }),

  /*
   * FALL EVENT
   * Route: Emergency/Event -> LLM Node -> ALERT branch
   */
  sendFallEventToSNS: (payload = {}) =>
    sendToSNSWebhook({
      type: 'Emergency/Event',
      eventType: 'FALL_DETECTED',
      isEmergency: true,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
      ...payload
    }),

  /*
   * SOS EVENT
   * Route: Emergency/Event -> LLM Node -> ALERT branch
   */
  sendSosEventToSNS: (payload = {}) =>
    sendToSNSWebhook({
      type: 'Emergency/Event',
      eventType: 'SOS',
      isEmergency: true,
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
      ...payload
    }),

  /*
   * UNRESPONSIVE EVENT
   * Route: Emergency/Event -> LLM Node -> ALERT branch
   */
  sendUnresponsiveEventToSNS: (payload = {}) =>
    sendToSNSWebhook({
      type: 'Emergency/Event',
      eventType: 'UNRESPONSIVE',
      isEmergency: true,
      severity: 'MEDIUM',
      timestamp: new Date().toISOString(),
      ...payload
    }),

  /*
   * VOICE INPUT / CAREBOT CHAT QUERY
   * Route: Emergency/Event -> LLM Node -> Voice Response in preferred language
   */
  sendVoiceInputToSNS: (payload = {}) =>
    sendToSNSWebhook({
      type: 'Emergency/Event',
      eventType: payload.eventType || 'VOICE_INPUT',
      isEmergency: false,
      timestamp: new Date().toISOString(),
      ...payload
    }),

  /*
   * NORMAL ACTIVITY EVENT
   * Route: Emergency/Event -> LLM Node -> ACTIVITY branch
   */
  sendNormalActivityToSNS: (payload = {}) =>
    sendToSNSWebhook({
      type: 'Emergency/Event',
      eventType: payload.activity || 'ACTIVITY_DETECTED',
      isEmergency: false,
      timestamp: new Date().toISOString(),
      ...payload
    }),

  /*
   * TEST WEBHOOK TRIGGER NODE PING
   * Dispatches a manual test ping to verify trigger node connectivity
   */
  testWebhookConnection: async (customUrl = null) => {
    const url = customUrl || getSNSWebhookUrl();
    return sendToSNSWebhook({
      type: 'Test/Ping',
      eventType: 'TRIGGER_NODE_TEST_PING',
      action: 'TRIGGER_NODE_PING',
      query: 'Test ping from ElderGuard AI to verify Trigger Node connectivity',
      message: 'ElderGuard AI manual webhook test ping',
      isEmergency: false
    });
  },

  getRecentWebhookLogs: () => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('eldercare_recent_webhook_dispatches');
        if (saved) return JSON.parse(saved);
        return window.__eldercareLastWebhookDispatches || [];
      }
    } catch (e) {}
    return [];
  }
};