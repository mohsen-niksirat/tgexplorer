import { t } from './i18n.js';
import { state } from './state.js';

function downloadBlob(text, filename, mime) {
  const b = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function folderExportLines(f) {
  const chans = f.items.filter(i => i.type === 'ch');
  const posts = f.items.filter(i => i.type === 'post');
  const lines = [f.name, '—', ''];
  if (chans.length) {
    lines.push('Channels (' + chans.length + '):');
    for (const c of chans) {
      const ch = window.getAllChannels().find(x => x.username === c.username);
      lines.push('- ' + (ch ? ch.title : c.username) + ' (@' + c.username + ') — https://t.me/' + c.username);
    }
    lines.push('');
  }
  if (posts.length) {
    lines.push('Posts (' + posts.length + '):');
    for (const p of posts) lines.push('- @' + p.username + '/' + p.postId + (p.label ? ' — ' + p.label : ''));
  }
  if (!chans.length && !posts.length) lines.push('(empty folder)');
  return lines.join('\n');
}

export function folderExportTxt(id) {
  const f = state.folders.find(x => x.id === id);
  if (!f) return;
  downloadBlob(folderExportLines(f), 'tgexplorer-folder-' + f.name.replace(/[^\w\u0600-\u06FF-]+/g, '_') + '.txt', 'text/plain;charset=utf-8');
  window.toast(' ' + t('toast_folder_saved', f.name));
}

export function folderExportJson(id) {
  const f = state.folders.find(x => x.id === id);
  if (!f) return;
  downloadBlob(JSON.stringify({ app: 'tgexplorer_folder', folder: { name: f.name, icon: f.icon || '', items: f.items }, exportedAt: new Date().toISOString() }, null, 2), 'tgexplorer-folder-' + f.name.replace(/[^\w\u0600-\u06FF-]+/g, '_') + '.json', 'application/json');
  window.toast(' ' + t('toast_folder_saved', f.name));
}

function buildPdf(lines) {
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const enc = new TextEncoder();
  const byteLen = s => enc.encode(s).length;
  const body = lines.slice(0, 48).map((l, i) => {
    const safe = String(l).replace(/[^\x20-\x7E\xA0-\xFF]/g, '?').slice(0, 95);
    return `BT /F1 11 Tf 40 ${750 - i * 16} Td (${esc(safe)}) Tj ET`;
  }).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${byteLen(body)} >>\nstream\n${body}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  let bytes = byteLen(pdf);
  const offsets = [];
  objects.forEach((o, i) => {
    offsets.push(bytes);
    const chunk = `${i + 1} 0 obj\n${o}\nendobj\n`;
    pdf += chunk; bytes += byteLen(chunk);
  });
  const xrefPos = bytes;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return pdf;
}

export function folderExportPdf(id) {
  const f = state.folders.find(x => x.id === id);
  if (!f) return;
  downloadBlob(buildPdf(folderExportLines(f).split('\n')), 'tgexplorer-folder-' + f.name.replace(/[^\w\u0600-\u06FF-]+/g, '_') + '.pdf', 'application/pdf');
  window.toast(' ' + t('toast_folder_saved', f.name));
}

export function exportPostsTxt() {
  const items = state.postFavs || [];
  const lines = [' Saved posts — Telegram Explorer', ''];
  for (const it of items) lines.push('- @' + it.username + '/' + it.postId + ((it.text || '').replace(/\s+/g, ' ').trim() ? ' — ' + it.text.replace(/\s+/g, ' ').trim().slice(0, 120) : ''));
  if (!items.length) lines.push('(no saved posts)');
  downloadBlob(lines.join('\n'), 'tgexplorer-posts.txt', 'text/plain;charset=utf-8');
  window.toast(' ' + t('toast_post_saved'));
}

export function exportPostsPdf() {
  const items = state.postFavs || [];
  const lines = ['Saved posts — Telegram Explorer', ''];
  for (const it of items) lines.push('@' + it.username + '/' + it.postId + ' ' + (it.text || '').replace(/\s+/g, ' ').trim().slice(0, 90));
  if (!items.length) lines.push('(no saved posts)');
  downloadBlob(buildPdf(lines), 'tgexplorer-posts.pdf', 'application/pdf');
  window.toast(' ' + t('toast_post_saved'));
}

export async function loadArchiveSources(seed, onProgress) {
  const names = Object.keys(seed);
  const sources = { ...seed };
  let done = 0;
  const CONCURRENCY = 8;
  let index = 0;
  async function worker() {
    while (index < names.length) {
      const u = names[index++];
      try {
        const r = await fetch('posts/' + encodeURIComponent(u) + '.json', { signal: AbortSignal.timeout(10000) });
        if (r.ok) {
          const arr = await r.json();
          if (Array.isArray(arr) && arr.length) sources[u] = arr;
        }
      } catch (e) {}
      done++;
      if (onProgress) onProgress(done, names.length);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return sources;
}
