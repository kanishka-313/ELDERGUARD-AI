import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { speechService } from '../services/speechService';
import { audioService } from '../services/audioService';
import { emotionService, EMOTIONS } from '../services/emotionService';
import { apiService } from '../services/apiService';
import { geminiService } from '../services/geminiService';
import { inferRoutineDetails, getLocalizedScheduleTitle as resolveScheduleTitle } from '../services/routineHelper';
import ProfileModal from '../components/ProfileModal';
import ElderProfileModal from '../components/ElderProfileModal';
import EditScheduleModal from '../components/EditScheduleModal';
import confetti from 'canvas-confetti';
import {
  Sun,
  Utensils,
  Pill,
  Footprints,
  Moon,
  Soup,
  Eye,
  Coffee,
  UtensilsCrossed,
  CheckCircle2,
  Circle,
  Volume2,
  Mic,
  MicOff,
  Bot,
  ShieldAlert,
  Clock,
  UserCheck,
  PhoneCall,
  Calendar,
  Stethoscope,
  ChevronRight,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  XCircle,
  BellRing,
  AlarmClock,
  Video,
  VideoOff,
  Camera,
  Smile,
  Activity,
  Heart,
  UserCog,
  Radio,
  Send,
  Zap,
  RefreshCw
} from 'lucide-react';

const ICON_MAP = {
  Sun,
  Utensils,
  Pill,
  Footprints,
  Moon,
  Soup,
  Eye,
  Coffee,
  UtensilsCrossed,
  Clock
};

export default function ElderDashboard({ onOpenChat, onOpenSOS }) {
  const {
    currentUser,
    schedules,
    appointments,
    activeVoiceAlarm,
    acknowledgeVoiceAlarm,
    saveScheduleTiming,
    deleteScheduleTiming,
    toggleScheduleComplete,
    triggerUnresponsiveVoiceAlert,
    addActivityLog,
    triggerSOS,
    isSeniorMode,
    language,
    setLanguage,
    t,
    LANGUAGES
  } = useApp();

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'camera' | 'doctor'
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showElderProfileModal, setShowElderProfileModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSpeechTranscript, setVoiceSpeechTranscript] = useState('');
  const [lastRecognizedSpeech, setLastRecognizedSpeech] = useState('');
  const [customVoiceInput, setCustomVoiceInput] = useState('');
  const [voiceAudioLevel, setVoiceAudioLevel] = useState(0);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState(() => t?.voiceStatusInitialPrompt || 'Tap microphone or select a quick voice prompt below to speak with CareBot');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update initial voice message when language changes
  useEffect(() => {
    setVoiceStatusMessage(t?.voiceStatusInitialPrompt || 'Tap microphone or select a quick voice prompt below to speak with CareBot');
  }, [language, t]);

  // Automatically open Elder Medical Profile Modal on login if profile is not complete (newly registered elders)
  useEffect(() => {
    if (currentUser && currentUser.role === 'elder') {
      if (currentUser.isProfileComplete === false) {
        setShowElderProfileModal(true);
      }
    }
  }, [currentUser]);

  // Live Camera & Emotion Monitor State for Elder
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [forcedEmotionState, setForcedEmotionState] = useState(null);
  const [metrics, setMetrics] = useState(() => emotionService.getSimulatedMetrics());
  const [snapshotLoggedMessage, setSnapshotLoggedMessage] = useState('');

  // Live Conversational Dialogue State for Voice Alarms
  const [alarmElderSpoken, setAlarmElderSpoken] = useState('');
  const [alarmCareBotReply, setAlarmCareBotReply] = useState('');
  const [alarmIsThinking, setAlarmIsThinking] = useState(false);
  const [alarmIsListening, setAlarmIsListening] = useState(false);

  // Automatically start Camera for real-time safety, facial emotion & posture monitoring when inside app
  useEffect(() => {
    let isMounted = true;
    const autoStartCamera = async () => {
      await new Promise(r => setTimeout(r, 600));
      if (!isMounted) return;
      if (videoRef.current && !isCameraActive) {
        try {
          const res = await emotionService.startCamera(videoRef.current, canvasRef.current, (newMetrics) => {
            if (isMounted) setMetrics(newMetrics);
          });
          if (res?.success && isMounted) {
            setIsCameraActive(true);
            console.log('[ElderDashboard] 🎥 Continuous AI Camera successfully auto-started.');
          }
        } catch (e) {
          console.warn('[ElderDashboard] Camera auto-start notice:', e);
        }
      }
    };

    autoStartCamera();

    return () => {
      isMounted = false;
      emotionService.stopCamera();
    };
  }, []);

  // Interactive Timing Box State
  const [boxCategory, setBoxCategory] = useState('wake');
  const [boxTitle, setBoxTitle] = useState(() => t?.wakeUpAlarm || 'Wake Up Alarm');
  const [boxTime, setBoxTime] = useState('07:00');
  const [boxVoicePrompt, setBoxVoicePrompt] = useState('Good morning! Time to wake up and start your day.');

  // Real-time Clock for UI display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update metrics periodically for camera tab and overview
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(emotionService.getSimulatedMetrics(forcedEmotionState));
    }, 3000);
    return () => clearInterval(interval);
  }, [forcedEmotionState]);

  // Conversational Voice Alarm Interaction Handler (Zero Keywords - Any response completes routine)
  const handleElderAlarmVoiceResponse = async (transcript) => {
    if (!transcript || !transcript.trim()) return;
    const cleanTranscript = transcript.trim();
    setAlarmElderSpoken(cleanTranscript);
    setAlarmIsThinking(true);
    setAlarmIsListening(false);

    try {
      const elderName = currentUser?.name || currentUser?.connectedElderName || 'Friend';

      // 1. Immediately mark schedule as completed on ANY verbal response to the alarm
      if (activeVoiceAlarm?.scheduleId) {
        const schedule = schedules.find(s => (s.id === activeVoiceAlarm.scheduleId || s.scheduleId === activeVoiceAlarm.scheduleId) && !s.completed);
        if (schedule) {
          toggleScheduleComplete(schedule.id || schedule.scheduleId);
        }
      }

      // 2. Acknowledge alarm event in backend
      if (activeVoiceAlarm?.eventId) {
        apiService.acknowledgeAlarm(activeVoiceAlarm.eventId, currentUser?.userId, cleanTranscript).catch(() => {});
      }

      // 3. Generate empathetic conversational response via AI
      const geminiResult = await geminiService.processVoiceAlarmResponse(
        cleanTranscript,
        activeVoiceAlarm,
        language,
        {
          name: elderName,
          age: currentUser?.age || 76,
          medicalHistory: currentUser?.medicalHistory || 'General Care'
        }
      );

      const spokenReply = geminiResult?.spokenReply || (
        language === 'ta' 
          ? `மிக்க மகிழ்ச்சி ${elderName} அவர்களே! உங்கள் வழக்கத்தை வெற்றிகரமாக முடித்துவிட்டீர்கள் என குறித்துக் கொண்டேன். உடலை நன்றாக பார்த்துக் கொள்ளுங்கள்!`
          : language === 'ml'
          ? `വളരെ സന്തോഷം ${elderName}! നിങ്ങൾ ഇത് പൂർത്തിയാക്കിയത് ഞാൻ രേഖപ്പെടുത്തിയിട്ടുണ്ട്. ആരോഗ്യം ശ്രദ്ധിക്കുക!`
          : `Wonderful job, ${elderName}! I have recorded your routine response and marked it complete for you.`
      );

      setAlarmCareBotReply(spokenReply);
      speechService.speak(spokenReply);
      audioService.playSuccessFanfare();

      // 4. Relay conversational interaction to SNS Workbench Webhook Trigger
      apiService.sendVoiceInputToSNS({
        type: 'Schedule',
        eventType: 'VOICE_ALARM_INTERACTION',
        routineTitle: activeVoiceAlarm?.title || 'Routine',
        elderId: currentUser?.userId,
        elderName,
        userVoiceTranscript: cleanTranscript,
        careBotReply: spokenReply,
        language
      }).catch(() => {});

      // 5. Auto-dismiss the alarm modal after the elder hears the reply
      setTimeout(() => {
        dismissVoiceAlarm();
      }, 4500);

    } catch (err) {
      console.warn('[ElderDashboard] Alarm conversational interaction error:', err);
    } finally {
      setAlarmIsThinking(false);
    }
  };

  // Automatically listen for elder's voice response when Voice Alarm Modal is active
  useEffect(() => {
    if (!activeVoiceAlarm) {
      setAlarmElderSpoken('');
      setAlarmCareBotReply('');
      setAlarmIsThinking(false);
      setAlarmIsListening(false);
      return;
    }

    setAlarmElderSpoken('');
    setAlarmCareBotReply('');
    setAlarmIsThinking(false);
    setAlarmIsListening(true);

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (!isSubscribed) return;
      speechService.startListening({
        onResult: (transcript) => {
          if (!isSubscribed) return;
          console.log('[ElderDashboard] 🎙️ Elder Voice Alarm Response:', transcript);
          handleElderAlarmVoiceResponse(transcript);
        },
        onPartial: (partial) => {
          if (isSubscribed) {
            setAlarmElderSpoken(partial);
          }
        },
        onError: () => {
          if (isSubscribed) setAlarmIsListening(false);
        },
        onEnd: () => {
          if (isSubscribed) setAlarmIsListening(false);
        }
      });
    }, 1500);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      speechService.stopListening();
    };
  }, [activeVoiceAlarm, language]);

  const completedCount = schedules.filter(s => s.completed).length;
  const progressPercent = schedules.length > 0 ? Math.round((completedCount / schedules.length) * 100) : 0;
  const currentEmotion = EMOTIONS[metrics.primaryEmotion] || EMOTIONS.CALM;

  const getLocalizedEmotionLabel = (emotionKey) => {
    const key = (emotionKey || metrics.primaryEmotion || '').toUpperCase();
    if (key === 'HAPPY') return t?.happyLabel || 'Happy / Content';
    if (key === 'CALM') return t?.calmLabel || 'Calm / Relaxed';
    if (key === 'ALERT' || key === 'NEUTRAL') return t?.alertLabel || 'Alert / Focused';
    if (key === 'DROWSY') return t?.drowsyLabel || 'Drowsy / Fatigued';
    if (key === 'DISTRESSED') return t?.discomfortLabel || 'Discomfort / Pain';
    return currentEmotion.label;
  };

  const getLocalizedScheduleTitle = (item) => {
    return resolveScheduleTitle(item, t, language);
  };

  // Camera Toggle for Elder
  const handleToggleCamera = async () => {
    if (isCameraActive) {
      emotionService.stopCamera(videoRef.current);
      setIsCameraActive(false);
    } else {
      await emotionService.startCamera(videoRef.current, canvasRef.current, (newMetrics) => {
        setMetrics(newMetrics);
      });
      setIsCameraActive(true);
      audioService.playVoicePing();
      speechService.speak(language === 'ta' ? 'கேமரா செயல்படுகிறது. உங்கள் நலனை கண்காணிக்கிறது.' : language === 'ml' ? 'ക്യാമറ സജീവമാണ്. ആരോഗ്യം നിരീക്ഷിക്കുന്നു.' : `Camera active. CareBot is monitoring your facial emotion and wellness in real time.`);
    }
  };

  // Log Wellness Snapshot to Family Feed
  const handleLogWellnessSnapshot = () => {
    audioService.playSuccessFanfare();
    const elderName = currentUser?.name || 'Elder';
    const localizedEmotion = getLocalizedEmotionLabel(metrics.primaryEmotion);
    addActivityLog({
      title: `Live Emotion Snapshot: ${localizedEmotion}`,
      type: 'camera',
      status: metrics.primaryEmotion === 'DISTRESSED' ? 'emergency' : metrics.primaryEmotion === 'DROWSY' ? 'warning' : 'safe',
      details: `${elderName}'s live facial emotion analyzed: ${localizedEmotion} (${metrics.confidence}%). Alertness: ${metrics.alertness}/100, Posture: ${metrics.posture}, Wellness: ${metrics.wellnessScore}%. Shared directly with family.`
    });

    setSnapshotLoggedMessage(`✓ Snapshot of ${localizedEmotion} shared with family!`);
    setTimeout(() => setSnapshotLoggedMessage(''), 4000);

    speechService.speak(language === 'ta' ? `நல்வாழ்வு பதிவு செய்யப்பட்டது. உங்கள் மனநிலை: ${localizedEmotion}. குடும்பத்திற்கு அனுப்பப்பட்டது.` : language === 'ml' ? `ആരോഗ്യ വിവരങ്ങൾ രേഖപ്പെടുത്തി. മാനസികാവസ്ഥ: ${localizedEmotion}. കുടുംബത്തെ അറിയിച്ചു.` : `Wellness snapshot recorded. Your detected mood is ${currentEmotion.label}. Details shared with your family.`);
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#2F6FED', '#3BAA72', '#F2B84B']
      });
    } catch (e) {}
  };

  const handleTitleChange = (newTitle) => {
    setBoxTitle(newTitle);
    const inferred = inferRoutineDetails(newTitle, boxCategory);
    setBoxCategory(inferred.category);
  };

  const handleSelectPreset = (cat, defaultTitle, defaultTime, defaultPrompt) => {
    setBoxCategory(cat);
    setBoxTitle(defaultTitle);
    setBoxTime(defaultTime);
    const elderName = currentUser?.name || 'Friend';
    const formattedPrompt = (defaultPrompt || '').replace(/\{name\}/g, elderName);
    setBoxVoicePrompt(formattedPrompt);
    audioService.playChime();
  };

  const handleSaveTiming = (e) => {
    if (e) e.preventDefault();
    if (!boxTitle || !boxTime) return;

    const [h, m] = boxTime.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayTimeStr = `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;

    const trimmedTitle = boxTitle.trim();
    const inferred = inferRoutineDetails(trimmedTitle, boxCategory);

    saveScheduleTiming({
      title: trimmedTitle,
      time: boxTime,
      displayTime: displayTimeStr,
      category: inferred.category,
      routineType: inferred.routineType,
      icon: inferred.icon,
      description: `${trimmedTitle} scheduled for ${displayTimeStr}`,
      voicePrompt: boxVoicePrompt || `${currentUser?.name || 'Elder'}, it is ${displayTimeStr}. Time for your ${trimmedTitle}.`,
      scheduledBy: language === 'ta' ? 'சுயமாக (முதியோர்)' : language === 'ml' ? 'സ്വയം (മുതിർന്നയാൾ)' : 'Self (Elder)'
    });

    audioService.playSuccessFanfare();
    speechService.speak(language === 'ta' ? `${trimmedTitle} ${displayTimeStr} மணிக்கு திட்டமிடப்பட்டது.` : language === 'ml' ? `${trimmedTitle} ${displayTimeStr} നായി ഷെഡ്യൂൾ ചെയ്തു.` : `Scheduled ${trimmedTitle} for ${displayTimeStr}. CareBot will remind you automatically.`);
  };

  const handleToggleItem = (item) => {
    toggleScheduleComplete(item.id || item.scheduleId);
    if (!item.completed) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#2F6FED', '#3BAA72', '#F2B84B']
        });
      } catch (e) {}
      const elderName = currentUser?.name || 'Friend';
      const localizedTitle = getLocalizedScheduleTitle(item);
      speechService.speak(language === 'ta' ? `அருமை ${elderName}! உங்கள் ${localizedTitle} முடிந்தது.` : language === 'ml' ? `വളരെ നല്ലത് ${elderName}! നിങ്ങൾ ${localizedTitle} പൂർത്തിയാക്കി.` : `Great job, ${elderName}! You completed your ${item.title}.`);
    }
  };

  const handleStartVoiceInteraction = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      setVoiceAudioLevel(0);
      return;
    }

    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
    }

    audioService.playVoicePing();
    setIsListening(true);
    setVoiceSpeechTranscript('');
    setLastRecognizedSpeech('');
    setVoiceStatusMessage(language === 'ta' ? '🎙️ மைக்ரோஃபோன் தயார்! பேசவும் (தமிழ், English, മലയാളം)...' : language === 'ml' ? '🎙️ മൈക്ക് സജീവം! ഇപ്പോൾ സംസാരിക്കുക (മലയാളം, English, தமிழ்)...' : '🎙️ Microphone Active! CareBot is listening... Speak now (English, தமிழ், മലയാളം)');

    speechService.startListening({
      onResult: (transcript) => {
        const trimmed = (transcript || '').trim();
        setVoiceSpeechTranscript(trimmed);
        setLastRecognizedSpeech(trimmed);
        setIsListening(false);
        setVoiceAudioLevel(0);
        processGeneralVoiceCommand(trimmed);
      },
      onPartial: (partial) => {
        setVoiceSpeechTranscript(partial);
      },
      onVolume: (vol) => {
        setVoiceAudioLevel(vol);
      },
      onError: (err) => {
        console.warn('[ElderDashboard] Voice recognition notice:', err);
        setIsListening(false);
        setVoiceAudioLevel(0);
        if (err !== 'no-speech') {
          setVoiceStatusMessage(`Mic Notice: ${err}. You can also type commands or click quick test buttons below.`);
        }
      },
      onEnd: () => {
        setIsListening(false);
        setVoiceAudioLevel(0);
      }
    });
  };

  const processGeneralVoiceCommand = async (command) => {
    if (!command || !command.trim()) return;
    const cleanCommand = command.trim();
    const elderName = currentUser?.name || 'Friend';
    setIsSpeaking(true);
    setLastRecognizedSpeech(cleanCommand);

    // If an alarm is currently active, acknowledge it with the spoken words
    if (activeVoiceAlarm) {
      acknowledgeVoiceAlarm(cleanCommand || 'Voice confirmed');
    }

    // Dynamic AI Semantic Intent & Action Understanding (ZERO Hardcoded Keywords)
    let aiAnalysis = null;
    try {
      aiAnalysis = await geminiService.understandElderSpeechIntent({
        transcript: cleanCommand,
        elderName,
        elderAge: currentUser?.age || '76',
        medicalHistory: currentUser?.medicalHistory || 'Hypertension',
        schedules,
        appointments,
        language
      });
    } catch (err) {
      console.warn('[ElderDashboard] Intent understanding error:', err);
    }

    // 1. Process emergency action if triggered by natural language
    if (aiAnalysis?.intent === 'EMERGENCY' || aiAnalysis?.action === 'SOS_TRIGGER') {
      const emergencyReply = aiAnalysis.spokenReply || (
        language === 'ta' ? '🚨 உங்கள் குடும்பத்திற்கு அவசர உதவி (SOS) உடனே அனுப்பப்படுகிறது!' :
        language === 'ml' ? '🚨 നിങ്ങളുടെ കുടുംബത്തിന് അടിയന്തര സഹായം (SOS) ഉടൻ അയക്കുന്നു!' :
        '🚨 Activating Emergency SOS Alert for your family immediately!'
      );
      setVoiceStatusMessage(emergencyReply);
      speechService.speak(emergencyReply);
      onOpenSOS();

      // Dispatch emergency event to SNS Workbench Webhook Trigger
      apiService.sendSosEventToSNS({
        userVoiceTranscript: cleanCommand,
        language,
        elderName,
        elderPhone: currentUser?.phone,
        familyPhone: currentUser?.connectedFamilyPhone,
        summaryForFamily: aiAnalysis?.summaryForFamily || `Emergency SOS triggered verbally by ${elderName}`
      }).catch(() => {});
      return;
    }

    // 2. Process routine completion if elder stated they finished/took/completed something
    if (aiAnalysis?.action === 'MARK_COMPLETE' || aiAnalysis?.intent === 'COMPLETE_ROUTINE') {
      let scheduleToToggle = null;
      if (aiAnalysis?.matchedScheduleId) {
        scheduleToToggle = schedules.find(s => 
          (s.id === aiAnalysis.matchedScheduleId || s.scheduleId === aiAnalysis.matchedScheduleId) && !s.completed
        );
      }
      if (!scheduleToToggle) {
        const lowerCmd = cleanCommand.toLowerCase();
        if (/wake|awake|morning|alarm|விழி|எழு|உண|ഉണർന്നു|സുപ്രഭാതം/i.test(lowerCmd)) {
          scheduleToToggle = schedules.find(s => !s.completed && (s.category === 'wake' || (s.title || '').toLowerCase().includes('wake') || (s.title || '').toLowerCase().includes('morning')));
        } else if (/tablet|med|pill|மருந்து|மாத்திரை|മരുന്ന്|ഗുളിക/i.test(lowerCmd)) {
          scheduleToToggle = schedules.find(s => !s.completed && (s.category === 'medication' || (s.title || '').toLowerCase().includes('tab') || (s.title || '').toLowerCase().includes('med')));
        } else if (/walk|exercise|jog|நடை|நட/i.test(lowerCmd)) {
          scheduleToToggle = schedules.find(s => !s.completed && (s.category === 'walk' || (s.title || '').toLowerCase().includes('walk')));
        } else if (/breakfast|lunch|dinner|food|eat|சாப்பாடு|உணவு|ഭക്ഷണം/i.test(lowerCmd)) {
          scheduleToToggle = schedules.find(s => !s.completed && (['breakfast', 'lunch', 'dinner', 'meal'].includes(s.category)));
        } else {
          scheduleToToggle = schedules.find(s => !s.completed);
        }
      }

      if (scheduleToToggle) {
        toggleScheduleComplete(scheduleToToggle.id || scheduleToToggle.scheduleId);
      }
    }

    // 3. Process camera / wellness request if elder asked about facial mood / camera
    if (aiAnalysis?.action === 'OPEN_CAMERA' || aiAnalysis?.intent === 'QUERY_WELLNESS') {
      setActiveTab('camera');
    }

    // 4. Relay full event to SNS Agent Workbench Webhook Trigger (Emergency/Event -> LLM Node)
    apiService.sendVoiceInputToSNS({
      userVoiceTranscript: cleanCommand,
      query: cleanCommand,
      language,
      preferredLanguage: language === 'ta' ? 'Tamil' : language === 'ml' ? 'Malayalam' : 'English',
      elderId: currentUser?.userId || 'usr-elder-1',
      elderName,
      elderAge: currentUser?.age || '76',
      medicalHistory: currentUser?.medicalHistory || 'Hypertension',
      location: currentUser?.location || currentUser?.room || 'Living Area',
      detectedIntent: aiAnalysis?.intent || 'GENERAL_CONVERSATION',
      detectedAction: aiAnalysis?.action || 'CONVERSE',
      schedulesSummary: schedules.map(s => `${s.title} at ${s.displayTime || s.time}`).join(', '),
      appointmentsSummary: appointments.map(a => `${a.purpose} on ${a.appointmentDate} at ${a.appointmentTime}`).join(', ')
    }).catch(() => {});

    // 5. Speak and display the AI conversational reply
    const finalReply = aiAnalysis?.spokenReply || (
      language === 'ta' ? `வணக்கம் ${elderName}, நீங்கள் பேசியதை நான் கேட்டேன்: "${cleanCommand}". நான் எப்போதும் உங்களுடன் இருக்கிறேன்.` :
      language === 'ml' ? `നമസ്കാരം ${elderName}, ഞാൻ കേട്ടു: "${cleanCommand}". ഞാൻ എപ്പോഴും നിങ്ങളുടെ കൂടെയുണ്ട്.` :
      `Hello ${elderName}, I heard you say: "${cleanCommand}". I am always right here by your side.`
    );

    setVoiceStatusMessage(finalReply);
    speechService.speak(finalReply, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const handleCustomVoiceSubmit = (e) => {
    if (e) e.preventDefault();
    if (!customVoiceInput || !customVoiceInput.trim()) return;
    const cmd = customVoiceInput.trim();
    setCustomVoiceInput('');
    setVoiceSpeechTranscript(cmd);
    processGeneralVoiceCommand(cmd);
  };

  const quickVoiceChips = [
    { label: t?.chipWake || '🌅 "Good morning, I woke up"', text: t?.chipWakeText || 'Good morning I am awake' },
    { label: t?.chipMedicine || '💊 "I took my morning tablets"', text: t?.chipMedicineText || 'I took my morning medicine tablets' },
    { label: t?.chipWalk || '🚶 "Finished morning walk"', text: t?.chipWalkText || 'Finished morning walk' },
    { label: t?.chipAppointments || '📅 "What appointments do I have?"', text: t?.chipAppointmentsText || 'What doctor appointments do I have?' },
    { label: t?.chipWellness || '😊 "How is my wellness today?"', text: t?.chipWellnessText || 'How is my facial emotion and wellness today?' },
    { label: t?.chipSos || '🚨 "Emergency SOS Help"', text: t?.chipSosText || 'SOS Emergency Help' }
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Automated Backend-Driven Voice Alarm Modal */}
      {activeVoiceAlarm && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{
            maxWidth: '620px',
            textAlign: 'center',
            padding: '2.4rem',
            border: '3px solid var(--primary)',
            boxShadow: '0 12px 36px var(--primary-glow)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--secondary)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.2rem',
              fontSize: '2.5rem'
            }} className="pulse-primary">
              <AlarmClock size={44} />
            </div>

            <span className="badge badge-primary" style={{ fontSize: '0.88rem', padding: '0.35rem 0.9rem', marginBottom: '0.8rem' }}>
              ⏰ {t?.automatedVoicePrompt || 'AUTOMATED ROUTINE VOICE REMINDER'}
            </span>

            <h2 style={{ fontSize: '1.8rem', color: 'var(--text)', margin: '0.4rem 0 0.6rem' }}>
              {activeVoiceAlarm.title || t?.wakeUpAlarm || 'Scheduled Routine Alarm'}
            </h2>

            <p style={{ fontSize: '1.15rem', color: 'var(--primary)', fontWeight: '700', margin: '0 0 1rem' }}>
              "{activeVoiceAlarm.voicePrompt || 'Time for your scheduled routine.'}"
            </p>

            {/* Live Interactive Conversation Dialogue */}
            {(alarmElderSpoken || alarmCareBotReply || alarmIsThinking || alarmIsListening) && (
              <div style={{
                background: '#F8FAFC',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.1rem',
                marginBottom: '1.4rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem'
              }}>
                {alarmElderSpoken && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    background: '#EFF6FF',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--primary)'
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>👴</span>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary)', display: 'block' }}>
                        {currentUser?.name || t?.elder || 'Elder'} (Elder Spoke):
                      </span>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.98rem', fontWeight: '600', color: 'var(--text)' }}>
                        "{alarmElderSpoken}"
                      </p>
                    </div>
                  </div>
                )}

                {alarmIsThinking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem', padding: '0.5rem' }}>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>CareBot AI is processing your words and responding...</span>
                  </div>
                )}

                {alarmCareBotReply && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    background: '#F0FDF4',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--safe)'
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>🤖</span>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--safe)', display: 'block' }}>
                        CareBot Companion Response:
                      </span>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.98rem', fontWeight: '600', color: 'var(--text)' }}>
                        "{alarmCareBotReply}"
                      </p>
                    </div>
                  </div>
                )}

                {alarmIsListening && !alarmElderSpoken && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '700' }}>
                    <Mic size={16} className="pulse-primary" />
                    <span>{language === 'ta' ? 'நீங்கள் பேசுவதை கேர்பாட் கேட்கிறது...' : language === 'ml' ? 'നിങ്ങൾ സംസാരിക്കുന്നത് കേൾക്കുന്നു...' : 'Listening to your voice... Speak anytime!'}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <button
                onClick={() => {
                  setAlarmIsListening(true);
                  speechService.startListening({
                    onResult: (transcript) => {
                      handleElderAlarmVoiceResponse(transcript);
                    },
                    onPartial: (partial) => {
                      setAlarmElderSpoken(partial);
                    }
                  });
                }}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Mic size={20} />
                <span>{alarmElderSpoken ? (language === 'ta' ? 'மீண்டும் பேசவும்' : language === 'ml' ? 'വീണ്ടും സംസാരിക്കുക' : 'Reply / Speak Again') : (t?.tapSpeakNow || 'Speak Response Now')}</span>
              </button>

              <button
                onClick={() => {
                  acknowledgeVoiceAlarm(alarmElderSpoken || 'Confirmed & Completed');
                  audioService.playSuccessFanfare();
                }}
                className="btn btn-safe btn-xl"
                style={{ width: '100%', fontSize: '1.2rem', padding: '0.95rem' }}
              >
                <CheckCircle2 size={24} />
                <span>✓ {t?.markDone || 'CONFIRM & MARK COMPLETED'}</span>
              </button>

              <button
                onClick={() => {
                  acknowledgeVoiceAlarm('Dismissed');
                }}
                className="btn btn-secondary btn-lg"
                style={{ width: '100%' }}
              >
                <XCircle size={20} />
                <span>{t?.dismissAlarm || 'Dismiss Reminder'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elder Medical Profile Modal */}
      <ElderProfileModal isOpen={showElderProfileModal} onClose={() => setShowElderProfileModal(false)} />

      {/* Profile Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Elder Welcome Banner with Live Emotion & Camera Status Pill */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, var(--secondary) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.8rem 2rem',
        marginBottom: '2rem',
        border: '1px solid rgba(47, 111, 237, 0.15)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{
            fontSize: '3.2rem',
            background: '#ffffff',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(47, 111, 237, 0.15)',
            border: '2px solid var(--secondary)'
          }}>
            👴
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.9rem', color: 'var(--text)', margin: 0 }}>
                {t?.welcomeElder || 'Welcome,'} {currentUser?.name || 'Elder User'}!
              </h1>
            </div>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', margin: 0 }}>
              {currentTime.toLocaleDateString(language === 'ta' ? 'ta-IN' : language === 'ml' ? 'ml-IN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>
                📞 {currentUser?.phone || '+91 98765 43210'}
              </span>

              <button
                onClick={() => setShowElderProfileModal(true)}
                className="btn btn-primary"
                style={{
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px var(--primary-glow)',
                  borderRadius: 'var(--radius-full)'
                }}
                title="Update your Age, Blood Group, and Medical History"
              >
                <UserCheck size={14} />
                <span>{t?.myMedicalProfile || "My Medical Profile"} ({currentUser?.bloodGroup || 'O+'}, {currentUser?.age || 76})</span>
              </button>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                background: currentEmotion.bg,
                color: currentEmotion.color,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${currentEmotion.color}`
              }}>
                <span>{currentEmotion.icon}</span>
                <span>{t?.liveMood || 'Live Mood'}: {getLocalizedEmotionLabel(metrics.primaryEmotion)} ({metrics.confidence}%)</span>
              </span>

              <button
                onClick={() => setShowProfileModal(true)}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Edit your phone or emergency family contact"
              >
                <UserCog size={13} color="var(--primary)" />
                <span>{t?.editContactsBtn || 'Edit Contacts'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Header Controls: Camera Quick Launch & Voice AI Mic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          {/* Quick Camera Toggle */}
          <button
            onClick={() => {
              setActiveTab('camera');
              if (!isCameraActive) {
                handleToggleCamera();
              }
            }}
            className={`btn ${isCameraActive ? 'btn-safe' : 'btn-secondary'}`}
            style={{
              padding: '0.75rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isCameraActive ? '0 4px 12px var(--safe-glow)' : 'var(--shadow-sm)'
            }}
            title="Open Live Emotion & Camera Monitor"
          >
            <Camera size={20} color={isCameraActive ? '#ffffff' : 'var(--primary)'} />
            <span style={{ fontWeight: '700' }}>
              {isCameraActive ? (t?.cameraActive || 'Camera Active') : (t?.startCamera || 'Start Camera')}
            </span>
          </button>

          {/* Voice Assistant Mic Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            background: '#ffffff',
            padding: '0.6rem 1.1rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 14px rgba(23, 32, 51, 0.06)',
            border: '1px solid var(--border)'
          }}>
            <button
              onClick={handleStartVoiceInteraction}
              className={`btn ${isListening ? 'btn-emergency pulse-emergency' : isSpeaking ? 'btn-primary animate-orb' : 'btn-primary'} btn-icon`}
              style={{ width: '50px', height: '50px', borderRadius: '50%', boxShadow: '0 6px 18px var(--primary-glow)' }}
              title="Speak with CareBot Voice Assistant"
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary)' }}>
                  {t?.voiceAssistantTitle || 'CareBot Voice AI'}
                </span>
                <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                  {isListening ? (t?.micListening || 'Listening...') : isSpeaking ? (t?.micSpeaking || 'Speaking...') : (t?.micReady || 'Ready')}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {isListening ? (t?.listeningToVoice || 'Listening to your voice...') : isSpeaking ? (t?.speakingToYou || 'Speaking to you...') : (t?.tapToTalk || 'Tap mic to talk like a person')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Caregiver & Real-Time Cross-Dashboard Sync Status */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 170, 114, 0.08) 0%, rgba(47, 111, 237, 0.06) 100%)',
        border: '1.5px solid rgba(59, 170, 114, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.9rem 1.4rem',
        marginBottom: '1.8rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--safe)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            boxShadow: '0 2px 8px rgba(59, 170, 114, 0.3)'
          }}>
            🔗
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text)' }}>
                {t?.caregiverLinkActive || 'Caregiver Link Active'}: <strong style={{ color: 'var(--primary)' }}>{currentUser?.connectedFamilyName || 'Family Caregiver'}</strong>
              </span>
              <span className="badge badge-safe" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                {t?.twoWayLiveSync || '🟢 2-Way Live Sync Connected'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
              {t?.caregiverPhone || 'Caregiver Phone'}: <strong>{currentUser?.connectedFamilyPhone || '+91 98765 12345'}</strong> • {t?.caregiverSyncDesc || 'All emergency alerts & completed routine voice confirmations are synchronized live to your family member.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowProfileModal(true)}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: '700' }}
        >
          {t?.verifyEditFamilyPhone || 'Verify / Edit Family Phone'}
        </button>
      </div>

      {/* Upcoming Doctor's Appointment Banner */}
      {appointments && appointments.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(47, 111, 237, 0.08) 100%)',
          border: '2px solid rgba(13, 148, 136, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.4rem',
          marginBottom: '1.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#0D9488',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              boxShadow: '0 3px 10px rgba(13, 148, 136, 0.3)'
            }}>
              📅
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span className="badge badge-safe" style={{ background: '#0D9488', color: '#ffffff', fontSize: '0.76rem' }}>
                  {t?.upcomingDoctorAppointment || "UPCOMING DOCTOR'S APPOINTMENT"}
                </span>
                <strong style={{ fontSize: '1.1rem', color: '#0F766E' }}>
                  {appointments[0].purpose}
                </strong>
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                  {t?.liveSyncedWithFamily || '🟢 Live Synced with Family'}
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: '0.2rem 0 0', fontWeight: '600' }}>
                📅 <strong>{appointments[0].appointmentDate}</strong> at <strong style={{ color: 'var(--primary)' }}>{appointments[0].appointmentTime}</strong> • 📍 {appointments[0].location || 'City Hospital Specialist Wing'} ({appointments[0].consultationMode || 'In-Person'})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const apt = appointments[0];
                const elderName = currentUser?.name || 'Friend';
                speechService.speak(language === 'ta'
                  ? `${elderName}, உங்கள் ${apt.purpose} சந்திப்பு ${apt.appointmentDate} அன்று ${apt.appointmentTime} மணிக்கு திட்டமிடப்பட்டுள்ளது.`
                  : language === 'ml'
                  ? `${elderName}, നിങ്ങളുടെ ${apt.purpose} അപ്പോയിന്റ്മെന്റ് ${apt.appointmentDate} ${apt.appointmentTime} നാണ്.`
                  : `${elderName}, your upcoming appointment for ${apt.purpose} is scheduled on ${apt.appointmentDate} at ${apt.appointmentTime} at ${apt.location || 'the clinic'}.`
                );
              }}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}
            >
              <Volume2 size={16} />
              <span>{t?.hearTimingAloud || 'Hear Timing Aloud'}</span>
            </button>
            <button
              onClick={() => setActiveTab('doctor')}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem', fontWeight: '700', background: '#0D9488' }}
            >
              {t?.viewConsultations || 'View Consultations'} ({appointments.length})
            </button>
          </div>
        </div>
      )}

      {/* 🎙️ CareBot Voice AI Live Speech Recognition & Action Console */}
      <div style={{
        background: isListening
          ? 'linear-gradient(135deg, rgba(235, 87, 87, 0.08) 0%, rgba(47, 111, 237, 0.06) 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, rgba(47, 111, 237, 0.04) 100%)',
        border: `2px solid ${isListening ? 'var(--emergency)' : isSpeaking ? 'var(--primary)' : 'rgba(47, 111, 237, 0.25)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: '1.4rem 1.6rem',
        marginBottom: '2rem',
        boxShadow: isListening ? '0 8px 24px var(--emergency-glow)' : 'var(--shadow-md)',
        transition: 'all 0.3s ease'
      }}>
        {/* Top Header of Voice Console */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
          paddingBottom: '0.8rem',
          borderBottom: '1px solid rgba(47, 111, 237, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isListening ? 'var(--emergency)' : isSpeaking ? 'var(--primary)' : 'var(--secondary)',
              color: isListening || isSpeaking ? '#ffffff' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening ? '0 4px 14px var(--emergency-glow)' : isSpeaking ? '0 4px 14px var(--primary-glow)' : 'none'
            }} className={isListening ? 'pulse-emergency' : isSpeaking ? 'animate-orb' : ''}>
              {isListening ? <Mic size={22} /> : isSpeaking ? <Volume2 size={22} /> : <Bot size={22} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text)' }}>
                  {t?.carebotVoiceAIConsole || 'CareBot Voice AI & Speech Recognition'}
                </h3>
                <span className={`badge ${isListening ? 'badge-emergency pulse-emergency' : isSpeaking ? 'badge-primary animate-orb' : 'badge-safe'}`} style={{ fontSize: '0.74rem', padding: '0.15rem 0.55rem' }}>
                  {isListening ? (t?.liveListeningBadge || '🔴 LIVE LISTENING...') : isSpeaking ? (t?.speakingResponseBadge || '🔊 SPEAKING RESPONSE...') : (t?.readyToListenBadge || '🟢 READY TO LISTEN')}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                {t?.activeLanguage || 'Language'}: <strong style={{ color: 'var(--primary)' }}>{language === 'ta' ? 'தமிழ் (Tamil)' : language === 'ml' ? 'മലയാളം (Malayalam)' : 'English'}</strong>
              </p>
            </div>
          </div>

          {/* Audio Visualizer Level Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>
              {t?.micSensitivity || 'Mic Sensitivity'}:
            </span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '24px', background: 'rgba(0,0,0,0.04)', padding: '2px 4px', borderRadius: '4px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
                const isActive = isListening && (voiceAudioLevel > bar * 10 || bar === 1);
                const height = Math.max(4, Math.min(22, isListening ? (voiceAudioLevel > bar * 10 ? 8 + bar * 2 : 4) : 4));
                return (
                  <span
                    key={bar}
                    style={{
                      width: '4px',
                      height: `${height}px`,
                      background: isActive ? (bar > 6 ? 'var(--emergency)' : bar > 4 ? 'var(--warning)' : 'var(--safe)') : '#CBD5E1',
                      borderRadius: '2px',
                      transition: 'height 0.1s ease, background 0.1s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Speech Recognition & Transcript HUD */}
        <div style={{
          background: isListening ? 'rgba(235, 87, 87, 0.06)' : '#ffffff',
          border: `1.5px solid ${isListening ? 'var(--emergency)' : isSpeaking ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '1.1rem 1.4rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: isListening ? 'var(--emergency)' : isSpeaking ? 'var(--primary)' : 'var(--text-muted)'
              }}>
                {isListening ? (t?.hearingLiveVoice || '🔴 Hearing Live Voice Input:') : lastRecognizedSpeech ? (t?.lastRecognizedWords || '✅ Last Recognized Words:') : (t?.speechRecognitionStatus || '💬 Speech Recognition Status:')}
              </span>
            </div>

            <p style={{
              fontSize: '1.15rem',
              fontWeight: '700',
              color: isListening ? 'var(--emergency)' : 'var(--text)',
              margin: 0,
              lineHeight: 1.4
            }}>
              {voiceSpeechTranscript ? `"${voiceSpeechTranscript}"` : lastRecognizedSpeech ? `"${lastRecognizedSpeech}"` : `"${voiceStatusMessage}"`}
            </p>

            {isSpeaking && (
              <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', margin: '0.4rem 0 0' }}>
                {t?.carebotReplyingIn || '🔊 CareBot replying in'} {language === 'ta' ? 'தமிழ்' : language === 'ml' ? 'മലയാളം' : 'English'}...
              </p>
            )}
          </div>

          {/* Voice Action Trigger Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleStartVoiceInteraction}
              className={`btn ${isListening ? 'btn-emergency pulse-emergency' : 'btn-primary'}`}
              style={{
                padding: '0.75rem 1.3rem',
                fontSize: '0.92rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: isListening ? '0 6px 20px var(--emergency-glow)' : '0 4px 14px var(--primary-glow)'
              }}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              <span>{isListening ? (t?.stopListening || 'Stop Listening') : (t?.tapSpeakNow || '🎙️ Tap & Speak Now')}</span>
            </button>

            {isSpeaking && (
              <button
                onClick={() => speechService.stopSpeaking()}
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1rem', fontSize: '0.88rem', fontWeight: '700' }}
              >
                {t?.stopSpeech || 'Stop Speech'}
              </button>
            )}

            {lastRecognizedSpeech && (
              <button
                onClick={() => processGeneralVoiceCommand(lastRecognizedSpeech)}
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Re-run last command and re-post to webhook"
              >
                <RefreshCw size={14} /> {t?.resend || 'Re-send'}
              </button>
            )}
          </div>
        </div>

        {/* Quick Voice Command Action Chips */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t?.quickVoiceTestTitle || 'Quick Voice Test Commands (Click to speak / test webhook immediately):'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {quickVoiceChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setVoiceSpeechTranscript(chip.text);
                  processGeneralVoiceCommand(chip.text);
                }}
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(47, 111, 237, 0.2)',
                  background: chip.text.includes('SOS') || chip.text.includes('அவசர') || chip.text.includes('അടിയന്തര') ? 'rgba(235, 87, 87, 0.1)' : '#ffffff',
                  color: chip.text.includes('SOS') || chip.text.includes('அவசர') || chip.text.includes('അടിയന്തര') ? 'var(--emergency)' : 'var(--text)'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type & Send Voice Command Text Field */}
        <form onSubmit={handleCustomVoiceSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="text"
            value={customVoiceInput}
            onChange={(e) => setCustomVoiceInput(e.target.value)}
            placeholder={t?.typeVoicePlaceholder || "Type any voice command or question for CareBot..."}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
          <button
            type="submit"
            disabled={!customVoiceInput.trim()}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.2rem',
              fontSize: '0.88rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={16} />
            <span>{t?.speakSendBtn || 'Speak / Send'}</span>
          </button>
        </form>
      </div>



      {/* Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          background: '#ffffff',
          padding: '6px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <button
            onClick={() => setActiveTab('schedule')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '1.05rem',
              background: activeTab === 'schedule' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'schedule' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <Clock size={20} />
            <span>{t?.tabSchedule || 'Daily Routines & Voice Alarms'}</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '1.05rem',
              background: activeTab === 'camera' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'camera' ? '#ffffff' : 'var(--text-muted)',
              position: 'relative'
            }}
          >
            <Camera size={20} />
            <span>{t?.tabCamera || 'Live Emotion & Camera Monitor'}</span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isCameraActive ? 'var(--safe)' : '#94A3B8' }} />
          </button>

          <button
            onClick={() => setActiveTab('doctor')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '1.05rem',
              background: activeTab === 'doctor' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'doctor' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <Calendar size={20} />
            <span>{t?.tabDoctor || 'Medical Appointments'} ({appointments.length})</span>
          </button>
        </div>

        {/* Adherence */}
        <div style={{
          background: '#ffffff',
          padding: '0.8rem 1.4rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.2rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text)' }}>
                {t?.timingsAdherence || 'Timings Adherence'}
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--safe)' }}>
                {completedCount} / {schedules.length} {t?.doneOutOf || 'Done'} ({progressPercent}%)
              </span>
            </div>
            <div style={{ width: '180px', height: '8px', background: '#F1F5F9', borderRadius: '4px', marginTop: '0.4rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPercent}%`, background: progressPercent === 100 ? 'var(--safe)' : 'var(--primary)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
          {progressPercent === 100 && schedules.length > 0 && (
            <span style={{ fontSize: '1.8rem' }}>🎉</span>
          )}
        </div>
      </div>

      {/* ============================================================
          TAB 1: SCHEDULE & TIMINGS
          ============================================================ */}
      <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
        <div>
          {/* Scheduling Timing Box */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, var(--secondary) 100%)',
            border: '2px solid rgba(47, 111, 237, 0.25)',
            padding: '1.6rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlarmClock size={26} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', margin: 0 }}>
                    {t?.scheduleBoxTitle || 'Schedule Automated Wake Up & Tablet Timing Box'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    {t?.scheduleBoxSubtitle || 'When the clock reaches the assigned timing, CareBot automatically speaks aloud and receives your voice response!'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
              <button
                type="button"
                onClick={() => handleSelectPreset('wake', t?.wakeUpAlarm || 'Wake Up Alarm', '07:00', t?.wakeUpPrompt || 'Good morning! Time to wake up.')}
                className={`btn ${boxCategory === 'wake' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.wakeUpPreset || '🌅 Wake Up Alarm'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('walk', t?.morningWalk || 'Morning Walk & Exercise', '07:30', t?.morningWalkPrompt || 'Time for morning walk!')}
                className={`btn ${boxCategory === 'walk' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.morningWalkPreset || '🚶 Morning Walk'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('breakfast', t?.breakfastTime || 'Breakfast Time', '08:00', t?.breakfastPrompt || 'Time for nutritious breakfast!')}
                className={`btn ${boxCategory === 'breakfast' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.breakfastPreset || '🍳 Breakfast Time'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('medication', t?.morningTablet || 'Morning Tablet', '08:30', t?.morningTabletPrompt || 'Time for your morning tablets with water.')}
                className={`btn ${boxCategory === 'medication' && (boxTitle.toLowerCase().includes('morning') || !boxTitle.toLowerCase().includes('night')) ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.morningTabletPreset || '💊 Morning Tablet'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('lunch', t?.lunchTime || 'Lunch Time', '13:00', t?.lunchPrompt || 'Time for nutritious lunch.')}
                className={`btn ${boxCategory === 'lunch' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.lunchPreset || '🥗 Lunch Time'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('medication', t?.nightTablet || 'Night Tablet', '20:30', t?.nightTabletPrompt || 'Time for your night tablet before bed.')}
                className={`btn ${boxCategory === 'medication' && boxTitle.toLowerCase().includes('night') ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.nightTabletPreset || '💊 Night Tablet'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('sleep', t?.sleepTime || 'Bedtime / Sleep', '21:30', t?.bedtimePrompt || "Time to rest and get a good night's sleep.")}
                className={`btn ${boxCategory === 'sleep' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.bedtimePreset || '🌙 Bedtime / Sleep'}
              </button>
            </div>

            <form onSubmit={handleSaveTiming} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr auto', gap: '0.8rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  {t?.timingTitleLabel || 'Routine Title'}
                </label>
                <input
                  type="text"
                  required
                  value={boxTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Bedtime, Afternoon Tablet, Tea Time"
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  {t?.assignTimeLabel || 'Assign Time'}
                </label>
                <input
                  type="time"
                  required
                  value={boxTime}
                  onChange={(e) => setBoxTime(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  {t?.voicePromptLabel || 'Voice Prompt Spoken by CareBot'}
                </label>
                <input
                  type="text"
                  value={boxVoicePrompt}
                  onChange={(e) => setBoxVoicePrompt(e.target.value)}
                  placeholder="e.g. Time for your routine."
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ padding: '0.75rem 1.4rem' }}
              >
                <Plus size={18} />
                <span>{t?.addTimingBtn || 'Add Timing'}</span>
              </button>
            </form>
          </div>

          {/* Today's Schedule List */}
          <div className="space-y-4">
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={22} color="var(--primary)" />
              <span>{t?.todaysRoutinesTitle || "Today's Daily Routines & Voice Alarms"} ({schedules.length})</span>
            </h3>

            {schedules.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)' }}>{t?.noRoutinesAssigned || 'No routines assigned yet'}</p>
                <p style={{ fontSize: '0.9rem' }}>{t?.noRoutinesAssignedDesc || 'Use the box above or ask your connected family member to schedule routines for you.'}</p>
              </div>
            ) : (
              schedules.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || Clock;
                return (
                  <div
                    key={item.id || item.scheduleId}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.2rem 1.6rem',
                      borderLeft: `6px solid ${item.completed ? 'var(--safe)' : 'var(--primary)'}`,
                      background: item.completed ? '#F8FCF9' : '#ffffff',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flex: 1, minWidth: '240px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        className="btn btn-ghost btn-icon"
                        style={{
                          color: item.completed ? 'var(--safe)' : '#94A3B8',
                          padding: '0.3rem',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease'
                        }}
                        title={item.completed ? (t?.markPending || 'Mark as pending') : (t?.markDone || 'Mark as completed')}
                      >
                        {item.completed ? <CheckCircle2 size={34} color="var(--safe)" /> : <Circle size={34} color="#CBD5E1" />}
                      </button>

                      <div style={{
                        background: item.completed ? 'var(--safe-light)' : 'var(--secondary)',
                        padding: '0.6rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        minWidth: '85px'
                      }}>
                        <strong style={{ color: item.completed ? 'var(--safe)' : 'var(--primary)', fontSize: '1.2rem' }}>
                          {item.displayTime || item.time}
                        </strong>
                      </div>

                      <div
                        onClick={() => handleToggleItem(item)}
                        style={{ cursor: 'pointer', flex: 1 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: item.completed ? 'var(--text-muted)' : 'var(--text)',
                            textDecoration: item.completed ? 'line-through' : 'none',
                            margin: 0
                          }}>
                            {getLocalizedScheduleTitle(item)}
                          </h3>
                          {item.completed && (
                            <span className="badge badge-safe">
                              <CheckCircle2 size={12} /> {t?.completedAt || 'Completed at'} {item.completedAt || 'Today'}
                            </span>
                          )}
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <UserCheck size={11} />
                            <span>
                              {item.scheduledBy && item.scheduledBy.trim()
                                ? item.scheduledBy
                                : (currentUser?.name || (language === 'ta' ? 'முதியோர்' : language === 'ml' ? 'മുതിർന്നയാൾ' : 'Self (Elder)'))}
                            </span>
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.92rem',
                          color: 'var(--text-muted)',
                          margin: '0.2rem 0 0',
                          textDecoration: item.completed ? 'line-through' : 'none',
                          opacity: item.completed ? 0.65 : 1
                        }}>
                          "{item.voicePrompt || item.customVoicePrompt || item.description}"
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const elderName = currentUser?.name || 'Friend';
                          const localizedTitle = getLocalizedScheduleTitle(item);
                          const prompt = item.voicePrompt || item.customVoicePrompt || `${elderName}, it is ${item.displayTime || item.time}. Time for your ${localizedTitle}.`;
                          speechService.speak(prompt.replace(/\{name\}/g, elderName));
                        }}
                        className="btn btn-secondary"
                        title="Hear routine prompt aloud"
                        style={{ padding: '0.6rem 0.9rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Volume2 size={16} color="var(--primary)" />
                        <span>{t?.hearPrompt || 'Hear Prompt'}</span>
                      </button>

                      <button
                        onClick={() => setEditingSchedule(item)}
                        className="btn btn-secondary"
                        title={t?.editRoutine || 'Edit routine'}
                        style={{ padding: '0.6rem 0.9rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}
                      >
                        <Pencil size={15} color="var(--primary)" />
                        <span>{t?.editRoutine || 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => deleteScheduleTiming(item.id || item.scheduleId)}
                        className="btn btn-ghost btn-icon"
                        style={{ color: 'var(--emergency)', padding: '0.5rem' }}
                        title={t?.deleteRoutine || 'Delete routine'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          TAB 2: LIVE EMOTION & CAMERA MONITOR
          ============================================================ */}
      <div style={{ display: activeTab === 'camera' ? 'block' : 'none' }}>
        <div>
          {/* Header Action Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, var(--secondary) 100%)',
            padding: '1.4rem 1.8rem',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            border: '2px solid rgba(47, 111, 237, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Camera size={26} color="var(--primary)" />
                <h2 style={{ fontSize: '1.45rem', color: 'var(--text)', margin: 0 }}>
                  {t?.cameraHeader || "Live Facial Emotion & Wellness Camera Monitor"}
                </h2>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                {t?.cameraHeaderDesc || "Your device camera monitors facial expressions, alertness, and relaxation in real time to support your daily wellness."}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleLogWellnessSnapshot}
                className="btn btn-secondary"
                style={{ padding: '0.7rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                title="Log current emotion and wellness score to family"
              >
                <Sparkles size={18} color="var(--primary)" />
                <span>{t?.logSnapshotToFamily || "Log Snapshot to Family"}</span>
              </button>

              <button
                onClick={handleToggleCamera}
                className={`btn ${isCameraActive ? 'btn-emergency' : 'btn-primary'}`}
                style={{ padding: '0.7rem 1.4rem' }}
              >
                {isCameraActive ? <VideoOff size={18} /> : <Video size={18} />}
                <span>{isCameraActive ? (t?.turnOffMyCamera || 'Turn Off My Camera') : (t?.startMyCamera || 'Start My Camera')}</span>
              </button>
            </div>
          </div>

          {snapshotLoggedMessage && (
            <div style={{
              background: 'var(--safe-light)',
              border: '1px solid var(--safe)',
              color: 'var(--safe)',
              padding: '0.8rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <CheckCircle2 size={20} />
              <span>{snapshotLoggedMessage}</span>
            </div>
          )}

          <div className="grid-2">
            {/* Left Column: Live Video Camera Viewport */}
            <div className="card" style={{ padding: '1.2rem' }}>
              <div style={{
                position: 'relative',
                height: '400px',
                background: '#0B1120',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #1E293B'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: isCameraActive ? 'block' : 'none',
                    transform: 'scaleX(-1)'
                  }}
                />

                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    display: isCameraActive ? 'block' : 'none'
                  }}
                />

                {!isCameraActive && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    textAlign: 'center',
                    padding: '2rem'
                  }}>
                    <div style={{
                      width: '130px',
                      height: '130px',
                      borderRadius: '50%',
                      border: `4px solid ${currentEmotion.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '4.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      boxShadow: `0 0 25px ${currentEmotion.color}40`
                    }}>
                      {forcedEmotionState === 'distressed' ? '😟' : forcedEmotionState === 'drowsy' ? '🥱' : '👴'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--safe)', fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.06em' }}>
                        {t?.aiCameraReady || "● AI CAMERA READY FOR MONITORING"}
                      </span>
                      <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: '0.35rem 0 1.2rem', maxWidth: '320px' }}>
                        {t?.aiCameraReadyDesc || "Click 'Start My Camera' to activate your webcam with real-time facial emotion recognition."}
                      </p>
                      <button
                        onClick={handleToggleCamera}
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1.4rem' }}
                      >
                        <Video size={18} />
                        <span>{t?.startCameraNow || "Start Camera Now"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Overlay Status HUD */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(10px)',
                  padding: '0.8rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94A3B8', display: 'block' }}>
                      {t?.liveDetectedEmotion || "Live Detected Emotion"}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: currentEmotion.color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{currentEmotion.icon}</span>
                      <span>{getLocalizedEmotionLabel(metrics.primaryEmotion)} ({metrics.confidence}%)</span>
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94A3B8', display: 'block' }}>
                      {t?.postureStatus || "Posture Status"}
                    </span>
                    <span style={{ fontSize: '0.98rem', fontWeight: '700', color: '#34D399' }}>
                      {metrics.posture === 'Upright & Steady' ? (t?.postureUpright || 'Upright & Steady') : metrics.posture}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emotion Simulator & Test Feedback Panel */}
              <div style={{ marginTop: '1.4rem', background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)' }}>
                    {t?.testCameraSimulation || "Live Emotion AI Monitor & Simulation:"}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {t?.activeLabel || 'Active'}: <strong style={{ color: currentEmotion.color }}>{getLocalizedEmotionLabel(metrics.primaryEmotion)}</strong>
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {/* 1. Happy */}
                  <button
                    onClick={() => {
                      setForcedEmotionState('happy');
                      emotionService.setTrackedEmotion('HAPPY');
                      setMetrics(emotionService.getSimulatedMetrics('happy'));
                      const elderName = currentUser?.name || 'Friend';
                      speechService.speak(language === 'ta' ? `நீங்கள் மகிழ்ச்சியாக இருக்கிறீர்கள் ${elderName}! எப்போதும் புன்னகையுடன் இருங்கள்.` : language === 'ml' ? `നിങ്ങൾ ഇന്ന് സന്തോഷവാനാണ് ${elderName}!` : `You look happy and relaxed today, ${elderName}! Keep smiling.`);
                    }}
                    className={`btn ${forcedEmotionState === 'happy' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.55rem 0.35rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>😊</span>
                    <span>{t?.happyLabel || 'Happy'}</span>
                  </button>

                  {/* 2. Calm */}
                  <button
                    onClick={() => {
                      setForcedEmotionState('calm');
                      emotionService.setTrackedEmotion('CALM');
                      setMetrics(emotionService.getSimulatedMetrics('calm'));
                      const elderName = currentUser?.name || 'Friend';
                      speechService.speak(language === 'ta' ? `உங்கள் முகம் அமைதியாகவும் சாந்தமாகவும் உள்ளது ${elderName}.` : language === 'ml' ? `നിങ്ങളുടെ മുഖഭാവം ശാന്തമാണ് ${elderName}.` : `Your facial tone is calm and peaceful, ${elderName}.`);
                    }}
                    className={`btn ${forcedEmotionState === 'calm' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.55rem 0.35rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>😌</span>
                    <span>{t?.calmLabel || 'Calm'}</span>
                  </button>

                  {/* 3. Neutral / Alert */}
                  <button
                    onClick={() => {
                      setForcedEmotionState('neutral');
                      emotionService.setTrackedEmotion('NEUTRAL');
                      setMetrics(emotionService.getSimulatedMetrics('neutral'));
                      const elderName = currentUser?.name || 'Friend';
                      speechService.speak(language === 'ta' ? `நேர்த்தியான நிலை மற்றும் கவனமான முகம் ${elderName}.` : language === 'ml' ? `ജാഗ്രതയുള്ള നില ${elderName}.` : `Attentive posture and neutral expression detected, ${elderName}.`);
                    }}
                    className={`btn ${forcedEmotionState === 'neutral' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.55rem 0.35rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>😐</span>
                    <span>{t?.alertLabel || 'Alert'}</span>
                  </button>

                  {/* 4. Drowsy */}
                  <button
                    onClick={() => {
                      setForcedEmotionState('drowsy');
                      emotionService.setTrackedEmotion('DROWSY');
                      setMetrics(emotionService.getSimulatedMetrics('drowsy'));
                      const elderName = currentUser?.name || 'Friend';
                      speechService.speak(language === 'ta' ? `${elderName}, நீங்கள் சற்று சோர்வாக இருக்கிறீர்கள். தண்ணீர் குடித்து ஓய்வெடுங்கள்.` : language === 'ml' ? `${elderName}, നിങ്ങൾ അല്പം ക്ഷീണിതനാണ്. വിശ്രമിക്കുക.` : `${elderName}, CareBot noticed you look a bit tired. Remember to rest if needed.`);
                    }}
                    className={`btn ${forcedEmotionState === 'drowsy' ? 'btn-warning' : 'btn-secondary'}`}
                    style={{ padding: '0.55rem 0.35rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🥱</span>
                    <span>{t?.drowsyLabel || 'Drowsy'}</span>
                  </button>

                  {/* 5. Distressed */}
                  <button
                    onClick={() => {
                      setForcedEmotionState('distressed');
                      emotionService.setTrackedEmotion('DISTRESSED');
                      setMetrics(emotionService.getSimulatedMetrics('distressed'));
                      const elderName = currentUser?.name || 'Friend';
                      speechService.speak(language === 'ta' ? `${elderName}, நீங்கள் அசௌகரியமாக உள்ளீர்கள். உங்களுக்கு உதவி தேவையா? குடும்பத்திற்கு தெரிவிக்கவா?` : language === 'ml' ? `${elderName}, നിങ്ങൾക്ക് വേദനയുണ്ടോ? ഞാൻ കുടുംബത്തെ അറിയിക്കട്ടെ?` : `${elderName}, you look in discomfort. Are you feeling alright? If you need help, I can alert your family immediately.`);
                    }}
                    className={`btn ${forcedEmotionState === 'distressed' ? 'btn-emergency' : 'btn-secondary'}`}
                    style={{ padding: '0.55rem 0.35rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>😟</span>
                    <span>{t?.discomfortLabel || 'Discomfort'}</span>
                  </button>

                  {/* 6. Dynamic Cycle */}
                  <button
                    onClick={() => {
                      setForcedEmotionState(null);
                      const dyn = emotionService.getSimulatedMetrics(null);
                      setMetrics(dyn);
                      emotionService.setTrackedEmotion(dyn.primaryEmotion);
                    }}
                    className={`btn ${forcedEmotionState === null ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.55rem 0.35rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🔄</span>
                    <span>{language === 'ta' ? 'தானியங்கி' : language === 'ml' ? 'ഓട്ടോ' : 'Auto'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Mood Breakdown & Biometric Telemetry */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.6rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', margin: 0 }}>
                    {t?.emotionBreakdown || "AI Emotion & Wellness Breakdown"}
                  </h3>
                  <span className="badge badge-safe">
                    <Activity size={12} /> {t?.realTimeTelemetry || "Real-Time Telemetry"}
                  </span>
                </div>

                {/* Progress bars for all 5 emotions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      <span>😊 {t?.happyContent || "Happy & Content"}</span>
                      <span style={{ color: 'var(--safe)', fontWeight: '700' }}>{metrics.emotions?.happy || 0}%</span>
                    </div>
                    <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.emotions?.happy || 0}%`, background: 'var(--safe)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      <span>😌 {t?.calmPeaceful || "Calm & Peaceful"}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{metrics.emotions?.calm || 0}%</span>
                    </div>
                    <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.emotions?.calm || 0}%`, background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      <span>😐 {t?.alertLabel || "Alert & Focused"}</span>
                      <span style={{ color: '#5B6B86', fontWeight: '700' }}>{metrics.emotions?.neutral || 0}%</span>
                    </div>
                    <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.emotions?.neutral || 0}%`, background: '#5B6B86', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      <span>🥱 {t?.drowsyFatigued || "Drowsy / Fatigued"}</span>
                      <span style={{ color: 'var(--warning)', fontWeight: '700' }}>{metrics.emotions?.drowsy || 0}%</span>
                    </div>
                    <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.emotions?.drowsy || 0}%`, background: 'var(--warning)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      <span>😟 {t?.distressedDiscomfort || "Distressed / Discomfort"}</span>
                      <span style={{ color: 'var(--emergency)', fontWeight: '700' }}>{metrics.emotions?.distressed || 0}%</span>
                    </div>
                    <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.emotions?.distressed || 0}%`, background: 'var(--emergency)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                </div>

                {/* Biometrics Grid */}
                <div style={{
                  background: '#F8FAFC',
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t?.postureStatus || "Posture Status"}</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{metrics.posture === 'Upright & Steady' ? (t?.postureUpright || 'Upright & Steady') : metrics.posture}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t?.blinkRate || "Blink Rate"}</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{metrics.blinkRate === 'Normal (18/min)' ? (t?.normalBlink || 'Normal (18/min)') : metrics.blinkRate}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t?.alertnessIndex || "Alertness Index"}</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{metrics.alertness}/100</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{t?.overallWellness || "Overall Wellness"}</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--safe)' }}>{metrics.wellnessScore}%</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button
                  onClick={() => {
                    const elderName = currentUser?.name || 'Friend';
                    const localizedMood = getLocalizedEmotionLabel(metrics.primaryEmotion);
                    speechService.speak(language === 'ta' ? `${elderName}, உங்கள் தற்போதைய உணர்வு: ${localizedMood}, விழிப்புணர்வு: ${metrics.alertness}, நல்வாழ்வு: ${metrics.wellnessScore}%.` : language === 'ml' ? `${elderName}, നിങ്ങളുടെ മാനസികാവസ്ഥ: ${localizedMood}, ആരോഗ്യം: ${metrics.wellnessScore}%.` : `${elderName}, your current detected emotion is ${currentEmotion.label} with an alertness score of ${metrics.alertness} and wellness score of ${metrics.wellnessScore} percent. You are doing wonderfully!`);
                  }}
                  className="btn btn-secondary btn-lg"
                  style={{ width: '100%', fontSize: '1.05rem' }}
                >
                  <Volume2 size={20} />
                  <span>{language === 'ta' ? 'உணர்ச்சி விவரத்தைக் குரலில் கேட்க' : language === 'ml' ? 'വിവരങ്ങൾ ഉറക്കെ കേൾക്കുക' : 'Hear Emotion Analysis Aloud'}</span>
                </button>

                {metrics.primaryEmotion === 'DISTRESSED' && (
                  <button
                    onClick={onOpenSOS}
                    className="btn btn-emergency btn-lg pulse-emergency"
                    style={{ width: '100%', fontSize: '1.05rem' }}
                  >
                    <ShieldAlert size={20} />
                    <span>{language === 'ta' ? 'குடும்பத்திற்கு அவசர உதவி எச்சரிக்கை அனுப்பு' : language === 'ml' ? 'കുടുംബത്തിന് അടിയന്തര അലേർട്ട് അയക്കുക' : 'Send Discomfort Alert to Family'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          TAB 3: APPOINTMENTS
          ============================================================ */}
      <div style={{ display: activeTab === 'doctor' ? 'block' : 'none' }}>
        <div>
          <div className="space-y-4">
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calendar size={22} color="var(--primary)" />
              <span>{t?.upcomingAppointments || "Upcoming Appointments"} ({appointments.length})</span>
            </h3>

            {schedules.length === 0 && appointments.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)' }}>{t?.noAppointments || "No upcoming appointments scheduled"}</p>
                <p style={{ fontSize: '0.9rem' }}>{language === 'ta' ? 'உங்கள் குடும்பத்தினர் உங்களுக்காக மருத்துவ சந்திப்புகளைத் திட்டமிடலாம்.' : language === 'ml' ? 'കുടുംബാംഗങ്ങൾക്ക് നിങ്ങൾക്കായി അപ്പോയിന്റ്മെന്റുകൾ ഷെഡ്യൂൾ ചെയ്യാം.' : 'Your connected family members can schedule appointments for you.'}</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)' }}>{t?.noAppointments || "No upcoming appointments scheduled"}</p>
              </div>
            ) : (
              appointments.map((apt) => (
                <div 
                  key={apt.appointmentId || apt.id} 
                  className="card" 
                  style={{ padding: '1.8rem', borderLeft: '6px solid #0D9488', marginBottom: '1.2rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Calendar size={20} color="#0D9488" />
                      <h4 style={{ fontSize: '1.2rem', color: 'var(--text)', margin: 0, fontWeight: '700' }}>
                        {apt.purpose}
                      </h4>
                    </div>
                    <span className="badge badge-safe">{apt.status || (language === 'ta' ? 'உறுதி செய்யப்பட்டது' : language === 'ml' ? 'സ്ഥിരീകരിച്ചു' : 'CONFIRMED')}</span>
                  </div>

                  <div style={{
                    background: '#F8FAFC',
                    padding: '1.2rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.2rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>{t?.appointmentDateLabel || 'Date'} & {t?.appointmentTimeLabel || 'Time'}</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                        {apt.appointmentDate} at {apt.appointmentTime}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>{t?.consultationModeLabel || 'Mode'} & {t?.hospitalClinicLocationLabel || 'Location'}</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>
                        {apt.location || 'Specialist Wing'} ({apt.consultationMode || 'In-Person'})
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        const elderName = currentUser?.name || 'Friend';
                        speechService.speak(language === 'ta'
                          ? `${elderName}, உங்கள் ${apt.purpose} சந்திப்பு ${apt.appointmentDate} அன்று ${apt.appointmentTime} மணிக்கு ${apt.location || 'மருத்துவமனையில்'} திட்டமிடப்பட்டுள்ளது.`
                          : language === 'ml'
                          ? `${elderName}, നിങ്ങളുടെ ${apt.purpose} അപ്പോയിന്റ്മെന്റ് ${apt.appointmentDate} ${apt.appointmentTime} നാണ്.`
                          : `${elderName}, your appointment for ${apt.purpose} is scheduled for ${apt.appointmentDate} at ${apt.appointmentTime} at ${apt.location || 'the clinic'}.`
                        );
                      }}
                      className="btn btn-secondary btn-lg"
                      style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Volume2 size={20} />
                      <span>{t?.hearAppointmentAloud || "Hear Appointment Details Aloud"}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Routine / Schedule Modal */}
      {editingSchedule && (
        <EditScheduleModal
          isOpen={Boolean(editingSchedule)}
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={async (updatedData) => {
            await saveScheduleTiming(updatedData);
            setEditingSchedule(null);
          }}
          currentUser={currentUser}
          language={language}
          t={t}
        />
      )}

      {/* Elder Medical Profile Update Modal */}
      <ElderProfileModal
        isOpen={showElderProfileModal}
        onClose={() => setShowElderProfileModal(false)}
      />

      {/* General Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
