import React from 'react';
import { useState, useEffect } from 'react';
import '../../styles/SubjectManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

/* ── Sortable row ─────────────────────────────── */
function SortableRow({ subject, onEdit, onDelete }) {
  return (
    <tr>
      <td>
        <div className="sm-name-cell">
          {subject.image && (
            <img src={subject.image} alt="" className="sm-thumb" loading="lazy" />
          )}
          <span>{subject.name}</span>
        </div>
      </td>
      <td className="sm-desc-cell">{subject.description?.substring(0, 60) || '—'}</td>
      <td>
        <span className={`badge ${subject.visible ? 'badge-green' : 'badge-gray'}`}>
          {subject.visible ? 'Visible' : 'Hidden'}
        </span>
      </td>
      <td>
        <button className="table-btn edit" onClick={() => onEdit(subject)}>Edit</button>
        <button className="table-btn delete" onClick={() => onDelete(subject._id)}>Delete</button>
      </td>
    </tr>
  );
}

/* ── Main component ───────────────────────────── */
function SubjectManagement() {
  const [subjects, setSubjects]   = useState([]);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [formData, setFormData]   = useState({
    name: '',
  });

  useEffect(() => { fetchSubjects(); }, []);

  const fetchSubjects = async () => {
    try {
      setError('');
      const token = localStorage.getItem('adminToken');
      if (!token) {
        window.location.href = '/admin/login';
        return;
      }

      const res   = await fetch(`${API_URL}/api/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return;
      }

      if (!res.ok) {
        setSubjects([]);
        setError('Could not load subjects. Please refresh and try again.');
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setSubjects(data);
      } else {
        setSubjects([]);
        setError('Invalid subjects response from server.');
      }
    } catch (err) {
      console.error(err);
      setSubjects([]);
      setError('Network error while loading subjects.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '' });
    setShowForm(true);
  };
  const openEdit = subject => {
    setEditingId(subject._id);
    setFormData({
      name: subject.name || '',
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    const token  = localStorage.getItem('adminToken');
    const method = editingId ? 'PUT' : 'POST';
    const url    = editingId
      ? `${API_URL}/api/subjects/${editingId}`
      : `${API_URL}/api/subjects`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) { closeForm(); fetchSubjects(); }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this subject and all its posts?')) return;
    const token = localStorage.getItem('adminToken');
    await fetch(`${API_URL}/api/subjects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchSubjects();
  };

  if (loading) return <div className="management-loading"><span className="spinner" /></div>;

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Subjects</h1>
        <button className="btn btn-primary" onClick={showForm ? closeForm : openAdd}>
          {showForm ? '✕ Cancel' : '➕ Add Subject'}
        </button>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="pm-modal-overlay" onClick={closeForm}>
          <div className="pm-modal glass" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header">
              <div>
                <h2>{editingId ? 'Edit Subject' : 'Add New Subject'}</h2>
                <p className="pm-modal-subtitle">Subjects help organize your posts</p>
              </div>
              <button className="pm-modal-close" onClick={closeForm}>✕</button>
            </div>

            <form className="pm-modal-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subject Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g., Mathematics 101"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Subject' : 'Create Subject'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(subject => (
              <SortableRow
                key={subject._id}
                subject={subject}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
        {subjects.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
            No subjects yet.
          </div>
        )}
        {error && (
          <div style={{ padding: '0 20px 20px', color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubjectManagement;
