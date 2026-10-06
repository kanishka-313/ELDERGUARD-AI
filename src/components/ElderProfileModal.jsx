import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import { apiService } from '../services/apiService';
import {
  User,
  HeartPulse,
  Activity,
  Droplet,
  Calendar,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const COMMON_CONDITIONS_EN = ['Hypertension (BP)', 'Type 2 Diabetes', 'Arthritis / Joint Pain', 'Heart Condition', 'Asthma', 'None'];
const COMMON_CONDITIONS_TA = ['இரத்த அழுத்தம் (BP)', 'சர்க்கரை நோய் (Diabetes)', 'மூட்டு வலி (Arthritis)', 'இதய நோய்', 'ஆஸ்துமா', 'எதுவுமில்லை'];
const COMMON_CONDITIONS_ML = ['രക്തസമ്മർദ്ദം (BP)', 'പ്രമേഹം (Diabetes)', 'സന്ധിവാതം (Arthritis)', 'ഹൃദ്രോഗം', 'ആസ്ത്മ', 'മറ്റൊന്നുമില്ല'];

export default function ElderProfileModal({ isOpen, onClose }) {
  const { currentUser, login, t, language } = useApp();

  const [age, setAge] = useState(currentUser?.age || '');
  const [medicalHistory, setMedicalHistory] = useState(currentUser?.medicalHistory || '');
  const [bloodGroup, setBloodGroup] = useState(currentUser?.bloodGroup || 'A+');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setAge(currentUser.age !== undefined && currentUser.age !== null ? currentUser.age : '');
      setMedicalHistory(currentUser.medicalHistory || '');
      setBloodGroup(currentUser.bloodGroup || 'A+');
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleAddCondition = (condition) => {
    if (condition === 'None' || condition === 'எதுவுமில்லை' || condition === 'മറ്റൊന്നുമില്ല') {
      setMedicalHistory(condition);
      return;
    }
    if (!medicalHistory || medicalHistory === 'None' || medicalHistory === 'எதுவுமில்லை' || medicalHistory === 'മറ്റൊന്നുമില്ല') {
      setMedicalHistory(condition);
    } else if (!medicalHistory.includes(condition)) {
      setMedicalHistory(`${medicalHistory}, ${condition}`);
    }
    audioService.playChime();
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!age || age < 1 || age > 130) {
      setErrorMsg('Please enter a valid age (e.g. 76).');
      return;
    }
    if (!bloodGroup) {
      setErrorMsg('Please select your blood group.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const updatedData = {
        ...currentUser,
        age: parseInt(age, 10),
        medicalHistory: medicalHistory.trim() || 'No major conditions reported',
        bloodGroup: bloodGroup,
        isProfileComplete: true
      };

      await apiService.updateProfile(updatedData);
      login(updatedData);

      audioService.playSuccessFanfare();
      setSavedSuccess(true);

      const confirmMsg = language === 'ta'
        ? 'உங்கள் மருத்துவ சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!'
        : language === 'ml'
        ? 'നിങ്ങളുടെ മെഡിക്കൽ പ്രൊഫൈൽ വിജയകരമായി സേവ് ചെയ്തു!'
        : 'Your medical profile has been saved successfully!';
      speechService.speak(confirmMsg);

      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.warn('Profile save offline fallback:', err);
      const updatedData = {
        ...currentUser,
        age: parseInt(age, 10),
        medicalHistory: medicalHistory.trim() || 'No major conditions reported',
        bloodGroup: bloodGroup,
        isProfileComplete: true
      };
      login(updatedData);
      audioService.playSuccessFanfare();
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const currentConditions = language === 'ta'
    ? COMMON_CONDITIONS_TA
    : language === 'ml'
    ? COMMON_CONDITIONS_ML
    : COMMON_CONDITIONS_EN;

  return (
    <div className="modal-overlay" style={{ zIndex: 1250, padding: '1rem' }}>
      <div className="modal-content" style={{
        maxWidth: '560px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem 1.6rem',
        border: '2px solid rgba(47, 111, 237, 0.25)',
        boxShadow: 'var(--shadow-lg)',
        background: '#ffffff'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.2rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, #1E4AA8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px var(--primary-glow)'
            }}>
              <HeartPulse size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text)', margin: 0, fontWeight: '800' }}>
                {t.elderProfileTitle || "Elder's Medical Profile"}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {currentUser?.name || (language === 'ta' ? 'முதியவர்' : language === 'ml' ? 'മുതിർന്ന വ്യക്തി' : 'Elder')} • {currentUser?.phone || '+91 98765 43210'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <p style={{
          fontSize: '0.88rem',
          color: 'var(--text)',
          background: 'var(--secondary)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid var(--primary)',
          marginBottom: '1.4rem',
          lineHeight: 1.4
        }}>
          {t.elderProfileSubtitle || "Please provide your essential medical background for personalized care and safety."}
        </p>

        {savedSuccess && (
          <div style={{
            background: 'var(--safe-light)',
            color: 'var(--safe)',
            border: '1.5px solid var(--safe)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1rem',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: '700',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <CheckCircle2 size={20} />
            <span>{t.profileSavedSuccess || "Medical profile updated successfully!"}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'var(--emergency-light)',
            color: 'var(--emergency)',
            border: '1.5px solid var(--emergency)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1rem',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: '700'
          }}>
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* 1. Age Field */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--text)' }}>
              1. {t.ageLabel || "Age (Years)"}
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
              <input
                type="number"
                min="40"
                max="125"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t.agePlaceholder || "e.g. 76"}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.8rem',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--border)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* 2. Blood Group Field */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--text)' }}>
              2. {t.bloodGroupLabel || "Blood Group"}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
              {BLOOD_GROUPS.map((bg) => {
                const isSelected = bloodGroup === bg;
                return (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => {
                      setBloodGroup(bg);
                      audioService.playChime();
                    }}
                    style={{
                      padding: '0.65rem 0.4rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--primary)' : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text)',
                      fontWeight: '800',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 4px 12px var(--primary-glow)' : 'none'
                    }}
                  >
                    <Droplet size={14} fill={isSelected ? '#ffffff' : 'var(--emergency)'} color={isSelected ? '#ffffff' : 'var(--emergency)'} />
                    <span>{bg}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Medical History Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--text)' }}>
              3. {t.medicalHistoryLabel || "Medical History & Chronic Conditions"}
            </label>
            
            {/* Quick condition chips for 1-tap addition */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {currentConditions.map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => handleAddCondition(cond)}
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid rgba(47, 111, 237, 0.3)',
                    background: medicalHistory.includes(cond) ? 'var(--primary-light)' : '#ffffff',
                    color: 'var(--primary)',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  + {cond}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              required
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder={t.medicalHistoryPlaceholder || "e.g. Hypertension, Mild Arthritis, Type 2 Diabetes"}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--border)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.4
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-xl"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '0.95rem 1.2rem',
                fontSize: '1.05rem',
                fontWeight: '800'
              }}
            >
              <CheckCircle2 size={22} />
              <span>{t.saveProfileBtn || "Save & Continue to Dashboard"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '0.6rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}
            >
              {t.completeLaterBtn || "I will complete this later"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
