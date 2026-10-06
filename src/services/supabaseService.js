/**
 * Supabase Data Service
 * Implements all CRUD, Auth, Schedules, Appointments, Alerts, Activity,
 * and Voice Alarm operations directly against Supabase PostgreSQL.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
}

// Simple SHA-256 password hasher for client-side matching
async function hashString(str) {
  if (!str) return '';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  return btoa(str);
}

// Convert camelCase DB user to UI user format
function formatUser(u) {
  if (!u) return null;
  return {
    userId: u.user_id || u.userId,
    name: u.name,
    role: u.role,
    phone: u.phone,
    email: u.email,
    pin: u.pin,
    connectedFamilyPhone: u.connected_family_phone || u.connectedFamilyPhone,
    connectedFamilyName: u.connected_family_name || u.connectedFamilyName,
    connectedFamilyEmail: u.connected_family_email || u.connectedFamilyEmail,
    connectedFamilyId: u.connected_family_id || u.connectedFamilyId,
    connectedElderPhone: u.connected_elder_phone || u.connectedElderPhone,
    connectedElderName: u.connected_elder_name || u.connectedElderName,
    connectedElderId: u.connected_elder_id || u.connectedElderId,
    preferredLanguage: u.preferred_language || u.preferredLanguage || 'en',
    isProfileComplete: u.is_profile_complete ?? u.isProfileComplete ?? false,
    address: u.address || '',
    doctorPhone: u.doctor_phone || u.doctorPhone || '',
    doctorName: u.doctor_name || u.doctorName || '',
    healthConditions: u.health_conditions || u.healthConditions || '',
    allergies: u.allergies || '',
    emergencyNotes: u.emergency_notes || u.emergencyNotes || '',
    upcomingAppointmentDate: u.upcoming_appointment_date || u.upcomingAppointmentDate || '',
    upcomingAppointmentTime: u.upcoming_appointment_time || u.upcomingAppointmentTime || '',
    upcomingAppointmentPurpose: u.upcoming_appointment_purpose || u.upcomingAppointmentPurpose || '',
    upcomingAppointmentLocation: u.upcoming_appointment_location || u.upcomingAppointmentLocation || '',
    createdAt: u.created_at || u.createdAt
  };
}

function formatSchedule(s) {
  if (!s) return null;
  return {
    id: s.schedule_id || s.id,
    scheduleId: s.schedule_id || s.id,
    elderId: s.elder_id || s.elderId,
    title: s.title || s.routine_type || 'Daily Routine',
    routineType: s.routine_type || s.routineType || 'CUSTOM',
    category: s.category || (s.routine_type || '').toLowerCase(),
    scheduledTime: s.scheduled_time || s.scheduledTime || '08:00',
    customVoicePrompt: s.custom_voice_prompt || s.customVoicePrompt || '',
    enabled: s.is_enabled ?? s.enabled ?? true,
    completed: s.completed ?? (s.completion_status === 'COMPLETED'),
    completionStatus: s.completion_status || (s.completed ? 'COMPLETED' : 'PENDING'),
    lastCompletedAt: s.last_completed_at || s.lastCompletedAt || null,
    createdAt: s.created_at || s.createdAt
  };
}

function formatAlert(a) {
  if (!a) return null;
  return {
    id: a.alert_id || a.id,
    alertId: a.alert_id || a.id,
    elderId: a.elder_id || a.elderId,
    type: a.type || 'SOS',
    severity: a.severity || 'HIGH',
    status: a.status || 'ACTIVE',
    message: a.message || 'Alert triggered',
    source: a.source || 'APP',
    createdAt: a.created_at || a.createdAt
  };
}

function formatActivity(act) {
  if (!act) return null;
  return {
    id: act.log_id || act.id,
    logId: act.log_id || act.id,
    elderId: act.elder_id || act.elderId,
    activity: act.activity || 'Active',
    source: act.source || 'ESP32_PIR',
    confidence: act.confidence ?? 1.0,
    metadata: act.metadata || '',
    timestamp: act.created_at || act.timestamp || new Date().toISOString()
  };
}

function formatAppointment(apt) {
  if (!apt) return null;
  return {
    id: apt.appointment_id || apt.id,
    appointmentId: apt.appointment_id || apt.id,
    elderId: apt.elder_id || apt.elderId,
    elderName: apt.elder_name || apt.elderName || 'Elder',
    doctorName: apt.doctor_name || apt.doctorName || 'Doctor',
    purpose: apt.purpose || 'Medical Checkup',
    location: apt.location || 'Healthcare Clinic',
    appointmentDate: apt.appointment_date || apt.appointmentDate || '',
    appointmentTime: apt.appointment_time || apt.appointmentTime || '',
    status: apt.status || 'CONFIRMED',
    createdAt: apt.created_at || apt.createdAt
  };
}

function handleSupabaseError(error) {
  if (!error) return;
  if (error.code === 'PGRST205' || String(error.message || '').includes('Could not find the table') || String(error.message || '').includes('relation') && String(error.message || '').includes('does not exist')) {
    throw new Error("Supabase tables have not been created yet. Please copy and execute 'supabase_schema.sql' in your Supabase SQL Editor.");
  }
  throw new Error(error.message || 'Supabase request failed');
}

export const supabaseService = {
  // ==========================================================
  // AUTHENTICATION & USERS
  // ==========================================================
  loginElder: async (name, pin, phone) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    let query = sb.from('users').select('*').eq('role', 'ELDER');
    
    if (phone) {
      const cleanDigits = String(phone).replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
      query = query.or(`phone.eq.${phone},phone.ilike.%${last10}%`);
    } else if (name) {
      query = query.ilike('name', name.trim());
    }

    const { data, error } = await query;
    if (error) handleSupabaseError(error);
    if (!data || data.length === 0) {
      throw new Error('Elder not found with provided credentials');
    }

    const user = data[0];
    if (pin && user.pin && user.pin !== String(pin).trim()) {
      throw new Error('Invalid PIN entered');
    }

    const formatted = formatUser(user);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
      localStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
    }
    return { success: true, message: 'Elder login successful', user: formatted, data: formatted };
  },

  loginFamily: async (email, password, connectedElderPhone) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const cleanEmail = (email || '').trim().toLowerCase();
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('role', 'FAMILY')
      .ilike('email', cleanEmail);

    if (error) handleSupabaseError(error);
    if (!data || data.length === 0) {
      throw new Error('Family member not found with this email. Please register first.');
    }

    const user = data[0];
    const hash = await hashString(password);
    if (user.password_hash && user.password_hash !== hash && user.password_hash !== password) {
      throw new Error('Invalid password');
    }

    // Auto-link connected elder if phone is supplied
    if (connectedElderPhone && !user.connected_elder_id) {
      const cleanElderDigits = String(connectedElderPhone).replace(/\D/g, '').slice(-10);
      const { data: elderData } = await sb
        .from('users')
        .select('*')
        .eq('role', 'ELDER')
        .ilike('phone', `%${cleanElderDigits}%`)
        .maybeSingle();

      if (elderData) {
        user.connected_elder_id = elderData.user_id;
        user.connected_elder_name = elderData.name;
        user.connected_elder_phone = elderData.phone;
        await sb.from('users').update({
          connected_elder_id: elderData.user_id,
          connected_elder_name: elderData.name,
          connected_elder_phone: elderData.phone
        }).eq('user_id', user.user_id);
      }
    }

    const formatted = formatUser(user);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
      localStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
    }
    return { success: true, message: 'Family login successful', user: formatted, data: formatted };
  },

  signup: async (userPayload) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const role = (userPayload.role || 'ELDER').toUpperCase();
    const userId = userPayload.userId || generateId(`usr-${role.toLowerCase()}`);
    const passHash = userPayload.password ? await hashString(userPayload.password) : null;

    const dbRecord = {
      user_id: userId,
      name: userPayload.name || 'User',
      role,
      phone: userPayload.phone || null,
      email: userPayload.email ? userPayload.email.trim().toLowerCase() : null,
      pin: userPayload.pin || null,
      password_hash: passHash,
      connected_family_phone: userPayload.connectedFamilyPhone || null,
      connected_family_name: userPayload.connectedFamilyName || null,
      connected_family_email: userPayload.connectedFamilyEmail || null,
      connected_family_id: userPayload.connectedFamilyId || null,
      connected_elder_phone: userPayload.connectedElderPhone || null,
      connected_elder_name: userPayload.connectedElderName || null,
      connected_elder_id: userPayload.connectedElderId || null,
      preferred_language: userPayload.preferredLanguage || 'en',
      is_profile_complete: userPayload.isProfileComplete ?? (role === 'FAMILY'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Auto-link bidirectional relationships
    if (role === 'ELDER' && dbRecord.connected_family_phone) {
      const famDigits = String(dbRecord.connected_family_phone).replace(/\D/g, '').slice(-10);
      const { data: famData } = await sb.from('users').select('*').eq('role', 'FAMILY').ilike('phone', `%${famDigits}%`).maybeSingle();
      if (famData) {
        dbRecord.connected_family_id = famData.user_id;
        dbRecord.connected_family_name = famData.name;
        dbRecord.connected_family_email = famData.email;
        // update family side
        await sb.from('users').update({
          connected_elder_id: userId,
          connected_elder_name: dbRecord.name,
          connected_elder_phone: dbRecord.phone
        }).eq('user_id', famData.user_id);
      }
    } else if (role === 'FAMILY' && dbRecord.connected_elder_phone) {
      const elderDigits = String(dbRecord.connected_elder_phone).replace(/\D/g, '').slice(-10);
      const { data: elderData } = await sb.from('users').select('*').eq('role', 'ELDER').ilike('phone', `%${elderDigits}%`).maybeSingle();
      if (elderData) {
        dbRecord.connected_elder_id = elderData.user_id;
        dbRecord.connected_elder_name = elderData.name;
        // update elder side
        await sb.from('users').update({
          connected_family_id: userId,
          connected_family_name: dbRecord.name,
          connected_family_email: dbRecord.email,
          connected_family_phone: dbRecord.phone
        }).eq('user_id', elderData.user_id);
      }
    }

    const { data, error } = await sb.from('users').insert(dbRecord).select().single();
    if (error) handleSupabaseError(error);

    const formatted = formatUser(data);
    if (role === 'ELDER') {
      // Seed default routines in background
      supabaseService.seedBaseSchedules(userId).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
      localStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
    }

    return { success: true, message: `${role} account registered successfully`, user: formatted, data: formatted };
  },

  getProfile: async (userId) => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from('users').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) return null;
    return formatUser(data);
  },

  updateProfile: async (profileUpdates) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');
    const userId = profileUpdates.userId;
    if (!userId) throw new Error('userId is required');

    const updateObj = {
      name: profileUpdates.name,
      phone: profileUpdates.phone,
      email: profileUpdates.email,
      address: profileUpdates.address,
      doctor_phone: profileUpdates.doctorPhone,
      doctor_name: profileUpdates.doctorName,
      health_conditions: profileUpdates.healthConditions,
      allergies: profileUpdates.allergies,
      emergency_notes: profileUpdates.emergencyNotes,
      connected_family_phone: profileUpdates.connectedFamilyPhone,
      connected_family_name: profileUpdates.connectedFamilyName,
      connected_family_email: profileUpdates.connectedFamilyEmail,
      connected_elder_phone: profileUpdates.connectedElderPhone,
      connected_elder_name: profileUpdates.connectedElderName,
      preferred_language: profileUpdates.preferredLanguage,
      is_profile_complete: profileUpdates.isProfileComplete ?? true,
      upcoming_appointment_date: profileUpdates.upcomingAppointmentDate,
      upcoming_appointment_time: profileUpdates.upcomingAppointmentTime,
      upcoming_appointment_purpose: profileUpdates.upcomingAppointmentPurpose,
      upcoming_appointment_location: profileUpdates.upcomingAppointmentLocation,
      updated_at: new Date().toISOString()
    };

    // Filter out undefined keys
    Object.keys(updateObj).forEach(k => updateObj[k] === undefined && delete updateObj[k]);

    const { data, error } = await sb.from('users').update(updateObj).eq('user_id', userId).select().single();
    if (error) throw error;

    const formatted = formatUser(data);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
      localStorage.setItem('eldercare_user_active', JSON.stringify(formatted));
    }
    return { success: true, message: 'Profile updated successfully in Supabase', user: formatted };
  },

  forgotPassword: async (contact, newPassword) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');
    const hash = await hashString(newPassword);
    const clean = (contact || '').trim();

    const { error } = await sb
      .from('users')
      .update({ password_hash: hash, pin: newPassword, updated_at: new Date().toISOString() })
      .or(`email.ilike.${clean},phone.ilike.%${clean.replace(/\D/g, '')}%`);

    if (error) throw error;
    return { success: true, message: 'Password reset successfully' };
  },

  // ==========================================================
  // SCHEDULES & ROUTINES
  // ==========================================================
  getSchedules: async (elderId) => {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('schedules')
      .select('*')
      .eq('elder_id', elderId)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('[Supabase] Error fetching schedules:', error);
      return [];
    }
    if (!data || data.length === 0) {
      return await supabaseService.seedBaseSchedules(elderId);
    }
    return data.map(formatSchedule);
  },

  createSchedule: async (schedule) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const scheduleId = schedule.scheduleId || schedule.id || generateId('sch');
    const dbRecord = {
      schedule_id: scheduleId,
      elder_id: schedule.elderId || 'usr-elder-1',
      title: schedule.title || schedule.routineType || 'Daily Routine',
      routine_type: schedule.routineType || 'CUSTOM',
      category: schedule.category || (schedule.routineType || 'custom').toLowerCase(),
      scheduled_time: schedule.scheduledTime || schedule.time || '08:00',
      custom_voice_prompt: schedule.customVoicePrompt || '',
      is_enabled: schedule.enabled ?? true,
      completed: schedule.completed ?? false,
      completion_status: schedule.completed ? 'COMPLETED' : 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await sb.from('schedules').insert(dbRecord).select().single();
    if (error) throw error;
    return { success: true, schedule: formatSchedule(data) };
  },

  updateSchedule: async (scheduleId, updates) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const dbUpdates = {
      title: updates.title,
      routine_type: updates.routineType,
      category: updates.category,
      scheduled_time: updates.scheduledTime || updates.time,
      custom_voice_prompt: updates.customVoicePrompt,
      is_enabled: updates.enabled,
      completed: updates.completed,
      completion_status: updates.completed ? 'COMPLETED' : (updates.completionStatus || 'PENDING'),
      last_completed_at: updates.lastCompletedAt || (updates.completed ? new Date().toISOString() : null),
      updated_at: new Date().toISOString()
    };
    Object.keys(dbUpdates).forEach(k => dbUpdates[k] === undefined && delete dbUpdates[k]);

    const { data, error } = await sb
      .from('schedules')
      .update(dbUpdates)
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, schedule: formatSchedule(data) };
  },

  toggleSchedule: async (scheduleId) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const { data: current } = await sb.from('schedules').select('is_enabled').eq('schedule_id', scheduleId).single();
    const newStatus = !current?.is_enabled;

    const { data, error } = await sb
      .from('schedules')
      .update({ is_enabled: newStatus, updated_at: new Date().toISOString() })
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, schedule: formatSchedule(data) };
  },

  deleteSchedule: async (scheduleId) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');
    const { error } = await sb.from('schedules').delete().eq('schedule_id', scheduleId);
    if (error) throw error;
    return { success: true };
  },

  seedBaseSchedules: async (elderId) => {
    const sb = getSupabase();
    if (!sb || !elderId) return [];

    const base = [
      { routine_type: 'WAKE_UP', title: 'Wake Up', category: 'wake', scheduled_time: '07:00', custom_voice_prompt: 'Good morning! Time to wake up and start your day.' },
      { routine_type: 'WALK', title: 'Morning Walk', category: 'walk', scheduled_time: '07:30', custom_voice_prompt: 'Time for your morning walk and fresh air exercise.' },
      { routine_type: 'BREAKFAST', title: 'Breakfast', category: 'breakfast', scheduled_time: '08:15', custom_voice_prompt: 'Time for your healthy morning breakfast meal.' },
      { routine_type: 'MEDICATION', title: 'Morning Medication', category: 'medication', scheduled_time: '08:45', custom_voice_prompt: 'Time to take your prescribed morning tablets with water.' },
      { routine_type: 'LUNCH', title: 'Lunch', category: 'lunch', scheduled_time: '13:00', custom_voice_prompt: 'Time for your afternoon lunch and hydration.' },
      { routine_type: 'MEDICATION', title: 'Afternoon Medication', category: 'medication', scheduled_time: '14:00', custom_voice_prompt: 'Time to take your afternoon post-lunch tablets.' },
      { routine_type: 'WALK', title: 'Evening Walk', category: 'walk', scheduled_time: '17:30', custom_voice_prompt: 'Time for your refreshing evening walk.' },
      { routine_type: 'DINNER', title: 'Dinner', category: 'dinner', scheduled_time: '19:30', custom_voice_prompt: 'Time for your evening dinner meal.' },
      { routine_type: 'MEDICATION', title: 'Night Medication', category: 'medication', scheduled_time: '20:30', custom_voice_prompt: 'Time to take your bedtime medication tablets.' },
      { routine_type: 'SLEEP', title: 'Bedtime', category: 'sleep', scheduled_time: '22:00', custom_voice_prompt: 'Time to rest and get a good night sleep.' }
    ];

    const records = base.map(item => ({
      schedule_id: generateId('sch'),
      elder_id: elderId,
      ...item,
      is_enabled: true,
      completed: false,
      completion_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await sb.from('schedules').insert(records).select();
    if (error) {
      console.warn('[Supabase] Failed to seed base schedules:', error);
      return [];
    }
    return (data || []).map(formatSchedule);
  },

  // ==========================================================
  // ALERTS & EMERGENCY SOS
  // ==========================================================
  getAlerts: async (elderId) => {
    const sb = getSupabase();
    if (!sb) return [];
    let q = sb.from('alerts').select('*').order('created_at', { ascending: false }).limit(30);
    if (elderId) q = q.eq('elder_id', elderId);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(formatAlert);
  },

  triggerSos: async (payload = {}) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const alertId = generateId('alt-sos');
    const dbRecord = {
      alert_id: alertId,
      elder_id: payload.elderId || 'usr-elder-1',
      type: 'SOS',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      message: payload.message || 'EMERGENCY: SOS button triggered by Elder!',
      source: payload.source || 'Elder Dashboard SOS',
      created_at: new Date().toISOString()
    };

    const { data, error } = await sb.from('alerts').insert(dbRecord).select().single();
    if (error) throw error;
    return { success: true, alert: formatAlert(data) };
  },

  triggerFall: async (elderId, message, source = 'ESP32_ACCEL_FALL') => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const alertId = generateId('alt-fall');
    const dbRecord = {
      alert_id: alertId,
      elder_id: elderId || 'usr-elder-1',
      type: 'FALL_DETECTED',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      message: message || 'CRITICAL: Fall Detected by Wearable / Sensor!',
      source,
      created_at: new Date().toISOString()
    };

    const { data, error } = await sb.from('alerts').insert(dbRecord).select().single();
    if (error) throw error;
    return { success: true, alert: formatAlert(data) };
  },

  triggerUnresponsive: async (elderId, message) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const alertId = generateId('alt-unresp');
    const dbRecord = {
      alert_id: alertId,
      elder_id: elderId || 'usr-elder-1',
      type: 'UNRESPONSIVE',
      severity: 'HIGH',
      status: 'ACTIVE',
      message: message || 'Elder did not acknowledge scheduled routine alarm',
      source: 'CareBot Voice Alarm Scheduler',
      created_at: new Date().toISOString()
    };

    const { data, error } = await sb.from('alerts').insert(dbRecord).select().single();
    if (error) throw error;
    return { success: true, alert: formatAlert(data) };
  },

  resolveAlert: async (alertId) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const { data, error } = await sb
      .from('alerts')
      .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
      .eq('alert_id', alertId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, alert: formatAlert(data) };
  },

  // ==========================================================
  // ACTIVITY & SENSORS
  // ==========================================================
  getActivityLogs: async (elderId, limit = 30) => {
    const sb = getSupabase();
    if (!sb) return [];
    let q = sb.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (elderId) q = q.eq('elder_id', elderId);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(formatActivity);
  },

  createActivityLog: async (payload = {}) => {
    const sb = getSupabase();
    if (!sb) return null;

    const dbRecord = {
      log_id: generateId('act'),
      elder_id: payload.elderId || 'usr-elder-1',
      activity: payload.activity || payload.action || 'Motion Detected',
      source: payload.source || 'ESP32_PIR',
      confidence: payload.confidence ?? 1.0,
      metadata: payload.metadata || '',
      created_at: new Date().toISOString()
    };

    const { data } = await sb.from('activity_logs').insert(dbRecord).select().single();
    return formatActivity(data);
  },

  ingestMotion: async (elderId, activity, confidence, source, metadata) => {
    return supabaseService.createActivityLog({
      elderId,
      activity,
      confidence,
      source: source || 'ESP32_PIR',
      metadata
    });
  },

  // ==========================================================
  // APPOINTMENTS
  // ==========================================================
  getAppointmentsForElder: async (elderId) => {
    const sb = getSupabase();
    if (!sb) return [];
    let q = sb.from('appointments').select('*').order('appointment_date', { ascending: true });
    if (elderId) q = q.eq('elder_id', elderId);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(formatAppointment);
  },

  createAppointment: async (payload = {}) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');

    const appointmentId = payload.appointmentId || generateId('apt');
    const dbRecord = {
      appointment_id: appointmentId,
      elder_id: payload.elderId || 'usr-elder-1',
      elder_name: payload.elderName || 'Elder',
      doctor_name: payload.doctorName || 'Doctor',
      purpose: payload.purpose || 'General Consultation',
      location: payload.location || 'Clinic',
      appointment_date: payload.appointmentDate || payload.date || '',
      appointment_time: payload.appointmentTime || payload.time || '',
      status: payload.status || 'CONFIRMED',
      created_at: new Date().toISOString()
    };

    const { data, error } = await sb.from('appointments').insert(dbRecord).select().single();
    if (error) throw error;
    return { success: true, appointment: formatAppointment(data) };
  },

  deleteAppointment: async (appointmentId) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not initialized');
    const { error } = await sb.from('appointments').delete().eq('appointment_id', appointmentId);
    if (error) throw error;
    return { success: true };
  },

  // ==========================================================
  // VOICE ALARMS
  // ==========================================================
  getActiveAlarm: async (elderId) => {
    const sb = getSupabase();
    if (!sb) return null;

    const { data } = await sb
      .from('voice_alarms')
      .select('*')
      .eq('elder_id', elderId)
      .eq('status', 'TRIGGERED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return {
      eventId: data.event_id,
      scheduleId: data.schedule_id,
      elderId: data.elder_id,
      routineType: data.routine_type,
      status: data.status,
      timestamp: data.created_at
    };
  },

  triggerVoiceAlarm: async (schedule) => {
    const sb = getSupabase();
    if (!sb) return null;

    const eventId = generateId('alarm');
    const dbRecord = {
      event_id: eventId,
      schedule_id: schedule.scheduleId || schedule.id,
      elder_id: schedule.elderId || 'usr-elder-1',
      routine_type: schedule.routineType || 'CUSTOM',
      status: 'TRIGGERED',
      created_at: new Date().toISOString()
    };

    const { data } = await sb.from('voice_alarms').insert(dbRecord).select().single();
    return data;
  },

  acknowledgeVoiceAlarm: async (eventId, elderId, response) => {
    const sb = getSupabase();
    if (!sb) return { success: true };

    const { error } = await sb
      .from('voice_alarms')
      .update({
        status: 'ACKNOWLEDGED',
        spoken_response: response || 'Acknowledged by Elder',
        acknowledged_at: new Date().toISOString()
      })
      .eq('event_id', eventId);

    if (error) console.warn('[Supabase] Error acknowledging voice alarm:', error);
    return { success: true };
  }
};

export default supabaseService;
