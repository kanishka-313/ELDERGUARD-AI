import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import confetti from 'canvas-confetti';
import {
  User,
  Users,
  Phone,
  Mail,
  Lock,
  Save,
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Link,
  PhoneCall,
  BellRing
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { currentUser, updateUserProfile, t, language } = useApp();

  const isElder = currentUser?.role?.toLowerCase() === 'elder';

  // Form states initialized cleanly
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  
  // Connection & Emergency Contact States
  const [connectedName, setConnectedName] = useState('');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [connectedEmail, setConnectedEmail] = useState('');

  // Upcoming Doctor's Appointment States
  const [upcomingDate, setUpcomingDate] = useState('');
  const [upcomingTime, setUpcomingTime] = useState('');
  const [upcomingPurpose, setUpcomingPurpose] = useState('');
  const [upcomingLocation, setUpcomingLocation] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state with active currentUser on open
  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setPin(''); // Keep blank so user only inputs if they want to change PIN
      
      if (isElder) {
        setConnectedName(currentUser.connectedFamilyName || '');
        setConnectedPhone(currentUser.connectedFamilyPhone || '');
        setConnectedEmail(currentUser.connectedFamilyEmail || '');
      } else {
        setConnectedName(currentUser.connectedElderName || '');
        setConnectedPhone(currentUser.connectedElderPhone || '');
        setConnectedEmail('');
      }

      setUpcomingDate(currentUser.upcomingAppointmentDate || '');
      setUpcomingTime(currentUser.upcomingAppointmentTime || '');
      setUpcomingPurpose(currentUser.upcomingAppointmentPurpose || '');
      setUpcomingLocation(currentUser.upcomingAppointmentLocation || '');
    }
  }, [currentUser, isOpen, isElder]);

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    const updatedData = {
      ...currentUser,
      name: name.trim(),
      phone: phone.trim(),
      upcomingAppointmentDate: upcomingDate.trim(),
      upcomingAppointmentTime: upcomingTime.trim(),
      upcomingAppointmentPurpose: upcomingPurpose.trim(),
      upcomingAppointmentLocation: upcomingLocation.trim()
    };

    if (isElder) {
      if (pin && pin.trim()) {
        updatedData.pin = pin.trim();
        updatedData.passwordHash = pin.trim();
      }
      updatedData.connectedFamilyName = connectedName.trim();
      updatedData.connectedFamilyPhone = connectedPhone.trim();
      updatedData.connectedFamilyEmail = connectedEmail.trim();
    } else {
      updatedData.email = email.trim();
      updatedData.connectedElderName = connectedName.trim();
      updatedData.connectedElderPhone = connectedPhone.trim();
    }

    try {
      await updateUserProfile(updatedData);
      setSavedSuccess(true);
      audioService.playSuccessFanfare();

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#2F6FED', '#3BAA72', '#F2B84B']
        });
      } catch (err) {}

      const confirmSpeech = language === 'ta'
        ? 'சுயவிவரம் மற்றும் அவசர தொடர்பு அமைப்புகள் புதுப்பிக்கப்பட்டன.'
        : language === 'ml'
        ? 'പ്രൊഫൈലും എമർജൻസി ക്രമീകരണങ്ങളും പുതുക്കി.'
        : 'Profile, emergency contacts, and upcoming appointments updated successfully.';
      speechService.speak(confirmSpeech);

      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1300 }}>
      <div className="modal-content" style={{ maxWidth: '620px', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'var(--secondary)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isElder ? <User size={24} /> : <Users size={24} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text)', margin: 0 }}>
                {isElder ? (t?.editElderProfileTitle || 'Edit Elder Profile & Family SOS Contact') : (t?.editFamilyProfileTitle || 'Edit Caregiver Profile & Connected Elder')}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                {isElder ? (t?.editElderProfileDesc || 'Update your personal details and where your SOS emergency alerts are sent') : (t?.editFamilyProfileDesc || 'Update your contact information and connected elder phone number')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {savedSuccess && (
          <div style={{
            background: 'var(--safe-light)',
            border: '1px solid var(--safe)',
            color: 'var(--safe)',
            padding: '0.8rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: '700'
          }}>
            <CheckCircle2 size={20} />
            <span>{t?.profileUpdatedSuccess || 'Profile and Emergency SOS Contact Settings Updated!'}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          {/* Section 1: User's Own Profile */}
          <div style={{
            background: '#F8FAFC',
            padding: '1.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: '1.4rem'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', display: 'block', marginBottom: '0.8rem' }}>
              👤 {t?.personalProfileDetails || 'Your Personal Profile Details'}
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.fullNameLabel || 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t?.namePlaceholder || 'Enter full name'}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {isElder ? (t?.elderPhoneLabel || 'Elder Phone Number (+91)') : (t?.caregiverPhoneLabel || 'Caregiver Phone Number (+91)')}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>
            </div>

            {isElder ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.pinLabel || 'Elder Password / PIN Code'}
                </label>
                <input
                  type="text"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={t?.pinPlaceholder || '4-digit PIN (e.g. 1234)'}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.familyEmailLabel || 'Caregiver Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="caregiver@eldercare.ai"
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Section 2: Connected Dashboard & Emergency Contact Integration */}
          <div style={{
            background: 'linear-gradient(135deg, var(--secondary) 0%, #ffffff 100%)',
            padding: '1.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid rgba(47, 111, 237, 0.3)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <Link size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>
                {isElder ? (t?.emergencyFamilyContactSection || '🚨 Emergency Family Member Contact (SOS Alerts Recipient)') : (t?.connectedElderSection || '🔗 Connected Elder Details & Phone Number')}
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.8rem' }}>
              {isElder
                ? (t?.emergencyFamilyContactDesc || 'When you press the SOS Emergency button, alerts and calls will be dispatched directly to this family member.')
                : (t?.connectedElderDesc || 'Connects your family dashboard to the elder. Alerts sent by this elder phone number will appear in your dashboard.')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {isElder ? (t?.familyMemberNameLabel || 'Family Member Name') : (t?.connectedElderLabel || "Connected Elder's Full Name")}
                </label>
                <input
                  type="text"
                  required
                  value={connectedName}
                  onChange={(e) => setConnectedName(e.target.value)}
                  placeholder={isElder ? (t?.familyNamePlaceholder || "e.g. Sarah / Son / Daughter") : (t?.elderNamePlaceholder || "e.g. Elder Name")}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {isElder ? (t?.familyMemberPhoneLabel || 'Family Member Phone (SOS Line)') : (t?.elderPhoneLabel || "Elder's Phone Number")}
                </label>
                <input
                  type="tel"
                  required
                  value={connectedPhone}
                  onChange={(e) => setConnectedPhone(e.target.value)}
                  placeholder="e.g. +91 98765 12345"
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>
            </div>

            {isElder && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.familyEmailLabel || 'Family Member Email Address'}
                </label>
                <input
                  type="email"
                  value={connectedEmail}
                  onChange={(e) => setConnectedEmail(e.target.value)}
                  placeholder="e.g. family.contact@eldercare.ai"
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Section 3: Upcoming Doctor / Medical Appointment Scheduler */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, #ffffff 100%)',
            padding: '1.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid rgba(20, 184, 166, 0.35)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem' }}>📅</span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0D9488', textTransform: 'uppercase' }}>
                {t?.upcomingDoctorSection || "Upcoming Doctor's Appointment Timing (Auto-Syncs with Dashboard)"}
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.8rem' }}>
              {t?.upcomingDoctorSectionDesc || 'Schedule or update the upcoming doctor consultation. This timing will automatically update across both the Elder and Family Member dashboards.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.appointmentDateLabel || 'Appointment Date'}
                </label>
                <input
                  type="date"
                  value={upcomingDate}
                  onChange={(e) => setUpcomingDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.appointmentTimeLabel || 'Appointment Time'}
                </label>
                <input
                  type="time"
                  value={upcomingTime}
                  onChange={(e) => setUpcomingTime(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.purposeDoctorNameLabel || 'Doctor / Purpose of Consultation'}
                </label>
                <input
                  type="text"
                  value={upcomingPurpose}
                  onChange={(e) => setUpcomingPurpose(e.target.value)}
                  placeholder={t?.appointmentPurposePlaceholder || "e.g. Cardiologist Review, Eye Checkup, Dr. Consultation"}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                  {t?.hospitalClinicLocationLabel || 'Hospital / Clinic Location'}
                </label>
                <input
                  type="text"
                  value={upcomingLocation}
                  onChange={(e) => setUpcomingLocation(e.target.value)}
                  placeholder={t?.appointmentLocationPlaceholder || "e.g. City Hospital, Specialist Wing"}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.4rem' }}
            >
              {t?.cancelBtn || 'Cancel'}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={18} />
              <span>{t?.saveProfileChangesBtn || 'Save & Update Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
