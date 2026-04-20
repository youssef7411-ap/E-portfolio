import React, { useState, useEffect } from 'react';
import '../../styles/Admin.css';
import { API_URL } from '../../config/api';

function Emailing() {
  const [settings, setSettings] = useState({
    defaultEmail: '',
    senderName: '',
    senderEmail: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
  });
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [settingsRes, teachersRes] = await Promise.all([
        fetch(`${API_URL}/api/email/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/teachers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({
          defaultEmail: data.defaultEmail || '',
          senderName: data.senderName || '',
          senderEmail: data.senderEmail || '',
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || '',
          smtpUser: data.smtpUser || '',
          smtpPassword: data.smtpPassword || '',
        });
      }

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/email/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const [broadcastMode, setBroadcastMode] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ subject: '', message: '' });

  const handleSendToAll = async () => {
    if (!broadcastForm.subject || !broadcastForm.message) {
      setMessage({ type: 'error', text: 'Please enter both subject and message.' });
      return;
    }

    const subject = broadcastForm.subject;
    const body = broadcastForm.message;

    if (!window.confirm(`Send email to all ${teachers.length} teachers?`)) return;

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/email/send-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, body }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: `Emails sent to ${data.sent || teachers.length} recipients!` });
      } else {
        setMessage({ type: 'error', text: 'Failed to send emails.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error sending emails.' });
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!settings.defaultEmail) {
      setMessage({ type: 'error', text: 'Please set a default email address first.' });
      return;
    }

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to: settings.defaultEmail }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test email.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error sending test email.' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="management-loading"><span className="spinner" /></div>;
  }

  return (
    <div className="emailing-section">
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Email Settings */}
      <div className="emailing-card">
        <div className="emailing-card-header">
          <h2 className="emailing-card-title">Email Settings</h2>
        </div>
        
        <div className="emailing-form">
          <div className="emailing-form-row">
            <div className="form-group">
              <label className="form-label">Default Email Address</label>
              <input
                type="email"
                name="defaultEmail"
                className="input"
                value={settings.defaultEmail}
                onChange={handleChange}
                placeholder="admin@example.com"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Sender Name</label>
              <input
                type="text"
                name="senderName"
                className="input"
                value={settings.senderName}
                onChange={handleChange}
                placeholder="Portfolio Admin"
              />
            </div>
          </div>

          <div className="emailing-form-row">
            <div className="form-group">
              <label className="form-label">Sender Email</label>
              <input
                type="email"
                name="senderEmail"
                className="input"
                value={settings.senderEmail}
                onChange={handleChange}
                placeholder="noreply@example.com"
              />
            </div>
          </div>

          <div className="emailing-form-row">
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input
                type="text"
                name="smtpHost"
                className="input"
                value={settings.smtpHost}
                onChange={handleChange}
                placeholder="smtp.gmail.com"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input
                type="text"
                name="smtpPort"
                className="input"
                value={settings.smtpPort}
                onChange={handleChange}
                placeholder="587"
              />
            </div>
          </div>

          <div className="emailing-form-row">
            <div className="form-group">
              <label className="form-label">SMTP Username</label>
              <input
                type="text"
                name="smtpUser"
                className="input"
                value={settings.smtpUser}
                onChange={handleChange}
                placeholder="your-email@gmail.com"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">SMTP Password</label>
              <input
                type="password"
                name="smtpPassword"
                className="input"
                value={settings.smtpPassword}
                onChange={handleChange}
                placeholder="App password"
              />
            </div>
          </div>

          <div className="emailing-actions">
            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button className="btn btn-secondary" onClick={handleSendTest} disabled={sending}>
              {sending ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Email */}
      <div className="emailing-card">
        <div className="emailing-card-header">
          <h2 className="emailing-card-title">Broadcast Message</h2>
          <span className="badge badge-gray">{teachers.length} recipients</span>
        </div>
        
        <p style={{ color: 'var(--text-3)', marginBottom: 'var(--space-lg)' }}>
          Send an email to all teachers in your database at once.
        </p>

        {broadcastMode && (
          <div className="emailing-form" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="input"
                value={broadcastForm.subject}
                onChange={(e) => setBroadcastForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="input"
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your message"
                rows={5}
              />
            </div>
            <div className="emailing-actions">
              <button className="btn btn-primary" onClick={handleSendToAll} disabled={sending}>
                {sending ? 'Sending...' : 'Send Now'}
              </button>
              <button className="btn btn-secondary" onClick={() => setBroadcastMode(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!broadcastMode && (
          <div className="emailing-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => setBroadcastMode(true)} 
              disabled={teachers.length === 0}
            >
              Compose Broadcast
            </button>
          </div>
        )}
      </div>

      {/* Recipients Preview */}
      <div className="emailing-card">
        <div className="emailing-card-header">
          <h2 className="emailing-card-title">Recipients</h2>
        </div>
        
        {teachers.length === 0 ? (
          <p style={{ color: 'var(--text-3)' }}>No teachers found. Add teachers to send emails.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: 'var(--space-sm)',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {teachers.map((teacher, index) => (
              <div 
                key={index}
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--bg-2)',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: 600 }}>{teacher.name || teacher.email}</span>
                <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>{teacher.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Emailing;