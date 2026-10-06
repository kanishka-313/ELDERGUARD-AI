import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { audioService } from '../services/audioService';
import { backgroundAlarmService } from '../services/backgroundAlarmService';
import ProfileModal from './ProfileModal';
import { 
  HeartHandshake, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  LogOut, 
  User, 
  Users, 
  Sparkles, 
  UserCog,
  Bell
} from 'lucide-react';

export default function Navbar({ onOpenChat, onOpenSOS }) {
  const { 
    currentUser, 
    logout, 
    isMuted, 
    toggleMute,
    language,
    setLanguage,
    LANGUAGES,
    t
  } = useApp();

  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleSwitchLanguage = (code) => {
    setLanguage(code);
    audioService.playVoicePing();
  };

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(23, 32, 51, 0.04)'
    }}>
      {/* Profile Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, #1748B0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px var(--primary-glow)'
          }}>
            <HeartHandshake size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: '800',
                color: 'var(--text)',
                letterSpacing: '-0.02em'
              }}>
                Elder<span style={{ color: 'var(--primary)' }}>Guard</span> AI
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                <Sparkles size={11} /> {t?.connectedHealth || 'Connected Health'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {currentUser ? (
                currentUser.role === 'elder' ? (t?.elderCompanionSubtitle || 'Elder Companion Interface') : (t?.familyPortalHeader || 'Family Member Portal')
              ) : (
                'Senior Health & Caregiver Hub'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Multilingual Selector (English, Tamil, Malayalam) */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)'
          }}>
            {LANGUAGES.map(l => {
              const active = language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => handleSwitchLanguage(l.code)}
                  title={`Switch language to ${l.label}`}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    border: 'none',
                    background: active ? 'var(--primary)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--text)',
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 8px var(--primary-glow)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{l.flag} {l.nativeName}</span>
                </button>
              );
            })}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="btn btn-secondary btn-icon"
            title={isMuted ? 'Unmute Sound Alerts' : 'Mute Sounds'}
            style={{ width: '38px', height: '38px' }}
          >
            {isMuted ? <VolumeX size={18} color="var(--text-muted)" /> : <Volume2 size={18} color="var(--primary)" />}
          </button>

          {/* Desktop Background Alarm Status & Toggle */}
          {currentUser && (
            <button
              onClick={async () => {
                const granted = await backgroundAlarmService.initNotificationPermission();
                if (granted) {
                  audioService.playChime();
                  backgroundAlarmService.showDesktopNotification({
                    title: '🔔 Desktop Background Alarms Active',
                    body: 'Voice alarms & routine reminders will alert you on your desktop even when minimized or outside this app!'
                  });
                }
              }}
              className="btn btn-secondary"
              title="Desktop Background Reminders: Alarms ring on desktop even when outside this app"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#EFF6FF',
                color: 'var(--primary)',
                borderColor: 'rgba(47, 111, 237, 0.3)',
                fontWeight: '700'
              }}
            >
              <Bell size={15} />
              <span>
                {language === 'ta' ? 'பின்னணி அலாரம்' : language === 'ml' ? 'പശ്ചാത്തല അലാറം' : 'Desktop Alarms'}
              </span>
            </button>
          )}

          {/* Quick SOS Trigger Button (Elder Only) */}
          {currentUser && currentUser?.role?.toLowerCase() === 'elder' && (
            <button
              onClick={onOpenSOS}
              className="btn btn-emergency pulse-emergency"
              style={{
                padding: '0.55rem 1.1rem',
                fontWeight: '700',
                letterSpacing: '0.02em',
                fontSize: '0.88rem'
              }}
            >
              <ShieldAlert size={18} />
              <span>{t?.sosTitle || 'SOS EMERGENCY'}</span>
            </button>
          )}

          {/* User Profile / Edit Profile Pill / Logout */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.25rem' }}>
              <button
                onClick={() => setShowProfileModal(true)}
                title="Click to Edit Profile and Emergency Contacts"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--secondary)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(47, 111, 237, 0.25)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{currentUser.avatar || (currentUser.role === 'elder' ? '👴' : '👩‍⚕️')}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary)', lineHeight: 1.1 }}>
                    {currentUser.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {currentUser.role === 'elder' ? (t?.elderRoleEdit || 'Elder (Edit)') : (t?.familyRoleEdit || 'Family (Edit)')}
                  </span>
                </div>
              </button>

              <button
                onClick={logout}
                className="btn btn-ghost btn-icon"
                title={t?.signOut || 'Sign Out'}
                style={{ width: '36px', height: '36px', color: 'var(--emergency)' }}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

