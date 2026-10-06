import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { speechService } from '../services/speechService';
import { audioService } from '../services/audioService';
import { apiService } from '../services/apiService';
import { geminiService } from '../services/geminiService';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  Calendar,
  Loader2
} from 'lucide-react';

export default function AIChatDrawer({ isOpen, onClose }) {
  const { schedules, appointments, currentUser, language, t } = useApp();
  const elderName = currentUser?.name || (language === 'ta' ? 'அன்பரே' : language === 'ml' ? 'പ്രിയ സുഹൃത്തേ' : 'Friend');
  const elderAge = currentUser?.age || currentUser?.medicalProfile?.age || '76';
  const medicalHistory = currentUser?.medicalHistory || currentUser?.medicalProfile?.medicalHistory || 'Hypertension, Mild Arthritis';
  const bloodGroup = currentUser?.bloodGroup || currentUser?.medicalProfile?.bloodGroup || 'B+';

  const getInitialGreeting = () => {
    if (language === 'ta') {
      return `வணக்கம் ${elderName}! நான் உங்கள் கேர்பாட் AI துணை. நீங்கள் இப்போது எப்படி உணர்கிறீர்கள்? உங்கள் மாத்திரை நேரங்கள், மருத்துவர் சந்திப்பு அல்லது அன்றாட விவரங்களை என்னிடம் பேசலாம்.`;
    }
    if (language === 'ml') {
      return `നമസ്കാരം ${elderName}! ഞാൻ നിങ്ങളുടെ കെയർബോട്ട് AI സഹായിയാണ്. ഇപ്പോൾ സുഖമായിരിക്കുന്നുവോ? നിങ്ങളുടെ മരുന്ന് സമയം, ദിനചര്യകൾ എന്നിവയെക്കുറിച്ച് എന്നോട് സംസാരിക്കാം.`;
    }
    return `Hello ${elderName}! I'm your ElderGuard AI Companion. How are you feeling right now? I can help you check your tablet timings, tell you about your daily routines, or have a cheerful conversation.`;
  };

  const [messages, setMessages] = useState([
    {
      id: 'm-init',
      sender: 'ai',
      text: getInitialGreeting(),
      time: 'Just now'
    }
  ]);

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Re-sync initial message if elderName or language changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'm-init') {
        return [{ id: 'm-init', sender: 'ai', text: getInitialGreeting(), time: 'Just now' }];
      }
      return prev;
    });
  }, [elderName, language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const handleVoiceToggle = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      if (isSpeaking) {
        speechService.stopSpeaking();
        setIsSpeaking(false);
      }
      audioService.playVoicePing();
      setIsListening(true);
      speechService.startListening({
        onResult: (transcript) => {
          setInput(transcript);
          setIsListening(false);
          handleSend(transcript);
        },
        onPartial: (partial) => {
          setInput(partial);
        },
        onError: (err) => {
          console.warn('Voice recognition:', err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
    }
  };

  const handleSend = async (textToSend = null) => {
    const finalQuery = typeof textToSend === 'string' ? textToSend : input;
    if (!finalQuery.trim() || isLoading) return;

    const userMsg = {
      id: `m-${Date.now()}`,
      sender: 'user',
      text: finalQuery.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let aiReply = "";

    // 1. Try Google Gemini Multilingual AI with User's API Key
    try {
      if (geminiService.hasApiKey()) {
        const geminiRes = await geminiService.chatWithCareBot({
          message: finalQuery.trim(),
          language,
          elderName,
          elderAge,
          medicalHistory,
          schedules,
          appointments
        });
        if (geminiRes) {
          aiReply = geminiRes;
        }
      }
    } catch (gErr) {
      console.warn('[AIChatDrawer] Gemini API notice:', gErr.message);
    }

    // 2. Try SNS Agent Workbench Webhook
    if (!aiReply) {
      try {
        const res = await apiService.sendVoiceInputToSNS({
          type: "Emergency/Event",
          eventType: "VOICE_INPUT",
          userVoiceTranscript: finalQuery.trim(),
          language,
          preferredLanguage: language === 'ta' ? 'Tamil' : language === 'ml' ? 'Malayalam' : 'English',
          elderId: currentUser?.userId || 'usr-elder-1',
          elderName,
          elderAge,
          medicalHistory,
          bloodGroup,
          schedulesSummary: schedules.map(s => `${s.title} at ${s.displayTime || s.time}`).join(', '),
          appointmentsSummary: appointments.map(a => `${a.purpose} on ${a.appointmentDate} at ${a.appointmentTime}`).join(', ')
        });

        if (res) {
          aiReply = res.voiceResponse || res.response || res.reply || res.message || res.text || (typeof res === 'string' ? res : "");
        }
      } catch (err) {
        console.warn('[AIChatDrawer] SNS Webhook chat notice:', err.message);
      }
    }

    if (!aiReply) {
      const text = finalQuery.toLowerCase();
      if (text.includes('appointment') || text.includes('doctor') || text.includes('சந்திப்பு') || text.includes('അപ്പോയിന്റ്മെന്റ്')) {
        const nextApt = appointments && appointments.length > 0 ? appointments[0] : null;
        aiReply = nextApt
          ? (language === 'ta' ? `உங்கள் அடுத்த மருத்துவர் சந்திப்பு (${nextApt.purpose}) ${nextApt.appointmentDate} அன்று ${nextApt.appointmentTime} மணிக்கு உள்ளது.` : language === 'ml' ? `നിങ്ങളുടെ അടുത്ത ഡോക്ടർ അപ്പോയിന്റ്മെന്റ് (${nextApt.purpose}) ${nextApt.appointmentDate} ന് ${nextApt.appointmentTime} നാണ്.` : `Your next medical appointment for ${nextApt.purpose} is on ${nextApt.appointmentDate} at ${nextApt.appointmentTime} at ${nextApt.location || 'the clinic'}.`)
          : (language === 'ta' ? `தற்போது புதிய மருத்துவ சந்திப்புகள் எதுவும் திட்டமிடப்படவில்லை.` : language === 'ml' ? `നിലവിൽ അപ്പോയിന്റ്മെന്റുകളൊന്നും ഷെഡ്യൂൾ ചെയ്തിട്ടില്ല.` : `You have no upcoming medical appointments scheduled right now.`);
      } else if (text.includes('tablet') || text.includes('medicine') || text.includes('மாத்திரை') || text.includes('மருந்து') || text.includes('ഗുളിക') || text.includes('മരുന്ന്')) {
        const nextMed = schedules.find(s => s.category === 'medication' && !s.completed);
        aiReply = nextMed
          ? (language === 'ta' ? `உங்கள் அடுத்த மாத்திரை நேரம்: ${nextMed.displayTime || nextMed.time}.` : language === 'ml' ? `നിങ്ങളുടെ അടുത്ത മരുന്ന് സമയം: ${nextMed.displayTime || nextMed.time}.` : `Your next tablet timing is set for ${nextMed.displayTime || nextMed.time}.`)
          : (language === 'ta' ? `${elderName}, தற்போது நிலுவையில் உள்ள மாத்திரைகள் எதுவும் இல்லை!` : language === 'ml' ? `${elderName}, ഇപ്പോൾ കഴിക്കേണ്ട മരുന്നുകളൊന്നുമില്ല!` : `${elderName}, you have no pending tablet timings for right now!`);
      } else if (text.includes('bed') || text.includes('sleep') || text.includes('தூக்கம்') || text.includes('உறக்கம்')) {
        const nextSleep = schedules.find(s => (s.category === 'sleep' || s.title.toLowerCase().includes('bed')) && !s.completed);
        aiReply = nextSleep
          ? (language === 'ta' ? `உங்கள் தூங்கும் நேரம் ${nextSleep.displayTime || nextSleep.time} மணிக்கு திட்டமிடப்பட்டுள்ளது.` : language === 'ml' ? `നിങ്ങളുടെ ഉറങ്ങുന്ന സമയം ${nextSleep.displayTime || nextSleep.time} നാണ്.` : `Your bedtime is scheduled for ${nextSleep.displayTime || nextSleep.time}. Get good rest!`)
          : (language === 'ta' ? `இரவு நல்ல தூக்கம் பெறுங்கள்!` : language === 'ml' ? `നല്ല ഉറക്കം ലഭിക്കട്ടെ!` : `Rest well and sleep comfortably!`);
      } else {
        aiReply = language === 'ta'
          ? `வணக்கம் ${elderName}, உங்கள் குரல் கிடைத்தது: "${finalQuery}". நான் உங்களுக்கு உதவ எப்போதும் தயாராக உள்ளேன்.`
          : language === 'ml'
          ? `നമസ്കാരം ${elderName}, സന്ദേശം ലഭിച്ചു: "${finalQuery}". ഞാൻ എപ്പോഴും നിങ്ങളുടെ കൂടെയുണ്ട്.`
          : `Hello ${elderName}, I received your message: "${finalQuery}". I am right here with you to assist you with all daily needs.`;
      }
    }

    const aiMsg = {
      id: `m-${Date.now() + 1}`,
      sender: 'ai',
      text: aiReply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
    audioService.playChime();

    if (autoSpeak) {
      setIsSpeaking(true);
      speechService.speak(aiReply, {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  const quickPrompts = language === 'ta' ? [
    { label: '💊 அடுத்த மாத்திரை நேரம்?', text: 'எனது அடுத்த மாத்திரை நேரம் எப்போது?' },
    { label: '📅 மருத்துவ சந்திப்பு விவரம்?', text: 'எனது அடுத்த மருத்துவ சந்திப்பு எப்போது?' },
    { label: '📅 இன்றைய அட்டவணை என்ன?', text: 'இன்றைய எனது தினசரி அட்டவணை என்னென்ன?' },
    { label: '❤️ என்னோடு பேசுங்கள்', text: 'வணக்கம் கேர்பாட், எனக்கு பிடித்த சுவாரஸ்யமான கதையை கூறுங்கள்.' }
  ] : language === 'ml' ? [
    { label: '💊 അടുത്ത മരുന്ന് സമയം?', text: 'എന്റെ അടുത്ത ഗുളിക സമയം എപ്പോഴാണ്?' },
    { label: '📅 അപ്പോയിന്റ്മെന്റ് എപ്പോഴാണ്?', text: 'എന്റെ അടുത്ത മെഡിക്കൽ അപ്പോയിന്റ്മെന്റ് എപ്പോഴാണ്?' },
    { label: '📅 ഇന്നത്തെ ദിനചര്യകൾ?', text: 'ഇന്നത്തെ എന്റെ ദിനചര്യകൾ എന്തൊക്കെയാണ്?' },
    { label: '❤️ എന്നോട് സംസാരിക്കാമോ?', text: 'നമസ്കാരം, എന്നോട് ഒരു ചെറിയ കഥ പറയാമോ?' }
  ] : [
    { label: '💊 Next tablet timing?', text: "What is my next tablet timing scheduled for?" },
    { label: '📅 Next appointment timing?', text: "When is my next medical appointment scheduled for?" },
    { label: '📅 What is my schedule today?', text: "What is my upcoming schedule and timings?" },
    { label: '❤️ Let us talk', text: "Tell me a cheerful uplifting thought for today." }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '480px',
      background: '#ffffff',
      boxShadow: '-8px 0 32px rgba(23, 32, 51, 0.15)',
      zIndex: 1050,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      borderLeft: '1px solid var(--border)'
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '1.2rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg, var(--secondary) 0%, #ffffff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px var(--primary-glow)'
          }} className={isSpeaking ? 'animate-orb' : ''}>
            <Bot size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {t.voiceAssistantTitle || 'CareBot Voice AI'}
              <span className="badge badge-safe" style={{ fontSize: '0.65rem' }}>SNS AI</span>
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {t.connectedCaregiver || 'Companion for'} <strong>{elderName}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => {
              if (isSpeaking) speechService.stopSpeaking();
              setAutoSpeak(!autoSpeak);
            }}
            className="btn btn-secondary btn-icon"
            title={autoSpeak ? 'Voice Speech ON' : 'Voice Speech OFF'}
            style={{ width: '36px', height: '36px' }}
          >
            {autoSpeak ? <Volume2 size={17} color="var(--primary)" /> : <VolumeX size={17} color="var(--text-muted)" />}
          </button>

          <button
            onClick={() => {
              speechService.stopSpeaking();
              speechService.stopListening();
              onClose();
            }}
            className="btn btn-ghost btn-icon"
            style={{ width: '36px', height: '36px' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Speaking Indicator Banner */}
      {isSpeaking && (
        <div style={{
          background: 'var(--primary-light)',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: 'var(--primary)',
          borderBottom: '1px solid rgba(47, 111, 237, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="audio-bars">
              <span className="audio-bar" />
              <span className="audio-bar" />
              <span className="audio-bar" />
              <span className="audio-bar" />
              <span className="audio-bar" />
            </div>
            <span style={{ fontWeight: '600' }}>
              {language === 'ta' ? 'கேர்பாட் பேசுகிறது...' : language === 'ml' ? 'കെയർബോട്ട് സംസാരിക്കുന്നു...' : 'CareBot is speaking aloud...'}
            </span>
          </div>
          <button
            onClick={() => {
              speechService.stopSpeaking();
              setIsSpeaking(false);
            }}
            style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'underline', fontWeight: '600' }}
          >
            {language === 'ta' ? 'நிறுத்து' : language === 'ml' ? 'നിർത്തുക' : 'Stop'}
          </button>
        </div>
      )}

      {/* Messages List */}
      <div style={{
        flex: 1,
        padding: '1.2rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: '#FAFBFD'
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '85%',
              padding: '0.9rem 1.1rem',
              borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.sender === 'user' ? 'var(--primary)' : '#ffffff',
              color: msg.sender === 'user' ? '#ffffff' : 'var(--text)',
              boxShadow: msg.sender === 'user' ? '0 4px 14px var(--primary-glow)' : '0 2px 8px rgba(23, 32, 51, 0.05)',
              border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              {msg.text}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.3rem', padding: '0 0.4rem' }}>
              {msg.sender === 'user' ? (language === 'ta' ? 'நீங்கள்' : language === 'ml' ? 'നിങ്ങൾ' : 'You') : 'CareBot AI'} • {msg.time}
            </span>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.8rem 1rem', background: '#ffffff', borderRadius: '18px', width: 'fit-content', border: '1px solid var(--border)' }}>
            <Loader2 size={18} className="animate-spin" color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {language === 'ta' ? 'கேர்பாட் சிந்திக்கிறது...' : language === 'ml' ? 'കെയർബോട്ട് ചിന്തിക്കുന്നു...' : 'CareBot is thinking...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div style={{
        padding: '0.6rem 1rem',
        background: '#ffffff',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.text)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--secondary)',
              color: 'var(--primary)',
              fontSize: '0.78rem',
              fontWeight: '600',
              border: '1px solid rgba(47, 111, 237, 0.2)',
              flexShrink: 0
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border)',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem'
      }}>
        <button
          onClick={handleVoiceToggle}
          className={`btn ${isListening ? 'btn-emergency pulse-emergency' : 'btn-secondary'} btn-icon`}
          title={isListening ? 'Listening to your voice... (Click to Stop)' : 'Speak with Microphone'}
          style={{ width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0 }}
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} color="var(--primary)" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening 
            ? (language === 'ta' ? 'குரலில் பேசுங்கள்...' : language === 'ml' ? 'സംസാരിക്കൂ...' : 'Listening to your voice...') 
            : (language === 'ta' ? `${elderName}-ன் கேர்பாட்டிடம் பேசவும்...` : language === 'ml' ? `${elderName}-ന്റെ കെയർബോട്ടിനോട് സംസാരിക്കൂ...` : `Type or speak to ${elderName}'s CareBot...`)}
          style={{
            flex: 1,
            padding: '0.75rem 1.1rem',
            borderRadius: 'var(--radius-full)',
            border: isListening ? '2px solid var(--emergency)' : '1px solid var(--border)',
            outline: 'none',
            fontSize: '0.95rem',
            background: '#F8FAFC'
          }}
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="btn btn-primary btn-icon"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            opacity: input.trim() && !isLoading ? 1 : 0.5,
            flexShrink: 0
          }}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
