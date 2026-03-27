import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { motion, useReducedMotion } from 'framer-motion';
import JSZip from 'jszip';
import '../styles/PostCard.css';

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

function toDownloadUrl(url) {
  if (!url) return url;
  if (!/https:\/\/res\.cloudinary\.com\//i.test(url)) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);
  if (!after) return `${before}fl_attachment`;
  if (after.startsWith('fl_attachment')) return url;
  const firstSlash = after.indexOf('/');
  if (firstSlash === -1) return `${before}fl_attachment/${after}`;
  const firstSeg = after.slice(0, firstSlash);
  if (/^v\d+$/i.test(firstSeg)) {
    return `${before}fl_attachment/${after}`;
  }
  return `${before}fl_attachment,${after}`;
}

function PostCard({ post, variants }) {
  const [imgExpanded, setImgExpanded] = useState(null);
  const [zipping, setZipping] = useState(false);
  const reduceMotion = useReducedMotion();

  const safeHTML = DOMPurify.sanitize(post.description || '');
  const hasDescription = safeHTML.trim() && safeHTML.replace(/<[^>]+>/g, '').trim();

  const allFiles = post.files || [];
  const images   = post.images || [];
  const videos   = post.videos || [];
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
        const url = file?.url;
        if (!url) continue;
        const response = await fetch(toDownloadUrl(url));
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
      console.error('Folder zip download failed:', err);
    } finally {
      setZipping(false);
    }
  };

  return (
    <motion.article
      className="pc card"
      whileHover={reduceMotion ? undefined : { y: -2 }}
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

      {/* ── Images ── */}
      {images.length > 0 && (
        <section className="pc-media-section">
          <h4 className="pc-section-label">📸 Images</h4>
          <div className="pc-image-grid">
            {images.map((url, i) => (
              <button key={i} className="pc-img-btn" onClick={() => setImgExpanded(url)}>
                <img src={url} alt={`Attachment ${i + 1}`} loading="lazy" className="pc-img-thumb" />
              </button>
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
          <ul className="pc-file-list">
            {allFiles.map((file, i) => {
              const name = file.name || file.file_name || `File ${i + 1}`;
              const url  = file.url;
              return (
                <li key={i} className="pc-file-item">
                  <span className="pc-file-icon">{fileIcon(name)}</span>
                  <span className="pc-file-name" title={name}>{name}</span>
                  {file.size > 0 && (
                    <span className="pc-file-size">{formatBytes(file.size)}</span>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm pc-preview-btn"
                    onClick={e => e.stopPropagation()}
                  >
                    👁 Preview
                  </a>
                  <a
                    href={toDownloadUrl(url)}
                    download={name}
                    className="btn btn-ghost btn-sm pc-download-btn"
                    onClick={e => e.stopPropagation()}
                  >
                    ⬇ Download
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Lightbox ── */}
      {imgExpanded && (
        <div className="pc-lightbox" onClick={() => setImgExpanded(null)}>
          <img src={imgExpanded} alt="Expanded" className="pc-lightbox-img" />
          <button className="pc-lightbox-close">✕</button>
        </div>
      )}
    </motion.article>
  );
}

export default PostCard;
