import { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-quill/dist/quill.snow.css';
import '../../styles/PostManagement.css';
import { API_URL } from '../../config/api';
import { htmlToPlainText, plainTextToQuillHtml } from '../utils/aiText';

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

const ALLOWED_FOLDER_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'vue',
  'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rb', 'php',
  'html', 'htm', 'css', 'scss', 'less',
  'json', 'xml', 'md', 'txt', 'yml', 'yaml',
  'sql', 'sh', 'bat',
  'gitignore', 'dockerignore',
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
  'pdf',
]);

const BLOCKED_FOLDER_EXTENSIONS = new Set([
  'exe', 'msi', 'dmg', 'pkg', 'app',
  'dll', 'so', 'dylib',
  'bin', 'iso', 'img',
  'p12', 'pfx', 'pem', 'key', 'crt', 'cer', 'der', 'keystore',
]);

const IGNORED_FOLDER_NAMES = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo', '.cache',
]);

const MAX_FOLDER_FILES = 2000;
const MAX_FOLDER_TOTAL_BYTES = 250 * 1024 * 1024;

const SEMESTER_OPTIONS = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
  { value: 'third', label: 'Third Semester' },
];

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1);
  return { value, label: `Grade ${value}` };
});

const EMPTY_FORM = {
  title: '', description: '', subject_id: '', semester: '', grade: '',
  type: 'note', files: [], images: [], videos: [], links: [], published: true,
};

const normalizeSemester = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  const token = raw.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  if (token === 'first' || token === '1' || token === '1st') return 'first';
  if (token === 'second' || token === '2' || token === '2nd') return 'second';
  if (token === 'third' || token === '3' || token === '3rd') return 'third';
  return '';
};

const normalizeGrade = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/\d{1,2}/);
  if (!match) return '';
  const n = Number(match[0]);
  if (!Number.isInteger(n) || n < 1 || n > 12) return '';
  return String(n);
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

const sanitizeZipPath = (value) => {
  const raw = String(value || '').replace(/\\/g, '/').trim();
  const withoutLeading = raw.replace(/^([a-zA-Z]:)?\/+/, '');
  const parts = withoutLeading.split('/').filter(Boolean);
  if (parts.some((p) => p === '.' || p === '..')) return '';
  return parts.join('/');
};

const getExtension = (name) => {
  const base = String(name || '').split('/').pop() || '';
  if (base.startsWith('.') && !base.includes('.', 1)) return base.slice(1).toLowerCase();
  const ext = base.split('.').pop() || '';
  return ext.toLowerCase();
};

const validateFolderFiles = (files) => {
  const errors = [];
  const kept = [];
  let totalBytes = 0;

  if (files.length > MAX_FOLDER_FILES) {
    errors.push(`Too many files (${files.length}). Max is ${MAX_FOLDER_FILES}.`);
    return { ok: false, errors, kept: [] };
  }

  for (const f of files) {
    const rel = sanitizeZipPath(f.webkitRelativePath || f.name || '');
    if (!rel) continue;
    const top = rel.split('/')[0];
    if (IGNORED_FOLDER_NAMES.has(top)) continue;

    const ext = getExtension(rel);
    if (BLOCKED_FOLDER_EXTENSIONS.has(ext)) {
      errors.push(`Blocked file type: .${ext}`);
      continue;
    }

    const isAllowed = ALLOWED_FOLDER_EXTENSIONS.has(ext);
    if (!isAllowed) {
      continue;
    }

    totalBytes += Number(f.size || 0);
    kept.push({ file: f, rel });
  }

  if (!kept.length) {
    errors.push('No valid files found in the selected folder.');
    return { ok: false, errors, kept: [] };
  }

  if (totalBytes > MAX_FOLDER_TOTAL_BYTES) {
    errors.push(`Folder is too large (${formatBytes(totalBytes)}). Max is ${formatBytes(MAX_FOLDER_TOTAL_BYTES)}.`);
    return { ok: false, errors, kept: [] };
  }

  const uniqueErrors = [...new Set(errors)].slice(0, 6);
  return { ok: uniqueErrors.length === 0, errors: uniqueErrors, kept };
};

const uploadSingleFileWithProgress = ({ file, token, onProgress }) => {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/upload`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const percent = Math.round((evt.loaded / evt.total) * 100);
      if (onProgress) onProgress(percent);
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.message || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(fd);
  });
};

const buildFolderZipFile = async (files, onProgress, options = {}) => {
  if (!files.length) return null;
  const { lowQuality = false } = options;
  const zip = new JSZip();
  const firstPath = files[0]?.webkitRelativePath || '';
  const rootFolder = sanitizeZipPath(firstPath).split('/')[0] || 'folder-upload';

  const validation = validateFolderFiles(files);
  if (!validation.ok) {
    const message = validation.errors.join(' ');
    throw new Error(message);
  }

  const kept = validation.kept;
  for (let i = 0; i < kept.length; i += 1) {
    const { file, rel } = kept[i];
    const ext = getExtension(rel);
    const isCompressibleImage = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp'].includes(ext);
    if (lowQuality && isCompressibleImage) {
      const compressed = await compressImage(file, { mode: 'low' });
      const outRel = rel.replace(/\.[^/.]+$/, '') + '.jpg';
      zip.file(outRel, compressed);
    } else {
      zip.file(rel, file);
    }
    if (onProgress) {
      onProgress({ stage: 'packing', percent: Math.round(((i + 1) / kept.length) * 25) });
    }
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => {
      if (onProgress) {
        const pct = 25 + Math.round((meta.percent || 0) * 0.75);
        onProgress({ stage: 'compressing', percent: Math.min(100, Math.max(0, pct)) });
      }
    },
  );

  return new File([zipBlob], `${rootFolder}.zip`, { type: 'application/zip' });
};

const compressImage = (file, options = {}) => {
  const { mode = 'low' } = options;
  const quality = mode === 'high' ? 0.92 : 0.35;
  const maxDim = mode === 'high' ? 2400 : 1200;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
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
          if (!blob) return resolve(file);
          const base = String(file?.name || 'image').replace(/\.[^/.]+$/, '');
          const outName = `${base}.jpg`;
          resolve(new File([blob], outName, { type: 'image/jpeg' }));
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
  const ext = getExtension(file?.name || '');
  if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'gif', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogg'].includes(ext)) return 'video';
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
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuggestionHtml, setAiSuggestionHtml] = useState('');
  const [aiOriginalHtml, setAiOriginalHtml] = useState('');
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  const aiLastClickAtRef = useRef(0);
  const aiAbortRef = useRef(null);

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
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

      const [postsRes, subjectsRes, aiStatusRes] = await Promise.all([
        fetch(`${API_URL}/api/posts/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/subjects`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/ai/status`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (
        postsRes.status === 401 || postsRes.status === 403
        || subjectsRes.status === 401 || subjectsRes.status === 403
        || aiStatusRes.status === 401 || aiStatusRes.status === 403
      ) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return;
      }

      const postsData = postsRes.ok ? await postsRes.json() : [];
      const subjectsData = subjectsRes.ok ? await subjectsRes.json() : [];
      setPosts(Array.isArray(postsData) ? postsData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);

      const aiStatus = aiStatusRes.ok ? await aiStatusRes.json().catch(() => null) : null;
      setAiEnabled(Boolean(aiStatus?.enabled));
    } catch (err) {
      console.error('PostManagement fetchData:', err);
      setPosts([]);
      setSubjects([]);
      setAiEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const sid = post.subject_id?._id || post.subject_id || '';
      if (filterSubject && sid !== filterSubject) return false;
      if (filterSemester && normalizeSemester(post.semester) !== filterSemester) return false;
      if (filterGrade && normalizeGrade(post.grade) !== filterGrade) return false;
      if (filterStatus && String(post.published) !== filterStatus) return false;
      if (filterType && post.type !== filterType) return false;
      return true;
    });
  }, [posts, filterSubject, filterSemester, filterGrade, filterStatus, filterType]);

  const uploadSelectedFiles = async (files, options = {}) => {
    const { preserveStructure = false } = options;
    if (!files.length) return;
    setUploadError('');
    setUploadPercent(0);
    setUploading(true);
    const token = localStorage.getItem('adminToken');

    for (let i = 0; i < files.length; i += 1) {
      let file = files[i];
      const kind = getFileKind(file);

      setUploadStatus(`Uploading ${i + 1}/${files.length}: ${file.name || 'file'}`);
      setUploadPercent(0);

      if (kind === 'image' && lowQuality) {
        try {
          file = await compressImage(file, { mode: 'low' });
        } catch (err) {
          console.error('Compression failed:', err);
        }
      }
      
      try {
        const data = await uploadSingleFileWithProgress({
          file,
          token,
          onProgress: (p) => setUploadPercent(p),
        });
        if (data.url) {
          const displayName = file.webkitRelativePath || data.filename || file.name;
          if (preserveStructure || kind === 'file') {
            setFormData(prev => ({
              ...prev,
              files: [...prev.files, {
                name: displayName,
                url: data.url,
                downloadUrl: data.downloadUrl || data.url,
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
        setUploadError(err?.message || `Network error while uploading ${file.name}`);
      }
    }
    setUploading(false);
    setUploadStatus('');
    setUploadPercent(0);
  };

  const normalizeLinkUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const withProto = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(withProto);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      return u.toString();
    } catch {
      return '';
    }
  };

  const addLink = ({ title, url }) => {
  const normalized = normalizeLinkUrl(url);
  if (!normalized || !url || typeof url !== 'string') {
    window.alert('Please enter a valid website link.');
    return;
  }
    setFormData(prev => ({
      ...prev,
      links: [...(Array.isArray(prev.links) ? prev.links : []), { title: String(title || '').trim(), url: normalized }],
    }));
  };

  const removeLink = (index) => {
    setFormData(prev => ({
      ...prev,
      links: (Array.isArray(prev.links) ? prev.links : []).filter((_, i) => i !== index),
    }));
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);

    const dt = e.dataTransfer;
    const droppedFiles = Array.from(dt?.files || []);
    if (droppedFiles.length) {
      await uploadSelectedFiles(droppedFiles);
      return;
    }

    const rawUrl = String(dt?.getData('text/uri-list') || dt?.getData('text/plain') || '').trim();
    if (rawUrl) {
      addLink({ title: '', url: rawUrl.split('\n')[0] });
    }
  };

  const handleFileUpload = async e => {
    const files = Array.from(e.target.files || []);
    await uploadSelectedFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFolderUpload = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadError('');
    setUploadStatus('Preparing folder...');
    setUploadPercent(0);
    setUploading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const zipFile = await buildFolderZipFile(files, ({ stage, percent }) => {
        setUploadStatus(stage === 'packing' ? 'Packing files...' : 'Compressing folder...');
        setUploadPercent(percent || 0);
      }, { lowQuality });
      if (zipFile) {
        setUploadStatus('Uploading ZIP...');
        setUploadPercent(0);
        const data = await uploadSingleFileWithProgress({
          file: zipFile,
          token,
          onProgress: (p) => setUploadPercent(p),
        });

        if (data.url) {
          const displayName = zipFile.name;
          setFormData(prev => ({
            ...prev,
            files: [...prev.files, {
              name: displayName,
              url: data.url,
              downloadUrl: data.downloadUrl || data.url,
              mimetype: data.mimetype || 'application/zip',
              size: data.size || zipFile.size || 0,
            }],
          }));
        }
      }
    } catch (err) {
      setUploadError(err?.message || 'Folder upload failed.');
    } finally {
      setUploading(false);
      setUploadStatus('');
      setUploadPercent(0);
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
    const semester = normalizeSemester(post.semester) || String(post.semester || '').trim();
    const grade = normalizeGrade(post.grade) || String(post.grade || '').trim();
    setFormData({
      title: post.title || '',
      description: post.description || '',
      subject_id: post.subject_id?._id || post.subject_id || '',
      semester,
      grade,
      type: post.type || 'note',
      files: post.files || [],
      images: post.images || [],
      videos: post.videos || [],
      links: Array.isArray(post.links) ? post.links : [],
      published: post.published !== false,
    });
    setLinkTitle('');
    setLinkUrl('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setUploadError('');
    setAiError('');
    setAiLoading(false);
    setAiSuggestionHtml('');
    setAiOriginalHtml('');
    setAiSuggestOpen(false);
    if (aiAbortRef.current) {
      try { aiAbortRef.current.abort(); } catch {}
      aiAbortRef.current = null;
    }
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleQuillChange = value => {
    setFormData(prev => ({ ...prev, description: value }));
  };

  const requestAiDescription = async ({ mode, title, description }) => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin/login';
      return null;
    }
    if (aiAbortRef.current) {
      try { aiAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    aiAbortRef.current = controller;
    const t = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${API_URL}/api/ai/description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mode, title, description }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, message: data?.message || 'AI request failed' };
      }
      return { ok: true, text: String(data?.text || '').trim() };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, message: 'AI request timed out.' };
      return { ok: false, message: 'Network error while contacting AI.' };
    } finally {
      clearTimeout(t);
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
    }
  };

  const handleAiClick = async () => {
    const now = Date.now();
    if (aiLoading) return;
    if (now - aiLastClickAtRef.current < 900) return;
    aiLastClickAtRef.current = now;

    if (!aiEnabled) return;
    setAiError('');
    setAiSuggestOpen(false);
    setAiSuggestionHtml('');
    setAiOriginalHtml('');
    setAiLoading(true);

    const title = String(formData.title || '').trim();
    const currentHtml = String(formData.description || '').trim();
    const currentText = htmlToPlainText(currentHtml);
    const mode = currentText ? 'improve' : 'generate';

    if (mode === 'generate' && !title) {
      setAiLoading(false);
      setAiError('Add a title first so AI can generate a description.');
      return;
    }

    const result = await requestAiDescription({ mode, title, description: currentText });
    setAiLoading(false);
    if (!result?.ok) {
      setAiError(result?.message || 'AI request failed');
      return;
    }
    const suggested = plainTextToQuillHtml(result.text);
    if (!suggested) {
      setAiError('AI returned an empty response.');
      return;
    }
    setAiOriginalHtml(currentHtml);
    setAiSuggestionHtml(suggested);
    setAiSuggestOpen(true);
  };

  const handleSave = async () => {
    const title = String(formData.title || '').trim();
    if (!title) {
      window.alert('Title is required.');
      return;
    }
    if (!String(formData.subject_id || '').trim()) {
      window.alert('Subject is required.');
      return;
    }
    if (!String(formData.semester || '').trim()) {
      window.alert('Semester is required.');
      return;
    }
    if (!String(formData.grade || '').trim()) {
      window.alert('Grade is required.');
      return;
    }

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
        body: JSON.stringify({ ...formData, title }),
      });
      if (res.ok) {
        closeModal();
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        window.alert(data?.message || 'Failed to save post');
      }
    } catch (err) {
      console.error('Save post error:', err);
      window.alert('Network error while saving post');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const post = posts.find(p => p._id === id);
    const title = post?.title ? String(post.title) : 'this post';
    const confirm1 = window.confirm(`Delete "${title}" permanently?`);
    if (!confirm1) return;
    const confirm2 = window.prompt('Type DELETE to confirm permanent deletion:');
    if (confirm2 !== 'DELETE') return;
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_URL}/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(data?.message || 'Failed to delete post');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Delete post error:', err);
      window.alert('Network error while deleting post');
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
        <h1>Posts</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <svg style={{ marginRight: '8px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Post
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
          {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
          <option value="">All Grades</option>
          {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="note">Note</option>
          <option value="summary">Summary</option>
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
                <td style={{ fontWeight: 600, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{post.title}</td>
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
                <button className="pm-modal-close" onClick={closeModal}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
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
                    <div className="pm-desc-head">
                      <label>Description</label>
                      {aiEnabled && (
                        <button
                          type="button"
                          className={`pm-ai-btn ${aiLoading ? 'loading' : ''}`}
                          onClick={handleAiClick}
                          aria-label="AI enhance description"
                          disabled={aiLoading}
                        >
                          AI
                        </button>
                      )}
                    </div>
                    <div className="pm-desc-wrap">
                      <ReactQuill
                        theme="snow"
                        value={formData.description}
                        onChange={handleQuillChange}
                        modules={QUILL_MODULES}
                      />
                      {aiLoading && (
                        <div className="pm-ai-overlay" aria-live="polite">
                          <div className="pm-ai-shadow">Generating…</div>
                        </div>
                      )}
                    </div>
                    {aiError && (
                      <div className="pm-ai-error" role="alert">{aiError}</div>
                    )}
                    <AnimatePresence>
                      {aiSuggestOpen && (
                        <motion.div
                          className="pm-ai-suggest glass"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.22 }}
                        >
                          <div className="pm-ai-suggest-head">
                            <div className="pm-ai-suggest-title">AI Suggestion</div>
                            <div className="pm-ai-suggest-actions">
                              <button
                                type="button"
                                className="pm-ai-action"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, description: aiSuggestionHtml }));
                                  setAiSuggestOpen(false);
                                }}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="pm-ai-action secondary"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, description: aiOriginalHtml }));
                                  setAiSuggestOpen(false);
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                          <div className="pm-ai-suggest-body" dangerouslySetInnerHTML={{ __html: aiSuggestionHtml }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                        <option value="summary">Summary</option>
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
                      <select name="semester" value={formData.semester} onChange={handleFormChange}>
                        {!!formData.semester && !SEMESTER_OPTIONS.some(s => s.value === formData.semester) && (
                          <option value={formData.semester}>{formData.semester}</option>
                        )}
                        <option value="">Select semester</option>
                        {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Grade</label>
                      <select name="grade" value={formData.grade} onChange={handleFormChange}>
                        {!!formData.grade && !GRADE_OPTIONS.some(g => g.value === formData.grade) && (
                          <option value={formData.grade}>{formData.grade}</option>
                        )}
                        <option value="">Select grade</option>
                        {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
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

                  <div
                    className={`pm-dropzone ${dragActive ? 'active' : ''}`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="pm-dropzone-title">Drag & drop files here</div>
                    <div className="pm-dropzone-sub">Or click to pick files. You can also drop a website link.</div>
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

                  {uploading && (
                    <div className="pm-upload-progress">
                      <div className="pm-upload-progress-row">
                        <span className="spinner" />
                        <span className="pm-upload-progress-text">{uploadStatus || 'Uploading...'}</span>
                        <span className="pm-upload-progress-pct">{uploadPercent ? `${uploadPercent}%` : ''}</span>
                      </div>
                      <div className="pm-progress-bar" aria-hidden="true">
                        <div className="pm-progress-fill" style={{ width: `${uploadPercent || 0}%` }} />
                      </div>
                    </div>
                  )}
                  {uploadError && <div style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>{uploadError}</div>}

                  <div className="pm-asset-group">
                    <label>Website Links</label>
                    <div className="pm-links-row">
                      <input
                        className="pm-link-title"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        placeholder="Title (optional)"
                      />
                      <input
                        className="pm-link-url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                      />
                      <button
                        type="button"
                        className="pm-link-add"
                        onClick={() => {
                          addLink({ title: linkTitle, url: linkUrl });
                          setLinkTitle('');
                          setLinkUrl('');
                        }}
                      >
                        Add
                      </button>
                    </div>

                    {(Array.isArray(formData.links) ? formData.links : []).length > 0 && (
                      <div className="pm-links-list">
                        {(Array.isArray(formData.links) ? formData.links : []).map((l, i) => (
                          <div key={`${l?.url || ''}-${i}`} className="pm-link-item">
                            <a className="pm-link-a" href={l?.url} target="_blank" rel="noopener noreferrer">
                              {l?.title ? String(l.title) : String(l?.url || '')}
                            </a>
                            <button type="button" className="pm-link-remove" onClick={() => removeLink(i)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
