import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useDropzone } from 'react-dropzone';
import { getCroppedImg } from '../utils/cropImage';
import '../../styles/SubjectManagement.css';
import { API_URL } from '../../config/api';

const MAX_HEADER_SIZE_MB = 5;
const MAX_HEADER_SIZE_BYTES = MAX_HEADER_SIZE_MB * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp'];
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getExt = (name = '') => {
  const i = String(name).lastIndexOf('.');
  return i >= 0 ? String(name).slice(i).toLowerCase() : '';
};

const getRejectionMessage = (rejections) => {
  if (!Array.isArray(rejections) || rejections.length === 0) return 'Invalid file.';
  const first = rejections[0];
  const err = first?.errors?.[0];
  if (!err?.code) return 'Invalid file. Please choose a valid image.';
  if (err.code === 'file-invalid-type') {
    return 'Invalid file type. Please upload JPG, PNG, or WEBP.';
  }
  if (err.code === 'file-too-large') {
    return `File is too large. Maximum size is ${MAX_HEADER_SIZE_MB}MB.`;
  }
  if (err.code === 'too-many-files') {
    return 'Please upload one image at a time.';
  }
  return err.message || 'Could not process this file.';
};

const validateHeaderFile = (file) => {
  if (!file) return 'No file selected.';
  const mime = String(file.type || '').toLowerCase();
  const ext = getExt(file.name || '');
  const mimeOk = ACCEPTED_MIME_TYPES.includes(mime);
  const extOk = ACCEPTED_EXTENSIONS.includes(ext);
  if (!mimeOk && !extOk) {
    return 'Unsupported format. Allowed: JPG, PNG, WEBP.';
  }
  if (Number(file.size || 0) > MAX_HEADER_SIZE_BYTES) {
    return `File exceeds ${MAX_HEADER_SIZE_MB}MB limit.`;
  }
  return '';
};

function SortableRow({ subject, onEdit, onDelete }) {
  // Ensure subject is valid and has required properties
  if (!subject || typeof subject !== 'object') {
    return null;
  }

  const subjectName = String(subject.name || '');
  const subjectDescription = String(subject.description || '');
  const subjectImage = String(subject.image || '');

  return (
    <tr>
      <td>
        <div className="sm-name-cell">
          <div
            className="sm-thumb sm-image-thumb"
            title={subjectName}
          >
            {subjectImage ? (
              <img src={subjectImage} alt="" className="sm-thumb-img" loading="lazy" />
            ) : (
              <span className="sm-thumb-letter">{subjectName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="sm-name-info">
            <span className="sm-name">{subjectName}</span>
            <span className="sm-desc">{subjectDescription.slice(0, 50) || 'No description'}</span>
          </div>
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

  const onCropCompleteHandler = useCallback((_, croppedAreaPixels) => {
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
  const [cropTarget] = useState('image');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
  });
  const [headerPreview, setHeaderPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
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
    setUploadError('');
    setUploadSuccess('');
    const file = acceptedFiles[0];
    if (!file) return;
    const validationError = validateHeaderFile(file);
    if (validationError) {
      setUploadStatus('');
      setUploadProgress(0);
      setUploadError(validationError);
      return;
    }

    setUploadStatus('Preparing image...');
    const reader = new FileReader();
    reader.onerror = () => {
      setUploadStatus('');
      setUploadProgress(0);
      setUploadError('Could not read the selected file. Please try a different image.');
    };
    reader.onload = () => {
      setCropImage(reader.result);
      setUploadStatus('Image ready. Crop and apply to continue.');
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDropHeaderRejected = useCallback((fileRejections) => {
    setUploadStatus('');
    setUploadProgress(0);
    setUploadSuccess('');
    setUploadError(getRejectionMessage(fileRejections));
  }, []);

  const { getRootProps: getHeaderProps, getInputProps: getHeaderInputProps, isDragActive: isHeaderDragActive } = useDropzone({
    onDrop: onDropHeader,
    onDropRejected: onDropHeaderRejected,
    accept: 'image/jpeg,image/png,image/webp,.jpeg,.jpg,.png,.webp',
    multiple: false,
    maxSize: MAX_HEADER_SIZE_BYTES,
  });

  const uploadImage = async (blob, target) => {
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(0);
    setUploadStatus('Uploading image...');
    const token = localStorage.getItem('adminToken');
    const formDataFile = new FormData();
    const filename = target === 'image' ? 'header.jpg' : 'button.png';
    formDataFile.append('file', blob, filename);

    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          const p = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(p);
          setUploadStatus(`Uploading image... ${p}%`);
        };

        xhr.onerror = () => reject(new Error('Network error while uploading image.'));

        xhr.onload = () => {
          let parsed = null;
          try {
            parsed = JSON.parse(xhr.responseText || '{}');
          } catch {
            parsed = null;
          }

          if (xhr.status === 401 || xhr.status === 403) {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin/login';
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300 && parsed?.url) {
            resolve(parsed);
            return;
          }

          reject(new Error(parsed?.message || `Upload failed (${xhr.status}).`));
        };

        xhr.send(formDataFile);
      });

      setFormData(prev => ({ ...prev, [target]: data.url }));
      if (target === 'image') setHeaderPreview(data.url);
      setUploadProgress(100);
      setUploadStatus('Upload complete.');
      setUploadSuccess('Cover image uploaded successfully.');
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus('');
      setUploadProgress(0);
      setUploadSuccess('');
      setUploadError(err?.message || 'Upload failed. Please try again.');
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
    setFormData({ name: '', description: '', image: '' });
    setHeaderPreview('');
    setUploadStatus('');
    setUploadProgress(0);
    setUploadSuccess('');
    setUploadError('');
    setShowForm(true);
  };
  const openEdit = subject => {
    setEditingId(subject._id);
    setFormData({
      name: subject.name || '',
      description: subject.description || '',
      image: subject.image || '',
    });
    setHeaderPreview(subject.image || '');
    setUploadStatus('');
    setUploadProgress(0);
    setUploadSuccess('');
    setUploadError('');
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setUploadStatus('');
    setUploadProgress(0);
    setUploadSuccess('');
    setUploadError('');
  };

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

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Brief description of this subject"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Header Image (16:9 recommended)</label>
                <div {...getHeaderProps()} className={`sm-upload-drop ${isHeaderDragActive ? 'active' : ''}`}>
                  <input {...getHeaderInputProps()} />
                  {headerPreview ? (
                    <div className="sm-upload-preview">
                      <img src={headerPreview} alt="Header Preview" />
                      <div className="sm-upload-overlay">Change Header</div>
                    </div>
                  ) : (
                    <span className="sm-upload-label">
                      {uploading ? 'Processing...' : 'Drop header image here or click to upload'}
                    </span>
                  )}
                </div>
                <p className="sm-upload-hint">Accepted formats: JPG, PNG, WEBP. Max size: {MAX_HEADER_SIZE_MB}MB.</p>
                {(uploadStatus || uploading) && (
                  <div className="sm-upload-status" aria-live="polite">
                    <div className="sm-upload-status-head">
                      <span>{uploadStatus || 'Uploading image...'}</span>
                      <strong>{uploadProgress}%</strong>
                    </div>
                    <div className="sm-upload-progress-track" aria-hidden="true">
                      <span className="sm-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>


              {uploadError && <p className="sm-upload-error" role="alert">{uploadError}</p>}
              {uploadSuccess && <p className="sm-upload-success">{uploadSuccess}</p>}

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
            {subjects
              .filter(subject => subject && subject._id) // Filter out invalid subjects
              .map(subject => (
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
