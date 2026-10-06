import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { audioService } from '../services/audioService';
import {
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Zap,
  Edit2,
  Check,
  X
} from 'lucide-react';

export default function WebhookStatusPanel({ isCompact = false }) {
  const { language, t } = useApp();
  const [webhookUrl, setWebhookUrl] = useState(() => apiService.getSNSWebhookUrl());
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(() => apiService.getSNSWebhookUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState(() => apiService.getRecentWebhookLogs());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleWebhookEvent = (e) => {
      setRecentLogs(apiService.getRecentWebhookLogs());
      if (e?.detail) {
        setTestResult({
          type: e.detail.success ? 'success' : 'error',
          text: `${e.detail.action || e.detail.eventType} POST (HTTP ${e.detail.status})`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    };

    window.addEventListener('eldercare_webhook_event', handleWebhookEvent);
    return () => window.removeEventListener('eldercare_webhook_event', handleWebhookEvent);
  }, []);

  const handleSaveUrl = () => {
    if (urlInput && urlInput.trim()) {
      apiService.setSNSWebhookUrl(urlInput.trim());
      setWebhookUrl(urlInput.trim());
      setIsEditingUrl(false);
      audioService.playChime();
      setTestResult({
        type: 'success',
        text: language === 'ta' ? 'வெப்ஹூக் முகவரி வெற்றிகரமாக புதுப்பிக்கப்பட்டது!' : language === 'ml' ? 'വെബ്ഹുക്ക് വിലാസം വിജയകരമായി അപ്‌ഡേറ്റ് ചെയ്തു!' : 'Webhook URL updated successfully!',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    setTestResult(null);
    audioService.playVoicePing();

    try {
      const res = await apiService.testWebhookConnection(webhookUrl);
      audioService.playSuccessFanfare();
      setTestResult({
        type: 'success',
        text: language === 'ta' 
          ? `✓ POST அனுப்பப்பட்டது! தூண்டுதல் முனையிலிருந்து HTTP 200 OK பெறப்பட்டது.`
          : language === 'ml'
          ? `✓ POST അയച്ചു! ട്രിഗർ നോഡിൽ നിന്ന് HTTP 200 OK ലഭിച്ചു.`
          : `✓ POST Request Delivered! HTTP 200 OK received from Trigger Node.`,
        details: res?.mode === 'trigger-test' ? 'Trigger Node test mode confirmed' : 'Payload successfully received',
        timestamp: new Date().toLocaleTimeString()
      });
      setRecentLogs(apiService.getRecentWebhookLogs());
    } catch (err) {
      console.error('[WebhookPanel] Test ping error:', err);
      setTestResult({
        type: 'error',
        text: `POST Error: ${err.message || 'Check trigger node status'}`,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, rgba(47, 111, 237, 0.04) 100%)',
      border: '1.5px solid rgba(47, 111, 237, 0.25)',
      borderRadius: 'var(--radius-lg)',
      padding: '0.85rem 1.25rem',
      marginBottom: '1.5rem',
      boxShadow: '0 2px 10px rgba(47, 111, 237, 0.06)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.8rem'
      }}>
        {/* Left Side: Webhook Status Indicator & URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px var(--primary-glow)',
            flexShrink: 0
          }}>
            <Radio size={18} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text)' }}>
                {t.webhookPanelTitle || 'SNS Webhook Trigger Node'}:
              </span>
              <span className="badge badge-safe" style={{ fontSize: '0.7rem', padding: '0.12rem 0.45rem' }}>
                {t.webhookDispatcherActive || '🟢 POST Dispatcher Active'}
              </span>
            </div>

            {isEditingUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://api.agents.snsihub.ai/webhook-test/eldercare-events"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--primary)',
                    width: '100%',
                    maxWidth: '420px'
                  }}
                />
                <button onClick={handleSaveUrl} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  <Check size={14} /> {t.saveBtn || 'Save'}
                </button>
                <button onClick={() => { setIsEditingUrl(false); setUrlInput(webhookUrl); }} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                <code style={{
                  fontSize: '0.76rem',
                  background: 'rgba(47, 111, 237, 0.08)',
                  color: 'var(--primary)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '600',
                  wordBreak: 'break-all'
                }}>
                  {webhookUrl}
                </code>
                <button
                  onClick={() => setIsEditingUrl(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.74rem', fontWeight: '700' }}
                  title="Change Webhook Endpoint URL"
                >
                  <Edit2 size={12} /> {t.editUrl || 'Edit URL'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleTestPing}
            disabled={isTesting}
            className="btn btn-primary"
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px var(--primary-glow)'
            }}
          >
            {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            <span>{isTesting ? (t.sendingPost || 'Sending POST...') : (t.testPostBtn || '⚡ Test POST to Trigger Node')}</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>{t.logsBtn || 'Logs'} ({recentLogs.length})</span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Test Feedback Toast / Alert */}
      {testResult && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.6rem 0.9rem',
          borderRadius: 'var(--radius-md)',
          background: testResult.type === 'success' ? 'rgba(59, 170, 114, 0.12)' : 'rgba(235, 87, 87, 0.12)',
          border: `1.5px solid ${testResult.type === 'success' ? 'var(--safe)' : 'var(--emergency)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
          fontSize: '0.82rem',
          fontWeight: '600',
          color: testResult.type === 'success' ? '#1E6F45' : 'var(--emergency)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {testResult.type === 'success' ? <CheckCircle2 size={16} color="var(--safe)" /> : <AlertCircle size={16} color="var(--emergency)" />}
            <span>{testResult.text}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{testResult.timestamp}</span>
        </div>
      )}

      {/* Expandable Live Dispatch Log Table */}
      {isOpen && (
        <div style={{
          marginTop: '0.9rem',
          paddingTop: '0.9rem',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text)' }}>
              {t.recentDispatches || 'Recent Outbound POST Dispatches to SNS Trigger Node:'}
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {t.webhookAutoFiresNote || 'Auto-fires on: Schedule Saved, Routine Completed, Alarm Acknowledged, Voice Query, Emergency SOS'}
            </span>
          </div>

          {recentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {t.noWebhooksYet || 'No webhooks dispatched yet in this session. Click "⚡ Test POST to Trigger Node" or perform any action to see live dispatches here.'}
            </div>
          ) : (
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem 0.6rem' }}>{t.timeCol || 'Time'}</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>{t.eventTypeCol || 'Event Type'}</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>{t.actionDetailCol || 'Action / Detail'}</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>{t.routeMethodCol || 'Route Method'}</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>{t.httpStatusCol || 'HTTP Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log, idx) => (
                    <tr key={log.id || idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: '700', color: 'var(--primary)' }}>{log.eventType}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text)' }}>{log.action}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>{log.method || 'Backend Relay'}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        <span className={`badge ${log.success ? 'badge-safe' : 'badge-emergency'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                          {log.status || (log.success ? 200 : 500)} {log.success ? '✓ Sent' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
