import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { motion, useReducedMotion } from 'framer-motion';
import JSZip from 'jszip';
import '../styles/PostCard.css';
import { API_URL } from '../config/api';
import { filenameFromUrl, normalizeLinks } from '../utils/postMedia';

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', txt: '📃',
  py: '🐍', js: '📜', html: '🌐', java: '☕', ts: '📘',
  c: '⚙️', cpp: '⚙️', cs: '⚙️',
  json: '🔢', yaml: '📋', yml: '📋', xml: '🔖', csv: '📊', md: '📝',
  zip: '🗜️', rar: '🗜️', '7z': '🗜️',
  xls: '📊', xlsx: '📊', ppt: '📋', pptx: '📋',
  mp4: '🎬', mov: '🎬', avi: '🎬',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
};

const formatBytes = b => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

function fileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📎';
}

function isVideo(url) {
  return /\.(mp4|mov|avi|webm|mkv)(\?.*)?$/i.test(url);
}

function normalizeZipPath(path, fallbackName) {
  const safe = (path || fallbackName || 'file').replaceAll('\\', '/');
  return safe
    .split('/')
    .filter(Boolean)
    .join('/');
}

function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  if (filename) {
    a.download = filename;
  }
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function toDownloadUrl(url) {
  return url; // Direct URL for R2/local storage
}

function isCloudinaryUrl(value) {
  return /(^|\/\/)res\.cloudinary\.com\//i.test(String(value || ''));
}

function rewriteLocalhostUploadUrl(value) {
  if (!API_URL) return null;
  try {
    const u = new URL(String(value));
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (!isLocal) return null;
    if (!u.pathname.startsWith('/uploads/')) return null;
    return `${API_URL}${u.pathname}`;
  } catch {
    return null;
  }
}

function getDownloadTarget(rawUrl, name) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    return { kind: 'blocked', reason: 'Missing file URL.' };
  }

  const rewritten = rewriteLocalhostUploadUrl(url);
  if (rewritten) {
    return { kind: 'direct', url: rewritten };
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(url)) {
    return {
      kind: 'blocked',
      reason: 'This file link points to localhost and is not available online. Please re-upload it.',
    };
  }

  if (isCloudinaryUrl(url)) {
    return {
      kind: 'proxy',
      url: `${API_URL}/api/files/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
    };
  }

  if (/^http:\/\//i.test(url)) {
    return {
      kind: 'proxy',
      url: `${API_URL}/api/files/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
    };
  }

  return { kind: 'direct', url };
}

function getPreviewTarget(rawUrl, name) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    return { kind: 'blocked', reason: 'Missing file URL.' };
  }

  const rewritten = rewriteLocalhostUploadUrl(url);
  if (rewritten) {
    return { kind: 'direct', url: rewritten };
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(url)) {
    return {
      kind: 'blocked',
      reason: 'This file link points to localhost and is not available online. Please re-upload it.',
    };
  }

  if (isCloudinaryUrl(url)) {
    return {
      kind: 'proxy',
      url: `${API_URL}/api/files/preview?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
    };
  }

  if (/^http:\/\//i.test(url)) {
    return {
      kind: 'proxy',
      url: `${API_URL}/api/files/preview?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
    };
  }

  return { kind: 'direct', url };
}

function isPreviewableInline(file) {
  const name = String(file?.name || file?.file_name || '').toLowerCase();
  const url = String(file?.url || file?.downloadUrl || '').toLowerCase();
  const mimetype = String(file?.mimetype || '').toLowerCase();
  const ext = (name.split('.').pop() || url.split('.').pop() || '').split('?')[0].toLowerCase();

  const isPdf = mimetype === 'application/pdf' || ext === 'pdf' || url.includes('.pdf');
  const isImage = mimetype.startsWith('image/')
    || /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url)
    || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp'].includes(ext);

  return isPdf || isImage;
}

function openInfoTab({ title, message }) {
  const safeTitle = String(title || 'Preview not available').replace(/[<>]/g, '');
  const safeMessage = String(message || '').replace(/[<>]/g, '');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; background:#0b1020; color:#e7e9ee; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
    .card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 22px; }
    h1 { margin: 0 0 10px; font-size: 20px; }
    p { margin: 0; line-height: 1.6; color: rgba(231,233,238,.85); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${safeTitle}</h1>
      <p>${safeMessage}</p>
    </div>
  </div>
</body>
</html>`;

  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const tab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  if (tab) {
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  } else {
    URL.revokeObjectURL(blobUrl);
  }
}

function handlePreview(file) {
  const name = String(file?.name || file?.file_name || 'File');
  const isFolder = name.includes('/');
  const url = String(file?.url || file?.downloadUrl || '');
  const lowerName = name.toLowerCase();
  const ext = (lowerName.split('.').pop() || '').toLowerCase();
  const isFolderLike = isFolder || ['zip', 'rar', '7z'].includes(ext) || ['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'md', 'txt'].includes(ext);

  if (isFolderLike || !isPreviewableInline(file)) {
    openInfoTab({
      title: 'Preview not available',
      message: 'This is a folder. To access it, please download it first.',
    });
    return;
  }

  const target = getPreviewTarget(url, name);
  if (target.kind === 'blocked') {
    openInfoTab({ title: 'Preview not available', message: target.reason });
    return;
  }

  window.open(target.url, '_blank', 'noopener,noreferrer');
}

function PostCard({ post, variants }) {
  const [imgExpanded, setImgExpanded] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState('');
  const [downloadingImage, setDownloadingImage] = useState('');
  const reduceMotion = useReducedMotion();

  const safeHTML = DOMPurify.sanitize(post.description || '');
  const hasDescription = safeHTML.trim() && safeHTML.replace(/<[^>]+>/g, '').trim();

  const allFiles = useMemo(() => (Array.isArray(post?.files) ? post.files : []), [post?.files]);
  const images = useMemo(() => (Array.isArray(post?.images) ? post.images : []), [post?.images]);
  const videos = useMemo(() => (Array.isArray(post?.videos) ? post.videos : []), [post?.videos]);
  const links = useMemo(() => (Array.isArray(post?.links) ? post.links : []), [post?.links]);
  const hasFolderStructure = allFiles.some(f => (f?.name || '').includes('/'));

  const tags = [
    post.type ? String(post.type).charAt(0).toUpperCase() + String(post.type).slice(1) : null,
    post.semester,
    post.grade ? `Grade ${String(post.grade).replace('Grade ', '')}` : null,
    images.length ? `${images.length} image${images.length > 1 ? 's' : ''}` : null,
    videos.length ? `${videos.length} video${videos.length > 1 ? 's' : ''}` : null,
    allFiles.length ? `${allFiles.length} file${allFiles.length > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  const handleDownloadFolder = async e => {
    e.stopPropagation();
    if (!allFiles.length || zipping) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < allFiles.length; i += 1) {
        const file = allFiles[i];
        const name = file?.name || `file-${i + 1}`;
        const url = file?.downloadUrl || file?.url;
        if (!url) continue;
        const rewritten = rewriteLocalhostUploadUrl(url);
        if (!rewritten && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(String(url))) {
          throw new Error('Localhost file links cannot be downloaded online. Please re-upload.');
        }
        const response = await fetch(toDownloadUrl(rewritten || url));
        if (!response.ok) continue;
        const blob = await response.blob();
        zip.file(normalizeZipPath(name, `file-${i + 1}`), blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      const safePostName = (post.title || 'post-files').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'post-files';
      const href = URL.createObjectURL(zipBlob);
      a.href = href;
      a.download = `${safePostName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      openInfoTab({
        title: 'Download not available',
        message: err?.message || 'Folder download failed. Please try again.',
      });
    } finally {
      setZipping(false);
    }
  };

  const handleFileDownload = async (e, file, index) => {
    e.stopPropagation();
    const name = file?.name || file?.file_name || `File ${index + 1}`;
    const rawUrl = file?.downloadUrl || file?.url;
    const target = getDownloadTarget(rawUrl, name);
    if (target.kind === 'blocked') {
      openInfoTab({ title: 'Download not available', message: target.reason });
      return;
    }

    if (target.kind === 'proxy') {
      window.open(target.url, '_blank', 'noopener,noreferrer');
      return;
    }

    const url = toDownloadUrl(target.url);
    if (!url || downloadingFile === url) return;

    setDownloadingFile(url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Download returned an empty file');
      }

      const href = URL.createObjectURL(blob);
      triggerDownload(href, name);
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error('File download failed:', err);
      triggerDownload(url, name);
    } finally {
      setDownloadingFile('');
    }
  };

  const handleImageDownload = async (e, rawUrl, index) => {
    e.stopPropagation();
    const name = filenameFromUrl(rawUrl, `image-${index + 1}.jpg`);
    const target = getDownloadTarget(rawUrl, name);
    if (target.kind === 'blocked') {
      openInfoTab({ title: 'Download not available', message: target.reason });
      return;
    }

    if (target.kind === 'proxy') {
      window.open(target.url, '_blank', 'noopener,noreferrer');
      return;
    }

    const url = toDownloadUrl(target.url);
    if (!url || downloadingImage === url) return;

    setDownloadingImage(url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Download returned an empty file');
      }
      const href = URL.createObjectURL(blob);
      triggerDownload(href, name);
      URL.revokeObjectURL(href);
    } catch {
      triggerDownload(url, name);
    } finally {
      setDownloadingImage('');
    }
  };

  return (
    <motion.article
      className="pc card"
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.03 }}
      transition={{ duration: 0.16 }}
    >
      {/* ── Meta bar ── */}
      <div className="pc-meta-bar">
        <div className="pc-tags">
          {tags.map(tag => <span key={tag} className="pc-tag">{tag}</span>)}
        </div>
        <time className="pc-date">{new Date(post.date_created).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
      </div>

      {/* ── Title ── */}
      <h2 className="pc-title">{post.title}</h2>

      {/* ── Description (rich text) ── */}
      {hasDescription && (
        <div
          className="pc-description ql-editor"
          dangerouslySetInnerHTML={{ __html: safeHTML }}
        />
      )}

      {/* ── Links ── */}
      {links.length > 0 && (
        <section className="pc-media-section">
          <h4 className="pc-section-label">🔗 Links</h4>
          <ul className="pc-link-list">
            {normalizeLinks(links).map((l, i) => (
                <li key={`${l.url}-${i}`} className="pc-link-item">
                  <a className="pc-link-a" href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.title || l.url}
                  </a>
                  <span className="pc-link-icon" aria-hidden="true">↗</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* ── Images ── */}
      {images.length > 0 && (
        <section className="pc-media-section">
          <h4 className="pc-section-label">📸 Images</h4>
          <div className="pc-image-grid">
            {images.map((url, i) => (
              <div key={i} className="pc-img-wrap">
                <button type="button" className="pc-img-btn" onClick={() => setImgExpanded(url)} aria-label={`Open image ${i + 1}`}>
                  <img src={url} alt={`Attachment ${i + 1}`} loading="lazy" className="pc-img-thumb" />
                </button>
                <button
                  type="button"
                  className="pc-img-download"
                  onClick={(e) => handleImageDownload(e, url, i)}
                  aria-label={`Download image ${i + 1}`}
                  disabled={downloadingImage === toDownloadUrl(url)}
                >
                  ⬇
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Videos ── */}
      {videos.length > 0 && (
        <section className="pc-media-section">
          <h4 className="pc-section-label">🎬 Videos</h4>
          <div className="pc-video-list">
            {videos.map((url, i) => (
              isVideo(url) ? (
                <video key={i} controls className="pc-video" loading="lazy" preload="none">
                  <source src={url} />
                </video>
              ) : (
                <iframe
                  key={i}
                  src={url}
                  title={`Video ${i + 1}`}
                  className="pc-iframe"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ))}
          </div>
        </section>
      )}

      {/* ── Files ── */}
      {allFiles.length > 0 && (
        <section className="pc-media-section">
          <div className="pc-files-head">
            <h4 className="pc-section-label">📁 Files</h4>
            <div className="pc-files-actions">
              {hasFolderStructure && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm pc-folder-download"
                  onClick={handleDownloadFolder}
                  disabled={zipping}
                >
                  {zipping ? 'Preparing...' : 'Download Folder (.zip)'}
                </button>
              )}
            </div>
          </div>
          <ul className="pc-file-list">
            {allFiles.map((file, i) => {
              const name = file.name || file.file_name || `File ${i + 1}`;
              const isFolder = name.includes('/');
              return (
                <li key={i} className="pc-file-item">
                  <span className="pc-file-icon">{fileIcon(name)}</span>
                  <span className="pc-file-name" title={name}>{name}</span>
                  {file.size > 0 && (
                    <span className="pc-file-size">{formatBytes(file.size)}</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm pc-preview-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(file);
                    }}
                    aria-disabled={isFolder ? 'true' : undefined}
                  >
                    👁 Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm pc-download-btn"
                    onClick={e => handleFileDownload(e, file, i)}
                    disabled={downloadingFile === toDownloadUrl(file?.downloadUrl || file?.url)}
                  >
                    {downloadingFile === toDownloadUrl(file?.downloadUrl || file?.url) ? 'Preparing...' : '⬇ Download'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Lightbox ── */}
      {imgExpanded && (
        <div className="pc-lightbox" onClick={() => setImgExpanded(null)} role="dialog" aria-label="Image preview">
          <img src={imgExpanded} alt="Expanded" className="pc-lightbox-img" />
          <div className="pc-lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="pc-lightbox-btn"
              onClick={(e) => handleImageDownload(e, imgExpanded, 0)}
              aria-label="Download image"
            >
              ⬇ Download
            </button>
            <button type="button" className="pc-lightbox-close" onClick={() => setImgExpanded(null)} aria-label="Close image preview">✕</button>
          </div>
        </div>
      )}
    </motion.article>
  );
}

export default PostCard;
