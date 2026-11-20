import { t } from './i18n.js';

let compareA = '';
let compareB = '';

export function openCompare(username) {
  compareA = username;
  compareB = '';
  fillCompareSelect();
  renderCompare();
  document.getElementById('compareOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeCompare() {
  document.getElementById('compareOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

export function pickCompareChannel(username) {
  compareB = username;
  const select = document.getElementById('compareSelect');
  if (select) select.value = username || '';
  renderCompare();
}

function fillCompareSelect() {
  const select = document.getElementById('compareSelect');
  if (!select) return;
  const channels = window.getAllChannels().filter(c => c.username.toLowerCase() !== compareA.toLowerCase());
  select.innerHTML = '<option value="">' + window.escHtml(t('compare_pick')) + '</option>' +
    channels.map(c => '<option value="' + window.escAttr(c.username) + '">' + window.escHtml(c.title || c.username) + ' (@' + window.escHtml(c.username) + ')</option>').join('');
  select.value = compareB && channels.some(c => c.username === compareB) ? compareB : '';
}

function compareColumn(username, canvasId) {
  if (!username) return '<div class="compare-empty">' + window.escHtml(t('compare_pick')) + '</div>';
  const ch = window.getAllChannels().find(c => c.username === username) || { username, title: username };
  const posts = window.getChannelPosts(username);
  const days = window.chartRange || 7;
  const activity = window.channelActivity(username, days);
  const total = activity.reduce((s, d) => s + d.posts, 0);
  const active = activity.filter(d => d.posts > 0).length;
  const perDay = (total / days).toFixed(1);
  const kw = window.postKeywords(posts, 5);
  return '<div class="compare-head">' +
    '<div class="compare-avatar" style="' + window.avatarGrad(username) + '">' + window.escHtml((ch.title || username)[0].toUpperCase()) + '</div>' +
    '<div><div class="compare-name">' + window.escHtml(ch.title || username) + '</div><div class="compare-user">@' + window.escHtml(username) + (ch.members ? ' ·  ' + window.escHtml(ch.members) : '') + '</div></div>' +
    '</div>' +
    '<div class="compare-stats">' +
    '<div class="compare-stat"><b>' + perDay + '</b><span>' + window.escHtml(t('posts_per_day')) + '</span></div>' +
    '<div class="compare-stat"><b>' + posts.length + '</b><span>' + window.escHtml(t('total_posts')) + '</span></div>' +
    '<div class="compare-stat"><b>' + active + '/' + days + '</b><span>' + window.escHtml(t('active_days')) + '</span></div>' +
    '<div class="compare-stat"><b>' + total + '</b><span>' + window.escHtml(t('posts_in_range', days)) + '</span></div>' +
    '</div>' +
    '<canvas class="compare-chart" id="' + canvasId + '"></canvas>' +
    (kw.length ? '<div class="compare-tags">' + kw.map(k => '<span class="compare-tag">' + window.escHtml(k[0]) + ' · ' + k[1] + '</span>').join('') + '</div>' : '');
}

function renderCompare() {
  const a = document.getElementById('compareColA');
  const b = document.getElementById('compareColB');
  if (!a || !b) return;
  a.innerHTML = compareColumn(compareA, 'compareChartA');
  b.innerHTML = compareColumn(compareB, 'compareChartB');
  for (const [id, username] of [['compareChartA', compareA], ['compareChartB', compareB]]) {
    const canvas = document.getElementById(id);
    if (!canvas || !username) continue;
    drawCompareChart(canvas, window.channelActivity(username, window.chartRange || 7));
  }
}

function drawCompareChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const padding = { top: 8, right: 6, bottom: 18, left: 6 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;
  const values = data.map(d => d.posts);
  const maxVal = Math.max(...values, 1);
  const stepX = chartW / (values.length - 1 || 1);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e5e5e5';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH * i) / 3;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(W - padding.right, y); ctx.stroke();
  }
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0088cc';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (v / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
