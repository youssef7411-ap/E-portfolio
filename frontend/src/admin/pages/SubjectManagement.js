import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import '../../styles/SubjectManagement.css';
import { API_URL } from '../../config/api';

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

/* ── Image Cropper Component ─────────────────────────────── */
function ImageCropper({ image, onCropComplete, onCancel, onSave }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    onCropComplete(croppedAreaPixels);
  };

  return (
    <div className="sm-crop-modal">
      <div className="sm-crop-container">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={16 / 9}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropCompleteHandler}
        />
      </div>
      <div className="sm-crop-controls">
        <div className="sm-crop-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(e.target.value)}
          />
        </div>
        <div className="sm-crop-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Apply Crop</button>
        </div>
      </div>
    </div>
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
  const [showPreview, setShowPreview] = useState(true);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    visible: true,
    order: 0,
  });
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleImageChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      setUploadPreview(reader.result);
      await uploadImage(file);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async file => {
    setUploading(true);
    const token = localStorage.getItem('adminToken');
    const formDataFile = new FormData();
    formDataFile.append('file', file);
    
    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataFile,
      });
      
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, image: data.url }));
        setUploadError('');
      } else {
        setUploadError('Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', image: '', visible: true, order: 0 });
    setUploadPreview('');
    setShowForm(true);
  };
  const openEdit = subject => {
    setEditingId(subject._id);
    setFormData({
      name: subject.name || '',
      description: subject.description || '',
      image: subject.image || '',
      visible: subject.visible !== false,
      order: subject.order || 0,
    });
    setUploadPreview(subject.image || '');
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
    const payload = {
      ...formData,
      order: Number(formData.order) || 0,
    };
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
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

              <div className="form-group">
                <label>Cover Image</label>
                <div className="sm-upload-area">
                  {uploadPreview ? (
                    <div className="sm-upload-preview">
                      <img src={uploadPreview} alt="Preview" />
                      <div className="sm-upload-actions">
                        <button 
                          type="button" 
                          className="sm-crop-btn"
                          onClick={() => {
                            setCropImage(uploadPreview);
                            setShowCropper(true);
                          }}
                        >
                          ✂ Crop
                        </button>
                        <button 
                          type="button" 
                          className="sm-upload-remove"
                          onClick={() => {
                            setUploadPreview('');
                            setFormData(prev => ({ ...prev, image: '' }));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="sm-upload-drop">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={uploading}
                      />
                      <span className="sm-upload-label">
                        {uploading ? 'Uploading...' : 'Click or drag image here'}
                      </span>
                    </label>
                  )}
                  {uploadError && <p className="sm-upload-error">{uploadError}</p>}
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Brief description of this subject..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Order</label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Visibility</label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      name="visible"
                      checked={formData.visible}
                      onChange={handleFormChange}
                    />
                    <span className="toggle-switch"></span>
                    <span>{formData.visible ? 'Visible' : 'Hidden'}</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Subject' : 'Create Subject'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`btn ${showPreview ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setShowPreview(!showPreview)}
                  style={{ marginLeft: 'auto' }}
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>

              {/* Live Preview */}
              {showPreview && (
                <div className="sm-preview-card" style={{ marginTop: '1.5rem' }}>
                  <div className="sm-preview-header">
                    <h3>Live Preview</h3>
                  </div>
                  <div className="sm-preview-body">
                    {formData.image && (
                      <img 
                        src={formData.image} 
                        alt={formData.name || 'Subject'} 
                        className="sm-preview-image" 
                      />
                    )}
                    <h4 className="sm-preview-title">
                      {formData.name || 'Subject Name'}
                    </h4>
                    <p className="sm-preview-desc">
                      {formData.description || 'Description will appear here...'}
                    </p>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <span className={`badge ${formData.visible ? 'badge-green' : 'badge-gray'}`}>
                        {formData.visible ? 'Visible' : 'Hidden'}
                      </span>
                      <span className="badge badge-gray">
                        Order: {formData.order}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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

      {/* Image Cropper Modal */}
      {showCropper && cropImage && (
        <ImageCropper
          image={cropImage}
          onCropComplete={(pixels) => {
            // For simplicity, we'll just use the original image
            // A full implementation would crop and re-upload
            setShowCropper(false);
          }}
          onCancel={() => {
            setShowCropper(false);
            setCropImage(null);
          }}
          onSave={() => {
            setShowCropper(false);
            setCropImage(null);
          }}
        />
      )}
    </div>
  );
}

export default SubjectManagement;
