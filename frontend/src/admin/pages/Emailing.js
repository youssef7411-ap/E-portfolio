import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../styles/Admin.css';
import { API_URL } from '../../config/api';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'link', 'image'
];

const EMAIL_TEMPLATES = [
  { id: 'blank', label: 'Blank', subject: '', body: '' },
  { id: 'meeting', label: 'Meeting Request', subject: 'Meeting Request - [Topic]', body: '<p>Dear Teacher,</p><p>I would like to schedule a meeting to discuss...</p><p>Please let me know your availability.</p><p>Best regards</p>' },
  { id: 'reminder', label: 'Reminder', subject: 'Reminder: [Topic]', body: '<p>Dear Teacher,</p><p>This is a reminder about...</p><p>Please take action at your earliest convenience.</p><p>Best regards</p>' },
  { id: 'announcement', label: 'Announcement', subject: 'Announcement: [Topic]', body: '<p>Dear Teachers,</p><p>I am pleased to announce that...</p><p>Please feel free to reach out if you have any questions.</p><p>Best regards</p>' },
];

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
  const [emailHistory, setEmailHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [activeTab, setActiveTab] = useState('compose');
  const [filterText, setFilterText] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [composeMode, setComposeMode] = useState('single');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [composeForm, setComposeForm] = useState({ subject: '', body: '', template: 'blank' });

  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [settingsRes, teachersRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/email/settings`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/teachers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/email/history`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ ok: false, json: () => [] })),
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

      if (historyRes.ok) {
        const data = await historyRes.json();
        setEmailHistory(Array.isArray(data) ? data : []);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

  const handleTemplateChange = (templateId) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setComposeForm(prev => ({ ...prev, template: templateId, subject: template.subject, body: template.body }));
    }
  };

  const handleSendSingle = async () => {
    if (!composeForm.subject.trim()) {
      setMessage({ type: 'error', text: 'Please enter a subject.' });
      return;
    }
    if (!selectedTeacher?.email) {
      setMessage({ type: 'error', text: 'Please select a recipient.' });
      return;
    }

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/email/send-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          to: selectedTeacher.email,
          subject: composeForm.subject,
          body: composeForm.body,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Email sent to ${selectedTeacher.name || selectedTeacher.email}!` });
        setComposeForm({ subject: '', body: '', template: 'blank' });
        setSelectedTeacher(null);
        setActiveTab('history');
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Failed to send email.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error sending email.' });
    } finally {
      setSending(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!composeForm.subject.trim()) {
      setMessage({ type: 'error', text: 'Please enter a subject.' });
      return;
    }

    setShowConfirm(true);
  };

  const confirmBroadcast = async () => {
    setShowConfirm(false);
    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/email/send-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject: composeForm.subject, body: composeForm.body }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: `Emails sent to ${data.sent || teachers.length} recipients!` });
        setComposeForm({ subject: '', body: '', template: 'blank' });
        setActiveTab('history');
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Failed to send emails.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error sending emails.' });
    } finally {
      setSending(false);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesText = !filterText || 
      (t.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(filterText.toLowerCase());
    const matchesDept = !filterDept || (t.department || '') === filterDept;
    const matchesStatus = !filterStatus || ((t.status || 'active') === filterStatus);
    return matchesText && matchesDept && matchesStatus;
  });

  const departments = [...new Set(teachers.map(t => t.department).filter(Boolean))];

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

      {/* Tabs */}
      <div className="emailing-tabs">
        <button 
          className={`tab-btn ${activeTab === 'compose' ? 'active' : ''}`}
          onClick={() => setActiveTab('compose')}
        >
          <span className="tab-icon">✉</span>
          Compose
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recipients' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipients')}
        >
          <span className="tab-icon">👥</span>
          Recipients ({teachers.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📋</span>
          History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="tab-icon">⚙</span>
          Settings
        </button>
      </div>

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="emailing-card">
          <div className="compose-mode-toggle">
            <button 
              className={`mode-btn ${composeMode === 'single' ? 'active' : ''}`}
              onClick={() => setComposeMode('single')}
            >
              Send to Individual
            </button>
            <button 
              className={`mode-btn ${composeMode === 'broadcast' ? 'active' : ''}`}
              onClick={() => setComposeMode('broadcast')}
            >
              Send to All ({teachers.length})
            </button>
          </div>

          {composeMode === 'single' && (
            <div className="form-group">
              <label className="form-label">Recipient</label>
              <select 
                className="input"
                value={selectedTeacher?._id || ''}
                onChange={(e) => {
                  const teacher = teachers.find(t => t._id === e.target.value);
                  setSelectedTeacher(teacher || null);
                }}
              >
                <option value="">Select a teacher...</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name || t.email} ({t.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Subject <span className="required">*</span>
              <span className="char-count">
                {composeForm.subject.length}/100
              </span>
            </label>
            <input
              type="text"
              className="input subject-input"
              value={composeForm.subject}
              onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value.slice(0, 100) }))}
              placeholder="Enter email subject..."
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Template</label>
            <select 
              className="input"
              value={composeForm.template}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              {EMAIL_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <div className="quill-wrapper">
              <ReactQuill
                theme="snow"
                value={composeForm.body}
                onChange={(content) => setComposeForm(prev => ({ ...prev, body: content }))}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Write your message..."
              />
            </div>
          </div>

          <div className="compose-actions">
            {composeMode === 'single' ? (
              <button 
                className="btn btn-primary" 
                onClick={handleSendSingle}
                disabled={sending || !selectedTeacher}
              >
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={handleSendBroadcast}
                disabled={sending || teachers.length === 0}
              >
                {sending ? 'Sending...' : `Broadcast to All (${teachers.length})`}
              </button>
            )}
            <button 
              className="btn btn-ghost" 
              onClick={() => setComposeForm({ subject: '', body: '', template: 'blank' })}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Recipients Tab */}
      {activeTab === 'recipients' && (
        <div className="emailing-card">
          <div className="filters-row">
            <div className="filter-search">
              <input
                type="text"
                className="input"
                placeholder="Search teachers..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <select 
              className="input filter-select"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select 
              className="input filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="recipients-table-wrap">
            <table className="recipients-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">No teachers found.</td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher, index) => (
                    <tr key={index}>
                      <td className="teacher-name">{teacher.name || '—'}</td>
                      <td className="teacher-email">{teacher.email}</td>
                      <td className="teacher-dept">{teacher.department || '—'}</td>
                      <td>
                        <span className={`status-badge ${teacher.status || 'active'}`}>
                          {teacher.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="action-btn"
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setComposeMode('single');
                            setActiveTab('compose');
                          }}
                          title="Send email"
                        >
                          ✉
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="results-count">
            Showing {filteredTeachers.length} of {teachers.length} teachers
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="emailing-card">
          <div className="emailing-card-header">
            <h2 className="emailing-card-title">Email History</h2>
            <span className="badge badge-gray">{emailHistory.length} sent</span>
          </div>
          
          {emailHistory.length === 0 ? (
            <p style={{ color: 'var(--text-3)' }}>No emails sent yet.</p>
          ) : (
            <div className="history-list">
              {emailHistory.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-header">
                    <span className="history-subject">{item.subject}</span>
                    <span className="history-date">
                      {item.sentAt ? new Date(item.sentAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="history-recipient">
                    To: {item.recipient || item.teacherEmail || 'All recipients'}
                  </div>
                  <div className="history-status">
                    <span className={`status-badge ${item.status}`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <>
          <div className="emailing-card">
            <div className="emailing-card-header">
              <h2 className="emailing-card-title">SMTP Settings</h2>
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
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Broadcast</h3>
            <p>Are you sure you want to send this email to all {teachers.length} teachers?</p>
            <p className="modal-subject">Subject: {composeForm.subject}</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={confirmBroadcast} disabled={sending}>
                {sending ? 'Sending...' : 'Confirm Send'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Emailing;