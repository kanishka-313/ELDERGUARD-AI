import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import { apiService } from '../services/apiService';
import { LANGUAGES, getTranslation } from '../services/translations';
import { inferRoutineDetails, cleanElderName } from '../services/routineHelper';
import { backgroundAlarmService } from '../services/backgroundAlarmService';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Preferred Language: English ('en'), Tamil ('ta'), Malayalam ('ml')
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('eldercare_language') || 'en';
  });

  const setLanguage = (lang) => {
    if (['en', 'ta', 'ml'].includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem('eldercare_language', lang);
      speechService.setLanguage(lang);
      apiService.sendToSNSWebhook({
        type: 'Settings',
        eventType: 'LANGUAGE_CHANGED',
        language: lang,
        preferredLanguage: lang === 'ta' ? 'Tamil' : lang === 'ml' ? 'Malayalam' : 'English',
        message: `Language updated to ${lang === 'ta' ? 'Tamil' : lang === 'ml' ? 'Malayalam' : 'English'}`
      }).catch(() => {});
    }
  };

  const t = getTranslation(language);

  // Current User: Always starts on Login / Landing Auth screen unless logged in during active session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('eldercare_user_active');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.name) {
          u.name = cleanElderName(u.name);
        }
        return u;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  // Dynamic Schedules loaded from Supabase Cloud Database (Zero hardcoded default timings)
  const [schedules, setSchedules] = useState([]);

  // Dynamic Activity Logs loaded from Supabase Cloud Database
  const [activityLogs, setActivityLogs] = useState([]);

  // Dynamic Emergency Alerts loaded from Supabase Cloud Database (Family only)
  const [alerts, setAlerts] = useState([]);

  // Dynamic Appointments loaded from Supabase Cloud Database
  const [appointments, setAppointments] = useState([]);

  // Active Voice Alarm Event triggered by backend
  const [activeVoiceAlarm, setActiveVoiceAlarm] = useState(null);
  const lastSpokenEventIdRef = useRef(null);

  const [isSeniorMode, setIsSeniorMode] = useState(() => {
    return localStorage.getItem('eldercare_senior_mode_active') === 'true';
  });

  const [isMuted, setIsMuted] = useState(false);

  // Sync current user to SessionStorage
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('eldercare_user_active', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('eldercare_user_active');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('eldercare_senior_mode_active', isSeniorMode ? 'true' : 'false');
    if (isSeniorMode) {
      document.body.classList.add('senior-mode');
    } else {
      document.body.classList.remove('senior-mode');
    }
  }, [isSeniorMode]);

  // Helper to resolve the active elder ID (works seamlessly for both Elder & Family portals)
  const getTargetElderId = useCallback(() => {
    if (!currentUser) return 'usr-elder-1';
    if (currentUser.role?.toUpperCase() === 'ELDER') {
      return currentUser.userId || 'usr-elder-1';
    }
    if (currentUser.connectedElderId) return currentUser.connectedElderId;
    if (currentUser.connectedElderPhone) {
      const digits = currentUser.connectedElderPhone.replace(/\D/g, '');
      const sanitized = (currentUser.connectedElderName || 'elder').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (digits) {
        return `usr-elder-${sanitized || 'user'}-${digits.slice(-4)}`;
      }
    }
    return 'usr-elder-1';
  }, [currentUser]);

  // Primary Data Fetching
  const refreshAllData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const elderId = getTargetElderId();

      // 1. Fetch Appointments
      apiService.getAppointmentsForElder(elderId).then(res => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (list) setAppointments(list);
      }).catch(() => {});

      // 2. Fetch Schedules
      apiService.getSchedules(elderId).then(res => {
        const rawList = res?.data || (Array.isArray(res) ? res : []);
        if (rawList && rawList.length > 0) {
          // Normalize schedules for UI
          const normalized = rawList.map(s => {
            const isCompleted = s.completionStatus === 'COMPLETED' || s.completed === true;
            const inferred = inferRoutineDetails(s.title || s.routineType, s.category || s.routineType);
            return {
              ...s,
              id: s.scheduleId || s.id,
              scheduleId: s.scheduleId || s.id,
              time: s.scheduledTime || s.time,
              displayTime: s.displayTime || (s.scheduledTime ? formatDisplayTime(s.scheduledTime) : ''),
              title: s.title || formatRoutineTitle(s.routineType),
              category: s.category || inferred.category,
              routineType: s.routineType || inferred.routineType,
              icon: s.icon || inferred.icon,
              completed: isCompleted,
              completionStatus: isCompleted ? 'COMPLETED' : 'PENDING',
              completedAt: s.completedAt || (isCompleted ? 'Today' : null)
            };
          });
          setSchedules(normalized);
        }
      }).catch(() => {});

      // 3. Fetch Alerts
      apiService.getAlerts(elderId).then(res => {
        const rawList = res?.data || (Array.isArray(res) ? res : []);
        if (rawList) {
          const formatted = rawList.map(a => ({
            ...a,
            id: a.alertId || a.id,
            title: formatAlertTitle(a.alertType || a.type),
            resolved: a.status === 'RESOLVED' || a.resolved === true,
            timestamp: a.createdAt ? formatRelativeTime(a.createdAt) : 'Recently',
            elderName: currentUser?.name || currentUser?.connectedElderName || 'Elder',
            recipient: currentUser?.role === 'ELDER' ? 'Family Member' : `You (${currentUser?.name || 'Family'})`
          }));
          setAlerts(formatted);
        }
      }).catch(() => {});

      // 4. Fetch Activity Logs
      apiService.getActivityLogs(elderId, 40).then(res => {
        const rawList = res?.data || (Array.isArray(res) ? res : []);
        if (rawList) {
          const formatted = rawList.map(l => ({
            ...l,
            id: l.logId || l.activityId || l.id,
            title: l.activity ? capitalize(l.activity) : 'Activity Detected',
            details: l.metadata || `Source: ${l.source || 'Sensors'} • Confidence: ${l.confidence ? Math.round(l.confidence * 100) + '%' : '95%'}`,
            time: l.timestamp ? formatLogTime(l.timestamp) : (l.createdAt ? formatLogTime(l.createdAt) : 'Just now'),
            type: l.activityType?.toLowerCase() || 'motion',
            status: l.activity?.includes('fall') ? 'emergency' : 'safe'
          }));
          setActivityLogs(formatted);
        }
      }).catch(() => {});

    } catch (e) {
      console.warn('[AppContext] Refresh data error:', e);
    }
  }, [currentUser, getTargetElderId]);

  // Supabase Realtime Live WebSocket Subscriptions
  useEffect(() => {
    if (!currentUser) return;
    const sb = getSupabase();
    if (!sb) return;

    try {
      const channel = sb
        .channel('eldercare_realtime_stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
          console.log('[Supabase Realtime] Alert change detected:', payload);
          refreshAllData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
          console.log('[Supabase Realtime] Schedule change detected:', payload);
          refreshAllData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, (payload) => {
          console.log('[Supabase Realtime] Activity change detected:', payload);
          refreshAllData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_alarms' }, (payload) => {
          console.log('[Supabase Realtime] Voice alarm change detected:', payload);
          refreshAllData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
          console.log('[Supabase Realtime] Appointment change detected:', payload);
          refreshAllData();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Supabase Realtime] Live channel subscribed successfully!');
          }
        });

      return () => {
        sb.removeChannel(channel);
      };
    } catch (err) {
      console.warn('[Supabase Realtime] Subscription error:', err);
    }
  }, [currentUser, refreshAllData]);

  // Trigger data refresh on login or mount
  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 8000); // Polling fallback sync every 8 seconds
    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Voice AI Alarm Polling for Elder Role (Backend-driven scheduled voice activation)
  useEffect(() => {
    if (!currentUser || currentUser.role?.toUpperCase() !== 'ELDER') {
      setActiveVoiceAlarm(null);
      return;
    }

    const checkVoiceAlarm = async () => {
      try {
        const elderId = currentUser.userId || 'usr-elder-1';
        const res = await apiService.getActiveAlarm(elderId);

        if (res?.data && res.data.eventId) {
          const event = res.data;
          setActiveVoiceAlarm(event);

          // Speak only once per eventId
          if (lastSpokenEventIdRef.current !== event.eventId && !isMuted) {
            lastSpokenEventIdRef.current = event.eventId;
            audioService.startAlarmRingtoneLoop(3500);
            const elderName = currentUser?.name || currentUser?.connectedElderName || 'Friend';
            let promptToSpeak = event.voicePrompt;
            if (!promptToSpeak || promptToSpeak.includes('alarm ringing') || promptToSpeak.includes('{name}')) {
              const displayTime = event.scheduledTime || event.time || 'now';
              const routineTitle = event.title || event.routineType || 'Routine';
              if (language === 'ta') {
                promptToSpeak = `${elderName}, நேரம் ${displayTime}. உங்கள் ${routineTitle} நேரம் வந்துவிட்டது! தயவுசெய்து உறுதிப்படுத்தவும்.`;
              } else if (language === 'ml') {
                promptToSpeak = `${elderName}, സമയം ${displayTime}. നിങ്ങളുടെ ${routineTitle} ചെയ്യാനുള്ള സമയമായി! ദയവായി സ്ഥിരീകരിക്കുക.`;
              } else {
                promptToSpeak = `${elderName}, it is ${displayTime}. Time for your ${routineTitle}. Please confirm to turn off the alarm.`;
              }
            } else {
              promptToSpeak = promptToSpeak.replace(/\{name\}/g, elderName);
            }
            
            // Out-of-app Background Notification & Title Flash
            backgroundAlarmService.showDesktopNotification({
              title: `⏰ Alarm Reminder: ${event.routineType || 'Scheduled Routine'}`,
              body: promptToSpeak,
              onClick: () => window.focus()
            });
            backgroundAlarmService.startTitleFlash(event.routineType || 'Routine Alarm');

            setTimeout(() => {
              speechService.speak(promptToSpeak);
            }, 600);
          }
        }
      } catch (err) {
        // Silent catch for background polling
      }
    };

    checkVoiceAlarm();
    const voiceInterval = setInterval(checkVoiceAlarm, 3000);
    return () => clearInterval(voiceInterval);
  }, [currentUser, isMuted]);

  // Real-time Schedule Clock Monitor (Uses unthrottled Web Worker so alarms ring even when tab is in background/minimized)
  const triggeredMinutesRef = useRef(new Set());
  useEffect(() => {
    if (!currentUser || isMuted) return;

    // Request desktop notification permission so alarms work outside the app
    backgroundAlarmService.initNotificationPermission().catch(() => {});

    const unsubscribe = backgroundAlarmService.onTick((now) => {
      const currentH = now.getHours().toString().padStart(2, '0');
      const currentM = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentH}:${currentM}`;
      const minuteKey = `${now.toDateString()}_${currentTimeStr}`;

      schedules.forEach(schedule => {
        if (!schedule.completed && (schedule.time === currentTimeStr || schedule.scheduledTime === currentTimeStr)) {
          const scheduleKey = `${minuteKey}_${schedule.id || schedule.scheduleId}`;
          if (!triggeredMinutesRef.current.has(scheduleKey)) {
            triggeredMinutesRef.current.add(scheduleKey);
            
            const elderName = currentUser?.name || currentUser?.connectedElderName || 'Friend';
            let promptToSpeak = schedule.customVoicePrompt || schedule.voicePrompt;
            if (!promptToSpeak) {
              const displayTime = schedule.displayTime || schedule.time || 'now';
              const routineTitle = schedule.title || 'Routine';
              if (language === 'ta') {
                promptToSpeak = `${elderName}, நேரம் ${displayTime}. உங்கள் ${routineTitle} நேரம் வந்துவிட்டது! தயவுசெய்து உறுதிப்படுத்தவும்.`;
              } else if (language === 'ml') {
                promptToSpeak = `${elderName}, സമയം ${displayTime}. നിങ്ങളുടെ ${routineTitle} ചെയ്യാനുള്ള സമയമായി! ദയവായി സ്ഥിരീകരിക്കുക.`;
              } else {
                promptToSpeak = `${elderName}, it is ${displayTime}. Time for your ${routineTitle}. Please confirm to turn off the alarm.`;
              }
            } else {
              promptToSpeak = promptToSpeak.replace(/\{name\}/g, elderName);
            }

            const voiceAlarmEvent = {
              eventId: `vevt-${Date.now()}`,
              elderId: currentUser.userId || 'usr-elder-1',
              scheduleId: schedule.id || schedule.scheduleId,
              title: schedule.title,
              routineType: schedule.routineType || 'ROUTINE',
              category: schedule.category || 'custom',
              voicePrompt: promptToSpeak,
              scheduledTime: schedule.time || schedule.scheduledTime
            };

            setActiveVoiceAlarm(voiceAlarmEvent);
            audioService.startAlarmRingtoneLoop(3500);

            // Native Desktop System Notification (pops up outside the app)
            backgroundAlarmService.showDesktopNotification({
              title: `⏰ Alarm Reminder: ${schedule.title}`,
              body: promptToSpeak,
              onClick: () => {
                window.focus();
              }
            });

            // Flashing browser tab title
            backgroundAlarmService.startTitleFlash(schedule.title);

            setTimeout(() => {
              speechService.speak(promptToSpeak);
            }, 500);

            // Relay to SNS Webhook
            apiService.sendScheduleEventToSNS({
              action: 'VOICE_ALARM_TRIGGERED',
              scheduleId: schedule.id || schedule.scheduleId,
              elderId: currentUser.userId,
              title: schedule.title,
              routineTitle: schedule.title,
              routineType: schedule.routineType,
              scheduledTime: schedule.time,
              displayTime: schedule.displayTime,
              voicePrompt: promptToSpeak,
              query: `Voice Reminder Triggered: ${schedule.title} at ${schedule.displayTime || schedule.time}`
            }).catch(() => {});
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, schedules, isMuted, language]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioService.setMuted(next);
    if (next) speechService.stopSpeaking();
  };

  const toggleSeniorMode = () => {
    setIsSeniorMode(prev => {
      const next = !prev;
      apiService.sendToSNSWebhook({
        type: 'Settings',
        eventType: 'SENIOR_MODE_TOGGLED',
        seniorMode: next,
        message: `Senior Mode ${next ? 'Enabled' : 'Disabled'}`
      }).catch(() => {});
      return next;
    });
  };

  const login = (userData) => {
    const cleanedUser = {
      ...userData,
      name: cleanElderName(userData.name || 'Elder')
    };
    setCurrentUser(cleanedUser);
    apiService.sendToSNSWebhook({
      type: 'Auth',
      eventType: 'USER_LOGIN',
      elderId: cleanedUser.userId || cleanedUser.id,
      elderName: cleanedUser.name,
      elderPhone: cleanedUser.phone,
      familyPhone: cleanedUser.connectedFamilyPhone,
      role: cleanedUser.role,
      isProfileComplete: cleanedUser.isProfileComplete,
      message: `User ${cleanedUser.name || 'User'} logged in as ${cleanedUser.role || 'user'}`
    }).catch(() => {});
  };

  const logout = () => {
    if (currentUser) {
      apiService.sendToSNSWebhook({
        type: 'Auth',
        eventType: 'USER_LOGOUT',
        elderId: currentUser.userId || currentUser.id,
        elderName: currentUser.name,
        role: currentUser.role,
        message: `User ${currentUser.name || 'User'} logged out`
      }).catch(() => {});
    }
    setCurrentUser(null);
    speechService.stopSpeaking();
  };

  const updateUserProfile = async (updatedFields) => {
    try {
      const merged = { 
        ...currentUser, 
        ...updatedFields,
        name: cleanElderName(updatedFields.name || currentUser?.name || 'Elder')
      };
      setCurrentUser(merged);
      sessionStorage.setItem('eldercare_user_active', JSON.stringify(merged));
      const res = await apiService.updateProfile(merged);
      if (res?.data) {
        const fullUser = { 
          ...merged, 
          ...res.data,
          name: cleanElderName(res.data.name || merged.name)
        };
        setCurrentUser(fullUser);
        sessionStorage.setItem('eldercare_user_active', JSON.stringify(fullUser));
      }
      audioService.playChime();
      addActivityLog({
        title: 'Profile Updated',
        type: 'profile',
        status: 'safe',
        details: `Profile settings updated for ${merged.name || 'User'}.`
      });

      apiService.sendToSNSWebhook({
        type: 'Profile',
        eventType: 'PROFILE_UPDATED',
        elderId: merged.userId || merged.id,
        elderName: merged.name,
        elderAge: merged.age,
        bloodGroup: merged.bloodGroup,
        medicalHistory: merged.medicalHistory,
        elderPhone: merged.phone,
        familyPhone: merged.connectedFamilyPhone,
        isProfileComplete: merged.isProfileComplete,
        message: `Medical & personal profile updated for ${merged.name || 'User'}`
      }).catch(() => {});

      refreshAllData();
      return res?.data || merged;
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  const toggleScheduleComplete = async (scheduleId) => {
    try {
      audioService.playChime();
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const targetSchedule = schedules.find(s => s.id === scheduleId || s.scheduleId === scheduleId);
      const nextCompleted = targetSchedule ? !targetSchedule.completed : true;

      // Optimistically update local state immediately
      setSchedules(prev => prev.map(s => {
        if (s.id === scheduleId || s.scheduleId === scheduleId) {
          return {
            ...s,
            completed: nextCompleted,
            completionStatus: nextCompleted ? 'COMPLETED' : 'PENDING',
            completedAt: nextCompleted ? nowStr : null
          };
        }
        return s;
      }));

      // Call backend toggle endpoint
      const res = await apiService.toggleSchedule(scheduleId);
      if (res?.data) {
        const updated = res.data;
        const isDone = updated.completed ?? (updated.completionStatus === 'COMPLETED');
        setSchedules(prev => prev.map(s => {
          if (s.id === scheduleId || s.scheduleId === scheduleId) {
            return {
              ...s,
              ...updated,
              id: updated.scheduleId || s.id,
              scheduleId: updated.scheduleId || s.scheduleId,
              completed: isDone,
              completionStatus: isDone ? 'COMPLETED' : 'PENDING',
              completedAt: isDone ? (updated.completedAt || nowStr) : null
            };
          }
          return s;
        }));
      }

      // Send Schedule Action POST Request to SNS Webhook Trigger
      apiService.sendScheduleEventToSNS({
        action: nextCompleted ? 'SCHEDULE_COMPLETED' : 'SCHEDULE_TOGGLED',
        scheduleId,
        elderId: getTargetElderId(),
        routineTitle: targetSchedule?.title || 'Routine',
        routineType: targetSchedule?.routineType || targetSchedule?.category || 'ROUTINE',
        status: nextCompleted ? 'COMPLETED' : 'PENDING',
        completed: nextCompleted,
        query: `Elder ${nextCompleted ? 'completed' : 'unmarked'} ${targetSchedule?.title || 'routine'} at ${nowStr}`
      }).catch(e => console.warn('[SNS] Webhook trigger notice:', e.message));

    } catch (err) {
      console.error('Error toggling schedule:', err);
    }
  };

  const saveScheduleTiming = async (scheduleData) => {
    try {
      audioService.playVoicePing();
      const elderId = getTargetElderId();
      const tempId = scheduleData.id || scheduleData.scheduleId || `sch-${Date.now()}`;
      const isUpdate = Boolean(scheduleData.id || scheduleData.scheduleId);
      const existing = schedules.find(s => s.id === tempId || s.scheduleId === tempId);

      const rawTitle = (scheduleData.title || '').trim();
      const inferred = inferRoutineDetails(rawTitle, scheduleData.category || scheduleData.routineType);
      const title = rawTitle || formatRoutineTitle(inferred.routineType);
      const category = (scheduleData.category && scheduleData.category !== 'custom') ? scheduleData.category : inferred.category;
      const routineType = (scheduleData.routineType && scheduleData.routineType !== 'CUSTOM') ? scheduleData.routineType : inferred.routineType;
      const icon = scheduleData.icon || inferred.icon;
      const displayTime = scheduleData.displayTime || (scheduleData.time ? formatDisplayTime(scheduleData.time) : '');
      const voicePrompt = scheduleData.voicePrompt || scheduleData.customVoicePrompt || `${currentUser?.connectedElderName || currentUser?.name || 'Friend'}, it is ${displayTime || scheduleData.time}. Time for your ${title}.`;

      // Optimistically add/update schedule in local state so it appears instantly below
      const newSchedule = {
        ...(existing || {}),
        id: tempId,
        scheduleId: tempId,
        elderId,
        title,
        routineTitle: title,
        time: scheduleData.time,
        scheduledTime: scheduleData.time,
        displayTime,
        category,
        routineType,
        icon,
        description: scheduleData.description || `${title} scheduled for ${displayTime}`,
        voicePrompt,
        customVoicePrompt: voicePrompt,
        scheduledBy: scheduleData.scheduledBy || existing?.scheduledBy || currentUser?.name || 'Family Member',
        completed: scheduleData.completed !== undefined ? scheduleData.completed : (existing?.completed ?? false),
        completionStatus: scheduleData.completionStatus || (existing?.completionStatus || (scheduleData.completed ? 'COMPLETED' : 'PENDING')),
        completedAt: scheduleData.completedAt || (existing?.completedAt ?? null),
        enabled: scheduleData.enabled !== undefined ? scheduleData.enabled : (existing?.enabled ?? true)
      };

      setSchedules(prev => {
        const exists = prev.some(s => s.id === tempId || s.scheduleId === tempId);
        if (exists) {
          return prev.map(s => (s.id === tempId || s.scheduleId === tempId) ? { ...s, ...newSchedule } : s);
        }
        return [newSchedule, ...prev];
      });

      if (isUpdate) {
        const id = scheduleData.id || scheduleData.scheduleId;
        await apiService.updateSchedule(id, {
          ...(existing || {}),
          ...scheduleData,
          elderId,
          title,
          routineTitle: title,
          category,
          routineType,
          icon,
          scheduledTime: scheduleData.time,
          time: scheduleData.time,
          displayTime,
          customVoicePrompt: voicePrompt,
          voicePrompt,
          scheduledBy: newSchedule.scheduledBy
        });
      } else {
        const res = await apiService.createSchedule({
          scheduleId: tempId,
          elderId,
          title,
          category,
          routineType,
          icon,
          scheduledTime: scheduleData.time,
          time: scheduleData.time,
          displayTime,
          customVoicePrompt: voicePrompt,
          scheduledBy: newSchedule.scheduledBy,
          enabled: true,
          completionStatus: 'PENDING'
        });
        if (res?.data?.scheduleId) {
          setSchedules(prev => prev.map(s => s.id === tempId ? { ...s, id: res.data.scheduleId, scheduleId: res.data.scheduleId } : s));
        }
      }

      // Send Schedule POST Request to SNS Webhook Trigger
      apiService.sendScheduleEventToSNS({
        action: isUpdate ? 'SCHEDULE_UPDATED' : 'SCHEDULE_CREATED',
        scheduleId: tempId,
        elderId,
        title: newSchedule.title,
        routineTitle: newSchedule.title,
        category: newSchedule.category,
        routineType: newSchedule.routineType,
        scheduledTime: newSchedule.time,
        displayTime: newSchedule.displayTime,
        voicePrompt: newSchedule.voicePrompt,
        query: `${isUpdate ? 'Updated' : 'Scheduled'} ${newSchedule.title} at ${newSchedule.displayTime}`
      }).catch(e => console.warn('[SNS] Webhook trigger notice:', e.message));

      refreshAllData();
    } catch (err) {
      console.error('Error saving schedule timing:', err);
    }
  };

  const deleteScheduleTiming = async (scheduleId) => {
    try {
      const targetSchedule = schedules.find(s => s.id === scheduleId || s.scheduleId === scheduleId);
      await apiService.deleteSchedule(scheduleId);
      setSchedules(prev => prev.filter(s => (s.id !== scheduleId && s.scheduleId !== scheduleId)));
      
      apiService.sendToSNSWebhook({
        type: 'Schedule',
        eventType: 'SCHEDULE_DELETED',
        scheduleId,
        elderId: getTargetElderId(),
        routineTitle: targetSchedule?.title || 'Routine',
        action: 'SCHEDULE_DELETED',
        message: `Schedule ${targetSchedule?.title || scheduleId} deleted`
      }).catch(() => {});
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const acknowledgeVoiceAlarm = async (response = "Awake / Done") => {
    if (!activeVoiceAlarm) return;
    try {
      audioService.stopAlarmRingtoneLoop();
      backgroundAlarmService.dismissNotification();
      backgroundAlarmService.stopTitleFlash();
      speechService.stopSpeaking();
      audioService.playChime();
      const elderId = currentUser?.userId || 'usr-elder-1';
      await apiService.acknowledgeVoiceAlarm(activeVoiceAlarm.eventId, elderId, response);

      // Send Voice Alarm Acknowledgment POST Request to SNS Webhook Trigger
      apiService.sendVoiceInputToSNS({
        type: 'Emergency/Event',
        eventType: 'VOICE_ALARM_ACKNOWLEDGED',
        eventId: activeVoiceAlarm.eventId,
        routineType: activeVoiceAlarm.routineType,
        userVoiceTranscript: response,
        query: response,
        elderId,
        elderName: currentUser?.name || 'Elder'
      }).catch(e => console.warn('[SNS] Webhook trigger notice:', e.message));

      setActiveVoiceAlarm(null);
      refreshAllData();
    } catch (err) {
      console.error('Error acknowledging voice alarm:', err);
    }
  };

  const addActivityLog = async (log) => {
    const elderId = currentUser?.userId || 'usr-elder-1';
    try {
      await apiService.createActivityLog({
        elderId,
        activity: log.title || 'Activity',
        activityType: log.type?.toUpperCase() || 'MOTION',
        metadata: log.details || '',
        source: 'APPLICATION'
      });

      apiService.sendToSNSWebhook({
        type: 'Emergency/Event',
        eventType: 'ACTIVITY_LOGGED',
        elderId,
        elderName: currentUser?.name || 'Elder',
        activity: log.title || 'Activity',
        activityType: log.type || 'motion',
        details: log.details || '',
        message: `Activity detected: ${log.title}`
      }).catch(() => {});

      refreshAllData();
    } catch (e) {}
  };

  // Emergency SOS Trigger - Sent to SNS Workbench (with direct Java safety fallback if SNS fails)
  const triggerSOS = async (source = 'Elder Dashboard Button', customMessage = null) => {
    audioService.playSiren();
    const elderId = getTargetElderId();
    const elderName = currentUser?.role?.toUpperCase() === 'ELDER' 
      ? (currentUser?.name || 'Elder') 
      : (currentUser?.connectedElderName || 'Elder');
    const elderPhone = currentUser?.role?.toUpperCase() === 'ELDER' 
      ? (currentUser?.phone || '') 
      : (currentUser?.connectedElderPhone || '');
    const familyPhone = currentUser?.role?.toUpperCase() === 'ELDER' 
      ? (currentUser?.connectedFamilyPhone || '') 
      : (currentUser?.phone || '');
    const location = currentUser?.location || currentUser?.room || 'Living Area';

    const sosText = customMessage || `🚨 EMERGENCY: SOS button activated by ${elderName}!`;

    try {
      // 1. Primary path: Dispatch to SNS Agent Workbench Webhook
      await apiService.sendSosEventToSNS({
        elderId,
        elderName,
        elderPhone,
        familyPhone,
        location,
        source,
        message: sosText,
        urgency: 'HIGH',
        timestamp: new Date().toISOString()
      });
      console.log('[AppContext] SOS event successfully routed via SNS Agent Workbench');
      refreshAllData();
    } catch (snsErr) {
      console.warn('[AppContext] SNS Webhook unavailable, executing direct Java safety fallback:', snsErr.message);
      // 2. Safety Fallback: Directly call Java backend if SNS fails
      try {
        const res = await apiService.triggerSos({
          elderId,
          elderName,
          elderPhone,
          familyPhone,
          message: `${sosText} Outbound emergency call placed to family number: ${familyPhone || 'Registered Family'}`,
          source
        });
        refreshAllData();
        return res;
      } catch (javaErr) {
        console.error('[AppContext] Failed to trigger direct SOS fallback:', javaErr);
      }
    }
  };

  // Fall Detection Alert - Sent to SNS Workbench (with direct Java safety fallback if SNS fails)
  const triggerFallDetection = async (confidence = 0.95, source = 'AI Camera Sensor') => {
    audioService.playSiren();
    const elderId = getTargetElderId();
    const elderName = currentUser?.role?.toUpperCase() === 'ELDER' 
      ? (currentUser?.name || 'Elder') 
      : (currentUser?.connectedElderName || 'Elder');
    const elderPhone = currentUser?.role?.toUpperCase() === 'ELDER' 
      ? (currentUser?.phone || '') 
      : (currentUser?.connectedElderPhone || '');
    const familyPhone = currentUser?.role?.toUpperCase() === 'ELDER' 
      ? (currentUser?.connectedFamilyPhone || '') 
      : (currentUser?.phone || '');
    const location = currentUser?.location || currentUser?.room || 'Camera Zone';
    const fallText = `CRITICAL: Sudden Fall Detected for ${elderName}!`;

    try {
      // 1. Primary path: Dispatch to SNS Agent Workbench Webhook
      await apiService.sendFallEventToSNS({
        elderId,
        elderName,
        elderPhone,
        familyPhone,
        location,
        confidence,
        source,
        message: fallText,
        urgency: 'CRITICAL',
        timestamp: new Date().toISOString()
      });
      console.log('[AppContext] Fall event successfully routed via SNS Agent Workbench');
      refreshAllData();
    } catch (snsErr) {
      console.warn('[AppContext] SNS Webhook unavailable, executing direct Java safety fallback:', snsErr.message);
      // 2. Safety Fallback: Directly call Java backend if SNS fails
      try {
        const res = await apiService.triggerFall(elderId, fallText, source);
        refreshAllData();
        return res;
      } catch (javaErr) {
        console.error('[AppContext] Failed to trigger direct fall alert fallback:', javaErr);
      }
    }
  };

  // Unresponsive Voice Alert - Sent to SNS Workbench (with direct Java safety fallback if SNS fails)
  const triggerUnresponsiveVoiceAlert = async (scheduledItemTitle = 'Routine Check') => {
    audioService.playWarningBeep();
    const elderId = getTargetElderId();
    const elderName = currentUser?.role?.toUpperCase() === 'ELDER' 
      ? (currentUser?.name || 'Elder') 
      : (currentUser?.connectedElderName || 'Elder');
    const location = currentUser?.location || currentUser?.room || 'Bedroom';
    const unrespText = `WARNING: ${elderName} did not respond to scheduled routine: ${scheduledItemTitle}.`;

    try {
      // 1. Primary path: Dispatch to SNS Agent Workbench Webhook
      await apiService.sendUnresponsiveEventToSNS({
        elderId,
        elderName,
        location,
        routine: scheduledItemTitle,
        message: unrespText,
        urgency: 'MEDIUM',
        timestamp: new Date().toISOString()
      });
      console.log('[AppContext] Unresponsive event successfully routed via SNS Agent Workbench');
      refreshAllData();
    } catch (snsErr) {
      console.warn('[AppContext] SNS Webhook unavailable, executing direct Java safety fallback:', snsErr.message);
      // 2. Safety Fallback: Directly call Java backend if SNS fails
      try {
        const res = await apiService.triggerUnresponsive(elderId, unrespText);
        refreshAllData();
        return res;
      } catch (javaErr) {
        console.error('[AppContext] Failed to trigger direct unresponsive alert fallback:', javaErr);
      }
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      audioService.playChime();
      await apiService.resolveAlert(alertId);

      apiService.sendToSNSWebhook({
        type: 'Emergency/Event',
        eventType: 'ALERT_RESOLVED',
        alertId,
        elderId: getTargetElderId(),
        message: `Alert ${alertId} resolved by caregiver`
      }).catch(() => {});

      refreshAllData();
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const scheduleAppointment = async (aptData) => {
    try {
      audioService.playSuccessFanfare();
      const elderId = getTargetElderId();
      const elderName = currentUser?.role?.toUpperCase() === 'ELDER'
        ? (currentUser?.name || 'Elder')
        : (currentUser?.connectedElderName || 'Elder');

      const tempId = aptData.appointmentId || aptData.id || `apt-${Date.now()}`;
      const payload = {
        appointmentId: tempId,
        elderId,
        elderName,
        appointmentDate: aptData.appointmentDate,
        appointmentTime: aptData.appointmentTime,
        purpose: aptData.purpose || "Doctor's Consultation",
        location: aptData.location || 'City Hospital Clinic',
        consultationMode: aptData.consultationMode || 'In-Person Clinic Visit',
        status: 'CONFIRMED'
      };

      // Optimistic local state update
      setAppointments(prev => [payload, ...prev.filter(a => (a.appointmentId || a.id) !== tempId)]);

      // Save via API
      const res = await apiService.createAppointment(payload);

      // Also sync to active user profile fields
      if (currentUser) {
        const updatedFields = {
          upcomingAppointmentDate: payload.appointmentDate,
          upcomingAppointmentTime: payload.appointmentTime,
          upcomingAppointmentPurpose: payload.purpose,
          upcomingAppointmentLocation: payload.location
        };
        const merged = { ...currentUser, ...updatedFields };
        setCurrentUser(merged);
        sessionStorage.setItem('eldercare_user_active', JSON.stringify(merged));
        apiService.updateProfile(merged).catch(() => {});
      }

      // Add activity log
      addActivityLog({
        title: `Doctor Appointment: ${payload.purpose}`,
        type: 'doctor',
        status: 'safe',
        details: `Scheduled for ${payload.appointmentDate} at ${payload.appointmentTime} at ${payload.location}. Live synchronized to Elder Dashboard.`
      });

      // Dispatch Appointment Scheduled POST to SNS Webhook Trigger
      apiService.sendToSNSWebhook({
        type: 'Appointment',
        eventType: 'APPOINTMENT_SCHEDULED',
        elderId,
        elderName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        purpose: payload.purpose,
        location: payload.location,
        consultationMode: payload.consultationMode,
        query: `Scheduled appointment for ${payload.purpose} on ${payload.appointmentDate} at ${payload.appointmentTime}`,
        message: `Medical appointment for ${payload.purpose} confirmed on ${payload.appointmentDate} at ${payload.appointmentTime}`
      }).catch(() => {});

      refreshAllData();
      return res?.data || payload;
    } catch (err) {
      console.error('Failed to schedule appointment:', err);
      throw err;
    }
  };

  const deleteAppointment = async (appointmentId) => {
    try {
      audioService.playChime();
      const targetApt = appointments.find(a => a.appointmentId === appointmentId || a.id === appointmentId);
      setAppointments(prev => prev.filter(a => a.appointmentId !== appointmentId && a.id !== appointmentId));
      await apiService.deleteAppointment(appointmentId);

      apiService.sendToSNSWebhook({
        type: 'Appointment',
        eventType: 'APPOINTMENT_CANCELLED',
        appointmentId,
        elderId: getTargetElderId(),
        purpose: targetApt?.purpose || 'Doctor Consultation',
        message: `Appointment for ${targetApt?.purpose || appointmentId} cancelled`
      }).catch(() => {});

      refreshAllData();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
      throw err;
    }
  };

  return (
    <AppContext.Provider value={{
      language,
      setLanguage,
      t,
      LANGUAGES,
      currentUser,
      login,
      logout,
      schedules,
      activityLogs,
      alerts,
      appointments,
      activeVoiceAlarm,
      acknowledgeVoiceAlarm,
      isSeniorMode,
      toggleSeniorMode,
      isMuted,
      toggleMute,
      toggleScheduleComplete,
      saveScheduleTiming,
      updateScheduleTiming: saveScheduleTiming,
      deleteScheduleTiming,
      scheduleAppointment,
      deleteAppointment,
      addActivityLog,
      updateUserProfile,
      triggerSOS,
      triggerFallDetection,
      triggerUnresponsiveVoiceAlert,
      resolveAlert,
      refreshAllData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Helpers
function formatDisplayTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12 < 10 ? '0' + hour12 : hour12}:${m} ${period}`;
}

function formatRoutineTitle(type) {
  if (!type) return 'Scheduled Routine';
  switch (type.toUpperCase()) {
    case 'WAKE_UP':
    case 'WAKE': return 'Morning Wake Up';
    case 'BREAKFAST': return 'Nutritious Breakfast';
    case 'MEDICINE':
    case 'MEDICATION':
    case 'TABLET': return 'Prescribed Medication';
    case 'LUNCH': return 'Nutritious Lunch';
    case 'WALK': return 'Morning / Evening Walk';
    case 'DINNER': return 'Evening Dinner';
    case 'SLEEP':
    case 'BEDTIME': return 'Bedtime & Sleep';
    default: return type.replace(/_/g, ' ');
  }
}

function formatAlertTitle(type) {
  if (!type) return '⚠️ Emergency Alert';
  switch (type.toUpperCase()) {
    case 'SOS': return '🚨 CRITICAL: SOS Emergency Button Triggered!';
    case 'FALL': return '⚠️ CRITICAL: Sudden Fall Detected by Sensor!';
    case 'UNRESPONSIVE': return '⚠️ Warning: Unresponsive Voice Routine Check-In!';
    default: return `⚠️ Emergency Alert: ${type}`;
  }
}

function formatRelativeTime(isoString) {
  try {
    const d = new Date(isoString);
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return 'Recently';
  }
}

function formatLogTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Now';
  }
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
