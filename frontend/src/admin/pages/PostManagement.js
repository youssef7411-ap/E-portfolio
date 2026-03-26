import { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-quill/dist/quill.snow.css';
import '../../styles/PostManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const UPLOAD_FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', txt: '📃',
  py: '🐍', js: '📜', ts: '📘', html: '🌐', htm: '🌐', java: '☕',
  c: '⚙️', cpp: '⚙️', cs: '⚙️',
  json: '🔢', yaml: '📋', yml: '📋', xml: '🔖', csv: '📊', md: '📝',
  zip: '🗜️', rar: '🗜️', '7z': '🗜️',
  xls: '📊', xlsx: '📊', ppt: '📋', pptx: '📋',
};

const formatBytes = b => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const uploadFileIcon = name => {
  const ext = name?.split('.').pop()?.toLowerCase() || '';
  return UPLOAD_FILE_ICONS[ext] || '📎';
};

const CODE_LANGS = { py: 'Python', js: 'JavaScript', ts: 'TypeScript', html: 'HTML', htm: 'HTML', json: 'JSON', yaml: 'YAML', yml: 'YAML', xml: 'XML', csv: 'CSV', java: 'Java', c: 'C', cpp: 'C++', cs: 'C#', md: 'Markdown' };
const langBadge = name => {
  const ext = name?.split('.').pop()?.toLowerCase() || '';
  return CODE_LANGS[ext] || null;
};

const EMPTY_FORM = {
  title: '', description: '', subject_id: '', semester: '', grade: '',
  type: 'note', files: [], images: [], videos: [], published: true,
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'code'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'code-block'],
    ['clean'],
  ],
};

const buildFolderZipFile = async files => {
  if (!files.length) return null;
  const zip = new JSZip();
  const firstPath = files[0]?.webkitRelativePath || '';
  const rootFolder = firstPath.split('/')[0] || 'folder-upload';

  for (const file of files) {
    const relativePath = (file.webkitRelativePath || file.name || 'file').replace(/\\/g, '/');
    const data = await file.arrayBuffer();
    zip.file(relativePath, data);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return new File([zipBlob], `${rootFolder}.zip`, { type: 'application/zip' });
};

const compressImage = (file, quality = 0.4) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height *= maxDim / width;
            width = maxDim;
          } else {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const getFileKind = (file) => {
  const type = file.type || '';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  return 'file';
};

export default function PostManagement() {
  const [posts, setPosts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lowQuality, setLowQuality] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        window.location.href = '/admin/login';
        return;
      }

      const [postsRes, subjectsRes] = await Promise.all([
        fetch(`${API_URL}/api/posts/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/subjects`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (postsRes.status === 401 || postsRes.status === 403 || subjectsRes.status === 401 || subjectsRes.status === 403) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return;
      }

      const postsData = postsRes.ok ? await postsRes.json() : [];
      const subjectsData = subjectsRes.ok ? await subjectsRes.json() : [];
      setPosts(Array.isArray(postsData) ? postsData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (err) {
      console.error('PostManagement fetchData:', err);
      setPosts([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const sid = post.subject_id?._id || post.subject_id || '';
      if (filterSubject && sid !== filterSubject) return false;
      if (filterSemester && post.semester !== filterSemester) return false;
      if (filterStatus && String(post.published) !== filterStatus) return false;
      if (filterType && post.type !== filterType) return false;
      return true;
    });
  }, [posts, filterSubject, filterSemester, filterStatus, filterType]);

  const uploadSelectedFiles = async (files, options = {}) => {
    const { preserveStructure = false } = options;
    if (!files.length) return;
    setUploadError('');
    setUploading(true);
    const token = localStorage.getItem('adminToken');

    for (let file of files) {
      const kind = getFileKind(file);
      
      // Apply compression if it's an image and lowQuality is enabled
      if (kind === 'image' && lowQuality) {
        try {
          file = await compressImage(file, 0.4);
        } catch (err) {
          console.error('Compression failed:', err);
        }
      }

      const fd = new FormData();
      fd.append('file', file);
      
      try {
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setUploadError(data.message || `Upload failed for ${file.name}`);
          continue;
        }
        if (data.url) {
          const displayName = file.webkitRelativePath || data.filename || file.name;
          if (preserveStructure || kind === 'file') {
            setFormData(prev => ({
              ...prev,
              files: [...prev.files, {
                name: displayName,
                url: data.url,
                mimetype: data.mimetype || '',
                size: data.size || 0,
              }],
            }));
          } else if (kind === 'image') {
            setFormData(prev => ({ ...prev, images: [...prev.images, data.url] }));
          } else if (kind === 'video') {
            setFormData(prev => ({ ...prev, videos: [...prev.videos, data.url] }));
          }
        }
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError(`Network error while uploading ${file.name}`);
      }
    }
    setUploading(false);
  };

  const handleFileUpload = async e => {
    const files = Array.from(e.target.files || []);
    await uploadSelectedFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFolderUpload = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const zipFile = await buildFolderZipFile(files);
    if (zipFile) {
      await uploadSelectedFiles([zipFile], { preserveStructure: true });
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = post => {
    setEditingId(post._id);
    setFormData({
      title: post.title || '',
      description: post.description || '',
      subject_id: post.subject_id?._id || post.subject_id || '',
      semester: post.semester || '',
      grade: post.grade || '',
      type: post.type || 'note',
      files: post.files || [],
      images: post.images || [],
      videos: post.videos || [],
      published: post.published !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setUploadError('');
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleQuillChange = value => {
    setFormData(prev => ({ ...prev, description: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    const url = editingId
      ? `${API_URL}/api/posts/${editingId}`
      : `${API_URL}/api/posts`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        closeModal();
        fetchData();
      }
    } catch (err) {
      console.error('Save post error:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(`${API_URL}/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error('Delete post error:', err);
    }
  };

  const togglePublished = async (post) => {
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(`${API_URL}/api/posts/${post._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ published: !post.published }),
        }
      );
      fetchData();
    } catch (err) {
      console.error('Toggle publish error:', err);
    }
  };

  const removeAsset = (kind, index) => {
    setFormData(prev => ({
      ...prev,
      [kind]: prev[kind].filter((_, i) => i !== index),
    }));
  };

  if (loading) return <div className="management-loading"><span className="spinner" /></div>;

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>Post Management</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <span style={{ fontSize: '1.25rem' }}>+</span>
          <span>Add New Post</span>
        </button>
      </div>

      {/* Filters */}
      <div className="pm-filters">
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
          <option value="">All Semesters</option>
          {[...new Set(posts.map(p => p.semester))].filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="note">Note</option>
          <option value="assignment">Assignment</option>
          <option value="project">Project</option>
          <option value="exam">Exam</option>
          <option value="other">Other</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
        <span className="pm-count">{filteredPosts.length} posts</span>
      </div>

      {/* Posts Table */}
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map(post => (
              <tr key={post._id}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{post.title}</td>
                <td>{post.subject_id?.name || 'N/A'}</td>
                <td>
                  <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                    {post.type || 'other'}
                  </span>
                </td>
                <td>
                  <button 
                    className={`pm-publish-btn ${post.published ? 'published' : 'draft'}`}
                    onClick={() => togglePublished(post)}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td>{new Date(post.updatedAt || post.date_created).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="table-btn edit" onClick={() => openEditModal(post)}>Edit</button>
                    <button className="table-btn delete" onClick={() => handleDelete(post._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPosts.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
            No posts match the current filters.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="pm-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="pm-modal glass"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'circOut' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="pm-modal-header">
                <div>
                  <h2>{editingId ? 'Edit Post' : 'Add New Post'}</h2>
                  <p className="pm-modal-subtitle">Fill out the details for your post</p>
                </div>
                <button className="pm-modal-close" onClick={closeModal}>✕</button>
              </div>

              <div className="pm-modal-body">
                {/* --- Basic Info --- */}
                <section className="pm-form-section">
                  <div className="pm-section-title">Basic Information</div>
                  <div className="form-group">
                    <label>Post Title</label>
                    <input
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      placeholder="e.g., Midterm Exam Study Guide"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={handleQuillChange}
                      modules={QUILL_MODULES}
                    />
                  </div>
                </section>

                {/* --- Categorization --- */}
                <section className="pm-form-section">
                  <div className="pm-section-title">Categorization</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Subject</label>
                      <select name="subject_id" value={formData.subject_id} onChange={handleFormChange}>
                        <option value="">Select a subject</option>
                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Type</label>
                      <select name="type" value={formData.type} onChange={handleFormChange}>
                        <option value="note">Note</option>
                        <option value="assignment">Assignment</option>
                        <option value="project">Project</option>
                        <option value="exam">Exam</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Semester</label>
                      <input name="semester" value={formData.semester} onChange={handleFormChange} placeholder="e.g., Fall 2024" />
                    </div>
                    <div className="form-group">
                      <label>Grade</label>
                      <input name="grade" value={formData.grade} onChange={handleFormChange} placeholder="e.g., A+" />
                    </div>
                  </div>
                </section>

                {/* --- Attachments --- */}
                <section className="pm-form-section">
                  <div className="pm-section-header">
                    <div className="pm-section-title">Attachments</div>
                    <div className="pm-compression-toggle">
                      <button
                        type="button"
                        className={`toggle-label ${!lowQuality ? 'active' : ''}`}
                        onClick={() => setLowQuality(false)}
                      >
                        High Quality
                      </button>
                      <motion.button
                        type="button"
                        className={`toggle-switch ${lowQuality ? 'on' : ''}`}
                        onClick={() => setLowQuality(!lowQuality)}
                        whileTap={{ scale: 0.9 }}
                        aria-pressed={lowQuality}
                      >
                        <motion.div className="toggle-handle" layout />
                      </motion.button>
                      <button
                        type="button"
                        className={`toggle-label ${lowQuality ? 'active' : ''}`}
                        onClick={() => setLowQuality(true)}
                      >
                        Low Quality
                      </button>
                    </div>
                  </div>

                  <div className="pm-upload-buttons">
                    <label className="pm-upload-btn-fancy">
                      <span className="icon">📄</span>
                      <div className="text">
                        <strong>Upload Files</strong>
                        <span>Images, videos, documents</span>
                      </div>
                      <input type="file" multiple onChange={handleFileUpload} ref={fileInputRef} style={{ display: 'none' }} />
                    </label>
                    <label className="pm-upload-btn-fancy">
                      <span className="icon">🗂️</span>
                      <div className="text">
                        <strong>Upload Folder</strong>
                        <span>Preserves structure</span>
                      </div>
                      <input type="file" multiple webkitdirectory="true" onChange={handleFolderUpload} ref={folderInputRef} style={{ display: 'none' }} />
                    </label>
                  </div>

                  {uploading && <div className="pm-upload-progress"><span className="spinner" /> Uploading...</div>}
                  {uploadError && <div style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>{uploadError}</div>}

                  {formData.images.length > 0 && (
                    <div className="pm-asset-group">
                      <label>Images</label>
                      <div className="pm-image-grid-fancy">
                        {formData.images.map((url, i) => (
                          <div key={i} className="pm-image-card">
                            <img src={url} alt="" className="pm-img-preview" />
                            <button className="pm-remove-btn" onClick={() => removeAsset('images', i)}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.videos.length > 0 && (
                    <div className="pm-asset-group">
                      <label>Videos</label>
                      <ul className="pm-file-list-fancy">
                        {formData.videos.map((url, i) => (
                          <li key={i} className="pm-file-item-fancy">
                            <span className="icon">🎬</span>
                            <div className="file-info">
                              <span className="name">{url.split('/').pop()}</span>
                            </div>
                            <button className="remove" onClick={() => removeAsset('videos', i)}>✕</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {formData.files.length > 0 && (
                    <div className="pm-asset-group">
                      <label>Files</label>
                      <ul className="pm-file-list-fancy">
                        {formData.files.map((file, i) => (
                          <li key={i} className="pm-file-item-fancy">
                            <span className="icon">{uploadFileIcon(file.name)}</span>
                            <div className="file-info">
                              <span className="name">{file.name}</span>
                              <span className="meta">
                                {formatBytes(file.size)}
                                {langBadge(file.name) && <span className="badge">{langBadge(file.name)}</span>}
                              </span>
                            </div>
                            <button className="remove" onClick={() => removeAsset('files', i)}>✕</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                <div className="pm-checkbox-fancy">
                  <label>
                    <input type="checkbox" name="published" checked={formData.published} onChange={handleFormChange} />
                    <div className="custom-check">✓</div>
                    <div className="text">
                      <strong>Published</strong>
                      <span>Make this post visible to viewers</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pm-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : (editingId ? 'Update Post' : 'Create Post')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
