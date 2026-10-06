import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { audioService } from '../services/audioService';
import { speechService } from '../services/speechService';
import ProfileModal from '../components/ProfileModal';
import AppointmentModal from '../components/AppointmentModal';
import EditScheduleModal from '../components/EditScheduleModal';
import { inferRoutineDetails, getLocalizedScheduleTitle as resolveScheduleTitle } from '../services/routineHelper';
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  Calendar,
  Clock,
  Pill,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  FileText,
  UserCheck,
  Zap,
  Stethoscope,
  Send,
  X,
  Link,
  UserCog,
  Download,
  Filter,
  Check,
  Phone,
  Eye,
  Smile,
  AlertCircle,
  AlarmClock,
  Plus,
  Pencil,
  Trash2,
  BellRing,
  MapPin,
  Volume2,
  Circle
} from 'lucide-react';

export default function FamilyDashboard({ onOpenChat }) {
  const {
    currentUser,
    schedules,
    activityLogs,
    alerts,
    appointments,
    refreshAllData,
    saveScheduleTiming,
    deleteScheduleTiming,
    scheduleAppointment,
    deleteAppointment,
    toggleScheduleComplete,
    resolveAlert,
    triggerSOS,
    triggerFallDetection,
    triggerUnresponsiveVoiceAlert,
    language,
    t
  } = useApp();

  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'review' | 'schedule' | 'appointments'
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'medication' | 'wake' | 'emergency'
  const [dayReviewSent, setDayReviewSent] = useState(false);

  const elderName = currentUser?.connectedElderName || (language === 'ta' ? 'முதியோர்' : language === 'ml' ? 'മുതിർന്നയാൾ' : 'Elder');

  // Family Routine Scheduling State
  const [boxCategory, setBoxCategory] = useState('medication');
  const [boxTitle, setBoxTitle] = useState(() => t?.morningTablet || 'Morning Tablet');
  const [boxTime, setBoxTime] = useState('08:30');
  const [boxVoicePrompt, setBoxVoicePrompt] = useState(() => t?.morningTabletPrompt?.replace(/\{name\}/g, elderName) || `${elderName}, it is time for your morning tablets with water.`);

  // Family Doctor Appointment Scheduling State
  const [aptDate, setAptDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [aptTime, setAptTime] = useState('10:30');
  const [aptPurpose, setAptPurpose] = useState('General Physician Health Review');
  const [aptLocation, setAptLocation] = useState('City Multi-Specialty Clinic, OPD Room 204');
  const [aptMode, setAptMode] = useState('In-Person Clinic Visit');
  const [aptLoading, setAptLoading] = useState(false);
  const [aptFeedback, setAptFeedback] = useState(null);

  const unreadAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  const completedCount = schedules.filter(s => s.completed).length;
  const progressPercent = schedules.length > 0 ? Math.round((completedCount / schedules.length) * 100) : 0;

  const getLocalizedScheduleTitle = (item) => {
    return resolveScheduleTitle(item, t, language);
  };

  const handleTitleChange = (newTitle) => {
    setBoxTitle(newTitle);
    const inferred = inferRoutineDetails(newTitle, boxCategory);
    setBoxCategory(inferred.category);
  };

  const handleAddTimingFromFamily = (e) => {
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
      voicePrompt: boxVoicePrompt || `${elderName}, it is ${displayTimeStr}. Time for your ${trimmedTitle}.`,
      scheduledBy: currentUser?.name || (language === 'ta' ? 'குடும்ப உறுப்பினர்' : language === 'ml' ? 'കുടുംബാംഗം' : 'Family Member')
    });

    audioService.playSuccessFanfare();
    speechService.speak(language === 'ta' ? `${elderName} க்கு ${trimmedTitle} ${displayTimeStr} மணிக்கு திட்டமிடப்பட்டது.` : language === 'ml' ? `${elderName} ന് ${trimmedTitle} ${displayTimeStr} നായി ഷെഡ്യൂൾ ചെയ്തു.` : `Scheduled ${trimmedTitle} for ${elderName} at ${displayTimeStr}. Synchronized live to dashboard.`);
  };

  const handleSelectPreset = (cat, defaultTitle, defaultTime, defaultPrompt) => {
    setBoxCategory(cat);
    setBoxTitle(defaultTitle);
    setBoxTime(defaultTime);
    const formattedPrompt = (defaultPrompt || '').replace(/\{name\}/g, elderName);
    setBoxVoicePrompt(formattedPrompt);
    audioService.playChime();
  };

  const handleScheduleDoctorAppointment = async (e) => {
    if (e) e.preventDefault();
    if (!aptDate || !aptTime || !aptPurpose) {
      setAptFeedback({ type: 'error', text: 'Please fill in Date, Time, and Purpose/Doctor' });
      return;
    }

    setAptLoading(true);
    try {
      if (scheduleAppointment) {
        await scheduleAppointment({
          appointmentDate: aptDate,
          appointmentTime: aptTime,
          purpose: aptPurpose,
          location: aptLocation || 'City Medical Clinic',
          consultationMode: aptMode
        });
      }

      setAptFeedback({
        type: 'success',
        text: `✓ Appointment for "${aptPurpose}" on ${aptDate} at ${aptTime} successfully scheduled & live synced to ${elderName}'s dashboard!`
      });

      speechService.speak(language === 'ta' ? `${elderName} க்கு மருத்துவ சந்திப்பு திட்டமிடப்பட்டது.` : language === 'ml' ? `${elderName} ന് ഡോക്ടർ അപ്പോയിന്റ്മെന്റ് ഷെഡ്യൂൾ ചെയ്തു.` : `Doctor appointment for ${aptPurpose} scheduled for ${elderName} on ${aptDate} at ${aptTime}. Synchronized live to Elder Dashboard.`);

      setTimeout(() => setAptFeedback(null), 6000);
    } catch (err) {
      setAptFeedback({ type: 'error', text: err.message || 'Failed to schedule appointment' });
    } finally {
      setAptLoading(false);
    }
  };

  const handleSelectAptPreset = (purpose, location = 'City Multi-Specialty Hospital, Room 204', mode = 'In-Person Clinic Visit') => {
    setAptPurpose(purpose);
    setAptLocation(location);
    setAptMode(mode);
    audioService.playChime();
  };

  // Filter activity logs for the Day Review
  const filteredLogs = activityLogs.filter(log => {
    if (reviewFilter === 'all') return true;
    const logType = (log.type || log.activityType || log.category || '').toLowerCase();
    if (reviewFilter === 'medication') return logType.includes('med') || /tablet|med|pill|மருந்து|மாத்திரை|ഗുളിക|മരുന്ന്/i.test(log.title || log.activity || '');
    if (reviewFilter === 'wake') return logType.includes('wake') || logType.includes('sleep') || /wake|morning|விழி|எழு|உண/i.test(log.title || log.activity || '');
    if (reviewFilter === 'emergency') return log.status === 'emergency' || log.status === 'warning' || logType.includes('emergency') || logType.includes('alert') || logType.includes('sos');
    return true;
  });

  const handleSendReportToDoctor = () => {
    audioService.playSuccessFanfare();
    setDayReviewSent(true);
    speechService.speak(language === 'ta' ? 'மருத்துவ அறிக்கை பகிர தயாராக உள்ளது.' : language === 'ml' ? 'മെഡിക്കൽ റിപ്പോർട്ട് തയ്യാറാക്കി.' : "Today's elder day review summary has been exported and prepared for sharing.");
    setTimeout(() => setDayReviewSent(false), 5000);
  };

  const handleDownloadReviewPDF = () => {
    audioService.playChime();
    const content = `ElderGuard AI - Daily Day Review Report\nElder: ${elderName}\nCaregiver: ${currentUser?.name || 'Family Member'}\nDate: ${new Date().toLocaleDateString()}\nRoutine Adherence: ${progressPercent}%\n\nActivity Logs:\n` +
      activityLogs.map(l => `[${l.time}] ${l.title}: ${l.details}`).join('\n');
    
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Day_Review_${elderName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Profile Edit Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Medical Appointments Modal */}
      <AppointmentModal 
        isOpen={showAppointmentModal} 
        onClose={() => setShowAppointmentModal(false)} 
        onRefreshData={refreshAllData} 
      />

      {/* Top Header Banner with Connected Elder Phone & Edit Profile Option */}
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
            fontSize: '3rem',
            background: '#ffffff',
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(47, 111, 237, 0.15)',
            border: '2px solid var(--secondary)'
          }}>
            👩‍⚕️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.8rem', color: 'var(--text)', margin: 0 }}>
                {t?.familyPortalHeader || 'Caregiver Command & Family Monitoring'}
              </h1>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>
              {language === 'ta' ? 'குடும்ப உறுப்பினர்' : language === 'ml' ? 'കെയർഗിവർ' : 'Caregiver'}: <strong>{currentUser?.name || 'Family Member'}</strong> ({currentUser?.email || 'caregiver@eldercare.ai'}) • {t?.familyPhoneLabel || 'Phone'}: <strong>{currentUser?.phone || '+91 98765 12345'}</strong>
            </p>
            
            {/* Connected Elder Phone Badge & Connection Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(47, 111, 237, 0.3)'
              }}>
                <Link size={14} />
                <span>{t?.connectedElderTag || 'Connected Elder'}: <strong>{currentUser?.connectedElderName || 'Elder'}</strong></span>
                <span>(📞 {currentUser?.connectedElderPhone || '+91 98765 43210'})</span>
              </span>

              <button
                onClick={() => setShowProfileModal(true)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Edit your phone number, name, or connected elder phone number"
              >
                <UserCog size={14} color="var(--primary)" />
                <span>{t?.editProfileLinkBtn || 'Edit Profile & Phone Link'}</span>
              </button>

              <button
                onClick={() => setActiveTab('appointments')}
                className="btn btn-primary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Manage healthcare appointments"
              >
                <Calendar size={14} />
                <span>{t?.doctorAppointmentsBtn || 'Doctor Appointments'} ({appointments?.length || 0})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'var(--safe-light)',
          color: 'var(--safe)',
          padding: '0.6rem 1.1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--safe)',
          fontWeight: '700',
          fontSize: '0.88rem'
        }}>
          <div className="pulse-safe" style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--safe)' }} />
          <span>{t?.twoWaySyncConnected || 'Live 2-Way Monitoring & Emergency Call Receiver Active'}</span>
        </div>
      </div>



      {/* Universal Active Emergency & Incoming Call Banner */}
      {unreadAlerts.length > 0 && activeTab !== 'alerts' && (
        <div style={{
          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
          border: '2.5px solid var(--emergency)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.2rem 1.6rem',
          marginBottom: '1.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px var(--emergency-glow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'var(--emergency)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px var(--emergency-glow)'
            }} className="pulse-emergency">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-emergency" style={{ fontSize: '0.8rem', fontWeight: '800' }}>
                  🚨 {unreadAlerts.length} {t?.emergencyAlertReceived || 'EMERGENCY ALERT RECEIVED'}
                </span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--emergency)' }}>
                  {unreadAlerts[0]?.title || `SOS Triggered by ${currentUser?.connectedElderName || 'Elder'}`}
                </strong>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: '0.2rem 0 0', fontWeight: '600' }}>
                {t?.hospitalClinicLocationLabel || 'Location'}: {unreadAlerts[0]?.location || 'Living Room'} • {currentUser?.phone || '+91 98765 12345'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a
              href={`tel:${currentUser?.connectedElderPhone || '+919876543210'}`}
              className="btn btn-emergency btn-lg"
              style={{ padding: '0.65rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <PhoneCall size={18} />
              <span>{t?.directCallElderRoom || 'Direct Call Elder Room'} ({currentUser?.connectedElderPhone || '+91 98765 43210'})</span>
            </a>
            <button
              onClick={() => setActiveTab('alerts')}
              className="btn btn-secondary btn-lg"
              style={{ padding: '0.65rem 1.1rem', fontWeight: '700' }}
            >
              <span>{t?.viewFullAlertIntercom || 'View Full Alert & Intercom'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          background: '#ffffff',
          padding: '6px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          {/* TAB 1: ALERTS SENT BY ELDER */}
          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.85rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '800',
              fontSize: '1.02rem',
              background: activeTab === 'alerts' ? (unreadAlerts.length > 0 ? 'var(--emergency)' : 'var(--primary)') : 'transparent',
              color: activeTab === 'alerts' ? '#ffffff' : 'var(--text-muted)',
              position: 'relative'
            }}
          >
            <ShieldAlert size={20} />
            <span>{t?.familyTabsAlerts || 'Live Alerts Sent by Elder'}</span>
            {unreadAlerts.length > 0 && (
              <span style={{
                background: '#ffffff',
                color: 'var(--emergency)',
                borderRadius: 'var(--radius-full)',
                padding: '0.15rem 0.55rem',
                fontSize: '0.78rem',
                fontWeight: '900',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* TAB 2: DAY REVIEW & ACTIVITY REPORT */}
          <button
            onClick={() => setActiveTab('review')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.85rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '800',
              fontSize: '1.02rem',
              background: activeTab === 'review' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'review' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <FileText size={20} />
            <span>{t?.familyTabsReview || 'Elder Day Review & Report'}</span>
          </button>

          {/* TAB 3: SCHEDULE ROUTINES FOR ELDER */}
          <button
            onClick={() => setActiveTab('schedule')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.85rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '800',
              fontSize: '1.02rem',
              background: activeTab === 'schedule' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'schedule' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <Clock size={20} />
            <span>{t?.familyTabsSchedule || 'Schedule Routines & Voice Alarms'} ({schedules.length})</span>
          </button>

          {/* TAB 4: SCHEDULE DOCTOR APPOINTMENTS */}
          <button
            onClick={() => setActiveTab('appointments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.85rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '800',
              fontSize: '1.02rem',
              background: activeTab === 'appointments' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'appointments' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <Calendar size={20} />
            <span>{t?.familyTabsAppointments || 'Doctor Appointments'} ({appointments.length})</span>
          </button>
        </div>

        {/* Quick Adherence Snapshot */}
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
                {t?.timingsAdherence || "Today's Adherence"}
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
          SECTION 1: ALERTS SENT BY THE ELDER
          ============================================================ */}
      {activeTab === 'alerts' && (
        <div>
          {/* Active Emergency Banner */}
          {unreadAlerts.length > 0 && (
            <div style={{
              background: 'var(--emergency-light)',
              border: '2px solid var(--emergency)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.4rem 1.8rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 24px var(--emergency-glow)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--emergency)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px var(--emergency-glow)'
                  }} className="pulse-emergency">
                    <ShieldAlert size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', color: 'var(--emergency)', margin: 0 }}>
                      🚨 {unreadAlerts.length} {t?.emergencyAlertReceived || 'Active Emergency Alerts Received'}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '0.2rem 0 0', fontWeight: '600' }}>
                      {language === 'ta' ? 'எச்சரிக்கைகள் உங்கள் தொலைபேசிக்கு நேரடியாக அனுப்பப்பட்டுள்ளன:' : language === 'ml' ? 'അലേർട്ടുകൾ നിങ്ങളുടെ ഫോണിലേക്ക് നേരിട്ട് അയച്ചു:' : 'Alerts are routed directly to your phone number:'} <strong>{currentUser?.phone || '+91 98765 12345'}</strong>.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <a
                    href={`tel:${currentUser?.connectedElderPhone || '+919876543210'}`}
                    className="btn btn-emergency btn-lg"
                    style={{ padding: '0.7rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <PhoneCall size={18} />
                    <span>{t?.callElderRoomNow || 'Call Elder Room Now'}</span>
                  </a>
                </div>
              </div>

              {/* Active Alerts List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {unreadAlerts.map(alertItem => (
                  <div
                    key={alertItem.id}
                    style={{
                      background: '#ffffff',
                      border: '2px solid var(--emergency)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.2rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      boxShadow: '0 4px 12px rgba(217, 83, 79, 0.12)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-emergency" style={{ fontSize: '0.78rem' }}>
                          {alertItem.type}
                        </span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--emergency)' }}>
                          {alertItem.title}
                        </strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          • {alertItem.timestamp}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text)', margin: '0 0 0.4rem', lineHeight: 1.4 }}>
                        {alertItem.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>📍 {t?.hospitalClinicLocationLabel || 'Location'}: <strong>{alertItem.location || 'Living Room'}</strong></span>
                        <span>📱 {t?.elderPhoneLabel || 'Elder Phone'}: <strong>{alertItem.elderPhone || currentUser?.connectedElderPhone || '+91 98765 43210'}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <button
                        onClick={() => resolveAlert(alertItem.id)}
                        className="btn btn-safe"
                        style={{ padding: '0.65rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <CheckCircle2 size={18} />
                        <span>{t?.acknowledgeResolve || 'Acknowledge & Resolve'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Active Alerts State */}
          {unreadAlerts.length === 0 && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #F0FDF4 100%)',
              border: '2px solid rgba(59, 170, 114, 0.3)',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'var(--safe)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                margin: '0 auto 1.2rem',
                boxShadow: '0 6px 18px var(--safe-glow)'
              }}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--text)', marginBottom: '0.4rem' }}>
                {t?.allSafeQuietTitle || 'All Safe & Quiet: No Active Alerts from'} {currentUser?.connectedElderName || elderName}
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                {t?.allSafeQuietDesc || 'Your connected elder has triggered no emergency SOS alarms or falls. All routine checks are operating normally.'}
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: '#ffffff', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--safe)', fontWeight: '700' }}>
                <Sparkles size={16} /> {t?.safetyMonitoringActive || '24/7 Voice & Camera Safety Monitoring Active'}
              </div>
            </div>
          )}

          {/* Past Resolved Alerts History */}
          <div className="card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Clock size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', margin: 0 }}>
                  {t?.alertsLogHistory || 'Alerts Log History'} ({alerts.length} {t?.totalLogged || 'Total Logged'})
                </h3>
              </div>
              <span className="badge badge-primary">
                {resolvedAlerts.length} {t?.resolvedLabel || 'Resolved'}
              </span>
            </div>

            {alerts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', margin: 0 }}>
                {t?.noPendingAlerts || 'No past alerts recorded in the history log.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {alerts.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: item.resolved ? '#F8FAFC' : '#FFF1F2',
                      border: `1px solid ${item.resolved ? 'var(--border)' : 'var(--emergency)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span className={`badge ${item.resolved ? 'badge-safe' : 'badge-emergency'}`} style={{ fontSize: '0.72rem' }}>
                          {item.resolved ? (t?.resolvedLabel || 'Resolved') : (t?.activeAlertLabel || 'Active')}
                        </span>
                        <strong style={{ fontSize: '1rem', color: item.resolved ? 'var(--text)' : 'var(--emergency)' }}>
                          {item.title}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          • {item.timestamp}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                        {item.message}
                      </p>
                    </div>

                    {!item.resolved && (
                      <button
                        onClick={() => resolveAlert(item.id)}
                        className="btn btn-safe"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                      >
                        {t?.resolveBtn || 'Resolve'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 2: DAY REVIEW & ACTIVITY REPORT
          ============================================================ */}
      {activeTab === 'review' && (
        <div>
          {/* Day Review Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.2rem',
            marginBottom: '2rem'
          }}>
            <div className="card" style={{ padding: '1.4rem', borderLeft: '5px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t?.routineProgress || 'Routine Adherence'}
              </span>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.3rem' }}>
                {progressPercent}%
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {completedCount} / {schedules.length} {t?.doneOutOf || 'Done'}
              </p>
            </div>

            <div className="card" style={{ padding: '1.4rem', borderLeft: '5px solid var(--safe)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t?.totalLogged || 'Total Activity Logs'}
              </span>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: 'var(--safe)', marginTop: '0.3rem' }}>
                {activityLogs.length}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {language === 'ta' ? 'தானியங்கி செயல்பாட்டு பதிவு' : language === 'ml' ? 'ഓട്ടോമേറ്റഡ് ഫീഡ്' : 'Automated Motion & Routine Feed'}
              </p>
            </div>

            <div className="card" style={{ padding: '1.4rem', borderLeft: '5px solid #F59E0B' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t?.filterEmergency || 'Emergency Alerts Triggered'}
              </span>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: unreadAlerts.length > 0 ? 'var(--emergency)' : 'var(--text)', marginTop: '0.3rem' }}>
                {alerts.length} ({unreadAlerts.length} {t?.activeAlertLabel || 'Active'})
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {currentUser?.phone || '+91 98765 12345'}
              </p>
            </div>
          </div>

          {/* Activity Log Chronological Timeline */}
          <div className="card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Activity size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', margin: 0 }}>
                  {t?.timelineTitle || 'Chronological Day Activity Timeline'}
                </h3>
              </div>

              {/* Action Buttons & Filter Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadReviewPDF}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Download size={14} />
                  <span>{t?.downloadReport || 'Download Summary'}</span>
                </button>
                <button
                  onClick={() => setReviewFilter('all')}
                  className={`btn ${reviewFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  {t?.allActivityLogs || 'All Events'} ({activityLogs.length})
                </button>
                <button
                  onClick={() => setReviewFilter('medication')}
                  className={`btn ${reviewFilter === 'medication' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  {t?.filterMedication || '💊 Tablet Timings'}
                </button>
                <button
                  onClick={() => setReviewFilter('wake')}
                  className={`btn ${reviewFilter === 'wake' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  {t?.filterWake || '🌅 Wake & Meals'}
                </button>
                <button
                  onClick={() => setReviewFilter('emergency')}
                  className={`btn ${reviewFilter === 'emergency' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  {t?.filterEmergency || '🚨 Alerts & Safety'}
                </button>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                <p style={{ margin: 0 }}>{language === 'ta' ? 'பதிவுகள் எதுவும் இல்லை.' : language === 'ml' ? 'ഇവന്റുകൾ ഒന്നും കണ്ടെത്തിയില്ല.' : 'No activity events found for the selected filter.'}</p>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '1.8rem' }}>
                <div style={{
                  position: 'absolute',
                  left: '8px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  background: 'var(--border)'
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {filteredLogs.map(log => {
                    const isAlert = log.status === 'emergency';
                    const isWarning = log.status === 'warning';

                    return (
                      <div key={log.id} style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-1.8rem',
                          top: '6px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: isAlert ? 'var(--emergency)' : isWarning ? 'var(--warning)' : 'var(--safe)',
                          border: '3px solid #ffffff',
                          boxShadow: '0 0 0 2px var(--border)'
                        }} />

                        <div style={{
                          background: isAlert ? 'var(--emergency-light)' : isWarning ? 'var(--warning-light)' : '#F8FAFC',
                          border: `1px solid ${isAlert ? 'var(--emergency)' : isWarning ? 'var(--warning)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem 1.2rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ fontSize: '1rem', color: isAlert ? 'var(--emergency)' : 'var(--text)' }}>
                                {log.title}
                              </strong>
                              <span className={`badge ${isAlert ? 'badge-emergency' : isWarning ? 'badge-warning' : 'badge-safe'}`} style={{ fontSize: '0.7rem' }}>
                                {log.type || 'Event'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                              ⏰ {log.time}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
                            {log.details}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: SCHEDULE ROUTINES FOR ELDER
          ============================================================ */}
      {activeTab === 'schedule' && (
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
                    {(t?.scheduleForElderTitle || 'Schedule Routines & Automated Voice Reminders for {name}').replace(/\{name\}/g, elderName)}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    {(t?.scheduleForElderDesc || "Any routine you assign here is saved securely and immediately appears on {name}'s dashboard. At the scheduled time, CareBot speaks aloud automatically!").replace(/\{name\}/g, elderName)}
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
                onClick={() => handleSelectPreset('medication', t?.morningTablet || 'Morning Prescribed Tablet', '08:30', t?.morningTabletPrompt || 'Time for your morning tablets with fresh water.')}
                className={`btn ${boxCategory === 'medication' && (boxTitle.toLowerCase().includes('morning') || !boxTitle.toLowerCase().includes('night')) ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.morningTabletPreset || '💊 Morning Tablet'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('lunch', t?.lunchTime || 'Lunch Time', '13:00', t?.lunchPrompt || 'Time for lunch meal.')}
                className={`btn ${boxCategory === 'lunch' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                {t?.lunchPreset || '🥗 Lunch Time'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('medication', t?.nightTablet || 'Night Prescribed Tablet', '20:30', t?.nightTabletPrompt || 'Time for your evening tablet before bed.')}
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

            <form onSubmit={handleAddTimingFromFamily} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr auto', gap: '0.8rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  {t?.timingTitleLabel || 'Routine Title'}
                </label>
                <input
                  type="text"
                  required
                  value={boxTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Bedtime, Lunch Timing, Evening Walk"
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
                  {(t?.voicePromptLabel || 'Voice Prompt Spoken to {name}').replace(/\{name\}/g, elderName)}
                </label>
                <input
                  type="text"
                  value={boxVoicePrompt}
                  onChange={(e) => setBoxVoicePrompt(e.target.value)}
                  placeholder={`e.g. ${elderName}, time for your routine.`}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ padding: '0.75rem 1.4rem' }}
              >
                <Plus size={18} />
                <span>{t?.assignRoutineBtn || 'Assign Routine'}</span>
              </button>
            </form>
          </div>

          {/* Current Routines List */}
          <div className="card" style={{ padding: '1.6rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={22} color="var(--primary)" />
              <span>{(t?.activeRoutinesTitle || 'Active Routines Scheduled for {name}').replace(/\{name\}/g, elderName)} ({schedules.length})</span>
            </h3>

            {schedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <AlarmClock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)', margin: '0 0 0.3rem' }}>
                  {t?.noTimingsAssigned || 'No Daily Routines Scheduled Yet'}
                </p>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  {t?.noTimingsDesc || 'Use the box above to assign wakeup, meals, or tablet times.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {schedules.map(item => (
                  <div
                    key={item.id || item.scheduleId}
                    style={{
                      background: item.completed ? '#F8FCF9' : '#ffffff',
                      border: `1px solid ${item.completed ? 'var(--safe)' : 'var(--border)'}`,
                      borderLeft: `6px solid ${item.completed ? 'var(--safe)' : 'var(--primary)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1.1rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flex: 1, minWidth: '240px' }}>
                      <button
                        type="button"
                        onClick={() => toggleScheduleComplete(item.id || item.scheduleId)}
                        className="btn btn-ghost btn-icon"
                        style={{
                          color: item.completed ? 'var(--safe)' : '#94A3B8',
                          padding: '0.3rem',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease'
                        }}
                        title={item.completed ? (t?.markPending || 'Mark as pending') : (t?.markDone || 'Mark as completed')}
                      >
                        {item.completed ? <CheckCircle2 size={30} color="var(--safe)" /> : <Circle size={30} color="#CBD5E1" />}
                      </button>

                      <div style={{
                        background: item.completed ? 'var(--safe-light)' : 'var(--secondary)',
                        padding: '0.5rem 0.8rem',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        minWidth: '85px'
                      }}>
                        <strong style={{ color: item.completed ? 'var(--safe)' : 'var(--primary)', fontSize: '1.15rem' }}>
                          {item.displayTime || item.time}
                        </strong>
                      </div>

                      <div
                        onClick={() => toggleScheduleComplete(item.id || item.scheduleId)}
                        style={{ cursor: 'pointer', flex: 1 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{
                            fontSize: '1.15rem',
                            color: item.completed ? 'var(--text-muted)' : 'var(--text)',
                            textDecoration: item.completed ? 'line-through' : 'none',
                            margin: 0,
                            fontWeight: '700'
                          }}>
                            {getLocalizedScheduleTitle(item)}
                          </h4>
                          {item.completed ? (
                            <span className="badge badge-safe">
                              <CheckCircle2 size={12} /> {t?.completedAt || 'Completed at'} {item.completedAt || 'Today'}
                            </span>
                          ) : (
                            <span className="badge badge-primary">{t?.pendingRoutineBadge || 'Pending Routine'}</span>
                          )}
                          <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                            {item.scheduledBy || (language === 'ta' ? 'குடும்ப உறுப்பினர்' : language === 'ml' ? 'കുടുംബാംഗം' : 'Family Member')}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.88rem',
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
                          const elderName = currentUser?.connectedElderName || 'Elder';
                          const localizedTitle = getLocalizedScheduleTitle(item);
                          const prompt = item.voicePrompt || item.customVoicePrompt || `${elderName}, it is ${item.displayTime || item.time}. Time for your ${localizedTitle}.`;
                          speechService.speak(prompt.replace(/\{name\}/g, elderName));
                        }}
                        className="btn btn-secondary"
                        title="Hear routine prompt aloud"
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Volume2 size={15} color="var(--primary)" />
                        <span>{t?.hearPrompt || 'Hear Prompt'}</span>
                      </button>

                      <button
                        onClick={() => setEditingSchedule(item)}
                        className="btn btn-secondary"
                        title={t?.editRoutine || 'Edit schedule'}
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)' }}
                      >
                        <Pencil size={15} color="var(--primary)" />
                        <span>{t?.editRoutine || 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => deleteScheduleTiming(item.id || item.scheduleId)}
                        className="btn btn-ghost btn-icon"
                        style={{ color: 'var(--emergency)', padding: '0.45rem' }}
                        title="Delete this schedule"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: SCHEDULE DOCTOR APPOINTMENTS
          ============================================================ */}
      {activeTab === 'appointments' && (
        <div>
          {/* Scheduling Doctor Appointment Box */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(20, 184, 166, 0.08) 100%)',
            border: '2px solid rgba(20, 184, 166, 0.35)',
            padding: '1.8rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#0D9488',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                }}>
                  <Calendar size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.35rem', color: 'var(--text)', margin: 0, fontWeight: '800' }}>
                    {t?.scheduleNewDoctorAppointment || "Schedule New Doctor Appointment"} ({elderName})
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                    {language === 'ta' ? 'இங்கு திட்டமிடப்படும் சந்திப்புகள் முதியோர் திரையில் குரல் அறிவிப்புடன் தானாகவே தோன்றும்!' : language === 'ml' ? 'ഇവിടെ ഷെഡ്യൂൾ ചെയ്യുമ്പോൾ മുതിർന്നയാളുടെ ഡാഷ്‌ബോർഡിൽ തത്സമയം ദൃശ്യമാകും!' : `When scheduled here, it is automatically synchronized in real-time to ${elderName}'s dashboard with speech notifications!`}
                  </p>
                </div>
              </div>

              <span className="badge badge-safe" style={{ fontSize: '0.82rem', padding: '0.3rem 0.8rem' }}>
                {t?.liveSyncedWithFamily || '🟢 Real-Time Cross-Dashboard Sync'}
              </span>
            </div>

            {/* Fast Presets */}
            <div style={{ marginBottom: '1.2rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                {language === 'ta' ? 'விரைவு முன்னமைவுகள்:' : language === 'ml' ? 'ദ്രുത പ്രീസെറ്റുകൾ:' : 'Quick Specialty Presets:'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSelectAptPreset(language === 'ta' ? 'பொது மருத்துவர் உடல்நலப் பரிசோதனை' : language === 'ml' ? 'ജനറൽ ഫിസിഷ്യൻ പരിശോധന' : 'General Physician Health Review', 'City Health Clinic, OPD Room 102')}
                  className={`btn ${aptPurpose.includes('General') || aptPurpose.includes('பொது') || aptPurpose.includes('ജനറൽ') ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  🩺 {language === 'ta' ? 'பொது மருத்துவர்' : language === 'ml' ? 'ജനറൽ ഫിസിഷ്യൻ' : 'General Physician'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAptPreset(language === 'ta' ? 'இதயவியல் & இரத்த அழுத்த பரிசோதனை' : language === 'ml' ? 'ഹൃദയ സംബന്ധമായ പരിശോധന' : 'Cardiologist Blood Pressure & Heart Review', 'Apollo Cardiology Center, Suite 304')}
                  className={`btn ${aptPurpose.includes('Cardio') || aptPurpose.includes('இதயம்') || aptPurpose.includes('ഹൃദയം') ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  ❤️ {language === 'ta' ? 'இதய பரிசோதனை' : language === 'ml' ? 'കാർഡിയോളജി പരിശോധന' : 'Cardiology Review'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAptPreset(language === 'ta' ? 'கண் பார்வை பரிசோதனை' : language === 'ml' ? 'നേത്ര പരിശോധന' : 'Eye Care & Vision Checkup', 'City Eye Institute, Vision Wing')}
                  className={`btn ${aptPurpose.includes('Eye') || aptPurpose.includes('கண்') || aptPurpose.includes('നേത്ര') ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  👁️ {language === 'ta' ? 'கண் பரிசோதனை' : language === 'ml' ? 'നേത്ര പരിശോധന' : 'Eye Checkup'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAptPreset(language === 'ta' ? 'பல் மருத்துவ பரிசோதனை' : language === 'ml' ? 'ദന്ത പരിശോധന' : 'Dental & Oral Health Checkup', 'Dental Care Specialist Clinic')}
                  className={`btn ${aptPurpose.includes('Dental') || aptPurpose.includes('பல்') || aptPurpose.includes('ദന്ത') ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  🦷 {language === 'ta' ? 'பல் பரிசோதனை' : language === 'ml' ? 'ദന്ത പരിശോധന' : 'Dental Checkup'}
                </button>
              </div>
            </div>

            {/* Feedback Alert */}
            {aptFeedback && (
              <div style={{
                background: aptFeedback.type === 'success' ? '#F0FDF4' : '#FFF1F2',
                border: `1.5px solid ${aptFeedback.type === 'success' ? 'var(--safe)' : 'var(--emergency)'}`,
                color: aptFeedback.type === 'success' ? 'var(--safe)' : 'var(--emergency)',
                padding: '0.8rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.2rem',
                fontWeight: '700',
                fontSize: '0.92rem'
              }}>
                {aptFeedback.text}
              </div>
            )}

            {/* Scheduling Form */}
            <form onSubmit={handleScheduleDoctorAppointment}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                    {t?.appointmentDateLabel || 'Appointment Date'} *
                  </label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                    {t?.appointmentTimeLabel || 'Appointment Time'} *
                  </label>
                  <input
                    type="time"
                    required
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                    {t?.consultationModeLabel || 'Consultation Mode'}
                  </label>
                  <select
                    value={aptMode}
                    onChange={(e) => setAptMode(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                  >
                    <option value="In-Person Clinic Visit">🏥 {t?.inPersonClinicVisit || 'In-Person Clinic Visit'}</option>
                    <option value="Video Telehealth Consultation">💻 {t?.videoTeleconsultation || 'Video Telehealth Consultation'}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                    {t?.purposeDoctorNameLabel || 'Doctor / Purpose of Consultation'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={aptPurpose}
                    onChange={(e) => setAptPurpose(e.target.value)}
                    placeholder="e.g. Dr. Sharma - Cardiology Follow-up"
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text)' }}>
                    {t?.hospitalClinicLocationLabel || 'Hospital / Clinic Location'}
                  </label>
                  <input
                    type="text"
                    value={aptLocation}
                    onChange={(e) => setAptLocation(e.target.value)}
                    placeholder="e.g. City Multi-Specialty Clinic, OPD Room 204"
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button
                  type="submit"
                  disabled={aptLoading}
                  className="btn btn-primary btn-lg"
                  style={{ padding: '0.8rem 1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', background: '#0D9488' }}
                >
                  <Calendar size={18} />
                  <span>{aptLoading ? (language === 'ta' ? 'திட்டமிடுகிறது...' : language === 'ml' ? 'ഷെഡ്യൂൾ ചെയ്യുന്നു...' : 'Scheduling...') : `📅 ${t?.addAppointmentBtn || 'Schedule & Sync to Elder Dashboard'}`}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Appointments List */}
          <div className="card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Calendar size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', margin: 0 }}>
                  {t?.doctorAppointmentsTabHeader || 'Active Doctor Appointments'} ({appointments.length})
                </h3>
              </div>
              <span className="badge badge-primary">
                {t?.liveSyncedWithFamily || 'Live Synced with Elder App'}
              </span>
            </div>

            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)', margin: '0 0 0.3rem' }}>
                  {t?.noAppointments || 'No Doctor Appointments Scheduled'}
                </p>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  {language === 'ta' ? 'மேலே உள்ள படிவத்தைப் பயன்படுத்தி முதியவருக்கு மருத்துவ நேரங்களைத் திட்டமிடவும்.' : language === 'ml' ? 'മുകളിലുള്ള ഫോം ഉപയോഗിച്ച് മുതിർന്നയാൾക്കായി ഡോക്ടർ അപ്പോയിന്റ്മെന്റുകൾ ഷെഡ്യൂൾ ചെയ്യുക.' : `Use the scheduling form above to assign upcoming doctor timings for ${elderName}.`}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.map((apt) => (
                  <div
                    key={apt.appointmentId || apt.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderLeft: '6px solid #0D9488',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.2rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.2rem', color: 'var(--text)', margin: 0, fontWeight: '700' }}>
                          {apt.purpose}
                        </h4>
                        <span className="badge badge-safe">{apt.status || (language === 'ta' ? 'உறுதி செய்யப்பட்டது' : language === 'ml' ? 'സ്ഥിരീകരിച്ചു' : 'CONFIRMED')}</span>
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                          🟢 {t?.liveSyncedWithFamily || 'Auto-Synced to Elder Dashboard'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', fontSize: '0.92rem', color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        <span>📅 <strong>{apt.appointmentDate}</strong> at <strong style={{ color: 'var(--primary)' }}>{apt.appointmentTime}</strong></span>
                        <span>📍 {t?.hospitalClinicLocationLabel || 'Location'}: <strong>{apt.location || 'City Hospital Clinic'}</strong></span>
                        <span>🩺 {t?.consultationModeLabel || 'Mode'}: <strong>{apt.consultationMode || 'In-Person'}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <button
                        onClick={() => {
                          speechService.speak(language === 'ta'
                            ? `${elderName} க்கு ${apt.purpose} சந்திப்பு ${apt.appointmentDate} அன்று ${apt.appointmentTime} மணிக்கு உள்ளது.`
                            : language === 'ml'
                            ? `${elderName} ന് ${apt.purpose} അപ്പോയിന്റ്മെന്റ് ${apt.appointmentDate} ${apt.appointmentTime} നാണ്.`
                            : `Appointment for ${apt.purpose} is scheduled on ${apt.appointmentDate} at ${apt.appointmentTime} at ${apt.location || 'the clinic'}.`
                          );
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        title="Test voice announcement"
                      >
                        <Volume2 size={16} />
                        <span>{language === 'ta' ? 'குரல் மாதிரி' : language === 'ml' ? 'വോയ്സ് പ്രിവ്യൂ' : 'Voice Preview'}</span>
                      </button>

                      <button
                        onClick={() => deleteAppointment(apt.appointmentId || apt.id)}
                        className="btn btn-ghost btn-icon"
                        style={{ color: 'var(--emergency)' }}
                        title="Cancel appointment"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
    </div>
  );
}
