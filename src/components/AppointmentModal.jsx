import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, MapPin, Video,
  Plus, Trash2, CheckCircle2, Shield, AlertCircle
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useApp } from '../context/AppContext';

export default function AppointmentModal({ isOpen, onClose, onRefreshData }) {
  const { currentUser, t, scheduleAppointment, deleteAppointment } = useApp();
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'createAppointment'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // New Appointment Form State
  const [newApt, setNewApt] = useState({
    appointmentDate: '',
    appointmentTime: '',
    purpose: '',
    location: 'Specialist Wing, City Medical Center',
    consultationMode: 'In-Person Clinic Visit'
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const aptRes = await apiService.getAllAppointments();
      if (aptRes?.data) {
        setAppointments(aptRes.data);
      }
    } catch (err) {
      console.error('Error fetching appointment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!newApt.appointmentDate || !newApt.appointmentTime || !newApt.purpose) {
      setSaveStatus({ type: 'error', msg: 'Please fill in all appointment fields' });
      return;
    }

    setLoading(true);
    try {
      if (scheduleAppointment) {
        await scheduleAppointment(newApt);
      } else {
        await apiService.createAppointment({
          ...newApt,
          elderId: currentUser?.role?.toUpperCase() === 'ELDER' ? (currentUser?.userId || 'usr-elder-1') : (currentUser?.connectedElderId || currentUser?.userId || 'usr-elder-1'),
          elderName: currentUser?.role?.toUpperCase() === 'ELDER' ? (currentUser?.name || 'Elder') : (currentUser?.connectedElderName || 'Elder'),
          status: 'CONFIRMED'
        });
      }

      setSaveStatus({ type: 'success', msg: 'Appointment successfully scheduled and synced!' });
      setNewApt({
        appointmentDate: '',
        appointmentTime: '',
        purpose: '',
        location: 'Specialist Wing, City Medical Center',
        consultationMode: 'In-Person Clinic Visit'
      });
      setActiveTab('appointments');
      loadData();
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus({ type: 'error', msg: err.message || 'Failed to schedule appointment' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm(t.deleteConfirm || 'Are you sure you want to cancel this appointment?')) return;
    setLoading(true);
    try {
      if (deleteAppointment) {
        await deleteAppointment(appointmentId);
      } else {
        await apiService.deleteAppointment(appointmentId);
      }
      setAppointments(prev => prev.filter(a => (a.appointmentId || a.id) !== appointmentId));
      setSaveStatus({ type: 'success', msg: t.appointmentCancelledSuccess || 'Appointment cancelled successfully.' });
      setTimeout(() => setSaveStatus(null), 3000);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setSaveStatus({ type: 'error', msg: err.message || 'Failed to delete appointment' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content appointment-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{t.medicalAppointmentsHeader || 'Medical Appointments'}</h2>
              <p className="text-xs text-slate-400">{t.medicalAppointmentsSubtitle || 'Schedule & Manage Healthcare Consultations'}</p>
            </div>
          </div>
          <button 
            className="btn-icon" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'appointments'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.medicalAppointmentsTab || 'Appointments'} ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('createAppointment')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'createAppointment'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.bookAppointmentTab || '+ Book Appointment'}
          </button>
        </div>

        {/* Status Message */}
        {saveStatus && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            saveStatus.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {saveStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {saveStatus.msg}
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* TAB 1: Appointments List */}
          {activeTab === 'appointments' && (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Calendar size={36} className="mx-auto mb-2 opacity-30" />
                  <p>{t.noAppointmentsFound || 'No upcoming appointments found.'}</p>
                  <button 
                    onClick={() => setActiveTab('createAppointment')}
                    className="mt-3 text-xs text-teal-400 hover:underline"
                  >
                    {t.scheduleFirstAppointment || '+ Schedule first appointment'}
                  </button>
                </div>
              ) : (
                appointments.map(apt => (
                  <div 
                    key={apt.appointmentId} 
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex justify-between items-start"
                  >
                    <div className="space-y-1.5 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 uppercase">
                          {apt.status || 'CONFIRMED'}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-100">{apt.purpose}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-teal-400" /> {apt.appointmentDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-teal-400" /> {apt.appointmentTime}
                        </span>
                        <span className="flex items-center gap-1">
                          {apt.consultationMode?.includes('Video') ? <Video size={13} className="text-teal-400" /> : <MapPin size={13} className="text-teal-400" />}
                          {apt.location || apt.consultationMode}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAppointment(apt.appointmentId)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title={t.cancelAppointment || 'Cancel Appointment'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Book / Create Appointment */}
          {activeTab === 'createAppointment' && (
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t.purposeOfAppointment || 'Purpose of Appointment *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.appointmentPurposePlaceholder || 'e.g. Cardiologist Checkup, Eye Test, Blood Panel Review'}
                  value={newApt.purpose}
                  onChange={e => setNewApt({ ...newApt, purpose: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t.dateLabel || 'Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newApt.appointmentDate}
                    onChange={e => setNewApt({ ...newApt, appointmentDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t.timeLabel || 'Time *'}
                  </label>
                  <input
                    type="time"
                    required
                    value={newApt.appointmentTime}
                    onChange={e => setNewApt({ ...newApt, appointmentTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t.consultationModeLabel || 'Consultation Mode'}
                </label>
                <select
                  value={newApt.consultationMode}
                  onChange={e => setNewApt({ ...newApt, consultationMode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="In-Person Clinic Visit">🏥 {t.inPersonClinicVisit || 'In-Person Clinic Visit'}</option>
                  <option value="Online Video Consultation">{t.onlineVideoConsultation || '📹 Online Video Consultation'}</option>
                  <option value="Home Nurse / Doctor Visit">{t.homeNurseVisit || '🏡 Home Nurse / Healthcare Visit'}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t.locationClinicName || 'Location / Clinic Name'}
                </label>
                <input
                  type="text"
                  placeholder={t.appointmentLocationPlaceholder || 'e.g. City Hospital, Specialist Wing Room 304'}
                  value={newApt.location}
                  onChange={e => setNewApt({ ...newApt, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  {t.cancelBtn || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  {loading ? (t.scheduling || 'Scheduling...') : (t.confirmAppointmentBtn || 'Confirm Appointment')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
