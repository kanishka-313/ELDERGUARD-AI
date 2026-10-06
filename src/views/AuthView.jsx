
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import { apiService } from '../services/apiService';
import { 
  HeartHandshake, 
  User, 
  Users, 
  KeyRound, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  X, 
  AlertCircle, 
  Link, 
  Wand2, 
  RefreshCw, 
  Globe,
  UserPlus,
  LogIn
} from 'lucide-react';

export default function AuthView() {
  const { login, language, setLanguage, t, LANGUAGES } = useApp();
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'register'
  const [activeTab, setActiveTab] = useState('elder'); // 'elder' | 'family'
  const [loading, setLoading] = useState(false);
  
  // Elder Sign In State
  const [elderName, setElderName] = useState('');
  const [elderPin, setElderPin] = useState('');
  const [elderPhone, setElderPhone] = useState('');
  const [elderError, setElderError] = useState('');

  // Elder Register State
  const [regElderName, setRegElderName] = useState('');
  const [regElderPin, setRegElderPin] = useState('');
  const [regElderPhone, setRegElderPhone] = useState('');
  const [regConnectedFamilyPhone, setRegConnectedFamilyPhone] = useState('');
  const [regElderError, setRegElderError] = useState('');

  // Family Sign In State
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [familyPassword, setFamilyPassword] = useState('');
  const [connectedElderPhone, setConnectedElderPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [familyError, setFamilyError] = useState('');

  // Family Register State
  const [regFamilyName, setRegFamilyName] = useState('');
  const [regFamilyEmail, setRegFamilyEmail] = useState('');
  const [regFamilyPassword, setRegFamilyPassword] = useState('');
  const [regFamilyPhone, setRegFamilyPhone] = useState('');
  const [regConnectedElderPhone, setRegConnectedElderPhone] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regFamilyError, setRegFamilyError] = useState('');

  // Modal States
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotContact, setForgotContact] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Helper to clean and sanitize human name (never include numbers or phone numbers)
  const cleanElderName = (name = '') => {
    if (!name) return '';
    const cleaned = String(name)
      .replace(/\+?91/gi, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/[0-9+()[\]:;,_.\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || String(name).replace(/\d+/g, '').trim() || 'Elder';
  };

  // Helper to enforce +91 Indian Phone format without deleting valid digits (e.g. numbers starting with 9)
  const formatPhoneWith91 = (val) => {
    if (!val || val.trim() === '') return '';
    
    let str = val.trim();
    
    // 1. If string explicitly starts with '+91' or '+ 91' or '+'
    if (str.startsWith('+91') || str.startsWith('+ 91')) {
      str = str.replace(/^\+\s*91\s*/, '');
    } else if (str.startsWith('+')) {
      str = str.slice(1).trim();
    }
    
    // 2. Extract digits only from remainder
    let digits = str.replace(/\D/g, '');
    
    // 3. If raw pasted value had 12 digits starting with '91' (e.g. 919876543210)
    if (digits.length > 10 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    
    // 4. Cap at 10 Indian mobile digits
    digits = digits.slice(0, 10);
    
    if (digits.length === 0) return '';
    if (digits.length > 5) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return `+91 ${digits}`;
  };

  // Handle Existing Elder Sign In
  const handleElderLogin = async (e) => {
    if (e) e.preventDefault();
    const sanitizedName = cleanElderName(elderName);
    if (!sanitizedName.trim()) {
      setElderError('Please enter your Name');
      return;
    }
    if (!elderPin.trim()) {
      setElderError('Please enter your Password / PIN Number');
      return;
    }

    setLoading(true);
    setElderError('');

    try {
      const res = await apiService.loginElder(sanitizedName.trim(), elderPin.trim(), elderPhone.trim());
      const userData = res?.data || res?.user;
      if (userData) {
        audioService.playSuccessFanfare();
        login({
          ...userData,
          name: cleanElderName(userData.name || sanitizedName),
          role: 'elder',
          avatar: userData.avatar || '👴'
        });
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      setElderError(err.message || 'Account not found or invalid PIN. Please check your credentials or click "Register New Account".');
    } finally {
      setLoading(false);
    }
  };

  // Handle New Elder Registration
  const handleElderRegister = async (e) => {
    if (e) e.preventDefault();
    const sanitizedName = cleanElderName(regElderName);
    if (!sanitizedName.trim()) {
      setRegElderError('Please enter your full name');
      return;
    }
    if (!regElderPin.trim() || regElderPin.trim().length < 4) {
      setRegElderError('Please enter a 4-digit PIN / password');
      return;
    }
    if (!regElderPhone.trim()) {
      setRegElderError('Please enter your phone number (+91)');
      return;
    }

    setLoading(true);
    setRegElderError('');

    try {
      const res = await apiService.signup({
        name: sanitizedName.trim(),
        pin: regElderPin.trim(),
        password: regElderPin.trim(),
        phone: regElderPhone.trim(),
        connectedFamilyPhone: regConnectedFamilyPhone.trim(),
        role: 'ELDER',
        isProfileComplete: false
      });

      const userData = res?.data || res?.user;
      if (userData) {
        audioService.playSuccessFanfare();
        login({
          ...userData,
          name: cleanElderName(userData.name || sanitizedName),
          role: 'elder',
          isProfileComplete: false,
          avatar: userData.avatar || '👴'
        });
      } else {
        throw new Error('Registration failed');
      }
    } catch (err) {
      setRegElderError(err.message || 'Registration failed. Please check your phone number and details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Family Sign In
  const handleFamilyLogin = async (e) => {
    if (e) e.preventDefault();
    if (!familyEmail.trim()) {
      setFamilyError('Please enter your email');
      return;
    }
    if (!familyPassword.trim()) {
      setFamilyError('Please enter your password');
      return;
    }

    setLoading(true);
    setFamilyError('');

    try {
      const res = await apiService.loginFamily(familyEmail.trim(), familyPassword.trim(), connectedElderPhone.trim());
      const userData = res?.data || res?.user;
      if (userData) {
        audioService.playSuccessFanfare();
        login({
          ...userData,
          role: 'family',
          avatar: userData.avatar || '👩‍⚕️'
        });
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      setFamilyError(err.message || 'Invalid email or password. Please verify your credentials or click "Register New Account".');
    } finally {
      setLoading(false);
    }
  };

  // Handle Family Registration
  const handleFamilyRegister = async (e) => {
    if (e) e.preventDefault();
    if (!regFamilyName.trim()) {
      setRegFamilyError('Please enter your full name');
      return;
    }
    if (!regFamilyEmail.trim()) {
      setRegFamilyError('Please enter your email');
      return;
    }
    if (!regFamilyPassword.trim() || regFamilyPassword.trim().length < 4) {
      setRegFamilyError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    setRegFamilyError('');

    try {
      const res = await apiService.signup({
        name: regFamilyName.trim(),
        email: regFamilyEmail.trim().toLowerCase(),
        password: regFamilyPassword.trim(),
        phone: regFamilyPhone.trim(),
        connectedElderPhone: regConnectedElderPhone.trim(),
        role: 'FAMILY'
      });

      const userData = res?.data || res?.user;
      if (userData) {
        audioService.playSuccessFanfare();
        login({
          ...userData,
          role: 'family',
          avatar: userData.avatar || '👩‍⚕️'
        });
      } else {
        throw new Error('Registration failed');
      }
    } catch (err) {
      setRegFamilyError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Auto-Fill Helpers
  const handleAutofillElder = () => {
    if (authMode === 'register') {
      const randomId = Math.floor(100 + Math.random() * 900);
      setRegElderName('Ramasami');
      setRegElderPin('1234');
      setRegElderPhone(`+91 98${randomId} 43210`);
      setRegConnectedFamilyPhone('+91 98765 12345');
      setRegElderError('');
    } else {
      setElderName('Ramasami');
      setElderPin('1234');
      setElderPhone('+91 98765 43210');
      setElderError('');
    }
    audioService.playChime();
  };

  const handleAutofillFamily = () => {
    if (authMode === 'register') {
      const randomId = Math.floor(100 + Math.random() * 900);
      setRegFamilyName('Sarah Caregiver');
      setRegFamilyEmail(`sarah${randomId}@eldercare.ai`);
      setRegFamilyPhone(`+91 98${randomId} 12345`);
      setRegFamilyPassword('password123');
      setRegConnectedElderPhone('+91 98765 43210');
      setRegFamilyError('');
    } else {
      setFamilyEmail('sarah.m@eldercare.ai');
      setFamilyPhone('+91 98765 12345');
      setFamilyPassword('password123');
      setConnectedElderPhone('+91 98765 43210');
      setFamilyError('');
    }
    audioService.playChime();
  };

  // OTP Change
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Forgot password flow
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (forgotStep === 1) {
      if (!forgotContact.trim()) {
        setForgotError('Please enter your email or registered phone number.');
        return;
      }
      audioService.playChime();
      setForgotStep(2);
      setOtpCode(['5', '9', '2', '8', '4', '1']);
    } else if (forgotStep === 2) {
      const enteredOtp = otpCode.join('');
      if (enteredOtp.length < 6) {
        setForgotError('Please enter the 6-digit OTP code.');
        return;
      }
      audioService.playChime();
      setForgotStep(3);
    } else if (forgotStep === 3) {
      if (!newPassword || newPassword.length < 4) {
        setForgotError('Password/PIN must be at least 4 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setForgotError('Passwords do not match.');
        return;
      }
      
      try {
        await apiService.forgotPassword(forgotContact.trim(), newPassword.trim());
      } catch (e) {}

      audioService.playSuccessFanfare();
      setForgotStep(4);
    }
  };

  const handleSelectLanguage = (code) => {
    setLanguage(code);
    audioService.playVoicePing();
    if (code === 'ta') {
      speechService.speak('வணக்கம்! மொழி தமிழாக தேர்ந்தெடுக்கப்பட்டது.');
    } else if (code === 'ml') {
      speechService.speak('നമസ്കാരം! ഭാഷ മലയാളമായി തിരഞ്ഞെടുത്തു.');
    } else {
      speechService.speak('Language set to English.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, var(--secondary) 0%, var(--bg) 45%, var(--bg) 100%)',
      padding: '2rem 1rem'
    }}>
      {/* Brand Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 2rem', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.8rem',
          padding: '0.6rem 1.4rem',
          background: '#ffffff',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '1rem',
          border: '1px solid rgba(47, 111, 237, 0.15)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HeartHandshake size={22} />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: '800',
            color: 'var(--text)'
          }}>
            Elder<span style={{ color: 'var(--primary)' }}>Guard</span> AI
          </span>
        </div>
        <h1 style={{ fontSize: '2.3rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
          {t.portalSubtitleHeader || 'Senior Health & Family Connected Portal'}
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: '680px', margin: '0 auto' }}>
          {t.portalTagline || 'Real-Time Voice Reminders • Emergency SOS Routing'}
        </p>
      </div>

      {/* Main Login Card */}
      <div style={{
        maxWidth: '580px',
        width: '100%',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 45px -10px rgba(47, 111, 237, 0.12)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Preferred Language Selection Header Card (Tamil, English, Malayalam) */}
        <div style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, var(--secondary) 100%)',
          padding: '1.2rem 1.4rem',
          borderBottom: '1.5px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '800', fontSize: '0.95rem' }}>
              <Globe size={18} />
              <span>{t.chooseLanguage}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              {language === 'ta' ? 'குரல் & திரை மொழி' : language === 'ml' ? 'വോയ്സ് & ഇന്റർഫേസ് ഭാഷ' : 'Voice & Text Language'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {LANGUAGES.map((langItem) => {
              const isSelected = language === langItem.code;
              return (
                <button
                  key={langItem.code}
                  type="button"
                  onClick={() => handleSelectLanguage(langItem.code)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.65rem 0.4rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--primary)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--text)',
                    boxShadow: isSelected ? '0 4px 14px var(--primary-glow)' : 'var(--shadow-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>{langItem.flag}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: '800' }}>{langItem.nativeName}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>{langItem.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {/* Auth Mode Switcher (Sign In vs Register) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#F8FAFC',
            padding: '4px',
            margin: '0.8rem 1.2rem 0.4rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setElderError('');
                setFamilyError('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700',
                fontSize: '0.92rem',
                background: authMode === 'signin' ? 'var(--primary)' : 'transparent',
                color: authMode === 'signin' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <LogIn size={16} />
              <span>{t.authModeSignIn || 'Sign In'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRegElderError('');
                setRegFamilyError('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700',
                fontSize: '0.92rem',
                background: authMode === 'register' ? 'var(--primary)' : 'transparent',
                color: authMode === 'register' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <UserPlus size={16} />
              <span>{t.authModeRegister || 'Register New Account'}</span>
            </button>
          </div>

          {/* Role Portal Tabs (Elder & Family Only) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#F1F5F9',
            padding: '6px',
            margin: '0.6rem 1.2rem 1.2rem',
            borderRadius: 'var(--radius-lg)',
            gap: '6px'
          }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('elder');
                setElderError('');
                setRegElderError('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.85rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '1rem',
                background: activeTab === 'elder' ? '#ffffff' : 'transparent',
                color: activeTab === 'elder' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'elder' ? '0 4px 12px rgba(23, 32, 51, 0.06)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <User size={20} />
              <span>{t.elderPortal}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('family');
                setFamilyError('');
                setRegFamilyError('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.85rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '1rem',
                background: activeTab === 'family' ? '#ffffff' : 'transparent',
                color: activeTab === 'family' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'family' ? '0 4px 12px rgba(23, 32, 51, 0.06)' : 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Users size={20} />
              <span>{t.familyPortal}</span>
            </button>
          </div>

          <div style={{ padding: '0 2rem 2rem' }}>
            {/* 1. ELDER SIGN IN FORM */}
            {activeTab === 'elder' && authMode === 'signin' && (
              <div>
                <form onSubmit={handleElderLogin}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.elderNameLabel || "User's Full Name (Elder)"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        value={elderName}
                        onChange={(e) => setElderName(e.target.value)}
                        placeholder={t.namePlaceholder || "Enter your name (e.g. Arthur Miller)"}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.pinLabel || "Password / PIN Number"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="password"
                        required
                        value={elderPin}
                        onChange={(e) => setElderPin(e.target.value)}
                        placeholder={t.pinPlaceholder || "Enter 4-digit PIN (e.g. 1234)"}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '1.2rem',
                          fontWeight: '700',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.elderPhoneLabel || "Elder's Phone Number (+91)"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                      <input
                        type="tel"
                        value={elderPhone}
                        onChange={(e) => setElderPhone(formatPhoneWith91(e.target.value))}
                        placeholder="+91 98765 43210"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '1rem',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      {t.phonePrefixNote || "Indian mobile number starting with +91"}
                    </span>
                    {elderError && (
                      <p style={{ color: 'var(--emergency)', fontSize: '0.85rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={15} /> {elderError}
                      </p>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.4rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <button
                      type="button"
                      onClick={handleAutofillElder}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Wand2 size={13} /> {t.demoFill || "Demo Fill"}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep(1);
                          setShowForgotPassword(true);
                        }}
                        style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {t.forgotPin || "Forgot PIN?"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-xl"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                      <>
                        <span>{t.signInElder || "Sign In to Elder Dashboard"}</span>
                        <ArrowRight size={22} />
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t.dontHaveAccount || "Don't have an account? Register Here"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. ELDER REGISTER FORM */}
            {activeTab === 'elder' && authMode === 'register' && (
              <div>
                <form onSubmit={handleElderRegister}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.elderNameLabel || "Elder's Full Name"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        value={regElderName}
                        onChange={(e) => setRegElderName(e.target.value)}
                        placeholder={t.namePlaceholder || "Enter your full name"}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.pinLabel || "Password / PIN Number"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="password"
                        required
                        value={regElderPin}
                        onChange={(e) => setRegElderPin(e.target.value)}
                        placeholder={t.pinPlaceholder || "Create 4-digit PIN (e.g. 1234)"}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '1.2rem',
                          fontWeight: '700',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.elderPhoneLabel || "Elder's Phone Number (+91)"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                      <input
                        type="tel"
                        required
                        value={regElderPhone}
                        onChange={(e) => setRegElderPhone(formatPhoneWith91(e.target.value))}
                        placeholder="+91 98765 43210"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '1rem',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.connectedFamilyLabel || "Connected Family / Emergency Phone (+91)"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Link size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--safe)' }} />
                      <input
                        type="tel"
                        value={regConnectedFamilyPhone}
                        onChange={(e) => setRegConnectedFamilyPhone(formatPhoneWith91(e.target.value))}
                        placeholder="+91 98765 12345"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '1rem',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      {t.phonePrefixNote || "Emergency SOS calls and alerts will be sent here"}
                    </span>
                    {regElderError && (
                      <p style={{ color: 'var(--emergency)', fontSize: '0.85rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={15} /> {regElderError}
                      </p>
                    )}
                  </div>

                  <div style={{ marginBottom: '1.4rem' }}>
                    <button
                      type="button"
                      onClick={handleAutofillElder}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Wand2 size={13} /> {t.demoFill || "Demo Fill"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-xl"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                      <>
                        <span>{t.completeElderRegisterBtn || "Register Elder & Go to Dashboard"}</span>
                        <ArrowRight size={22} />
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t.alreadyHaveAccount || 'Already have an account? Sign In'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. FAMILY SIGN IN FORM */}
            {activeTab === 'family' && authMode === 'signin' && (
              <div>
                <form onSubmit={handleFamilyLogin}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.familyEmailLabel || "Family Member Email"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        required
                        value={familyEmail}
                        onChange={(e) => setFamilyEmail(e.target.value)}
                        placeholder="e.g. sarah.m@eldercare.ai"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.connectedElderLabel || "Connected Elder's Phone (+91)"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Link size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                      <input
                        type="tel"
                        value={connectedElderPhone}
                        onChange={(e) => setConnectedElderPhone(formatPhoneWith91(e.target.value))}
                        placeholder="+91 98765 43210"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid rgba(47, 111, 237, 0.35)',
                          background: 'var(--secondary)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      {t.phonePrefixNote || "Indian mobile number starting with +91"}
                    </span>
                  </div>

                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.passwordLabel || "Password"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={familyPassword}
                        onChange={(e) => setFamilyPassword(e.target.value)}
                        placeholder={t.passwordPlaceholder || "Enter caregiver password"}
                        style={{
                          width: '100%',
                          padding: '0.85rem 2.8rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.8rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {familyError && (
                      <p style={{ color: 'var(--emergency)', fontSize: '0.85rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={15} /> {familyError}
                      </p>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.4rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <button
                      type="button"
                      onClick={handleAutofillFamily}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Wand2 size={13} /> {t.demoFill || "Demo Fill"}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep(1);
                          setShowForgotPassword(true);
                        }}
                        style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {t.forgotPin || "Forgot Password?"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-xl"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                      <>
                        <span>{t.signInFamily || "Sign In to Family Dashboard"}</span>
                        <ArrowRight size={22} />
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t.dontHaveAccount || "Don't have an account? Register Here"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. FAMILY REGISTER FORM */}
            {activeTab === 'family' && authMode === 'register' && (
              <div>
                <form onSubmit={handleFamilyRegister}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.fullNameLabel || 'Caregiver Full Name'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        value={regFamilyName}
                        onChange={(e) => setRegFamilyName(e.target.value)}
                        placeholder="e.g. Sarah Miller"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.familyEmailLabel || 'Family Member Email'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        required
                        value={regFamilyEmail}
                        onChange={(e) => setRegFamilyEmail(e.target.value)}
                        placeholder="e.g. sarah.m@eldercare.ai"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.passwordLabel || 'Password'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regFamilyPassword}
                        onChange={(e) => setRegFamilyPassword(e.target.value)}
                        placeholder="Create caregiver password"
                        style={{
                          width: '100%',
                          padding: '0.85rem 2.8rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.8rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.familyPhoneLabel || 'Family Phone Number (+91)'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--safe)' }} />
                      <input
                        type="tel"
                        value={regFamilyPhone}
                        onChange={(e) => setRegFamilyPhone(formatPhoneWith91(e.target.value))}
                        placeholder="+91 98765 12345"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text)' }}>
                      {t.connectedElderLabel || "Connected Elder's Phone (+91)"}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Link size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                      <input
                        type="tel"
                        value={regConnectedElderPhone}
                        onChange={(e) => setRegConnectedElderPhone(formatPhoneWith91(e.target.value))}
                        placeholder="+91 98765 43210"
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid rgba(47, 111, 237, 0.35)',
                          background: 'var(--secondary)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      {t.phonePrefixNote || "Connects your family dashboard to the elder automatically"}
                    </span>
                    {regFamilyError && (
                      <p style={{ color: 'var(--emergency)', fontSize: '0.85rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={15} /> {regFamilyError}
                      </p>
                    )}
                  </div>

                  <div style={{ marginBottom: '1.4rem' }}>
                    <button
                      type="button"
                      onClick={handleAutofillFamily}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Wand2 size={13} /> {t.demoFill || "Demo Fill"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-xl"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                      <>
                        <span>{t.completeFamilyRegisterBtn || 'Register Family Account'}</span>
                        <ArrowRight size={22} />
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t.alreadyHaveAccount || 'Already have an account? Sign In'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPassword && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--secondary)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <KeyRound size={20} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', margin: 0 }}>
                  {t.resetPasswordTitle || 'Reset Password / PIN'}
                </h3>
              </div>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="btn btn-ghost btn-icon"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  style={{
                    height: '6px',
                    width: '45px',
                    borderRadius: '3px',
                    background: forgotStep >= s ? 'var(--primary)' : 'var(--border)'
                  }}
                />
              ))}
            </div>

            {forgotStep === 1 && (
              <form onSubmit={handleForgotSubmit}>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                  {t.forgotStep1Desc || 'Enter your registered phone number or email to receive a 6-digit OTP code:'}
                </p>
                <div style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    required
                    value={forgotContact}
                    onChange={(e) => setForgotContact(e.target.value)}
                    placeholder={t.enterPhoneOrEmail || "Enter phone number or email"}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      outline: 'none'
                    }}
                  />
                  {forgotError && (
                    <p style={{ color: 'var(--emergency)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                      {forgotError}
                    </p>
                  )}
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {t.sendOtpBtn || 'Send OTP Code'}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleForgotSubmit}>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                  {t.forgotStep2Desc || 'Enter the 6-digit OTP code sent to your contact:'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  {otpCode.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      style={{
                        width: '46px',
                        height: '54px',
                        textAlign: 'center',
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        borderRadius: 'var(--radius-md)',
                        border: '2px solid var(--primary)',
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>
                {forgotError && (
                  <p style={{ color: 'var(--emergency)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
                    {forgotError}
                  </p>
                )}
                <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      audioService.playChime();
                      setOtpCode(['5', '9', '2', '8', '4', '1']);
                    }}
                    style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}
                  >
                    {t.autofillDemoOtp || 'Auto-Fill Demo OTP (592841)'}
                  </button>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {t.verifyCodeBtn || 'Verify Code'}
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleForgotSubmit}>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                  {t.forgotStep3Desc || 'Set a new password / PIN number:'}
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                    {t.newPasswordLabel || 'New Password / PIN'}
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none' }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                    {t.confirmPasswordLabel || 'Confirm Password / PIN'}
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none' }}
                  />
                  {forgotError && (
                    <p style={{ color: 'var(--emergency)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                      {forgotError}
                    </p>
                  )}
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {t.saveAndConfirmBtn || 'Save & Confirm'}
                </button>
              </form>
            )}

            {forgotStep === 4 && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--safe)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <CheckCircle2 size={38} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {t.passwordResetSuccessTitle || 'Password Reset Successfully!'}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  {t.passwordResetSuccessDesc || 'You can now log in securely with your new credentials.'}
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setAuthMode('signin');
                  }}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  {t.returnToLoginBtn || 'Return to Login'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
