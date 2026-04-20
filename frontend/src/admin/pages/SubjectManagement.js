import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useDropzone } from 'react-dropzone';
import { getCroppedImg } from '../utils/cropImage';
import '../../styles/SubjectManagement.css';
import { API_URL } from '../../config/api';

/* ── Sortable row ─────────────────────────────── */
function SortableRow({ subject, onEdit, onDelete }) {
  return (
    <tr>
      <td>
        <div className="sm-name-cell">
          {subject.buttonImage ? (
            <div 
              className="sm-thumb-container" 
              style={{ backgroundColor: subject.bgColor || 'var(--bg-2)' }}
            >
              <img src={subject.buttonImage} alt="" className="sm-thumb-img" loading="lazy" />
            </div>
          ) : subject.image ? (
            <img src={subject.image} alt="" className="sm-thumb" loading="lazy" />
          ) : (
            <div className="sm-thumb sm-placeholder">
              {subject.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span>{subject.name}</span>
        </div>
      </td>
      <td>
        <button className="table-btn edit" onClick={() => onEdit(subject)}>Edit</button>
        <button className="table-btn delete" onClick={() => onDelete(subject._id)}>Delete</button>
      </td>
    </tr>
  );
}

/* ── Image Cropper Component ─────────────────────────────── */
function ImageCropper({ image, onCropComplete, onCancel, initialAspect = 16 / 9 }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(initialAspect);
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

  const handleSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="sm-crop-modal">
      <div className="sm-crop-container">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropCompleteHandler}
        />
      </div>
      <div className="sm-crop-controls">
        <div className="sm-aspect-ratios">
          <button 
            type="button" 
            className={`aspect-btn ${aspect === 16/9 ? 'active' : ''}`}
            onClick={() => setAspect(16/9)}
          >
            16:9
          </button>
          <button 
            type="button" 
            className={`aspect-btn ${aspect === 4/3 ? 'active' : ''}`}
            onClick={() => setAspect(4/3)}
          >
            4:3
          </button>
          <button 
            type="button" 
            className={`aspect-btn ${aspect === 3/2 ? 'active' : ''}`}
            onClick={() => setAspect(3/2)}
          >
            3:2
          </button>
          <button 
            type="button" 
            className={`aspect-btn ${aspect === 1 ? 'active' : ''}`}
            onClick={() => setAspect(1)}
          >
            1:1
          </button>
        </div>
        <div className="sm-crop-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
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
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropTarget, setCropTarget] = useState('image'); // 'image' or 'buttonImage'
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    buttonImage: '',
    bgColor: '#3b82f6',
  });
  const [headerPreview, setHeaderPreview] = useState('');
  const [buttonPreview, setButtonPreview] = useState('');
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

  const onDropHeader = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setCropTarget('image');
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDropButton = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size exceeds 2MB limit for buttons.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setCropTarget('buttonImage');
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps: getHeaderProps, getInputProps: getHeaderInputProps, isDragActive: isHeaderDragActive } = useDropzone({
    onDrop: onDropHeader,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false
  });

  const { getRootProps: getButtonProps, getInputProps: getButtonInputProps, isDragActive: isButtonDragActive } = useDropzone({
    onDrop: onDropButton,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false
  });

  const uploadImage = async (blob, target) => {
    setUploading(true);
    const token = localStorage.getItem('adminToken');
    const formDataFile = new FormData();
    const filename = target === 'image' ? 'header.jpg' : 'button.png';
    formDataFile.append('file', blob, filename);
    
    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataFile,
      });
      
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, [target]: data.url }));
        if (target === 'image') setHeaderPreview(data.url);
        else setButtonPreview(data.url);
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

  const handleCropComplete = async (croppedBlob) => {
    setShowCropper(false);
    await uploadImage(croppedBlob, cropTarget);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', image: '', buttonImage: '', bgColor: '#3b82f6' });
    setHeaderPreview('');
    setButtonPreview('');
    setShowForm(true);
  };
  const openEdit = subject => {
    setEditingId(subject._id);
    setFormData({
      name: subject.name || '',
      image: subject.image || '',
      buttonImage: subject.buttonImage || '',
      bgColor: subject.bgColor || '#3b82f6',
    });
    setHeaderPreview(subject.image || '');
    setButtonPreview(subject.buttonImage || '');
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
          {showForm ? (
            <>
              <svg style={{ marginRight: '8px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Cancel
            </>
          ) : (
            <>
              <svg style={{ marginRight: '8px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Subject
            </>
          )}
        </button>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="pm-modal-overlay" onClick={closeForm}>
          <div className="pm-modal glass sm-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header">
              <div>
                <h2>{editingId ? 'Edit Subject' : 'Add New Subject'}</h2>
                <p className="pm-modal-subtitle">Subjects help organize your posts</p>
              </div>
              <button className="pm-modal-close" onClick={closeForm}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form className="pm-modal-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subject Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div className="sm-upload-grid">
                <div className="form-group">
                  <label>Header Image (16:9 recommended)</label>
                  <div {...getHeaderProps()} className={`sm-upload-drop ${isHeaderDragActive ? 'active' : ''}`}>
                    <input {...getHeaderInputProps()} />
                    {headerPreview ? (
                      <div className="sm-upload-preview">
                        <img src={headerPreview} alt="Header Preview" />
                        <div className="sm-upload-overlay">Change Image</div>
                      </div>
                    ) : (
                      <span className="sm-upload-label">
                        {uploading ? 'Processing...' : 'Drop header image here'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Button Image (Icon/PNG)</label>
                  <div {...getButtonProps()} className={`sm-upload-drop ${isButtonDragActive ? 'active' : ''}`}>
                    <input {...getButtonInputProps()} />
                    {buttonPreview ? (
                      <div className="sm-button-preview-container" style={{ backgroundColor: formData.bgColor }}>
                        <img src={buttonPreview} alt="Button Preview" className="sm-button-img" />
                        <div className="sm-upload-overlay">Change Icon</div>
                      </div>
                    ) : (
                      <span className="sm-upload-label">
                        {uploading ? 'Processing...' : 'Drop icon here'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Button Background Color</label>
                <div className="sm-color-picker">
                  <input
                    type="color"
                    name="bgColor"
                    value={formData.bgColor}
                    onChange={handleFormChange}
                    className="sm-color-input"
                  />
                  <span className="sm-color-value">{formData.bgColor}</span>
                </div>
              </div>

              <div className="sm-preview-section">
                <label>Subject Button Preview</label>
                <div className="sm-button-preview-card">
                  <div 
                    className="sm-preview-button" 
                    style={{ backgroundColor: formData.bgColor }}
                  >
                    {buttonPreview ? (
                      <img src={buttonPreview} alt="" className="sm-preview-icon" />
                    ) : (
                      <span className="sm-preview-initials">{formData.name ? formData.name.slice(0, 2).toUpperCase() : '??'}</span>
                    )}
                  </div>
                  <div className="sm-preview-info">
                    <strong>{formData.name || 'Subject Name'}</strong>
                    <span>Preview of how it appears on home page</span>
                  </div>
                </div>
              </div>

              {uploadError && <p className="sm-upload-error">{uploadError}</p>}

              <div className="pm-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
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
              <th>Subject</th>
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
          <div className="sm-empty">
            No subjects yet.
          </div>
        )}
        {error && (
          <div className="sm-error">
            {error}
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && cropImage && (
        <ImageCropper
          image={cropImage}
          initialAspect={cropTarget === 'image' ? 16 / 9 : 1}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setCropImage(null);
          }}
        />
      )}
    </div>
  );
}

export default SubjectManagement;
