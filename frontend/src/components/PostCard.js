import React, { useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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

function getUploadTimestamp(file) {
  const url = String(file?.downloadUrl || file?.url || '');
  const name = String(file?.name || file?.file_name || '');
  const fromUrl = url.match(/\/uploads\/(\d{10,})-/)?.[1];
  const fromName = name.match(/^(\d{10,})-/)?.[1];
  const raw = fromUrl || fromName;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function normalizeFileKey(file, index) {
  const url = String(file?.downloadUrl || file?.url || '');
  if (url) return url;
  const name = String(file?.name || file?.file_name || '');
  return name ? `name:${name}` : `idx:${index}`;
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

  window.open(url, '_blank', 'noopener,noreferrer');
}

function PostCard({ post, variants }) {
  const [imgExpanded, setImgExpanded] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState('');
  const viewedKeysRef = useRef(new Set());
  const [, forceUpdate] = useState(0);
  const reduceMotion = useReducedMotion();

  const safeHTML = DOMPurify.sanitize(post.description || '');
  const hasDescription = safeHTML.trim() && safeHTML.replace(/<[^>]+>/g, '').trim();

  const allFiles = useMemo(() => (Array.isArray(post?.files) ? post.files : []), [post?.files]);
  const images = useMemo(() => (Array.isArray(post?.images) ? post.images : []), [post?.images]);
  const videos = useMemo(() => (Array.isArray(post?.videos) ? post.videos : []), [post?.videos]);
  const hasFolderStructure = allFiles.some(f => (f?.name || '').includes('/'));

  const newestFile = useMemo(() => {
    if (!allFiles.length) return null;
    const withTs = allFiles
      .map((f, i) => ({ f, i, ts: getUploadTimestamp(f) }))
      .filter((x) => x.ts > 0);
    if (!withTs.length) {
      return { file: allFiles[allFiles.length - 1], ts: 0 };
    }
    withTs.sort((a, b) => b.ts - a.ts);
    return { file: withTs[0].f, ts: withTs[0].ts };
  }, [allFiles]);

  const viewedCount = useMemo(() => {
    const keys = viewedKeysRef.current;
    let count = 0;
    for (let i = 0; i < allFiles.length; i += 1) {
      if (keys.has(normalizeFileKey(allFiles[i], i))) count += 1;
    }
    return count;
  }, [allFiles]);

  const fileProgress = allFiles.length ? Math.round((viewedCount / allFiles.length) * 100) : 0;

  const hasNewFiles = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const byFile = allFiles.some((f) => {
      const ts = getUploadTimestamp(f);
      return ts > 0 && now - ts <= weekMs;
    });
    if (byFile) return true;
    const updated = new Date(post?.updatedAt || post?.date_created || 0).getTime();
    const hasAnyAttachments = (images.length + videos.length + allFiles.length) > 0;
    return hasAnyAttachments && Number.isFinite(updated) && now - updated <= weekMs;
  }, [allFiles, images.length, videos.length, post?.updatedAt, post?.date_created]);

  const tags = [
    post.type ? String(post.type).charAt(0).toUpperCase() + String(post.type).slice(1) : null,
    post.semester,
    post.grade ? `Grade ${String(post.grade).replace('Grade ', '')}` : null,
    images.length ? `${images.length} image${images.length > 1 ? 's' : ''}` : null,
    videos.length ? `${videos.length} video${videos.length > 1 ? 's' : ''}` : null,
    allFiles.length ? `${allFiles.length} file${allFiles.length > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  const newestFileName = String(newestFile?.file?.name || newestFile?.file?.file_name || '').trim();

  const markViewed = (file, index) => {
    viewedKeysRef.current.add(normalizeFileKey(file, index));
    forceUpdate((v) => v + 1);
  };

  const handleDownloadFolder = async e => {
    e.stopPropagation();
    if (!allFiles.length || zipping) return;
    setZipping(true);
    for (let i = 0; i < allFiles.length; i += 1) {
      viewedKeysRef.current.add(normalizeFileKey(allFiles[i], i));
    }
    forceUpdate((v) => v + 1);
    try {
      const zip = new JSZip();
      for (let i = 0; i < allFiles.length; i += 1) {
        const file = allFiles[i];
        const name = file?.name || `file-${i + 1}`;
        const url = file?.downloadUrl || file?.url;
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

  const handleFileDownload = async (e, file, index) => {
    e.stopPropagation();
    const name = file?.name || file?.file_name || `File ${index + 1}`;
    const url = toDownloadUrl(file?.downloadUrl || file?.url);
    if (!url || downloadingFile === url) return;

    markViewed(file, index);
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

  return (
    <motion.article
      className="pc card"
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.03 }}
      transition={{ duration: 0.16 }}
    >
      {/* ── Meta bar ── */}
      <div className="pc-meta-bar">
        <div className="pc-tags">
          {tags.map(tag => {
            const isFileCount = typeof tag === 'string' && /\bfile(s)?\b/i.test(tag);
            return (
              <span key={tag} className={`pc-tag ${isFileCount ? 'pc-tag--key' : ''}`}>
                {tag}
              </span>
            );
          })}
          {newestFileName && (
            <span className="pc-tag pc-tag--key" title={newestFileName}>
              Newest: {newestFileName}
            </span>
          )}
        </div>
        <div className="pc-meta-right">
          <AnimatePresence>
            {hasNewFiles && (
              <motion.span
                className="pc-new-badge"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.22 }}
              >
                New files
              </motion.span>
            )}
          </AnimatePresence>
          <time className="pc-date">{new Date(post.date_created).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
        </div>
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
            <div className="pc-files-actions">
              <div className="pc-progress" title={`${viewedCount}/${allFiles.length} files viewed`}>
                <svg className="pc-progress-svg" viewBox="0 0 36 36" aria-hidden="true">
                  <path
                    className="pc-progress-bg"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="pc-progress-fg"
                    strokeDasharray={`${fileProgress}, 100`}
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="pc-progress-text">{viewedCount}/{allFiles.length}</span>
              </div>
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
                      markViewed(file, i);
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
        <div className="pc-lightbox" onClick={() => setImgExpanded(null)}>
          <img src={imgExpanded} alt="Expanded" className="pc-lightbox-img" />
          <button className="pc-lightbox-close">✕</button>
        </div>
      )}
    </motion.article>
  );
}

export default PostCard;
