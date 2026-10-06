import React, { useState, useEffect } from 'react';
import { speechService } from '../services/speechService';
import { audioService } from '../services/audioService';
import { inferRoutineDetails, cleanElderName } from '../services/routineHelper';
import {
  Clock,
  Volume2,
  CheckCircle2,
  X,
  Sparkles,
  Sun,
  Utensils,
  Pill,
  Footprints,
  Moon,
  UserCheck,
  RotateCcw,
  VolumeX
} from 'lucide-react';

export default function EditScheduleModal({
  isOpen = true,
  schedule,
  onClose,
  onSave,
  currentUser,
  language = 'en',
  t = {}
}) {
  if (!isOpen || !schedule) return null;

  const elderName = cleanElderName(currentUser?.connectedElderName || currentUser?.name || 'Friend');

  const [title, setTitle] = useState(schedule.title || '');
  const [time, setTime] = useState(schedule.time || schedule.scheduledTime || '08:00');
  const [category, setCategory] = useState(schedule.category || 'custom');
  const [voicePrompt, setVoicePrompt] = useState(
    schedule.voicePrompt || schedule.customVoicePrompt || ''
  );
  const [scheduledBy, setScheduledBy] = useState(
    schedule.scheduledBy || currentUser?.name || (language === 'ta' ? 'முதியோர்' : language === 'ml' ? 'മുതിർന്നയാൾ' : 'Self (Elder)')
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title || '');
      setTime(schedule.time || schedule.scheduledTime || '08:00');
      const inferred = inferRoutineDetails(schedule.title, schedule.category || schedule.routineType);
      setCategory(schedule.category || inferred.category);
      setVoicePrompt(
        schedule.voicePrompt ||
        schedule.customVoicePrompt ||
        `${elderName}, it is ${schedule.displayTime || schedule.time}. Time for your ${schedule.title}.`
      );
      setScheduledBy(
        schedule.scheduledBy ||
        currentUser?.name ||
        (language === 'ta' ? 'சுயமாக (முதியோர்)' : language === 'ml' ? 'സ്വയം (മുതിർന്നയാൾ)' : 'Self (Elder)')
      );
      setErrorMsg('');
      setIsSpeaking(false);
    }
  }, [schedule, elderName, currentUser, language]);

  // Format 24h time to 12h display time
  const getFormattedDisplayTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [hStr, mStr] = timeStr.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  };

  const currentDisplayTime = getFormattedDisplayTime(time);

  // Preset definitions
  const PRESETS = [
    {
      id: 'wake',
      icon: Sun,
      label: t?.wakeUpPreset || (language === 'ta' ? '🌅 விழிப்பு அலாரம்' : language === 'ml' ? '🌅 ഉണരൽ അലാറം' : '🌅 Morning Wake Up'),
      defaultTitle: language === 'ta' ? 'காலை விழிப்பு அலாரம்' : language === 'ml' ? 'പ്രഭാത ഉണരൽ അലാറം' : 'Morning Wake Up',
      defaultTime: '07:00',
      defaultPrompt: language === 'ta'
        ? `காலை வணக்கம் {name}! விழித்தெழுந்து உங்கள் நாளைத் தொடங்குங்கள்.`
        : language === 'ml'
        ? `സുപ്രഭാതം {name}! ഉണർന്ന് നിങ്ങളുടെ ദിവസം സന്തോഷത്തോടെ ആരംഭിക്കുക.`
        : `Good morning {name}! Time to wake up and start your energetic day.`
    },
    {
      id: 'walk',
      icon: Footprints,
      label: t?.morningWalkPreset || (language === 'ta' ? '🚶 நடைப்பயிற்சி' : language === 'ml' ? '🚶 പ്രഭാത നടത്തം' : '🚶 Morning Walk'),
      defaultTitle: language === 'ta' ? 'காலை / மாலை நடைப்பயிற்சி' : language === 'ml' ? 'പ്രഭാത / സായാഹ്ന നടത്തം' : 'Morning / Evening Walk',
      defaultTime: '07:30',
      defaultPrompt: language === 'ta'
        ? `வணக்கம் {name}! உங்கள் நடைப்பயிற்சி மற்றும் நல்வாழ்வுக்கான நேரம்.`
        : language === 'ml'
        ? `ഹലോ {name}! നിങ്ങളുടെ പ്രഭാത നടത്തത്തിനും വ്യായാമത്തിനുമുള്ള സമയമായി.`
        : `Hello {name}! Time for your refreshing morning walk and fresh air exercise.`
    },
    {
      id: 'breakfast',
      icon: Utensils,
      label: t?.breakfastPreset || (language === 'ta' ? '🍳 காலை உணவு' : language === 'ml' ? '🍳 പ്രഭാതഭക്ഷണം' : '🍳 Nutritious Breakfast'),
      defaultTitle: language === 'ta' ? 'சத்தான காலை உணவு' : language === 'ml' ? 'പോഷകസമൃദ്ധമായ പ്രഭാതഭക്ഷണം' : 'Nutritious Breakfast',
      defaultTime: '08:15',
      defaultPrompt: language === 'ta'
        ? `{name}, உங்கள் சத்தான காலை உணவை உட்கொள்ளும் நேரம்.`
        : language === 'ml'
        ? `{name}, നിങ്ങളുടെ ആരോഗ്യകരമായ പ്രഭാതഭക്ഷണം കഴിക്കാനുള്ള സമയമായി.`
        : `Time for your healthy morning breakfast meal, {name}.`
    },
    {
      id: 'medication',
      icon: Pill,
      label: t?.morningTabletPreset || (language === 'ta' ? '💊 மாத்திரை நேரம்' : language === 'ml' ? '💊 മരുന്ന് / ഗുളിക' : '💊 Prescribed Medication'),
      defaultTitle: language === 'ta' ? 'மருத்துவர் பரிந்துரைத்த மாத்திரைகள்' : language === 'ml' ? 'നിർദ്ദേശിച്ച മരുന്ന് / ഗുളികകൾ' : 'Prescribed Medication',
      defaultTime: '08:45',
      defaultPrompt: language === 'ta'
        ? `{name}, தயவுசெய்து உங்கள் மாத்திரைகளை தண்ணீருடன் எடுத்துக் கொள்ளுங்கள்.`
        : language === 'ml'
        ? `{name}, ദയവായി നിങ്ങളുടെ ഗുളികകൾ വെള്ളത്തോടൊപ്പം കഴിക്കുക.`
        : `Time to take your prescribed tablets with fresh water, {name}.`
    },
    {
      id: 'lunch',
      icon: Utensils,
      label: t?.lunchPreset || (language === 'ta' ? '🥗 மதிய உணவு' : language === 'ml' ? '🥗 ഉച്ചഭക്ഷണം' : '🥗 Nutritious Lunch'),
      defaultTitle: language === 'ta' ? 'மதிய உணவு' : language === 'ml' ? 'ഉച്ചഭക്ഷണം' : 'Nutritious Lunch',
      defaultTime: '13:00',
      defaultPrompt: language === 'ta'
        ? `{name}, உங்கள் மதிய உணவை உட்கொள்ளும் நேரம்.`
        : language === 'ml'
        ? `{name}, നിങ്ങളുടെ ഉച്ചഭക്ഷണം കഴിക്കാനുള്ള സമയമായി.`
        : `Time for your healthy lunch meal and water hydration, {name}.`
    },
    {
      id: 'sleep',
      icon: Moon,
      label: t?.bedtimePreset || (language === 'ta' ? '🌙 தூங்கும் நேரம்' : language === 'ml' ? '🌙 ഉറങ്ങുന്ന സമയം' : '🌙 Bedtime / Sleep'),
      defaultTitle: language === 'ta' ? 'இரவு உறங்கும் நேரம்' : language === 'ml' ? 'രാത്രി ഉറങ്ങുന്ന സമയം' : 'Bedtime & Good Night Sleep',
      defaultTime: '21:30',
      defaultPrompt: language === 'ta'
        ? `இரவு உறங்க வேண்டிய நேரம் {name}. நல்ல அமைதியான தூக்கம் பெறுக.`
        : language === 'ml'
        ? `രാത്രി വിശ്രമിക്കാനും ഉറങ്ങാനുമുള്ള സമയമായി {name}. ശുഭരാത്രി.`
        : `Time to rest and get a peaceful good night sleep, {name}. Good night!`
    }
  ];

  const handleSelectPreset = (preset) => {
    setCategory(preset.id);
    setTitle(preset.defaultTitle);
    setTime(preset.defaultTime);
    const formattedPrompt = preset.defaultPrompt.replace(/\{name\}/g, elderName);
    setVoicePrompt(formattedPrompt);
    audioService.playChime();
  };

  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
    const inferred = inferRoutineDetails(newTitle, category);
    setCategory(inferred.category);
  };

  const handleResetDefaultPrompt = () => {
    const inferred = inferRoutineDetails(title, category);
    const disp = currentDisplayTime || time;
    let def = `${elderName}, it is ${disp}. Time for your ${title || 'daily routine'}.`;
    if (language === 'ta') {
      def = `${elderName}, மணி ${disp}. உங்கள் ${title || 'தினசரி வழக்கம்'} செய்வதற்கான நேரம்.`;
    } else if (language === 'ml') {
      def = `${elderName}, സമയം ${disp}. നിങ്ങളുടെ ${title || 'ദിനചര്യ'} ചെയ്യാനുള്ള സമയമായി.`;
    }
    setVoicePrompt(def);
    audioService.playChime();
  };

  const handleTestVoice = () => {
    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = (voicePrompt || `${elderName}, it is ${currentDisplayTime}. Time for your ${title}.`)
      .replace(/\{name\}/g, elderName);

    setIsSpeaking(true);
    speechService.speak(textToSpeak);
    setTimeout(() => {
      setIsSpeaking(false);
    }, Math.max(3000, textToSpeak.length * 90));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title || !title.trim()) {
      setErrorMsg(language === 'ta' ? 'தயவுசெய்து தலைப்பை உள்ளிடவும்' : language === 'ml' ? 'ദയവായി ശീർഷകം നൽകുക' : 'Please enter a routine title');
      return;
    }
    if (!time) {
      setErrorMsg(language === 'ta' ? 'தயவுசெய்து நேரத்தைத் தேர்ந்தெடுக்கவும்' : language === 'ml' ? 'ദയവായി സമയം തിരഞ്ഞെടുക്കുക' : 'Please select a routine time');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const trimmedTitle = title.trim();
      const inferred = inferRoutineDetails(trimmedTitle, category);
      const displayTimeStr = currentDisplayTime;

      const updatedSchedule = {
        ...schedule,
        id: schedule.id || schedule.scheduleId,
        scheduleId: schedule.scheduleId || schedule.id,
        title: trimmedTitle,
        routineTitle: trimmedTitle,
        time: time,
        scheduledTime: time,
        displayTime: displayTimeStr,
        category: inferred.category,
        routineType: inferred.routineType,
        icon: inferred.icon,
        description: `${trimmedTitle} scheduled for ${displayTimeStr}`,
        voicePrompt: voicePrompt.trim() || `${elderName}, it is ${displayTimeStr}. Time for your ${trimmedTitle}.`,
        customVoicePrompt: voicePrompt.trim() || `${elderName}, it is ${displayTimeStr}. Time for your ${trimmedTitle}.`,
        scheduledBy: scheduledBy.trim() || currentUser?.name || 'Caregiver',
        completed: schedule.completed ?? false,
        completionStatus: schedule.completionStatus || (schedule.completed ? 'COMPLETED' : 'PENDING'),
        completedAt: schedule.completedAt || null,
        enabled: schedule.enabled !== undefined ? schedule.enabled : true
      };

      if (onSave) {
        await onSave(updatedSchedule);
      }

      audioService.playSuccessFanfare();
      onClose();
    } catch (err) {
      console.error('Error saving routine update:', err);
      setErrorMsg(err.message || 'Failed to update routine');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          speechService.stopSpeaking();
          onClose();
        }
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(47, 111, 237, 0.15)',
          padding: '2rem',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, var(--primary) 0%, #1E4AA8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px var(--primary-glow)',
                flexShrink: 0
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--text)', margin: 0, fontWeight: '800', lineHeight: 1.2 }}>
                {t?.editRoutineTitle || (language === 'ta' ? 'வழக்கம் & குரல் அலாரத்தைத் திருத்து' : language === 'ml' ? 'ദിനചര്യ & വോയ്‌സ് അലാറം എഡിറ്റ് ചെയ്യുക' : 'Edit Routine & Voice Alarm')}
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                {t?.editRoutineSubtitle || (language === 'ta' ? 'நேரம், வழக்கத்தின் பெயர் அல்லது கேர்பாட் குரல் நினைவூட்டலைப் புதுப்பிக்கவும்' : language === 'ml' ? 'സമയം, ദിനചര്യയുടെ പേര് അല്ലെങ്കിൽ കെയർബോട്ട് വോയ്സ് ഓർമ്മപ്പെടുത്തൽ അപ്ഡേറ്റ് ചെയ്യുക' : 'Update timing, routine name, or CareBot voice spoken reminder')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              speechService.stopSpeaking();
              onClose();
            }}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%', color: '#64748B', padding: '0.4rem' }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.5rem',
              color: '#991B1B',
              fontSize: '0.88rem',
              marginBottom: '1.25rem',
              fontWeight: '500'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Quick Presets */}
        <div style={{ marginBottom: '1.4rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            {t?.quickPresetsLabel || (language === 'ta' ? 'விரைவுத் தேர்வுகள் (Quick Presets)' : language === 'ml' ? 'ക്വിക്ക് പ്രീസെറ്റുകൾ' : 'Quick Routine Presets')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.45rem 0.8rem',
                  borderRadius: '2rem',
                  border: category === preset.id ? '2px solid var(--primary)' : '1px solid #E2E8F0',
                  background: category === preset.id ? 'rgba(47, 111, 237, 0.08)' : '#F8FAFC',
                  color: category === preset.id ? 'var(--primary)' : 'var(--text)',
                  fontWeight: category === preset.id ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Routine Title */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.4rem' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span>{t?.timingTitleLabel || (language === 'ta' ? 'அட்டவணை தலைப்பு' : language === 'ml' ? 'ഷെഡ്യൂൾ ശീർഷകം' : 'Routine Title')}</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Morning Wake Up, Prescribed Tablets, Evening Walk"
              className="input-field"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                fontSize: '1rem',
                borderRadius: '0.75rem',
                border: '1.5px solid #CBD5E1',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontWeight: '600'
              }}
              required
            />
          </div>

          {/* Timing Selector with Live Formatted Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.4rem' }}>
                <Clock size={16} color="var(--primary)" />
                <span>{t?.assignTimeLabel || (language === 'ta' ? 'நேரத்தை ஒதுக்கு' : language === 'ml' ? 'സമയം നിശ്ചയിക്കുക' : 'Assigned Routine Time')}</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  fontSize: '1.1rem',
                  borderRadius: '0.75rem',
                  border: '1.5px solid #CBD5E1',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  outline: 'none'
                }}
                required
              />
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, var(--secondary) 0%, #EBF3FF 100%)',
                padding: '0.8rem 1.2rem',
                borderRadius: '0.75rem',
                border: '1.5px solid rgba(47, 111, 237, 0.2)',
                textAlign: 'center',
                minWidth: '130px'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>
                Alarm Time
              </span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: '800' }}>
                {currentDisplayTime || '07:00 AM'}
              </strong>
            </div>
          </div>

          {/* Voice Prompt Spoken by CareBot */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700', color: 'var(--text)' }}>
                <Volume2 size={16} color="var(--primary)" />
                <span>{t?.voicePromptLabel || (language === 'ta' ? 'கேர்பாட் பேச வேண்டிய குரல் அறிவிப்பு' : language === 'ml' ? 'കെയർബോട്ട് സംസാരിക്കേണ്ട വോയ്സ് സന്ദേശം' : 'Voice Prompt Spoken by CareBot')}</span>
              </label>
              <button
                type="button"
                onClick={handleResetDefaultPrompt}
                className="btn btn-ghost"
                style={{ fontSize: '0.76rem', color: 'var(--primary)', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Reset to default prompt"
              >
                <RotateCcw size={12} />
                <span>{t?.resetDefaultPrompt || (language === 'ta' ? 'மீட்டமை' : language === 'ml' ? 'പുനഃസ്ഥാപിക്കുക' : 'Default Prompt')}</span>
              </button>
            </div>
            <textarea
              value={voicePrompt}
              onChange={(e) => setVoicePrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Good morning Ramasami! Time to wake up and start your energetic day."
              className="input-field"
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                fontSize: '0.94rem',
                borderRadius: '0.75rem',
                border: '1.5px solid #CBD5E1',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.45,
                fontFamily: 'inherit'
              }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={handleTestVoice}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.4rem 0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: '0.5rem',
                  color: isSpeaking ? 'var(--emergency)' : 'var(--primary)',
                  borderColor: isSpeaking ? 'var(--emergency)' : 'var(--primary)'
                }}
              >
                {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isSpeaking ? 'Stop Speaking' : (t?.testVoice || (language === 'ta' ? 'குரலைச் சோதி' : language === 'ml' ? 'വോയ്‌സ് പരിശോധിക്കുക' : 'Test Voice Prompt'))}</span>
              </button>
            </div>
          </div>

          {/* Scheduled By (Dynamic) */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.4rem' }}>
              <UserCheck size={16} color="var(--primary)" />
              <span>{t?.scheduledByLabel || (language === 'ta' ? 'திட்டமிட்டவர்' : language === 'ml' ? 'ഷെഡ്യൂൾ ചെയ്തത്' : 'Scheduled By / Assigned Caregiver')}</span>
            </label>
            <input
              type="text"
              value={scheduledBy}
              onChange={(e) => setScheduledBy(e.target.value)}
              placeholder="Self (Elder) or Family Caregiver name"
              className="input-field"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.92rem',
                borderRadius: '0.75rem',
                border: '1.5px solid #CBD5E1',
                outline: 'none'
              }}
            />
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.8rem',
              marginTop: '0.8rem',
              paddingTop: '1.2rem',
              borderTop: '1px solid #E2E8F0'
            }}
          >
            <button
              type="button"
              onClick={() => {
                speechService.stopSpeaking();
                onClose();
              }}
              className="btn btn-ghost"
              style={{ padding: '0.75rem 1.4rem', fontSize: '0.95rem', fontWeight: '600' }}
              disabled={saving}
            >
              {t?.cancel || (language === 'ta' ? 'ரத்துசெய்' : language === 'ml' ? 'റദ്ദാക്കുക' : 'Cancel')}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.6rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px var(--primary-glow)'
              }}
              disabled={saving}
            >
              <CheckCircle2 size={18} />
              <span>{saving ? 'Saving...' : (t?.saveChanges || (language === 'ta' ? 'மாற்றங்களைச் சேமி' : language === 'ml' ? 'മാറ്റങ്ങൾ സംരക്ഷിക്കുക' : 'Save Changes'))}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
