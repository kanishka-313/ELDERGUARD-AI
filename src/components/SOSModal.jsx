import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import { ShieldAlert, PhoneCall, PhoneOff, XCircle, CheckCircle2, MapPin, Radio, Users, Volume2, Mic, Activity } from 'lucide-react';

export default function SOSModal({ isOpen, onClose }) {
  const { triggerSOS, currentUser, language, t } = useApp();
  const [countdown, setCountdown] = useState(5);
  const [dispatched, setDispatched] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [callConnected, setCallConnected] = useState(false);
  const callTimerRef = useRef(null);

  useEffect(() => {
    let timer = null;
    if (isOpen && !dispatched) {
      setCountdown(5);
      setCallDuration(0);
      setCallConnected(false);
      audioService.playWarningBeep();

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            startEmergencyCall();
            return 0;
          }
          audioService.playWarningBeep();
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      audioService.stopPhoneRingLoop();
    };
  }, [isOpen]);

  const startEmergencyCall = () => {
    setDispatched(true);
    triggerSOS('Elder Emergency SOS & Call Trigger');
    
    // Play telephone ring loop
    audioService.startPhoneRingLoop(3200);

    const familyName = currentUser?.connectedFamilyName || (language === 'ta' ? 'குடும்ப உறுப்பினர்' : language === 'ml' ? 'കുടുംബാംഗം' : 'Family Member');
    speechService.speak(language === 'ta' ? `அவசர எச்சரிக்கை ${familyName} க்கு அனுப்பப்பட்டது. அவசர அழைப்பு இணைக்கப்படுகிறது.` : language === 'ml' ? `അടിയന്തര മുന്നറിയിപ്പ് ${familyName} ലേക്ക് അയച്ചു. അടിയന്തര കോൾ ബന്ധിപ്പിക്കുന്നു.` : `Emergency alert dispatched to your family member ${familyName}. Placing emergency call now.`);

    // Simulate connection after 4 seconds of ringing
    setTimeout(() => {
      audioService.stopPhoneRingLoop();
      setCallConnected(true);
      audioService.playVoicePing();
      
      callTimerRef.current = setInterval(() => {
        setCallDuration(c => c + 1);
      }, 1000);
    }, 4000);
  };

  const handleImmediateDispatch = () => {
    setCountdown(0);
    startEmergencyCall();
  };

  const handleEndCall = () => {
    audioService.stopPhoneRingLoop();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    speechService.stopSpeaking();
    setDispatched(false);
    setCallConnected(false);
    setCountdown(5);
    onClose();
  };

  if (!isOpen) return null;

  const familyName = currentUser?.connectedFamilyName || (language === 'ta' ? 'குடும்ப உறுப்பினர்' : language === 'ml' ? 'കുടുംബാംഗം' : 'Family Member');
  const familyPhone = currentUser?.connectedFamilyPhone || '+91 98765 43210';
  const elderName = currentUser?.name || (language === 'ta' ? 'முதியவர்' : language === 'ml' ? 'മുതിർന്ന വ്യക്തി' : 'Elder');

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }}>
      <div className="modal-content" style={{
        maxWidth: '560px',
        textAlign: 'center',
        padding: '2.4rem',
        border: '3.5px solid var(--emergency)',
        boxShadow: 'var(--shadow-emergency)',
        borderRadius: 'var(--radius-xl)'
      }}>
        {!dispatched ? (
          <>
            <div style={{
              width: '92px',
              height: '92px',
              margin: '0 auto 1.4rem',
              borderRadius: '50%',
              background: 'var(--emergency)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.8rem',
              fontWeight: '900',
              boxShadow: '0 0 40px var(--emergency-glow)'
            }} className="pulse-emergency">
              {countdown}
            </div>

            <h2 style={{ color: 'var(--emergency)', fontSize: '1.9rem', marginBottom: '0.4rem' }}>
              {t?.sosTitle || 'EMERGENCY SOS TO FAMILY'}
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text)', marginBottom: '1.2rem', lineHeight: 1.4 }}>
              {(t?.countdownSubtitle || 'Transmitting priority emergency alert & connecting direct call to {name} in {sec} seconds.')
                .replace(/\{name\}/g, familyName)
                .replace(/\{sec\}/g, countdown)}
            </p>

            <div style={{
              background: 'var(--emergency-light)',
              padding: '1.1rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              color: 'var(--emergency)',
              fontWeight: '700',
              fontSize: '0.95rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Users size={18} />
                <span>{t?.familyCaregiverLabel || 'Family Caregiver'}: {familyName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <PhoneCall size={18} />
                <span>{t?.emergencyLineLabel || 'Emergency Line'}: {familyPhone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <MapPin size={18} />
                <span>{t?.gpsLocationLabel || 'Location: Living Suite 204 (GPS Live Tracking)'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <button
                onClick={handleEndCall}
                className="btn btn-secondary btn-xl"
                style={{
                  background: '#F1F5F9',
                  color: 'var(--text)',
                  border: '2px solid var(--border)',
                  width: '100%',
                  fontSize: '1.15rem'
                }}
              >
                <XCircle size={24} />
                <span>{t?.cancelAlert || "I'M OKAY (CANCEL ALERT)"}</span>
              </button>

              <button
                onClick={handleImmediateDispatch}
                className="btn btn-emergency btn-xl"
                style={{ width: '100%', fontSize: '1.2rem' }}
              >
                <Radio size={22} />
                <span>{t?.sendSosNow || 'SEND SOS & CALL FAMILY NOW'}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ACTIVE OUTGOING EMERGENCY CALL SCREEN */}
            <div style={{
              width: '90px',
              height: '90px',
              margin: '0 auto 1.2rem',
              borderRadius: '50%',
              background: callConnected ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'var(--emergency)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: callConnected ? '0 0 35px rgba(16, 185, 129, 0.5)' : '0 0 35px var(--emergency-glow)',
              transition: 'all 0.3s ease'
            }} className={callConnected ? 'animate-orb' : 'pulse-emergency'}>
              <PhoneCall size={44} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: callConnected ? 'var(--safe-light)' : 'var(--emergency-light)', color: callConnected ? 'var(--safe)' : 'var(--emergency)', padding: '0.35rem 0.95rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.6rem' }}>
              <Activity size={15} /> {callConnected 
                ? (t?.callConnectedStatus || 'CALL CONNECTED • {time}').replace(/\{time\}/g, formatDuration(callDuration))
                : (t?.dialingFamilyStatus || 'DIALING & RINGING FAMILY LINE...')}
            </div>

            <h2 style={{ color: 'var(--text)', fontSize: '1.75rem', marginBottom: '0.3rem' }}>
              {familyName}
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--primary)', fontWeight: '700', marginBottom: '1.2rem' }}>
              📞 {familyPhone}
            </p>

            {/* Live Call Information Box */}
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, var(--secondary) 100%)',
              border: `2px solid ${callConnected ? 'var(--safe)' : 'var(--emergency)'}`,
              padding: '1.2rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {t?.emergencyDispatchStatus || 'EMERGENCY DISPATCH STATUS:'}
                </span>
                <span className={`badge ${callConnected ? 'badge-safe' : 'badge-emergency'}`} style={{ fontSize: '0.75rem' }}>
                  {callConnected ? (t?.intercomActiveBadge || 'Intercom Active') : (t?.alertDeliveredBadge || 'Alert Delivered')}
                </span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', margin: '0 0 0.6rem', lineHeight: 1.4 }}>
                {callConnected
                  ? (t?.intercomConnectedMsg || '✓ Audio intercom connected with {name}. Speak clearly into your microphone.').replace(/\{name\}/g, familyName)
                  : (t?.alertDeliveredMsg || '🚨 Priority emergency SOS alert broadcasted to {name}\'s dashboard with GPS location.').replace(/\{name\}/g, familyName)}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>🎙️ {language === 'ta' ? 'மைக்' : language === 'ml' ? 'മൈക്ക്' : 'Mic'}: <strong>{isMuted ? (t?.micMutedText || 'Muted') : (t?.micActiveText || 'Live & Active')}</strong></span>
                <span>🔊 {language === 'ta' ? 'ஸ்பீக்கர்' : language === 'ml' ? 'സ്പീക്കർ' : 'Speaker'}: <strong>{t?.speakerMaxText || 'Maximum'}</strong></span>
              </div>
            </div>

            {/* Direct Phone Dial Link Button (Triggers native phone app / direct dial) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <a
                href={`tel:${familyPhone.replace(/[^0-9+]/g, '')}`}
                className="btn btn-safe btn-xl"
                style={{
                  width: '100%',
                  fontSize: '1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  textDecoration: 'none'
                }}
              >
                <PhoneCall size={22} />
                <span>{(t?.directDialPhoneBtn || 'DIRECT DIAL PHONE CALL ({phone})').replace(/\{phone\}/g, familyPhone)}</span>
              </a>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`btn ${isMuted ? 'btn-warning' : 'btn-secondary'}`}
                  style={{ padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Mic size={18} />
                  <span>{isMuted ? (t?.unmuteMicBtn || 'Unmute Mic') : (t?.muteMicBtn || 'Mute Mic')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="btn btn-emergency btn-lg"
                  style={{ padding: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <PhoneOff size={18} />
                  <span>{t?.endCallBtn || 'END EMERGENCY CALL'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

