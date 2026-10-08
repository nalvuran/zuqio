import { firebaseConfig, APP_NAME } from './firebase-config.js';
import { QUESTIONS } from './questions.js';
const BASE_QS = QUESTIONS.slice(); // günün sorusu herkeste aynı olsun diye sadece hazır sorulardan seçilir
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, reauthenticateWithPopup, deleteUser } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref as fbRef, get as fbGet, set as fbSet, update as fbUpdate, remove as fbRemove, onValue as fbOnValue, onDisconnect as fbOnDisconnect, serverTimestamp, query, orderByChild, equalTo, limitToLast } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = getDatabase(fb);

/* ================= yerel oda katmanı (bilgisayara karşı mod) =================
   "rooms/L…" ve "keys/L…" yolları Firebase'e gitmez, telefonun belleğinde tutulur.
   Böylece oyun motorunun tamamı botlu oyunda da aynen çalışır. */
const LOCAL = {};
const TS_JSON = JSON.stringify(serverTimestamp());
const localSubs = [];
const isLocalPath = p => /^(rooms|keys)\/L/.test(p || '');
const lparts = p => p.split('/').filter(Boolean);
const lclone = v => v == null ? null : JSON.parse(JSON.stringify(v));
function lres(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v) === TS_JSON) return Date.now() + S.offset;
  if (Array.isArray(v)) return v.map(lres);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) if (v[k] != null) o[k] = lres(v[k]); return Object.keys(o).length ? o : null; }
  return v;
}
function lget(p) { let n = LOCAL; for (const k of lparts(p)) { if (n == null || typeof n !== 'object') return null; n = n[k]; } return n === undefined ? null : n; }
function lset(p, v) {
  const ks = lparts(p); let n = LOCAL;
  for (let i = 0; i < ks.length - 1; i++) { if (n[ks[i]] == null || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; }
  v = lres(v); if (v == null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = v;
}
const lsnap = (v, key) => ({key, val: () => lclone(v), exists: () => v != null, forEach(cb) { if (v && typeof v === 'object') for (const k in v) cb(lsnap(v[k], k)); }});
function lnotify() { setTimeout(() => { for (const sb of localSubs.slice()) { const v = lget(sb.p), j = JSON.stringify(v); if (j !== sb.last) { sb.last = j; sb.cb(lsnap(v)); } } }, 0); }
const ref = (d, p) => isLocalPath(p) ? {__local: true, p} : fbRef(d, p);
const get = r => r && r.__local ? Promise.resolve(lsnap(lget(r.p))) : fbGet(r);
const set = (r, v) => { if (r && r.__local) { lset(r.p, v); lnotify(); return Promise.resolve(); } return fbSet(r, v); };
const remove = r => set(r, null);
const update = (r, o) => { if (r && r.__local) { for (const k in o) lset(r.p + '/' + k, o[k]); lnotify(); return Promise.resolve(); } return fbUpdate(r, o); };
const onValue = (r, cb, err) => {
  if (r && r.__local) { const sb = {p: r.p, cb, last: undefined}; localSubs.push(sb); lnotify(); return () => { const i = localSubs.indexOf(sb); if (i >= 0) localSubs.splice(i, 1); }; }
  return fbOnValue(r, cb, err);
};
const onDisconnect = r => r && r.__local ? {set: () => Promise.resolve(), cancel: () => Promise.resolve()} : fbOnDisconnect(r);

/* ================= yardımcılar ================= */
const ICON = {
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  key:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 12h.01M11 12h.01M15 12h.01"/></svg>',
  list:'<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  bolt:'<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  trophy:'<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/></svg>',
  half:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/></svg>',
  x2:'<svg viewBox="0 0 24 24"><path d="M5 7l6 10M11 7l-6 10M15 9a2 2 0 1 1 4 0c0 2-4 4-4 8h4"/></svg>',
  ice:'<svg viewBox="0 0 24 24"><path d="M12 2v20M4 7l16 10M20 7 4 17M9 4l3 3 3-3M9 20l3-3 3 3"/></svg>',
  again:'<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/></svg>',
  hint:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
  home:'<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7M6 10v10h12V10M10 20v-6h4v6"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  shop:'<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v7h14v-7M10 20v-4h4v4"/></svg>',
  help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.5-2.7 4M12 17.5h.01"/></svg>',
  gift:'<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.2 8.4 8 12 8zM12 8s1.5-4.5 4-3.8S15.6 8 12 8z"/></svg>',
  back:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
};
const AV = [
  {c:'#1E78F5', b:'rect',    f:'happy'},
  {c:'#FFC21A', b:'diamond', f:'grin'},
  {c:'#E5333B', b:'tri',     f:'wink'},
  {c:'#2FA84F', b:'circle',  f:'smile'},
  {c:'#7B5CFF', b:'hex',     f:'glasses'},
  {c:'#FF8A1F', b:'squircle',f:'tongue'},
  {c:'#FF5FA2', b:'blob',    f:'blush'},
  {c:'#17C3B2', b:'pill',    f:'cool'}
];
const PREMIUM_NAMES = {8:'Yıldız', 9:'Kalp', 10:'Damla', 11:'Bulut', 12:'Robot', 13:'Kedi', 14:'Hayalet', 15:'Kral'};
function avPremium(i) {
  const k = '#1C1240';
  const dots = y => `<circle cx="18.5" cy="${y}" r="2.3" fill="${k}"/><circle cx="29.5" cy="${y}" r="2.3" fill="${k}"/>`;
  const eyes = y => `<circle cx="18" cy="${y}" r="4" fill="#fff"/><circle cx="30" cy="${y}" r="4" fill="#fff"/><circle cx="18.6" cy="${y + .6}" r="2.1" fill="${k}"/><circle cx="30.6" cy="${y + .6}" r="2.1" fill="${k}"/>`;
  const smile = y => `<path d="M19.5 ${y}Q24 ${y + 4.5} 28.5 ${y}" fill="none" stroke="${k}" stroke-width="2.1" stroke-linecap="round"/>`;
  let g = '';
  switch (i) {
    case 8: g = `<polygon points="24,7.5 29,18.6 41.1,19.9 32.1,28.1 34.6,40.1 24,34 13.4,40.1 15.9,28.1 6.9,19.9 19,18.6" fill="#FFC21A" stroke="#FFC21A" stroke-width="4" stroke-linejoin="round"/>${dots(25)}${smile(29)}`; break;
    case 9: g = `<path d="M24 40C8 29 6 18 13 13.5C18 10.5 22 13 24 17C26 13 30 10.5 35 13.5C42 18 40 29 24 40Z" fill="#FF4D8D"/>${dots(22)}${smile(26.5)}<circle cx="14.5" cy="26" r="2.4" fill="#FFB3D1"/><circle cx="33.5" cy="26" r="2.4" fill="#FFB3D1"/>`; break;
    case 10: g = `<path d="M24 6C32 17 38 23 38 29A14 14 0 0 1 10 29C10 23 16 17 24 6Z" fill="#2CC4F0"/>${eyes(29)}${smile(35)}`; break;
    case 11: g = `<g fill="#A8D4FF"><circle cx="16" cy="28" r="9"/><circle cx="25" cy="23" r="11"/><circle cx="33" cy="29" r="8"/><rect x="9" y="28" width="30" height="11" rx="5"/></g><path d="M14.5 29Q18 32.5 21.5 29M26.5 29Q30 32.5 33.5 29" fill="none" stroke="${k}" stroke-width="2.1" stroke-linecap="round"/><ellipse cx="24" cy="34.5" rx="2.2" ry="1.8" fill="${k}"/>`; break;
    case 12: g = `<line x1="24" y1="13" x2="24" y2="7.5" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="6.5" r="2.6" fill="#FF5A5F"/><circle cx="9" cy="26" r="2.4" fill="#3B4CB8"/><circle cx="39" cy="26" r="2.4" fill="#3B4CB8"/><rect x="10" y="13" width="28" height="27" rx="7" fill="#5E7CE2"/><rect x="14" y="20" width="8.5" height="7.5" rx="2.2" fill="#fff"/><rect x="25.5" y="20" width="8.5" height="7.5" rx="2.2" fill="#fff"/><rect x="16.5" y="22" width="4" height="4" rx="1" fill="${k}"/><rect x="28" y="22" width="4" height="4" rx="1" fill="${k}"/><rect x="17" y="32" width="14" height="3.4" rx="1.7" fill="${k}"/>`; break;
    case 13: g = `<polygon points="10,21 11.5,6.5 21.5,13" fill="#FF8A1F" stroke="#FF8A1F" stroke-width="2.4" stroke-linejoin="round"/><polygon points="38,21 36.5,6.5 26.5,13" fill="#FF8A1F" stroke="#FF8A1F" stroke-width="2.4" stroke-linejoin="round"/><circle cx="24" cy="26" r="15" fill="#FF8A1F"/>${eyes(24.5)}<polygon points="22.3,29.2 25.7,29.2 24,31.4" fill="#FF6B8A"/><path d="M24 31.4Q21.5 35 18.5 33.4M24 31.4Q26.5 35 29.5 33.4" fill="none" stroke="${k}" stroke-width="1.8" stroke-linecap="round"/><path d="M8.5 28.5L14.5 29.5M8.5 33L14.5 32M39.5 28.5L33.5 29.5M39.5 33L33.5 32" stroke="${k}" stroke-width="1.2" stroke-linecap="round"/>`; break;
    case 14: g = `<path d="M9 40V22A15 15 0 0 1 39 22V40L34 36L29 40L24 36L19 40L14 36Z" fill="#B9A7FF"/><ellipse cx="18.5" cy="23" rx="2.6" ry="3.4" fill="${k}"/><ellipse cx="29.5" cy="23" rx="2.6" ry="3.4" fill="${k}"/><ellipse cx="24" cy="30.5" rx="2.7" ry="3.2" fill="${k}"/><circle cx="13.5" cy="28" r="2.2" fill="#E3D9FF"/><circle cx="34.5" cy="28" r="2.2" fill="#E3D9FF"/>`; break;
    case 15: g = `<circle cx="24" cy="28" r="14" fill="#7B5CFF"/><polygon points="14,19 16.5,8 21,13.5 24,6.5 27,13.5 31.5,8 34,19" fill="#FFC21A" stroke="#E39A00" stroke-width="1.4" stroke-linejoin="round"/>${eyes(28)}${smile(33.5)}`; break;
    default: g = '';
  }
  return `<svg viewBox="3 3 42 42" aria-hidden="true">${g}</svg>`;
}
function avSVG(i){
  if (i >= 8) return avPremium(i);
  const a = AV[((i % 8) + 8) % 8], c = a.c, k = '#1C1240';
  const body = {
    rect:`<rect x="8" y="9" width="32" height="31" rx="9" fill="${c}"/>`,
    diamond:`<polygon points="24,6 42,24 24,42 6,24" fill="${c}" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>`,
    tri:`<polygon points="24,8 42,39 6,39" fill="${c}" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>`,
    circle:`<circle cx="24" cy="25" r="16" fill="${c}"/>`,
    hex:`<polygon points="40,24 32,38 16,38 8,24 16,10 32,10" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`,
    squircle:`<rect x="8" y="8" width="32" height="32" rx="13" fill="${c}" transform="rotate(-8 24 24)"/>`,
    blob:`<g fill="${c}"><circle cx="17" cy="27" r="11"/><circle cx="31" cy="27" r="11"/><circle cx="24" cy="19" r="11"/><rect x="13" y="26" width="22" height="12" rx="4"/></g>`,
    pill:`<rect x="11" y="6" width="26" height="36" rx="13" fill="${c}"/>`
  }[a.b];
  const y = {rect:23, diamond:23, tri:30, circle:24, hex:23, squircle:24, blob:25, pill:21}[a.b];
  const eyes = `<circle cx="18" cy="${y}" r="4.2" fill="#fff"/><circle cx="30" cy="${y}" r="4.2" fill="#fff"/><circle cx="18.6" cy="${y+.6}" r="2.2" fill="${k}"/><circle cx="30.6" cy="${y+.6}" r="2.2" fill="${k}"/>`;
  const dots = `<circle cx="18.5" cy="${y}" r="2.4" fill="${k}"/><circle cx="29.5" cy="${y}" r="2.4" fill="${k}"/>`;
  const smile = `<path d="M19 ${y+6.5}Q24 ${y+11} 29 ${y+6.5}" fill="none" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/>`;
  const face = {
    happy: eyes + smile,
    grin: eyes + `<path d="M17.5 ${y+6}Q24 ${y+14} 30.5 ${y+6}Z" fill="${k}"/>`,
    wink: `<circle cx="18" cy="${y}" r="4.2" fill="#fff"/><circle cx="18.6" cy="${y+.6}" r="2.2" fill="${k}"/><path d="M26.5 ${y+.5}Q30 ${y-3} 33.5 ${y+.5}" fill="none" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/>` + smile,
    smile: dots + smile,
    glasses: eyes + `<g fill="none" stroke="${k}" stroke-width="1.8"><circle cx="18" cy="${y}" r="5.6"/><circle cx="30" cy="${y}" r="5.6"/><path d="M23.6 ${y}h.8"/></g><path d="M21 ${y+8}Q24 ${y+10} 27 ${y+8}" fill="none" stroke="${k}" stroke-width="2" stroke-linecap="round"/>`,
    tongue: eyes + `<path d="M18.5 ${y+6.5}Q24 ${y+11} 29.5 ${y+6.5}" fill="none" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="25" cy="${y+10}" rx="2.6" ry="2.2" fill="#FF6B8A"/>`,
    blush: dots + smile + `<circle cx="14.5" cy="${y+5}" r="2.6" fill="#FFB3D1"/><circle cx="33.5" cy="${y+5}" r="2.6" fill="#FFB3D1"/>`,
    cool: `<rect x="13" y="${y-3.5}" width="9.5" height="6.5" rx="2.5" fill="${k}"/><rect x="25.5" y="${y-3.5}" width="9.5" height="6.5" rx="2.5" fill="${k}"/><path d="M22.5 ${y-1}h3" stroke="${k}" stroke-width="1.8"/><path d="M20 ${y+7.5}Q25 ${y+10.5} 30 ${y+6.5}" fill="none" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/>`
  }[a.f];
  return `<svg viewBox="3 3 42 42" aria-hidden="true">${body}${face}</svg>`;
}

const COLORS = ['#7B5CFF', '#E5333B', '#1E78F5', '#2FA84F', '#FFC21A', '#FF8A1F', '#FF5FA2', '#17C3B2'];
const SHAPE_NAMES = ['Parıltı', 'Ok', 'Dalga', 'Yaprak'];
const JOKER_INFO = {
  half:   {label:'Yarı yarıya', icon:'half'},
  hint:   {label:'İpucu', icon:'hint'},
  double: {label:'Çifte puan', icon:'x2'},
  freeze: {label:'Buz', icon:'ice'},
  second: {label:'İkinci şans', icon:'again'}
};
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.round(n).toLocaleString('tr-TR');
const fmtQ = (q, v) => q && q.tolAbs ? String(Math.round(v)) : fmt(v);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const buzz = ms => { try { if (S.haptic !== false && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
const APP_VERSION = '0.5 (test)';
const icon = i => `<img src="ic${i}.png" alt="" draggable="false">`;
const avatar = (av, cls = '', fr = '') => `<div class="avatar ${cls} ${/^fr[0-9]+$/.test(fr || '') ? fr : ''}">${avSVG(av || 0)}</div>`;
const backBtn = (act, label = 'Geri') => `<button class="back" ${act}>${ICON.back}${label}</button>`;
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

/* ================= ses efektleri (dışarıdan dosya yok, tarayıcıda üretilir) ================= */
const SFX = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; this.ctx = new C(); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
  },
  tone(f, t0, dur, type, vol, f2) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  play(name) {
    if (!S.sound || !this.ctx || this.ctx.state !== 'running') return;
    const T = (f, t, d, type = 'triangle', v = 0.15, f2) => this.tone(f, t, d, type, v, f2);
    switch (name) {
      case 'tick':    T(880, 0, 0.07, 'square', 0.05); break;
      case 'go':      T(660, 0, 0.12); T(990, 0.1, 0.22); break;
      case 'tap':     T(520, 0, 0.07, 'triangle', 0.12); break;
      case 'pop':     T(620, 0, 0.09, 'sine', 0.1, 980); break;
      case 'joker':   T(600, 0, 0.08); T(900, 0.08, 0.08); T(1250, 0.16, 0.16); break;
      case 'correct': T(523, 0, 0.14); T(659, 0.1, 0.14); T(784, 0.2, 0.3); break;
      case 'wrong':   T(240, 0, 0.3, 'sawtooth', 0.09, 110); break;
      case 'timeup':  T(300, 0, 0.28, 'sine', 0.14, 140); break;
      case 'win':     T(523, 0, 0.14); T(659, 0.13, 0.14); T(784, 0.26, 0.14); T(1047, 0.39, 0.5); break;
      case 'end':     T(392, 0, 0.2); T(330, 0.18, 0.34); break;
      case 'coin':    T(988, 0, 0.07, 'square', 0.07); T(1319, 0.07, 0.22, 'square', 0.07); break;
    }
  }
};

/* ================= arka plan müziği =================
   Dosya yok: müzik tarayıcıda anlık üretilir (telif derdi yok, internet harcamaz).
   Yumuşak bir akor döngüsü + bas + seyrek, yankılı notalar. */
const MUSIC = {
  on: false, master: null, bus: null, noise: null, timer: null, next: 0, step: 0, level: 0.5,
  bpm: 112,
  // C – G – Am – F (neşeli pop döngüsü), oktav 3-4
  chords: [[261.6, 329.6, 392.0], [246.9, 293.7, 392.0], [220.0, 261.6, 329.6], [220.0, 261.6, 349.2]],
  bass: [[65.4, 98.0], [98.0, 73.4], [55.0, 82.4], [87.3, 65.4]],
  // 16 adımlık melodi kalıbı: akorun notalarının indeksleri (-1 = sus); 2 oktav yukarıda çalınır
  mel: [0, -1, 1, 2, -1, 1, 2, -1, 0, -1, 2, 1, -1, 2, 1, -1],
  setup() {
    const c = SFX.ctx; if (!c || this.master) return;
    this.master = c.createGain(); this.master.gain.value = 0.0001;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const dl = c.createDelay(1); dl.delayTime.value = 60 / this.bpm * 0.75;
    const fb = c.createGain(); fb.gain.value = 0.22;
    const wet = c.createGain(); wet.gain.value = 0.35;
    this.bus = c.createGain(); this.bus.gain.value = 1;
    this.bus.connect(lp); lp.connect(this.master);
    lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this.master);
    this.master.connect(c.destination);
    const len = Math.floor(c.sampleRate * 0.05), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },
  note(f, t, dur, type, vol, atk) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
  },
  hat(t, vol) {
    const c = SFX.ctx, src = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    src.connect(hp); hp.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.06);
  },
  schedule() {
    const c = SFX.ctx; if (!c || c.state !== 'running') return;
    const sx = 60 / this.bpm / 4; // 16'lık
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.4) {
      const t = this.next, bar = Math.floor(this.step / 16) % 4, pos = this.step % 16, ch = this.chords[bar];
      // kısa, zıplayan akor vuruşları (2. ve 4. vuruş)
      if (pos === 4 || pos === 12) ch.forEach(f => this.note(f, t, sx * 3, 'triangle', 0.022, 0.01));
      // bas: kök – beşli, sekizlik
      if (pos % 4 === 0) this.note(this.bass[bar][pos % 8 === 0 ? 0 : 1], t, sx * 2.5, 'sine', 0.085, 0.01);
      // melodi
      const m = this.mel[pos]; if (m >= 0 && (bar !== 3 || pos < 12)) this.note(ch[m] * 2, t, sx * 1.8, 'square', 0.011, 0.005);
      // hafif zil
      if (pos % 2 === 0) this.hat(t, pos % 4 === 2 ? 0.035 : 0.015);
      this.next += sx; this.step++;
    }
  },
  start() {
    if (!S.music) return;
    SFX.init(); const c = SFX.ctx; if (!c) return;
    this.setup();
    if (!this.timer) { this.next = 0; this.timer = setInterval(() => this.schedule(), 120); this.schedule(); }
    this.on = true; this.fade(this.target());
  },
  stop() {
    this.on = false; this.fade(0.0001);
    setTimeout(() => { if (!this.on && this.timer) { clearInterval(this.timer); this.timer = null; } }, 900);
  },
  target() { return S.screen === 'question' ? this.level * 0.45 : this.level; },
  fade(v) {
    const c = SFX.ctx; if (!c || !this.master) return;
    const g = this.master.gain, t = c.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(Math.max(g.value, 0.0001), t); g.exponentialRampToValueAtTime(Math.max(v, 0.0001), t + 0.8);
  },
  duck() { if (this.on) this.fade(this.target()); }
};

/* ================= durum ================= */
const S = {
  user: null, me: null, screen: 'loading', code: null, R: null, keys: null,
  offset: 0, unsubRoom: null, lastKey: '', hostBusy: false, q: null,
  pick: 0, draft: '', firstProfile: false, pendingCode: null, wake: null, busy: false,
  sound: ls.get('zuqio-sound') !== '0', music: ls.get('zuqio-music') !== '0', haptic: ls.get('zuqio-haptic') !== '0', lastN: null, catsOpen: false, catSel: new Set(), catAll: true, catMode: 'quiz'
};
const uid = () => S.user && S.user.uid;
const now = () => Date.now() + S.offset;
const roomRef = (p = '') => ref(db, `rooms/${S.code}${p ? '/' + p : ''}`);

onValue(ref(db, '.info/serverTimeOffset'), s => { S.offset = s.val() || 0; });
onValue(ref(db, '.info/connected'), s => { if (s.val()) markOnline(); });

function go(screen) { S.screen = screen; render(); app.scrollTop = 0; }

/* ================= jeton, günlük ödül, mağaza ================= */
const COIN = `<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#FFC21A" stroke="#E39A00" stroke-width="1.5"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#E39A00" stroke-width="1.3"/><path d="M12 8.4l1.1 2.4 2.6.3-1.9 1.8.5 2.6-2.3-1.3-2.3 1.3.5-2.6-1.9-1.8 2.6-.3z" fill="#E39A00"/></svg>`;
const DAILY = [10, 10, 15, 15, 20, 25, 50];
const QUESTION_REWARD = {right: 20, wrong: 5};
const SHOP = [
  {id: 'av8', av: 8, price: 60}, {id: 'av9', av: 9, price: 60}, {id: 'av10', av: 10, price: 80}, {id: 'av11', av: 11, price: 80},
  {id: 'av12', av: 12, price: 100}, {id: 'av13', av: 13, price: 100}, {id: 'av14', av: 14, price: 120}, {id: 'av15', av: 15, price: 150}
];
const FRAMES = [
  {id: 'fr1', name: 'Altın', price: 80}, {id: 'fr4', name: 'Buz', price: 80}, {id: 'fr6', name: 'Gece', price: 100},
  {id: 'fr2', name: 'Neon', price: 120}, {id: 'fr5', name: 'Alev', price: 150}, {id: 'fr3', name: 'Gökkuşağı', price: 200}
];
// Tepki paketleri: re0 herkese ücretsiz. Her paketin 3 tepkisi var, sırası kurallarla eşleşir.
const REACT_PACKS = [
  {id: 're0', name: 'Temel', price: 0, e: ['👍', '😂', '😮']},
  {id: 're1', name: 'Kutlama', price: 50, e: ['🔥', '🎉', '👏']},
  {id: 're2', name: 'Atışma', price: 70, e: ['😎', '😈', '🤯']},
  {id: 're3', name: 'Duygusal', price: 50, e: ['😭', '❤️', '🙏']}
];
const SHIELD = {price: 40, max: 2};
const shields = () => (S.me && S.me.wallet && S.me.wallet.shield) || 0;
const coins = () => (S.me && S.me.wallet && S.me.wallet.coins) || 0;
const owned = id => !!(S.me && S.me.owned && S.me.owned[id]);
const dayIdx = () => Math.floor((now() + 10800000) / 86400000); // Türkiye saatine göre gün numarası

function dailyState() {
  const w = (S.me && S.me.wallet) || {}, t = dayIdx();
  const claimed = w.claimDay === t, saved = w.claimDay === t - 2 && (w.shield || 0) > 0;
  const cont = w.claimDay === t - 1 || saved;
  const next = claimed ? w.streak : (cont ? (w.streak % 7) + 1 : 1);
  const done = claimed ? w.streak : (cont && w.streak < 7 ? w.streak : 0);
  return {claimed, next, done, saved, qDone: w.qDay === t, qRes: w.qRes};
}

// Günün sorusu: herkese aynı, tarihe göre belirlenir (İngilizce hariç, çoktan seçmeli)
function dailyQuestion() {
  const t = dayIdx(), pool = BASE_QS.filter(q => q.t === 'mc' && q.cat !== 'İngilizce');
  const q = pool[((t * 2654435761) >>> 0) % pool.length];
  let seed = (t * 1103515245 + 12345) >>> 0;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const idx = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return {q, o: idx.map(i => q.o[i]), a: idx.indexOf(0)};
}

async function freshWallet() {
  const s = await get(ref(db, 'users/' + uid()));
  const v = s.val() || {};
  S.me = Object.assign({}, S.me, v);
  return v.wallet || {};
}

async function claimDaily() {
  if (S.busy) return;
  S.busy = true; render();
  try {
    const w = await freshWallet(), t = dayIdx();
    if (w.claimDay === t) { toast('Bugünün ödülünü zaten aldın'); S.busy = false; render(); return; }
    const saved = w.claimDay === t - 2 && (w.shield || 0) > 0;
    const streak = (w.claimDay === t - 1 || saved) ? (w.streak % 7) + 1 : 1, amt = DAILY[streak - 1];
    const up = {'wallet/coins': (w.coins || 0) + amt, 'wallet/claimDay': t, 'wallet/streak': streak};
    if (saved) up['wallet/shield'] = w.shield - 1;
    await update(ref(db, 'users/' + uid()), up);
    SFX.play('coin'); buzz(30); toast(saved ? `Seri koruyucu serini kurtardı! +${amt} jeton` : `+${amt} jeton kazandın!`);
  } catch (e) { console.error(e); toast('Ödül alınamadı, tekrar dene'); }
  S.busy = false; render();
}

const DQ_TIME = 15000; // günün sorusu için süre
function dqStartT() { try { const v = JSON.parse(ls.get('zuqio-dq') || 'null'); return v && v.day === dayIdx() ? v.t : null; } catch (e) { return null; } }
function dqLeft() { const t = dqStartT(); return t == null ? null : Math.max(0, DQ_TIME - (Date.now() - t)); }
function dqStart() { if (dqStartT() == null) ls.set('zuqio-dq', JSON.stringify({day: dayIdx(), t: Date.now()})); S.dqPick = null; render(); }
async function answerDaily(i) {
  if (S.busy) return;
  const st = dailyState(); if (st.qDone) return;
  if (i >= 0 && dqLeft() == null) return; // önce BAŞLA'ya basılmalı
  const late = i >= 0 && dqLeft() === 0; if (late) i = -1; // süre bittikten sonra gelen cevap geçersiz
  const dq = dailyQuestion(), right = i === dq.a, amt = right ? QUESTION_REWARD.right : QUESTION_REWARD.wrong;
  S.busy = true; S.dqPick = {day: dayIdx(), i}; render();
  try {
    const w = await freshWallet(), t = dayIdx();
    if (w.qDay === t) { S.busy = false; render(); return; }
    await update(ref(db, 'users/' + uid()), {'wallet/coins': (w.coins || 0) + amt, 'wallet/qDay': t, 'wallet/qRes': right ? 1 : 0});
    SFX.play(right ? 'correct' : 'wrong'); buzz(right ? [30, 40, 30] : 120);
    toast(right ? `Doğru! +${amt} jeton` : i < 0 ? `Süre doldu, +${amt} jeton kazandın` : `Yanlış, ama +${amt} jeton kazandın`);
  } catch (e) { console.error(e); S.dqPick = null; S.dqRetry = Date.now() + 4000; toast('Cevap kaydedilemedi, tekrar dene'); }
  S.busy = false; render();
}

function shopItem(id) {
  const av = SHOP.find(x => x.id === id); if (av) return {id, kind: 'av', av: av.av, price: av.price, name: PREMIUM_NAMES[av.av] + ' avatarı'};
  const fr = FRAMES.find(x => x.id === id); if (fr) return {id, kind: 'fr', price: fr.price, name: fr.name + ' çerçevesi'};
  const rp = REACT_PACKS.find(x => x.id === id); if (rp && rp.price) return {id, kind: 're', price: rp.price, name: rp.name + ' tepki paketi'};
  if (id === 'shield') return {id, kind: 'shield', price: SHIELD.price, name: 'Seri koruyucu'};
  return null;
}

async function buyItem(id) {
  const it = shopItem(id); if (!it || S.busy) return;
  const w = await freshWallet();
  if (it.kind === 'shield' ? (w.shield || 0) >= SHIELD.max : owned(id)) return;
  if ((w.coins || 0) < it.price) { toast(`Yeterli jetonun yok (${it.price} gerekli)`); render(); return; }
  if (!confirm(`${it.name} için ${it.price} jeton harcamak istiyor musun?`)) return;
  S.busy = true;
  try {
    const up = {'wallet/coins': (w.coins || 0) - it.price};
    if (it.kind === 'shield') up['wallet/shield'] = (w.shield || 0) + 1; else up['owned/' + id] = true;
    await update(ref(db, 'users/' + uid()), up);
    await freshWallet();
    SFX.play('coin'); toast(it.kind === 'shield' ? 'Seri koruyucu hazır!' : `${it.name} artık senin!`);
  } catch (e) { console.error(e); toast('Satın alınamadı, tekrar dene'); }
  S.busy = false; render();
}

async function equipItem(id) {
  const it = shopItem(id) || (id === 'fr0' ? {kind: 'fr'} : null);
  if (!it || (id !== 'fr0' && !owned(id))) return;
  const up = it.kind === 'av' ? {av: it.av} : {fr: id === 'fr0' ? '' : id};
  try {
    await update(ref(db, 'users/' + uid()), up);
    S.me = Object.assign({}, S.me, up); syncBoardProfile();
    toast(it.kind === 'av' ? 'Avatarın değişti' : (id === 'fr0' ? 'Çerçeve çıkarıldı' : 'Çerçeven takıldı'));
  } catch (e) { console.error(e); toast('Değiştirilemedi'); }
  render();
}

/* ================= tepkiler ================= */
const myPacks = () => REACT_PACKS.filter(p => !p.price || owned(p.id));
function reactBar() {
  return ''; // tepkiler kaldırıldı
  if (!S.code || isBotRoom()) return '';
  return `<div class="reactbar" role="group" aria-label="Tepki gönder">${myPacks().map(p => p.e.map((e, k) =>
    `<button data-act="react" data-p="${p.id}" data-e="${REACT_PACKS.indexOf(p) * 3 + k}" aria-label="Tepki ${e}">${e}</button>`).join('')).join('')}</div>`;
}
let lastReact = 0;
async function sendReact(p, e) {
  if (Date.now() - lastReact < 1600) return;
  lastReact = Date.now(); buzz(15);
  try { await set(ref(db, `rooms/${S.code}/react/${uid()}`), {e, p, t: serverTimestamp()}); }
  catch (err) { console.error(err); }
}
const reactSeen = {};
function showReacts(R) {
  return; // tepkiler kaldırıldı
  const rx = R.react || {};
  for (const [id, r] of Object.entries(rx)) {
    if (!r || typeof r.t !== 'number') continue;
    const first = reactSeen[id] === undefined;
    if (reactSeen[id] === r.t) continue;
    reactSeen[id] = r.t;
    if (first && now() - r.t > 4000) continue;
    const pk = REACT_PACKS[Math.floor(r.e / 3)], emo = pk && pk.e[r.e % 3]; if (!emo) continue;
    const p = (R.players || {})[id] || {};
    const el = document.createElement('div'); el.className = 'rfly';
    el.style.left = (12 + Math.random() * 62) + '%';
    el.innerHTML = `<span class="re">${emo}</span><span class="rn">${esc(p.name || '')}</span>`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  }
}

let unsubMe = null;
function watchMe() {
  if (unsubMe) unsubMe();
  unsubMe = onValue(ref(db, 'users/' + uid()), snap => {
    const v = snap.val(); if (!v) return;
    S.me = v;
    if (['home', 'daily', 'shop', 'settings'].includes(S.screen) && !S.busy) render();
  });
}

/* ================= ekranlar ================= */
const V = {};
const LOGO = () => `<div class="hero">
  <div class="logo4">${[0, 1, 2, 3].map(icon).join('')}</div>
  <div class="wordmark">${esc(APP_NAME.toUpperCase()).replace('Q', '<span>Q</span>')}</div>
  <p class="slogan">Soruyu bil, <span class="y">seçimini yap</span>, <span class="g">kazan</span>!</p>
</div>`;

function annBanner() {
  const A = S.ann; if (!A || !A.text || ls.get('zuqio-ann') === String(A.t)) return '';
  return `<div class="annmodal" data-act="annclose"><div class="anncard" role="dialog" aria-label="Duyuru" data-stop="1">
    <button class="annx" data-act="annclose" aria-label="Kapat">✕</button>
    <svg class="annleaf" viewBox="0 0 100 100" aria-hidden="true"><path d="M22 78C14 46 34 18 82 16C84 58 62 84 28 82" fill="#fff"/><path d="M20 82C34 62 50 44 68 30" fill="none" stroke="#2A9444" stroke-width="4" stroke-linecap="round"/></svg>
    <p>${esc(A.text)}</p></div></div>`;
}
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const monthLabel = key => { const m = /^m(\d{4})-(\d{2})$/.exec(key || ''); return m ? MONTHS_TR[+m[2] - 1] : ''; };
function winPop() {
  const w = S.win; if (!w || ls.get('zuqio-win-' + w.key) === '1') return '';
  return `<div class="annmodal" data-act="winclose"><div class="anncard" role="dialog" aria-label="Tebrikler" data-stop="1" style="flex-direction:column;gap:18px">
    <button class="annx" data-act="winclose" aria-label="Kapat">✕</button>
    <p style="font-size:1.2rem">🎉 Tebrikler!<br>${esc(monthLabel(w.key))} ayının kitap ödülünü kazandın</p>
    <button class="btn primary" data-act="bookdl" ${S.busyBook ? 'disabled' : ''}>Kitabını indir</button></div></div>`;
}
async function checkWin() {
  try {
    for (const off of [0, -1]) {
      const x = new Date(Date.now() + 10800000); x.setUTCMonth(x.getUTCMonth() + off, 1);
      const key = 'm' + x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0');
      const v = (await get(ref(db, 'prizes/' + key))).val();
      if (v && v.uid === uid()) { S.win = {key, name: v.name}; break; }
    }
  } catch (e) { console.error(e); }
  if (S.win && (S.screen === 'home' || S.screen === 'board')) render();
}
async function downloadBook() {
  const w = S.win; if (!w || S.busyBook) return;
  S.busyBook = true; toast('Kitap hazırlanıyor…');
  try {
    const v = (await get(ref(db, 'bookfile/' + w.key))).val();
    if (!v || !v.d) { toast('Kitap henüz yüklenmedi, biraz sonra tekrar dene'); S.busyBook = false; return; }
    const bin = atob(v.d), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], {type: 'application/pdf'}));
    const a = document.createElement('a'); a.href = url; a.download = v.n || 'Zuqio-kitap.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    ls.set('zuqio-win-' + w.key, '1'); toast('Kitap indirildi 🎉');
  } catch (e) { console.error(e); toast('İndirilemedi, tekrar dene'); }
  S.busyBook = false; render();
}
let annSub = null;
function watchAnn() { if (annSub) return; annSub = onValue(ref(db, 'announce'), sn => { S.ann = sn.val(); if (S.screen === 'home') render(); }, () => { annSub = null; }); }

V.banned = () => `
  <div class="screen"><div class="grow"></div>${LOGO()}
    <div class="card stack" style="gap:8px;text-align:center;margin-top:24px">
      <b>Hesabın askıya alındı</b>
      <p class="small muted">${S.banned && S.banned.why ? esc(S.banned.why) : 'Kurallara aykırı davranış nedeniyle hesabın şu an oyun oynayamıyor.'}</p>
    </div>
    <div class="grow"></div><button class="btn ghost" data-act="logout">Çıkış yap</button></div>`;

V.loading = () => `<div class="screen"><div class="grow"></div>${LOGO()}<div class="grow"></div><p class="status">Yükleniyor…</p></div>`;

V.login = () => `
  <div class="screen">
    <div class="grow"></div>${LOGO()}<div class="grow"></div>
    <div class="stack">
      <button class="btn gbtn" data-act="login" ${S.busy ? 'disabled' : ''}><img class="glogo" src="google-g.svg" alt="" onerror="this.style.display='none'">Google ile devam et</button>
      <p class="small muted" style="text-align:center">Hesabın yoksa ilk girişte otomatik oluşturulur.</p>
    </div>
  </div>`;

V.profile = () => `
  <div class="screen">
    <div class="top">${S.firstProfile ? '<span></span>' : backBtn('data-go="home"')}</div>
    <div class="stack" style="gap:16px">
      <h2>${S.firstProfile ? 'Hoş geldin!' : 'Profil'}</h2>
      ${S.firstProfile ? '<p class="muted">Oyunda görünecek adını ve avatarını seç. Sonra istediğin zaman değiştirebilirsin.</p>' : ''}
      <div class="avatar avbig">${avSVG(S.pick)}</div>
      <label class="small muted" for="pnm">Oyunda görünecek adın</label>
      <input class="field" id="pnm" maxlength="16" autocomplete="nickname" value="${esc(S.draft)}">
      <span class="small muted">Avatarını seç</span>
      <div class="avpick" role="radiogroup" aria-label="Avatar">
        ${[0, 1, 2, 3, 4, 5, 6, 7].concat(SHOP.filter(s => owned(s.id)).map(s => s.av)).map(i => `<button role="radio" aria-checked="${S.pick === i}" aria-label="Avatar ${i + 1}" class="${S.pick === i ? 'on' : ''}" data-act="av" data-i="${i}">${avSVG(i)}</button>`).join('')}
      </div>
    </div>
    <div class="grow" style="min-height:16px"></div>
    <div class="stack">
      <button class="btn primary big" data-act="saveprof" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">KAYDET</span></button>
      ${S.firstProfile ? '' : '<button class="btn ghost" data-act="logout">Çıkış yap</button>'}
    </div>
  </div>`;

V.home = () => `
  <div class="screen">
    ${winPop() || annBanner()}
    <div class="top"><button class="coinchip" data-go="shop" aria-label="Mağaza, ${coins()} jeton">${COIN}<b>${coins()}</b></button><button class="me-chip" data-act="openprofile" aria-label="Profili düzenle">${esc(S.me.name)}${avatar(S.me.av, '', S.me.fr)}</button></div>
    <div class="grow"></div>${LOGO()}
    <div class="grow" style="min-height:24px"></div>
    <div class="stack" style="gap:14px">
      <button class="btn primary big" data-act="quick" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">HIZLI OYNA</span></button>
      <button class="btn purple big" data-go="friends"><span class="ic">${ICON.users}</span><span class="lb">ARKADAŞLARINLA OYNA</span></button>
    </div>
  </div>`;

function untilTomorrow() {
  const ms = (dayIdx() + 1) * 86400000 - 10800000 - now();
  const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000);
  return `Yeni soru ${h} sa ${m} dk sonra`;
}
async function shareDaily() {
  const ok = dailyState().qRes === 1;
  const text = `${APP_NAME} · Günün sorusu ${ok ? '🟩 Bildim!' : '🟥 Bu sefer olmadı'}\nSen de dene:`;
  const url = location.origin + location.pathname;
  try {
    if (navigator.share) { await navigator.share({title: APP_NAME, text, url}); return; }
    await navigator.clipboard.writeText(text + ' ' + url); toast('Kopyalandı, istediğin yere yapıştır');
  } catch (e) { if (e && e.name !== 'AbortError') toast('Paylaşılamadı'); }
}

V.daily = () => {
  const st = dailyState(), dq = dailyQuestion(), pick = S.dqPick && S.dqPick.day === dayIdx() ? S.dqPick.i : null;
  const nextAmt = DAILY[st.claimed ? st.next % 7 : st.next - 1];
  return `
  <div class="screen">
    <div class="top">${backBtn('data-go="home"')}<span class="coinbar">${COIN}<b>${coins()}</b></span></div>
    <div class="stack" style="gap:14px">
      <h2>Günlük ödül</h2>
      <div class="days" aria-label="7 günlük seri">${DAILY.map((amt, i) => `<div class="day ${i + 1 <= st.done ? 'done' : ''} ${!st.claimed && i + 1 === st.next ? 'today' : ''}"><span class="n">${i + 1}. gün</span>${COIN}<b>${amt}</b></div>`).join('')}</div>
      ${st.claimed
        ? `<div class="donebox">✓ Bugünün ödülü alındı</div>`
        : `<button class="btn primary big" data-act="claim" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.gift}</span><span class="lb">ÖDÜLÜ AL · +${DAILY[st.next - 1]}</span></button>`}
      <p class="small muted" style="text-align:center">${st.claimed ? `Yarın gel, +${nextAmt} jeton seni bekliyor. Seri bozulmasın!` : (st.saved ? 'Dün gelemedin ama seri koruyucun serini kurtaracak!' : 'Her gün gelirsen ödül büyür, 7. gün en büyük ödül.')}${shields() ? ` · Seri koruyucu: ${shields()}` : ''}</p>
      ${st.qDone ? (() => {
        const ok = st.qRes === 1;
        return `<div class="card stack dqdone" style="gap:10px">
          <div class="row between"><span class="tag">Günün sorusu</span><span class="small muted" id="dqcd">${untilTomorrow()}</span></div>
          <p class="small muted">${esc(dq.q.q)}</p>
          <div class="dqres ${ok ? 'ok' : 'no'}"><b>${ok ? '✓ Doğru bildin' : S.dqPick && S.dqPick.day === dayIdx() && S.dqPick.i < 0 ? '⏱ Süre doldu' : '✗ Bu sefer olmadı'}</b><span>${ok ? `+${QUESTION_REWARD.right} jeton` : `Doğrusu: ${esc(dq.o[dq.a])} · +${QUESTION_REWARD.wrong} jeton`}</span></div>
          <button class="btn outline" data-act="dqshare">Sonucu paylaş</button>
        </div>`;
      })() : (dqLeft() == null
      ? `<div class="card stack" style="gap:10px;text-align:center">
        <div class="row between"><span class="tag">Günün sorusu</span><span class="small muted">Doğru +${QUESTION_REWARD.right} · Yanlış +${QUESTION_REWARD.wrong}</span></div>
        <p style="font-size:1.1rem;font-weight:600">Hazır mısın? Cevaplamak için <b>${DQ_TIME / 1000} saniyen</b> var.</p>
        <button class="btn primary big" data-act="dqstart"><span class="ic">${ICON.play}</span><span class="lb">BAŞLA</span></button>
      </div>`
      : `<div class="card stack" style="gap:10px">
        <div class="row between"><span class="tag">Günün sorusu</span><div class="hex" id="dqhex">${Math.ceil(dqLeft() / 1000)}</div></div>
        <div class="bar" style="margin:4px 0"><i id="dqbar" style="width:${dqLeft() / DQ_TIME * 100}%"></i></div>
        <p class="qtext" style="font-size:1.2rem">${esc(dq.q.q)}</p>
        <div class="answers dqa">${dq.o.map((o, i) => `<button class="ans c${i}" data-act="dqpick" data-i="${i}" ${S.busy ? 'disabled' : ''}>${icon(i)}<span>${esc(o)}</span></button>`).join('')}</div>
      </div>`)}
    </div>
  </div>`;
};

V.shop = () => {
  const tab = S.shopTab || 'av';
  const tabs = {av: 'Avatar', fr: 'Çerçeve', sh: 'Koruyucu'};
  let body = '';
  if (tab === 'av') body = `<div class="shopgrid">${SHOP.map(it => {
      const own = owned(it.id), cur = S.me.av === it.av;
      return `<button class="shopitem ${own ? 'own' : ''} ${cur ? 'cur' : ''}" data-act="${own ? 'equip' : 'buy'}" data-id="${it.id}" ${cur ? 'disabled' : ''}>
        <div class="avatar">${avSVG(it.av)}</div><b>${PREMIUM_NAMES[it.av]}</b>
        <span class="price">${own ? (cur ? 'Kullanılıyor' : 'Kullan') : COIN + it.price}</span></button>`;
    }).join('')}</div>`;
  else if (tab === 'fr') body = `<div class="shopgrid">${[{id: 'fr0', name: 'Çerçevesiz', price: 0}].concat(FRAMES).map(it => {
      const own = it.id === 'fr0' || owned(it.id), cur = (S.me.fr || 'fr0') === it.id;
      return `<button class="shopitem ${own ? 'own' : ''} ${cur ? 'cur' : ''}" data-act="${own ? 'equip' : 'buy'}" data-id="${it.id}" ${cur ? 'disabled' : ''}>
        ${avatar(S.me.av, '', it.id)}<b>${esc(it.name)}</b>
        <span class="price">${own ? (cur ? 'Takılı' : 'Tak') : COIN + it.price}</span></button>`;
    }).join('')}</div>
    <p class="small muted">Çerçeven lobide, oyun sıralamasında ve liderlik tablosunda görünür.</p>`;
  else body = `<div class="card stack" style="gap:10px;align-items:center;text-align:center">
      <div class="shieldic"><svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg></div>
      <b>Seri koruyucu</b>
      <p class="small muted">Günlük ödülü bir gün kaçırırsan serin bozulmaz; koruyucu kendiliğinden kullanılır. En fazla ${SHIELD.max} tane taşıyabilirsin.</p>
      <p><b>Sende: ${shields()} / ${SHIELD.max}</b></p>
      <button class="btn primary big" data-act="buy" data-id="shield" ${shields() >= SHIELD.max ? 'disabled' : ''}><span class="ic">${COIN}</span><span class="lb">${shields() >= SHIELD.max ? 'DOLU' : `AL · ${SHIELD.price} JETON`}</span></button>
    </div>`;
  return `
  <div class="screen">
    <div class="top">${backBtn('data-go="home"')}<span class="coinbar">${COIN}<b>${coins()}</b></span></div>
    <div class="stack" style="gap:14px">
      <h2>Mağaza</h2>
      <div class="tabs four" role="tablist" style="grid-template-columns:repeat(3,1fr)">${Object.keys(tabs).map(k => `<button role="tab" class="${tab === k ? 'on' : ''}" aria-selected="${tab === k}" data-act="shoptab" data-t="${k}">${tabs[k]}</button>`).join('')}</div>
      ${body}
      <p class="small muted">Mağazadaki her şey sadece görünüş ve eğlence içindir; puana ve sıralamaya etkisi yoktur. Jetonları günlük ödül ve günün sorusuyla kazanırsın.</p>
    </div>
  </div>`;
};

V.settings = () => `
  <div class="screen">
    <div class="top">${backBtn('data-go="home"')}</div>
    <div class="stack" style="gap:14px">
      <h2>Ayarlar</h2>
      <div class="card stack" style="gap:0;padding:0 16px">
        <div class="setrow"><div><b>Müzik</b><span class="small muted">Yumuşak arka plan müziği</span></div>
          <button class="switch ${S.music ? 'on' : ''}" role="switch" aria-checked="${S.music}" aria-label="Müzik" data-act="tmusic"></button></div>
        <div class="setrow"><div><b>Ses efektleri</b><span class="small muted">Doğru, yanlış ve geri sayım sesleri</span></div>
          <button class="switch ${S.sound ? 'on' : ''}" role="switch" aria-checked="${S.sound}" aria-label="Ses efektleri" data-act="tsound"></button></div>
        <div class="setrow"><div><b>Titreşim</b><span class="small muted">${'vibrate' in navigator ? 'Cevap verince ve süre azalınca titrer' : 'Bu cihaz web uygulamalarında titreşimi desteklemiyor'}</span></div>
          <button class="switch ${S.haptic && 'vibrate' in navigator ? 'on' : ''}" role="switch" aria-checked="${S.haptic && 'vibrate' in navigator}" aria-label="Titreşim" data-act="thaptic" ${'vibrate' in navigator ? '' : 'disabled'}></button></div>
      </div>
      <div class="card stack" style="gap:0;padding:0 16px">
        <button class="setrow" data-act="openprofile"><div><b>Profili düzenle</b><span class="small muted">${esc(S.me.name)}</span></div>${avatar(S.me.av, '', S.me.fr)}</button>
        <button class="setrow" data-go="how"><div><b>Nasıl oynanır?</b></div><span class="muted">›</span></button>
      </div>
      <div class="card stack" style="gap:4px">
        <b>${esc(APP_NAME)}</b>
        <span class="small muted">Sürüm ${APP_VERSION}</span>
        <span class="small muted">Şu an test aşamasındayız. Gördüğün hataları ve önerilerini bize ilet, birlikte geliştirelim.</span>
      </div>
      <button class="btn ghost" data-act="logout">Çıkış yap</button>
      <button class="btn ghost" data-act="delacct" style="color:var(--red)" ${S.busy ? 'disabled' : ''}>Hesabımı sil</button>
      <span class="small muted" style="text-align:center">Hesabını silersen profilin, jetonların, puanların ve hazırladığın quizler kalıcı olarak silinir.</span>
    </div>
  </div>`;

V.friends = () => `
  <div class="screen">
    <div class="top">${backBtn('data-go="home"')}</div>
    <div class="stack">
      <h2>Arkadaşlarınla oyna</h2>
      <p class="muted">Oda aç ve kodu paylaş ya da arkadaşının odasına katıl.</p>
      <button class="btn primary menu-main" data-act="create" ${S.busy ? 'disabled' : ''}>Oda aç<small>Kodu arkadaşlarına gönder, oyunu sen başlat</small></button>
      <div class="menu-grid">
        <button class="btn" data-go="join">${ICON.key}Kodla katıl</button>
        <button class="btn" data-act="openrooms">${ICON.list}Açık odalar</button>
      </div>
      <button class="btn outline" data-act="myquizzes">📝 Zuqio’larım<span class="small muted" style="margin-left:6px">· kendi sorularını yaz</span></button>
      <button class="btn outline" data-act="bot" ${S.busy ? 'disabled' : ''}>🤖 Bilgisayara karşı oyna<span class="small muted" style="margin-left:6px">· antrenman</span></button>
    </div>
  </div>`;

function watchOpenRooms() {
  stopOpenRooms();
  S.openRooms = null;
  S.orUnsub = onValue(query(ref(db, 'rooms'), orderByChild('pub'), equalTo('open')), sn => {
    const t = now(), list = [];
    sn.forEach(ch => {
      const R = ch.val(); if (!R || R.status !== 'lobby' || !R.public) return;
      const ps = Object.values(R.players || {}), host = (R.players || {})[R.host];
      if (!host || host.online === false || (R.createdAt || 0) < t - 3 * 3600 * 1000) return;
      list.push({code: ch.key, R, n: ps.filter(p => p.online !== false).length, host});
    });
    list.sort((a, b) => b.n - a.n || (b.R.createdAt || 0) - (a.R.createdAt || 0));
    S.openRooms = list; if (S.screen === 'rooms') render();
  }, err => { console.error(err); S.openRooms = []; if (S.screen === 'rooms') render(); toast('Odalar yüklenemedi'); });
}
function stopOpenRooms() { if (S.orUnsub) { S.orUnsub(); S.orUnsub = null; } }
V.rooms = () => {
  const L = S.openRooms;
  return `
  <div class="screen">
    <div class="top">${backBtn('data-act="roomsback"')}</div>
    <div class="stack" style="gap:12px">
      <h2>Açık odalar</h2>
      <p class="muted">Oyuncu bekleyen herkese açık odalar. Dokun, katıl.</p>
      ${L == null ? '<p class="status">Yükleniyor…</p>' : !L.length ? `<div class="card stack" style="gap:10px;text-align:center"><b>Şu an açık oda yok</b>
        <p class="small muted">Kendin bir oda açıp "Herkese açık" yapabilir ya da hızlı oyunla rakip arayabilirsin.</p>
        <button class="btn primary" data-act="quick">Hızlı oyna</button></div>`
      : L.map(o => `<button class="card roomcard" data-act="joinopen" data-code="${o.code}" ${S.busy ? 'disabled' : ''}>
          <div class="row" style="gap:12px">${avatar(o.host.av, '', o.host.fr)}<div class="stack" style="gap:2px;flex:1;text-align:left">
            <b>${esc(o.host.name)} odası</b>
            <span class="small muted">${o.R.quiz ? `📝 ${esc(o.R.quizTitle || 'Topluluk Zuqio’su')}` : `${o.R.count || 10} soru · ${DIFF_LABEL[o.R.diff || 'mix']} · ${esc(catSummary(o.R))}`}</span>
            ${o.R.quiz ? '<span><span class="tag">Topluluk Zuqio’su</span></span>' : ''}
          </div><div class="stack" style="gap:2px;align-items:flex-end"><b>${o.n}</b><span class="small muted">oyuncu</span></div></div>
        </button>`).join('')}
    </div>
  </div>`;
};

V.join = () => `
  <div class="screen">
    <div class="top">${backBtn('data-go="friends"')}</div>
    <div class="stack">
      <h2>Kodla katıl</h2>
      <p class="muted">Oda sahibinin paylaştığı 6 haneli kodu yaz.</p>
      <input class="field" id="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="000000" autocomplete="off" style="font-size:1.8rem;text-align:center;letter-spacing:.2em;font-weight:800">
      <button class="btn primary big" data-act="joincode" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">ODAYA KATIL</span></button>
    </div>
  </div>`;

V.how = () => `
  <div class="screen">
    <div class="top">${backBtn('data-go="home"')}</div>
    <div class="stack">
      <h2>Nasıl oynanır?</h2>
      <div class="card stack" style="gap:10px">
        <p><b>Oda aç, kodu paylaş.</b> Arkadaşların 6 haneli kodla ya da gönderdiğin bağlantıyla katılır.</p>
        <p><b>Hızlı ve doğru cevap ver.</b> Ne kadar erken bilirsen o kadar çok puan alırsın.</p>
        <p><b>Tahmin sorularında</b> şık yok: sayını yaz, doğruya ne kadar yakınsan o kadar çok puan.</p>
        <p><b>Jeton kazan:</b> her gün Günlük ödül’ü al ve günün sorusunu cevapla. Jetonlarla Mağaza’dan yeni avatarlar açarsın. Jetonlar oyunda avantaj sağlamaz.</p>
        <p><b>Jokerlerin</b> her oyunda birer kez kullanılır: yarı yarıya, çifte puan, buz ve tahmin sorularında ipucu.</p>
      </div>
    </div>
  </div>`;

/* ---------- oda ekranları ---------- */
const players = R => Object.entries((R && R.players) || {}).map(([id, p]) => Object.assign({id}, p)).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
const isHost = () => S.R && S.R.host === uid();
const myJ = key => { const j = S.R && S.R.jokers && S.R.jokers[uid()]; return j && j[key] !== undefined ? j[key] : null; };
const ansOf = (R, qi) => (R.answers && R.answers[qi]) || {};
const hostOnline = () => { const h = S.R && S.R.players && S.R.players[S.R.host]; return !h || h.online !== false; };

const CATS = [...new Set(QUESTIONS.map(q => q.cat))].sort((x, y) => (x === 'İngilizce') - (y === 'İngilizce'));
const NON_EN = CATS.filter(c => c !== 'İngilizce');
const roomCats = R => R && R.cats ? R.cats.split('|').filter(c => CATS.includes(c)) : null;
function catSummary(R) {
  const c = roomCats(R);
  if (!c || !c.length) return 'Bilgi yarışması · Tümü';
  if (c.includes('İngilizce')) return 'İngilizce öğrenme';
  return c.length <= 2 ? c.join(', ') : c.length + ' kategori';
}
const BOT_NAMES = ['Zeka', 'Bilgin', 'Kıvılcım', 'Pusula', 'Atlas', 'Sincap', 'Mercan', 'Fener'];
const isBotRoom = () => !!(S.R && S.R.bot);
async function startBotGame() {
  if (S.busy) return;
  const prev = S.code, prevR = S.R;
  if (prev) {
    leaveLocal();
    if (prevR && prevR.host === uid()) { remove(ref(db, 'keys/' + prev)).catch(() => {}); remove(ref(db, 'rooms/' + prev)).catch(() => {}); }
    else set(ref(db, `rooms/${prev}/players/${uid()}`), null).catch(() => {});
  }
  const code = 'L' + Date.now().toString(36);
  const names = shuffle(BOT_NAMES).slice(0, 3), avs = shuffle([0, 1, 2, 3, 4, 5, 6, 7].filter(a => a !== S.me.av));
  const ps = {[uid()]: {name: S.me.name, av: S.me.av, fr: S.me.fr || '', online: true, joinedAt: now()}};
  names.forEach((n, i) => { ps['bot' + i] = {name: n + ' 🤖', av: avs[i], fr: '', online: true, joinedAt: now() + i + 1, skill: 0.45 + Math.random() * 0.3}; });
  lset('rooms/' + code, {host: uid(), status: 'lobby', count: 10, diff: 'mix', bot: true, createdAt: now(), players: ps});
  enterRoom(code);
  setTimeout(() => { if (S.code === code) startGame(); }, 60);
}
// Her yeni soruda botların cevabını zamanla
const botPlan = {};
function planBots(R) {
  const key = S.code + ':' + R.qi; if (botPlan[key]) return; botPlan[key] = true;
  const q = R.questions[R.qi], a = S.keys && S.keys.a ? S.keys.a[R.qi] : null; if (a == null) return;
  for (const [id, p] of Object.entries(R.players || {})) {
    if (!id.startsWith('bot')) continue;
    const sk = p.skill || 0.6, delay = 2500 + Math.random() * (R.qDur * (1.05 - sk) * 0.9);
    setTimeout(() => {
      const cur = S.R; if (!cur || S.code !== key.split(':')[0] || cur.status !== 'question' || cur.qi !== R.qi) return;
      let v;
      if (q.t === 'mc') { v = Math.random() < sk ? a : shuffle([0, 1, 2, 3].filter(i => i !== a))[0]; }
      else { const spread = q.tolAbs ? q.tolAbs * (1.3 - sk) : Math.abs(a) * 0.35 * (1.2 - sk); v = Math.round(a + (Math.random() * 2 - 1) * spread); }
      set(ref(db, `rooms/${S.code}/answers/${R.qi}/${id}`), {v, t: serverTimestamp()});
    }, delay);
  }
}

const QUICK_MIN = 2, QUICK_FULL = 6, QUICK_WAIT = 15000, QUICK_MAX = 8;
function quickStartIn() {
  const R = S.R; if (!R || !R.quick || typeof R.autoAt !== 'number') return null;
  return Math.max(0, Math.ceil((R.autoAt + QUICK_WAIT - now()) / 1000));
}

V.quickLobby = () => {
  const R = S.R, ps = players(R).filter(p => p.online !== false), sec = quickStartIn();
  return `
  <div class="screen">
    <div class="top">${backBtn('data-act="leave"', 'Vazgeç')}<span class="tag">Hızlı oyun</span></div>
    <div class="card stack" style="align-items:center;gap:8px;text-align:center">
      <h2 id="qmtitle">${ps.length < QUICK_MIN ? 'Rakip aranıyor…' : 'Rakipler bulundu!'}</h2>
      <p class="muted" id="qmsub">${ps.length < QUICK_MIN ? 'Biri katılınca oyun kısa süre içinde başlayacak.' : `Oyun <b>${sec != null ? sec : '…'}</b> saniye içinde başlıyor`}</p>
    </div>
    <div class="row between plhead" style="margin:18px 0 10px"><b>Oyuncular</b><span class="muted small">${ps.length} / ${QUICK_MAX}</span></div>
    <div class="plist">
      ${ps.map(p => `<div class="pitem">${avatar(p.av, '', p.fr)}<b>${esc(p.name)}</b>${p.id === uid() ? '<span class="tag" style="margin-left:auto">Sen</span>' : ''}</div>`).join('')}
    </div>
    ${ps.length < QUICK_MIN && S.qmSince && now() - S.qmSince > QUICK_WAIT ? `
      <div class="card stack" style="gap:10px;margin-top:16px;text-align:center">
        <b>Şu an rakip bulunamadı</b>
        <p class="small muted">Bilgisayara karşı antrenman yapabilirsin. Bu oyunlar liderlik tablosuna sayılmaz.</p>
        <button class="btn primary big" data-act="bot"><span class="ic">${ICON.play}</span><span class="lb">BİLGİSAYARA KARŞI OYNA</span></button>
        <button class="btn ghost" data-act="keepwait">Beklemeye devam et</button>
      </div>` : ''}
    <div class="grow"></div>
    <p class="demo">10 soru · karışık kategoriler</p>
  </div>`;
};

V.cats = () => {
  const R = S.R, en = S.catMode === 'en', sel = S.catSel, all = S.catAll;
  const diff = R.diff || 'mix', want = R.count || 10;
  const chosen = en ? ['İngilizce'] : (all ? null : [...sel]);
  const n = poolFor(chosen).filter(q => diff === 'mix' || q.d === diff).length;
  const on = c => !all && sel.has(c);
  return `
  <div class="screen">
    <div class="top">${backBtn('data-act="catsdone"', 'Geri')}</div>
    <div class="stack" style="gap:14px">
      <h2>Kategoriler</h2>
      <div class="tabs" role="tablist" style="grid-template-columns:1fr 1fr;margin-bottom:0">
        <button role="tab" aria-selected="${!en}" class="${en ? '' : 'on'}" data-act="catmode" data-m="quiz">Bilgi yarışması</button>
        <button role="tab" aria-selected="${en}" class="${en ? 'on' : ''}" data-act="catmode" data-m="en">İngilizce öğren</button>
      </div>
      ${en ? `
      <div class="card stack" style="gap:8px">
        <b>İngilizce öğrenme modu</b>
        <p class="small muted">Sorular İngilizce kelime ve kalıplar üzerine. Kolay = A1–A2 (Türkçe sorular), Orta = B1–B2, Zor = C1. Her cevaptan sonra kısa bir “Öğren” notu gösterilir.</p>
      </div>` : `
      <p class="muted">Hangi konulardan soru çıksın? Bir konuya dokunursan sadece o seçilir, sonra istediğin kadar ekleyebilirsin.</p>
      <div class="chips wrap">
        <button class="${all ? 'on' : ''}" aria-pressed="${all}" data-act="catall">Hepsi</button>
        ${NON_EN.map(c => `<button class="${on(c) ? 'on' : ''}" aria-pressed="${on(c)}" data-act="cattoggle" data-i="${CATS.indexOf(c)}">${esc(c)}</button>`).join('')}
      </div>`}
      <p class="small ${n < want * 2 ? '' : 'muted'}" style="${n < want * 2 ? 'color:var(--yellow)' : ''}">Bu seçimde ${n} soru var.${n < want * 2 ? (en ? ' Soru az olabilir; zorluğu “Karışık” yapmayı dene.' : ' Soru az olabilir, tekrarlar çıkabilir; zorluğu “Karışık” yapmayı ya da kategori eklemeyi dene.') : ''}</p>
    </div>
    <div class="grow" style="min-height:16px"></div>
    <button class="btn primary big" data-act="catsdone"><span class="ic">${ICON.play}</span><span class="lb">TAMAM</span></button>
  </div>`;
};

V.lobby = () => {
  const R = S.R, ps = players(R), host = isHost();
  if (R.quick) return V.quickLobby();
  if (S.catsOpen && host) return V.cats();
  return `
  <div class="screen lobby">
    <div class="top">${backBtn('data-act="leave"', 'Odadan çık')}<span class="tag">${host ? 'Oda sahibi sensin' : 'Oyun bekleniyor'}</span></div>
    <div class="card stack codecard" style="align-items:center;gap:6px">
      <span class="small muted">Oda kodu</span>
      <div class="code">${S.code}</div>
      <button class="btn ghost" data-act="share">Kodu paylaş</button>
      <button class="copybtn" data-act="copycode" aria-label="Kodu kopyala"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button>
    </div>
    <div class="row between" style="margin:18px 0 10px"><b>Oyuncular</b><span class="muted small">${ps.length} kişi</span></div>
    <div class="plist">
      ${ps.map(p => `<div class="pitem ${p.online === false ? 'off' : ''}">${avatar(p.av, '', p.fr)}<b>${esc(p.name)}</b>
        <span style="margin-left:auto" class="row">${p.id === R.host ? '<span class="tag">Oda sahibi</span>' : ''}${p.id === uid() ? '<span class="tag">Sen</span>' : ''}</span></div>`).join('')}
    </div>
    ${reactBar()}
    <div class="lsp"></div>
    ${host ? `<div class="card setrow pubrow"><div><b>Herkese açık oda</b><span class="small muted">${R.public ? 'Açık odalar listesinde görünüyor' : 'Sadece kodu bilenler katılabilir'}</span></div>
      <button class="switch ${R.public ? 'on' : ''}" role="switch" aria-checked="${!!R.public}" aria-label="Herkese açık oda" data-act="tpublic"></button></div>` : ''}
    ${host && R.quiz ? `
      <div class="card setrow" style="margin-bottom:14px;padding:10px 16px"><div><b>📝 ${esc(R.quizTitle || 'Kendi Zuqio’n')}</b><span class="small muted">${R.quizN || ''} soru · topluluk Zuqio’su</span></div>
        <button class="btn ghost" data-act="quizoff">Hazır sorular</button></div>
      <button class="btn primary big" data-act="start" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">OYUNU BAŞLAT</span></button>`
    : !host && R.quiz ? `<p class="status">📝 ${esc(R.quizTitle || 'Topluluk Zuqio’su')} · ${R.quizN || ''} soru<br>Oda sahibinin oyunu başlatması bekleniyor…</p>`
    : host ? `
      <span class="small muted lbl" style="margin-bottom:8px">Soru sayısı</span>
      <div class="chips" style="margin-bottom:10px">${[5, 10, 15].map(n => `<button class="${(R.count || 10) === n ? 'on' : ''}" data-act="count" data-n="${n}">${n}</button>`).join('')}</div>
      <span class="small muted lbl" style="margin-bottom:8px">Zorluk</span>
      <div class="chips" style="margin-bottom:10px">${['mix', 'k', 'o', 'z'].map(v => `<button class="${(R.diff || 'mix') === v ? 'on' : ''}" data-act="diff" data-v="${v}">${DIFF_LABEL[v]}</button>`).join('')}</div>
      <button class="card setrow catrow" style="margin-bottom:14px;padding:10px 16px" data-act="opencats"><div><b>Kategoriler</b><span class="small muted">${esc(catSummary(R))}</span></div><span class="muted">›</span></button>
      <button class="btn primary big" data-act="start" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">OYUNU BAŞLAT</span></button>`
    : `<p class="status">${R.count || 10} soru · ${DIFF_LABEL[R.diff || 'mix']} · ${esc(catSummary(R))}<br>Oda sahibinin oyunu başlatması bekleniyor…</p>`}
  </div>`;
};

V.count = () => `<div class="screen"><div class="count" id="cnt">${countNum()}</div><p class="status">Hazır ol</p></div>`;
const countNum = () => clamp(Math.ceil(((S.R.countAt || now()) + 3000 - now()) / 1000), 1, 3);

function myDeadline() {
  const R = S.R; if (!R || typeof R.qStartAt !== 'number') return now() + 20000;
  return R.qStartAt + R.qDur + (myJ('freeze') === R.qi ? 8000 : 0);
}
function remaining() {
  const dl = myDeadline(), n = now();
  return Math.max(0, S.q && S.q.frozenUntil > n ? dl - S.q.frozenUntil : dl - n);
}
function statusText() {
  const R = S.R; if (!R) return '';
  if (!hostOnline()) return 'Oda sahibinin bağlantısı koptu, bekleniyor…';
  const ps = players(R).filter(p => p.online !== false), A = ansOf(R, R.qi);
  const n = ps.filter(p => A[p.id]).length;
  if (S.q && S.q.frozenUntil > now()) return 'Süre donduruldu';
  const mine = A[uid()] || (S.q && S.q.sent != null);
  if (mine && remaining() > 0 && myJ('second') === R.qi && R.questions[R.qi].t === 'mc' && !(A[uid()] && A[uid()].v2 != null) && !(S.q && S.q.sent2 != null)) return 'İkinci şansını seç: doğruysa yarı puan';
  if (!mine && remaining() <= 0) return 'Süre doldu';
  return mine ? `Cevabın alındı · ${n}/${ps.length} oyuncu cevapladı` : `${n}/${ps.length} oyuncu cevapladı`;
}

V.question = () => {
  const R = S.R, qi = R.qi, q = R.questions[qi];
  const A = ansOf(R, qi), mineV = A[uid()] ? A[uid()].v : (S.q.sent != null ? S.q.sent : null);
  const mineV2 = A[uid()] && A[uid()].v2 != null ? A[uid()].v2 : (S.q.sent2 != null ? S.q.sent2 : null);
  const locked = mineV != null || remaining() <= 0;
  const isNum = q.t === 'num';
  const wait2 = !isNum && myJ('second') === qi && mineV != null && mineV2 == null && remaining() > 0;
  const hidden = myJ('half') === qi ? (q.h || []) : [];
  const ans = isNum
    ? `${myJ('hint') === qi && q.hint ? `<div class="hint">İpucu: cevap ${esc(q.hint)}</div>` : ''}
       <div class="numbox">
         <input class="field" id="guess" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="${esc(q.unit)}" ${locked ? 'disabled' : ''} value="${mineV != null ? fmtQ(q, mineV) : ''}">
         <button class="btn primary" data-act="sendnum" ${locked ? 'disabled' : ''}>Gönder</button>
       </div>`
    : `<div class="answers">${q.o.map((o, i) => {
        const cls = ['ans', 'c' + i];
        if (hidden.includes(i)) cls.push('gone');
        if (mineV != null) cls.push(mineV === i || mineV2 === i ? 'mine' : (wait2 ? '' : 'dim'));
        const off = locked && !(wait2 && i !== mineV);
        return `<button class="${cls.join(' ')}" data-act="pick" data-i="${i}" ${off ? 'disabled' : ''} aria-label="${SHAPE_NAMES[i]}: ${esc(o)}">${icon(i)}<span>${esc(o)}</span></button>`;
      }).join('')}</div>`;
  const jk = key => {
    const used = myJ(key) != null, active = myJ(key) === qi;
    const off = key === 'second' ? (used || remaining() <= 0 || mineV2 != null) : (used || locked);
    return `<button class="joker ${active ? 'on' : ''}" data-act="joker" data-j="${key}" ${off ? 'disabled' : ''}>${ICON[JOKER_INFO[key].icon]}${JOKER_INFO[key].label}</button>`;
  };
  return `
  <div class="screen">
    <div class="qhead">
      <div class="stack" style="gap:6px">
        <span class="small muted">Soru ${qi + 1} / ${R.questions.length}</span>
        <span><span class="tag">${esc(q.cat)}${q.sub ? ' · ' + esc(q.sub) : ''}${isNum ? ' · Tahmin' : ''}</span></span>
      </div>
      <div class="hex" id="hex">${Math.ceil(remaining() / 1000)}</div>
    </div>
    <div class="bar"><i id="tbar"></i></div>
    <p class="qtext">${esc(q.q)}</p>
    <div class="grow" style="min-height:16px"></div>
    <p class="status" id="st">${statusText()}</p>
    <div class="jokers" role="group" aria-label="Jokerler">${jk(isNum ? 'hint' : 'half')}${jk('double')}${jk('freeze')}${isNum ? '' : jk('second')}</div>
    ${ans}
  </div>`;
};

function rankList(R, qi) {
  const gains = (R.reveal && R.reveal[qi] && R.reveal[qi].gains) || {};
  const sc = R.scores || {};
  return players(R).sort((a, b) => (sc[b.id] || 0) - (sc[a.id] || 0)).map((p, i) => `
    <div class="rank ${p.id === uid() ? 'me' : ''}"><span class="n">${i + 1}</span>${avatar(p.av, '', p.fr)}<b>${esc(p.name)}</b>
      <span class="pts">${fmt(sc[p.id] || 0)}</span><span class="delta">${gains[p.id] ? '+' + fmt(gains[p.id]) : ''}</span></div>`).join('');
}

V.reveal = () => {
  const R = S.R, qi = R.qi, q = R.questions[qi], rv = (R.reveal && R.reveal[qi]) || {};
  const mine = ansOf(R, qi)[uid()], gain = (rv.gains || {})[uid()] || 0, a = rv.a;
  let cls, title, sub;
  if (!mine) { cls = 'bad'; title = 'Süre doldu'; sub = q.t === 'mc' ? `Doğru cevap: ${esc(q.o[a])}` : `Doğru cevap: ${fmtQ(q, a)} ${esc(q.unit)}`; }
  else if (q.t === 'mc') {
    const ok2 = mine.v !== a && mine.v2 === a && myJ('second') === qi && gain > 0;
    const ok = mine.v === a || ok2;
    cls = ok ? 'good' : 'bad'; title = ok ? `+${fmt(gain)}` : 'Yanlış';
    sub = ok2 ? 'İkinci şans işe yaradı! (yarı puan)' : ok ? (myJ('double') === qi ? 'Doğru! Çifte puan işe yaradı' : 'Doğru!') : `Doğru cevap: ${esc(q.o[a])}`;
  } else {
    cls = gain >= 700 ? 'good' : gain > 0 ? 'mid' : 'bad';
    title = gain > 0 ? `+${fmt(gain)}` : 'Çok uzak';
    sub = `Doğru cevap: ${fmtQ(q, a)} ${esc(q.unit)} · Senin tahminin: ${fmtQ(q, mine.v)}`;
  }
  const last = qi === R.questions.length - 1;
  return `
  <div class="screen">
    <div class="verdict ${cls}"><b>${title}</b><p>${sub}</p></div>
    ${rv.info ? `<div class="card infocard"><b>${q.cat === 'İngilizce' ? 'Öğren' : 'Biliyor muydun?'}</b><p>${esc(rv.info)}</p></div>` : ''}
    <div class="row between" style="margin:20px 0 10px"><b>Sıralama</b><span class="small muted">Soru ${qi + 1} / ${R.questions.length}</span></div>
    <div class="stack" style="gap:8px">${rankList(R, qi)}</div>
    ${reactBar()}
    <div class="grow" style="min-height:16px"></div>
    <button class="linkbtn" data-act="report">Bu soruda hata var, bildir</button>
    ${isHost()
      ? `<button class="btn primary big" data-act="next"><span class="ic">${ICON.play}</span><span class="lb">${last ? 'SONUÇLARI GÖR' : 'SONRAKİ SORU'}</span></button>`
      : `<p class="status">${hostOnline() ? 'Oda sahibi sonraki soruya geçecek…' : 'Oda sahibinin bağlantısı koptu, bekleniyor…'}</p>`}
  </div>`;
};

/* ================= lider tablosu ================= */
// Dönemler Türkiye saatine göre: gün, hafta (pazartesi başlar), ay
function periods() {
  const d = dayIdx(), w = Math.floor((d + 3) / 7);
  const dt = new Date(now() + 10800000), m = dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0');
  return {d: 'd' + d, w: 'w' + w, m: 'm' + m};
}
const PRIZE_MIN = 3, PRIZE_DAILY_CAP = 5000; // ödül yarışı kuralları
async function claimBoard(R) {
  if (R.bot || R.quiz) return; // antrenman ve kendi quiz oyunları tabloya sayılmaz
  const me = uid(), gid = R.gid, mine = (R.scores || {})[me] || 0;
  if (!gid || !mine || S.lbDone === gid || S.lbBusy === gid) return;
  S.lbBusy = gid;
  try {
    const P = periods(), code = S.code;
    const cur = await Promise.all(Object.values(P).map(p => get(ref(db, `lb/${p}/${me}`)).then(x => x.val()).catch(() => null)));
    const pz = (R.hp || 0) >= PRIZE_MIN ? await get(ref(db, `lbp/${P.m}/${me}`)).then(x => x.val()).catch(() => null) : undefined;
    const up = {[`lbClaim/${code}/${gid}/${me}`]: true};
    Object.values(P).forEach((p, i) => {
      const o = cur[i] || {s: 0, g: 0};
      up[`lb/${p}/${me}`] = {s: (o.s || 0) + mine, g: (o.g || 0) + 1, n: S.me.name, av: S.me.av, fr: S.me.fr || '', c: code, gid};
    });
    if (pz !== undefined) { // ödül yarışı: en az 3 gerçek oyuncu, günlük puan sınırı
      const dd = dayIdx(), o = pz || {s: 0, g: 0}, used = o.dd === dd ? (o.dp || 0) : 0, gain = Math.min(mine, PRIZE_DAILY_CAP - used);
      if (gain > 0) up[`lbp/${P.m}/${me}`] = {s: (o.s || 0) + gain, g: (o.g || 0) + 1, n: S.me.name, av: S.me.av, fr: S.me.fr || '', c: code, gid, dd, dp: used + gain};
    }
    await update(ref(db), up);
    S.lbDone = gid; S.lbCache = {};
    if (S.screen === 'final') render();
  } catch (e) { console.error(e); }
  S.lbBusy = null;
}
const boardKey = () => S.lbTab === 'p' ? 'p' + periods().m : periods()[S.lbTab];
function monthLeft() { // Türkiye saatine göre ay bitimine kalan gün
  const x = new Date(Date.now() + 10800000), end = Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((end - x.getTime()) / 86400000));
}
async function loadPrizeInfo() {
  S.tabP = null;
  try { const x = new Date(Date.now() + 10800000); x.setUTCMonth(x.getUTCMonth() - 1, 1);
    const pm = x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0');
    const v = (await get(ref(db, 'prizes/m' + pm))).val(); S.tabP = v ? {name: v.name, av: v.av, fr: v.fr} : false;
  } catch (e) { S.tabP = false; }
  if (S.screen === 'board') render();
}
async function loadBoard() {
  const key = boardKey();
  S.lbCache = S.lbCache || {};
  if (S.tabP === undefined) loadPrizeInfo();
  if (S.lbCache[key]) return;
  S.lbCache[key] = 'loading'; render();
  try {
    const path = S.lbTab === 'p' ? 'lbp/' + periods().m : 'lb/' + key;
    const snap = await get(query(ref(db, path), orderByChild('s'), limitToLast(50)));
    const rows = []; snap.forEach(c => { rows.push(Object.assign({id: c.key}, c.val())); });
    rows.sort((a, b) => b.s - a.s);
    let mine = rows.find(r => r.id === uid());
    if (!mine) { const m = await get(ref(db, `${path}/${uid()}`)); if (m.exists()) mine = Object.assign({id: uid(), out: true}, m.val()); }
    S.lbCache[key] = {rows, mine};
  } catch (e) { console.error(e); S.lbCache[key] = {err: true}; }
  if (S.screen === 'board') render();
}
V.board = () => {
  const labels = {d: 'Günlük', w: 'Haftalık', m: 'Aylık', p: '🏆 Ödül'}, key = boardKey();
  const data = S.lbCache && S.lbCache[key];
  let body;
  if (!data || data === 'loading') body = '<p class="status">Yükleniyor…</p>';
  else if (data.err) body = '<p class="status">Tablo yüklenemedi. Biraz sonra tekrar dene.</p>';
  else if (!data.rows.length) body = '<div class="card" style="text-align:center"><b>Henüz kimse yok</b><p class="small muted" style="margin-top:6px">Bir oyun bitir, bu tablonun ilk adı sen ol!</p></div>';
  else body = `<div class="stack" style="gap:8px">${data.rows.map((r, i) => `
      <div class="rank ${r.id === uid() ? 'me' : ''}"><span class="n">${i + 1}</span>${avatar(r.id === uid() ? S.me.av : r.av, '', r.id === uid() ? S.me.fr : r.fr)}<b>${esc(r.id === uid() ? S.me.name : r.n)}</b>
        <span class="pts">${fmt(r.s)}</span></div>`).join('')}
      ${data.mine && data.mine.out ? `<div class="rank me"><span class="n">–</span>${avatar(S.me.av, '', S.me.fr)}<b>${esc(S.me.name)}</b><span class="pts">${fmt(data.mine.s)}</span></div>` : ''}
    </div>`;
  const sub = {d: 'Bugün gece yarısı sıfırlanır.', w: 'Her pazartesi sıfırlanır.', m: 'Her ayın başında sıfırlanır.', p: ''}[S.lbTab];
  const prize = S.lbTab !== 'p' ? '' : `<div class="card stack" style="gap:6px;margin-bottom:12px;border-color:rgba(255,194,26,.6)">
      <div class="row" style="gap:12px;align-items:center"><img src="kitap-kapak.png" alt="Kitap kapağı" width="64" style="width:64px;height:auto;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.4)"><b>🏆 Bu ayın ödülü: “100 İlginç Bilgi” kitabı</b></div>
      <p class="small" style="margin:0">Ay sonunda ödül puanında 1. olan, kitabın PDF’ini e-postayla alır. Bitmesine <b>${monthLeft()} gün</b> var.</p>
      <p class="small muted" style="margin:0">Sayılan oyunlar: en az 3 gerçek oyuncunun olduğu odalar. Günde en fazla ${fmt(PRIZE_DAILY_CAP)} puan sayılır. Antrenman ve Zuqio’larım oyunları sayılmaz. Kazanan, yönetici kontrolünden sonra kesinleşir.</p>
      ${S.tabP ? `<p class="small" style="margin:0">Geçen ayın kazananı: <b>${esc(S.tabP.name)}</b> 🎉</p>` : ''}
      ${S.win ? `<button class="btn primary" data-act="bookdl" ${S.busyBook ? 'disabled' : ''}>📥 Kitabını indir (${esc(monthLabel(S.win.key))})</button>` : ''}</div>`;
  return `
  <div class="screen">
    <div class="top">${backBtn('data-go="home"')}</div>
    <h2 style="margin-bottom:12px">Liderlik tablosu</h2>
    <div class="tabs" role="tablist" style="grid-template-columns:repeat(4,1fr)">${Object.keys(labels).map(k => `<button role="tab" class="${S.lbTab === k ? 'on' : ''}" aria-selected="${S.lbTab === k}" data-act="lbtab" data-t="${k}">${labels[k]}</button>`).join('')}</div>
    ${prize}${S.lbTab === 'p' ? '' : `<p class="small muted" style="margin-bottom:12px">${sub} Bilgisayara karşı antrenman oyunları sayılmaz.</p>`}
    ${body}
  </div>`;
};

V.final = () => {
  const R = S.R, sc = R.scores || {};
  const s = players(R).sort((a, b) => (sc[b.id] || 0) - (sc[a.id] || 0));
  const myRank = s.findIndex(p => p.id === uid()) + 1;
  const pod = (p, place, h) => p ? `<div class="pod"><div class="row" style="justify-content:center">${avatar(p.av, '', p.fr)}</div><div class="nm">${esc(p.name)}</div><div class="sc">${fmt(sc[p.id] || 0)}</div><div class="blk" style="height:${h}px;background:${COLORS[(place - 1) % 4]}">${place}</div></div>` : '<div></div>';
  return `
  <div class="screen">
    <h2 style="text-align:center;margin-top:10px">${myRank === 1 ? 'Kazandın!' : `${myRank}. oldun`}</h2>
    <p class="muted small" style="text-align:center;margin-top:4px">${R.bot ? 'Antrenman oyunuydu, liderlik tablosuna sayılmaz.' : R.quiz ? 'Topluluk Zuqio’ları liderlik tablosuna sayılmaz.' : S.lbDone === R.gid ? 'Puanın günlük, haftalık ve aylık tablolara eklendi.' : (R.scores && R.scores[uid()] ? 'Puanın lider tablolarına ekleniyor…' : '')}</p>
    <div class="podium">${pod(s[1], 2, 70)}${pod(s[0], 1, 104)}${pod(s[2], 3, 50)}</div>
    <div class="stack" style="gap:8px;margin-top:8px">${s.slice(3).map((p, i) => `<div class="rank ${p.id === uid() ? 'me' : ''}"><span class="n">${i + 4}</span>${avatar(p.av, '', p.fr)}<b>${esc(p.name)}</b><span class="pts">${fmt(sc[p.id] || 0)}</span></div>`).join('')}</div>
    ${reactBar()}
    <div class="grow" style="min-height:20px"></div>
    <div class="stack">
      ${R.bot
        ? `<button class="btn primary big" data-act="botagain"><span class="ic">${ICON.play}</span><span class="lb">TEKRAR OYNA</span></button>
           <button class="btn outline" data-act="quickfrombot">Gerçek rakip ara</button>
           <button class="btn ghost" data-act="leave">Ana menü</button>`
        : R.quick
        ? `<button class="btn primary big" data-act="quickagain"><span class="ic">${ICON.play}</span><span class="lb">YENİ HIZLI OYUN</span></button>
           <button class="btn ghost" data-act="leave">Ana menü</button>`
        : isHost()
        ? `<button class="btn primary big" data-act="again" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">TEKRAR OYNA</span></button>
           <button class="btn ghost" data-act="leave">Odayı kapat</button>`
        : `<p class="status">Oda sahibi yeni bir oyun başlatabilir.</p><button class="btn ghost" data-act="leave">Odadan çık</button>`}
    </div>
  </div>`;
};

const NAV_SCREENS = ['home', 'friends', 'settings', 'shop', 'board', 'daily', 'quizzes', 'rooms', 'join', 'how', 'profile'];
function gnav() {
  if (!NAV_SCREENS.includes(S.screen) || S.R || (S.screen === 'profile' && S.firstProfile)) return '';
  const on = k => S.screen === k ? ' on' : '';
  const dot = (() => { const d = dailyState(); return !d.claimed || !d.qDone ? ' hasdot' : ''; })();
  return `<div class="gnav-sp"></div><div class="gnav"><nav class="bottomnav" aria-label="Ana menü">
      <button data-go="home" class="${on('home').trim()}">${ICON.home}ANA SAYFA</button>
      <button data-go="shop" class="${on('shop').trim()}">${ICON.shop}MAĞAZA</button>
      <button data-act="openboard" class="${on('board').trim()}">${ICON.trophy}LİDERLİK</button>
      <button data-go="daily" class="${(on('daily') + dot).trim()}">${ICON.gift}GÜNLÜK</button>
      <button data-go="settings" class="${on('settings').trim()}">${ICON.gear}AYARLAR</button>
    </nav></div>`;
}
function render() {
  MUSIC.duck();
  if (!V[S.screen]) S.screen = 'home';
  let keep = null; const g = document.getElementById('guess');
  if (g && !g.disabled) keep = g.value;
  app.innerHTML = V[S.screen]() + gnav();
  if (keep != null) { const g2 = document.getElementById('guess'); if (g2 && !g2.disabled) g2.value = keep; }
  tick();
}

/* ================= saat ================= */
function tick() {
  if (S.screen === 'lobby' && S.R && S.R.quick && S.R.status === 'lobby' && !S.qmOffered && S.qmSince && now() - S.qmSince > QUICK_WAIT
      && players(S.R).filter(p => p.online !== false).length < QUICK_MIN) { S.qmOffered = true; render(); return; }
  if (S.screen === 'question' && S.R && S.R.status === 'question') {
    const r = remaining(), dl = S.R.qDur || 20000;
    const hex = document.getElementById('hex'), bar = document.getElementById('tbar'), st = document.getElementById('st');
    const frozen = S.q && S.q.frozenUntil > now();
    const sec = Math.ceil(r / 1000), A0 = ansOf(S.R, S.R.qi), answered = !!A0[uid()] || (S.q && S.q.sent != null);
    if (S.q && !frozen && !answered && sec <= 5 && sec > 0 && S.q.lastSec !== sec) { S.q.lastSec = sec; SFX.play('tick'); }
    if (hex) { hex.textContent = Math.ceil(r / 1000); hex.className = 'hex' + (frozen ? ' ice' : r < 5000 ? ' low' : ''); }
    if (bar) bar.style.width = clamp(r / dl * 100, 0, 100) + '%';
    if (st) st.textContent = statusText();
    if (r <= 0 && S.q && !S.q.timeUpShown) { S.q.timeUpShown = true; render(); }
  }
  if (S.screen === 'lobby' && S.R && S.R.quick) {
    const sub = document.getElementById('qmsub'), sec = quickStartIn();
    if (sub && sec != null) { const b = sub.querySelector('b'); if (b && b.textContent !== String(sec)) b.textContent = sec; }
  }
  if (S.screen === 'count' && S.R) { const el = document.getElementById('cnt'); if (el && el.textContent !== String(countNum())) { el.textContent = countNum(); buzz(20); SFX.play('tick'); } }
}
setInterval(() => {
  if (S.screen === 'daily') {
    const c = document.getElementById('dqcd'); if (c) c.textContent = untilTomorrow();
    const l = dqLeft(), hx = document.getElementById('dqhex'), br = document.getElementById('dqbar');
    if (l != null && !dailyState().qDone && !S.busy) {
      if (hx) { hx.textContent = Math.ceil(l / 1000); hx.className = 'hex' + (l < 5000 ? ' low' : ''); }
      if (br) br.style.width = (l / DQ_TIME * 100) + '%';
      if (l <= 0 && !(S.dqRetry > Date.now())) answerDaily(-1);
    }
  }
  tick(); hostStep();
}, 150);

/* ================= giriş ve profil ================= */
getRedirectResult(auth).catch(() => {});

onAuthStateChanged(auth, async u => {
  S.user = u;
  if (!u) { if (unsubMe) { unsubMe(); unsubMe = null; } if (annSub) { annSub(); annSub = null; } S.me = null; go('login'); return; }
  watchAnn(); checkWin(); loadApproved().then(loadFixes);
  try {
    const snap = await get(ref(db, 'users/' + u.uid));
    const ban = await get(ref(db, 'bans/' + u.uid)).catch(() => null);
    if (ban && ban.exists()) { S.banned = ban.val(); go('banned'); return; }
    if (snap.exists()) {
      S.me = snap.val();
      update(ref(db, 'users/' + u.uid), {email: u.email || '', seen: serverTimestamp()}).catch(() => {});
      afterLogin();
    }
    else {
      S.firstProfile = true; S.pick = Math.floor(Math.random() * 8);
      S.draft = (u.displayName || '').split(' ')[0].slice(0, 16);
      go('profile');
    }
  } catch (e) { console.error(e); toast('Profil yüklenemedi. Sayfayı yenile.'); }
});

async function afterLogin() {
  watchMe();
  const code = S.pendingCode || ls.get('zuqio-room');
  S.pendingCode = null;
  if (code) { const ok = await joinRoom(code, true); if (ok) return; }
  go('home');
}

async function login() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});
  S.busy = true; render();
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
      try { await signInWithRedirect(auth, provider); return; } catch (e2) { toast('Giriş yapılamadı (' + e2.code + ')'); }
    } else if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) {
      toast('Giriş yapılamadı (' + e.code + ')');
    }
  }
  S.busy = false; render();
}

async function deleteAccount() {
  const u = auth.currentUser; if (!u || S.busy) return;
  if (!confirm('Hesabın ve tüm verilerin (profil, jetonlar, puanlar, hazırladığın quizler) kalıcı olarak silinecek. Bu işlem geri alınamaz.\n\nDevam etmek istiyor musun?')) return;
  S.busy = true; render();
  try {
    const provider = new GoogleAuthProvider(); provider.setCustomParameters({prompt: 'select_account', login_hint: u.email || ''});
    await reauthenticateWithPopup(u, provider);
  } catch (e) {
    S.busy = false; render();
    if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) toast('Kimlik doğrulanamadı (' + (e.code || 'hata') + ')');
    return;
  }
  try {
    const id = u.uid;
    if (unsubMe) { unsubMe(); unsubMe = null; }
    leaveLocal();
    const d0 = dayIdx(), w0 = Math.floor((d0 + 3) / 7), x = new Date(now() + 10800000), jobs = [];
    for (let i = 0; i < 40; i++) jobs.push(remove(ref(db, `lb/d${d0 - i}/${id}`)));
    for (let i = 0; i < 8; i++) jobs.push(remove(ref(db, `lb/w${w0 - i}/${id}`)));
    for (let i = 0; i < 6; i++) {
      const t = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() - i, 1)), k = t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0');
      jobs.push(remove(ref(db, `lb/m${k}/${id}`))); jobs.push(remove(ref(db, `lbp/m${k}/${id}`)));
    }
    await Promise.allSettled(jobs);
    try {
      const qs = await get(query(ref(db, 'quizzes'), orderByChild('owner'), equalTo(id)));
      const rm = []; qs.forEach(c => { rm.push(remove(ref(db, 'quizzes/' + c.key))); });
      await Promise.allSettled(rm);
    } catch (e) { console.error(e); }
    await remove(ref(db, 'users/' + id));
    await deleteUser(u);
    try { Object.keys(localStorage).filter(k => k.startsWith('zuqio')).forEach(k => ls.del(k)); } catch (e) {}
    S.busy = false; S.me = null; toast('Hesabın silindi');
  } catch (e) {
    console.error(e); S.busy = false; render();
    toast('Hesap silinemedi (' + (e.code || 'hata') + '). Tekrar dene.');
  }
}

// Profil değişince bu dönemin tablolarındaki kendi satırının ad ve avatarını da güncelle
async function syncBoardProfile() {
  try {
    const me = uid(), up = {};
    const keys = Object.values(periods());
    const rows = await Promise.all(keys.map(p => get(ref(db, `lb/${p}/${me}`)).then(x => x.exists()).catch(() => false)));
    const pk = `lbp/${periods().m}/${me}`, pe = await get(ref(db, pk)).then(x => x.exists()).catch(() => false);
    if (pe) { up[pk + '/n'] = S.me.name; up[pk + '/av'] = S.me.av; up[pk + '/fr'] = S.me.fr || ''; }
    keys.forEach((p, i) => { if (rows[i]) { up[`lb/${p}/${me}/n`] = S.me.name; up[`lb/${p}/${me}/av`] = S.me.av; up[`lb/${p}/${me}/fr`] = S.me.fr || ''; } });
    if (Object.keys(up).length) await update(ref(db), up);
    S.lbCache = {};
  } catch (e) { console.error(e); }
}

async function saveProfile() {
  const v = (document.getElementById('pnm').value || '').trim().slice(0, 16);
  if (!v) { toast('Bir ad yaz'); return; }
  S.busy = true; render();
  try {
    const data = {name: v, av: S.pick, plan: (S.me && S.me.plan) || 'free', email: (S.user && S.user.email) || '', seen: serverTimestamp()};
    if (!(S.me && S.me.createdAt)) data.createdAt = serverTimestamp();
    await update(ref(db, 'users/' + uid()), data);   // update: cüzdan ve satın alınanlar silinmesin
    S.me = Object.assign({}, S.me, {name: v, av: S.pick, plan: data.plan});
    syncBoardProfile();
    const first = S.firstProfile; S.firstProfile = false; S.busy = false;
    toast('Profil kaydedildi');
    if (first) afterLogin(); else go('home');
  } catch (e) { console.error(e); S.busy = false; render(); toast('Kaydedilemedi, tekrar dene'); }
}

/* ================= oda ================= */
function enterRoom(code) {
  if (S.unsubRoom) S.unsubRoom();
  S.qmSince = now(); S.qmOffered = false;
  S.code = code; S.R = null; S.keys = null; S.lastKey = ''; S.q = null; S.lastN = null;
  if (code[0] !== 'L') ls.set('zuqio-room', code);
  markOnline();
  S.unsubRoom = onValue(roomRef(), snap => onRoom(snap.val()), err => { console.error(err); toast('Odaya erişilemedi'); leaveLocal(); go('home'); });
  wakeOn();
}

function leaveLocal() {
  S.catsOpen = false;
  if (S.unsubRoom) S.unsubRoom();
  if (S.code && uid()) { try { onDisconnect(ref(db, `rooms/${S.code}/players/${uid()}/online`)).cancel(); } catch (e) {} }
  S.unsubRoom = null; S.code = null; S.R = null; S.keys = null; S.lastKey = ''; S.q = null;
  ls.del('zuqio-room'); wakeOff();
}

function markOnline() {
  if (!S.code || !uid()) return;
  const r = ref(db, `rooms/${S.code}/players/${uid()}/online`);
  onDisconnect(r).set(false).catch(() => {});
  set(r, true).catch(() => {});
}

function onRoom(R) {
  if (!S.code) return;
  if (!R) {
    const wasQuickLobby = S.R && S.R.quick && S.R.status === 'lobby';
    leaveLocal();
    if (wasQuickLobby) { toast('Oda kapandı, yeni rakip aranıyor'); quickPlay(); return; }
    toast('Oda kapatıldı'); go('home'); return;
  }
  if (!R.players || !R.players[uid()]) { leaveLocal(); toast('Odadan çıktın'); go('home'); return; }
  const np = Object.keys(R.players || {}).length;
  if (S.lastN != null && np > S.lastN && R.status === 'lobby') SFX.play('pop');
  S.lastN = np;
  S.R = R;
  showReacts(R);
  const map = {lobby: 'lobby', countdown: 'count', question: 'question', reveal: 'reveal', final: 'final'};
  const scr = map[R.status] || 'lobby';
  const key = R.status + ':' + (R.qi != null ? R.qi : '');
  if (key !== S.lastKey) {
    S.lastKey = key;
    if (R.status === 'question' && R.bot) planBots(R);
    if (R.status === 'question') { S.q = {qi: R.qi, frozenUntil: 0, sent: null, sent2: null, timeUpShown: false, lastSec: null}; SFX.play('go'); }
    if (R.status === 'reveal') {
      const g = (R.reveal && R.reveal[R.qi] && R.reveal[R.qi].gains || {})[uid()] || 0;
      buzz(g > 0 ? [30, 40, 30] : 120);
      SFX.play(g > 0 ? 'correct' : (ansOf(R, R.qi)[uid()] ? 'wrong' : 'timeup'));
    }
    if (R.status === 'final') {
      claimBoard(R);
      const sc = R.scores || {}, mine = sc[uid()] || 0, top = Math.max(0, ...Object.values(sc));
      SFX.play(mine > 0 && mine >= top ? 'win' : 'end');
    }
    S.screen = scr; render(); app.scrollTop = 0; return;
  }
  if (S.screen !== scr) { S.screen = scr; render(); return; }
  if (scr === 'question') {
    // yalnızca durum satırı ve kilitleme değişir; yazılan tahmini kaybetmemek için tam çizim yapma
    const mine = ansOf(R, R.qi)[uid()];
    if (mine && S.q && S.q.sent == null) { S.q.sent = mine.v; if (mine.v2 != null) S.q.sent2 = mine.v2; render(); }
    else if (mine && S.q && mine.v2 != null && S.q.sent2 == null) { S.q.sent2 = mine.v2; render(); }
    else tick();
  } else render();
}

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function createRoom(opts = {}) {
  if (S.busy && !opts.quick) return; S.busy = true; render();
  try {
    let code = null;
    for (let i = 0; i < 6 && !code; i++) { const c = genCode(); const s = await get(ref(db, 'rooms/' + c)); if (!s.exists()) code = c; }
    if (!code) throw new Error('no-code');
    const extra = opts.quick ? {quick: true, qm: 'open'} : (opts.quiz ? {quiz: opts.quiz, quizTitle: opts.quizTitle, quizN: opts.quizN} : {});
    await set(ref(db, 'rooms/' + code), Object.assign(extra, {
      host: uid(), status: 'lobby', count: 10, createdAt: serverTimestamp(),
      players: {[uid()]: {name: S.me.name, av: S.me.av, fr: S.me.fr || '', online: true, joinedAt: serverTimestamp()}}
    }));
    S.busy = false; enterRoom(code);
  } catch (e) { console.error(e); S.busy = false; render(); toast('Oda açılamadı, tekrar dene'); }
}

async function joinRoom(code, silent) {
  if (!/^\d{6}$/.test(code)) { if (!silent) toast('Kod 6 haneli olmalı'); return false; }
  S.busy = true; if (!silent) render();
  try {
    const s = await get(ref(db, 'rooms/' + code));
    if (!s.exists()) { S.busy = false; ls.del('zuqio-room'); if (!silent) { render(); toast('Bu kodla bir oda bulunamadı'); } return false; }
    const R = s.val();
    if (R.players && R.players[uid()]) { S.busy = false; enterRoom(code); return true; }
    if (R.status !== 'lobby') { S.busy = false; if (!silent) render(); toast('Bu odada oyun başlamış, bitince tekrar dene'); return false; }
    if (Object.keys(R.players || {}).length >= 30) { S.busy = false; if (!silent) render(); toast('Oda dolu'); return false; }
    await set(ref(db, `rooms/${code}/players/${uid()}`), {name: S.me.name, av: S.me.av, fr: S.me.fr || '', online: true, joinedAt: serverTimestamp()});
    S.busy = false; enterRoom(code); return true;
  } catch (e) { console.error(e); S.busy = false; if (!silent) render(); toast('Odaya katılılamadı'); return false; }
}

async function quickPlay() {
  if (S.code) return;
  S.busy = true; if (S.screen === 'home') render();
  try {
    const snap = await get(query(ref(db, 'rooms'), orderByChild('qm'), equalTo('open')));
    const t = now(), list = [];
    snap.forEach(ch => {
      const R = ch.val(); if (!R || R.status !== 'lobby' || !R.quick) return;
      const ps = Object.values(R.players || {}), online = ps.filter(p => p.online !== false).length;
      const host = R.players && R.players[R.host];
      if (!host || host.online === false) return;
      if ((R.createdAt || 0) < t - 15 * 60 * 1000) return;
      if (online >= QUICK_MAX) return;
      list.push({code: ch.key, online});
    });
    list.sort((a, b) => b.online - a.online);
    for (const c of list) {
      try {
        await set(ref(db, `rooms/${c.code}/players/${uid()}`), {name: S.me.name, av: S.me.av, fr: S.me.fr || '', online: true, joinedAt: serverTimestamp()});
        S.busy = false; enterRoom(c.code); return;
      } catch (e) { /* oda bu arada başlamış olabilir, sıradakini dene */ }
    }
    S.busy = false;
    await createRoom({quick: true});
  } catch (e) { console.error(e); S.busy = false; render(); toast('Hızlı oyun başlatılamadı, tekrar dene'); }
}

async function leaveRoom() {
  const R = S.R; if (!R) { leaveLocal(); go('home'); return; }
  if (isHost() && R.quick && R.status !== 'lobby') {
    const code = S.code, me = uid(); leaveLocal(); go('home');
    try { await set(ref(db, `rooms/${code}/players/${me}/online`), false); } catch (e) {}
    return;
  }
  if (isHost()) {
    if (!R.quick && !R.bot && !confirm('Odayı kapatırsan herkes odadan çıkar. Emin misin?')) return;
    const code = S.code; leaveLocal(); go('home');
    try { await remove(ref(db, 'keys/' + code)); await remove(ref(db, 'rooms/' + code)); } catch (e) { console.error(e); }
  } else {
    const code = S.code, me = uid(), lobby = R.status === 'lobby';
    leaveLocal(); go('home');
    try {
      if (lobby) await remove(ref(db, `rooms/${code}/players/${me}`));
      else await set(ref(db, `rooms/${code}/players/${me}/online`), false);
    } catch (e) { console.error(e); }
  }
}

async function copyCode() {
  const code = String(S.code || '');
  try { await navigator.clipboard.writeText(code); }
  catch (e) {
    try { const t = document.createElement('textarea'); t.value = code; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    catch (e2) { toast('Kod: ' + code); return; }
  }
  buzz(15); toast('Kod kopyalandı');
}
async function shareCode() {
  const url = location.origin + location.pathname + '?oda=' + S.code;
  const text = `${APP_NAME}'da odama gel! Kod: ${S.code}`;
  try {
    if (navigator.share) { await navigator.share({title: APP_NAME, text, url}); return; }
    await navigator.clipboard.writeText(text + ' ' + url); toast('Bağlantı kopyalandı');
  } catch (e) { if (e && e.name !== 'AbortError') toast('Kod: ' + S.code); }
}

/* ================= oda sahibi (host) mantığı ================= */
function niceRound(n, up) {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
  return (up ? Math.ceil(n / mag) : Math.floor(n / mag)) * mag;
}

const DIFF_LABEL = {mix: 'Karışık', k: 'Kolay', o: 'Orta', z: 'Zor'};
function qid(q) { let h = 0; const t = q.q + '|' + (q.t === 'mc' ? q.o[0] : q.a); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function loadSeen() { try { return new Set(JSON.parse(ls.get('zuqio-seen') || '[]')); } catch (e) { return new Set(); } }
function saveSeen(set) { ls.set('zuqio-seen', JSON.stringify([...set].slice(-1500))); }

// Oyun için soru seç: seçilen zorluğa uygun, bu cihazda daha önce görülmemişleri öne al, kategorileri dengele.
function poolFor(cats) {
  return QUESTIONS.filter(q => cats && cats.length ? cats.includes(q.cat) : q.cat !== 'İngilizce');
}
function pickQuestions(count, diff, cats) {
  const pool = poolFor(cats);
  const seen = loadSeen();
  if (pool.filter(q => !seen.has(qid(q))).length < count) pool.forEach(q => seen.delete(qid(q))); // havuz tükendiyse yeni tur başlar
  const plan = diff === 'mix' ? {k: 0.4, o: 0.4, z: 0.2} : {[diff]: 1};
  const keys = Object.keys(plan), want = {};
  let sum = 0;
  keys.forEach(d => { want[d] = Math.round(count * plan[d]); sum += want[d]; });
  while (sum < count) { want[keys[sum % keys.length]]++; sum++; }
  while (sum > count) { const d = keys.find(x => want[x] > 0); want[d]--; sum--; }
  const chosen = [], usedCat = {}, taken = new Set();
  const take = (d, k) => {
    for (let i = 0; i < k; i++) {
      let best = null, bestScore = Infinity;
      for (const q of pool) {
        if (taken.has(q) || (d && q.d !== d)) continue;
        const sc = (seen.has(qid(q)) ? 1000 : 0) + (usedCat[q.cat] || 0) * 12 + Math.random() * 10;
        if (sc < bestScore) { bestScore = sc; best = q; }
      }
      if (!best) return;
      taken.add(best); chosen.push(best); usedCat[best.cat] = (usedCat[best.cat] || 0) + 1;
    }
  };
  keys.forEach(d => take(d, want[d]));
  if (chosen.length < count) take(null, count - chosen.length);
  chosen.forEach(q => seen.add(qid(q)));
  saveSeen(seen);
  return shuffle(chosen);
}

function buildGame(count, diff, cats, fixed) {
  const pool = fixed || pickQuestions(count, diff, cats);
  const pub = [], keys = [], infos = [];
  for (const q of pool) {
    if (q.t === 'mc') {
      const order = shuffle([0, 1, 2, 3]);
      const o = order.map(i => q.o[i]), a = order.indexOf(0);
      const h = shuffle([0, 1, 2, 3].filter(i => i !== a)).slice(0, 2);
      const item = {t: 'mc', cat: q.cat, d: q.d, q: q.q, o, h, id: q.fk || qid(q)};
      if (q.sub) item.sub = q.sub;
      pub.push(item); keys.push(a); infos.push(q.info || '');
    } else {
      const w = q.tolAbs ? q.tolAbs * 0.8 : q.a * 0.3;
      const lo0 = Math.max(0, q.a - w * Math.random());
      const lo = q.tolAbs ? Math.floor(lo0) : Math.min(niceRound(lo0, false), q.a);
      const hi = q.tolAbs ? Math.ceil(lo0 + w) : Math.max(niceRound(lo0 + w, true), q.a);
      const f = v => q.tolAbs ? String(v) : fmt(v);
      const item = {t: 'num', cat: q.cat, d: q.d, q: q.q, unit: q.unit, hint: `${f(lo)} ile ${f(hi)} ${q.unit} arasında`, id: q.fk || qid(q)};
      if (q.tolAbs) item.tolAbs = q.tolAbs;
      pub.push(item); keys.push(q.a); infos.push(q.info || '');
    }
  }
  return {pub, keys, infos};
}

function doHost(fn) {
  if (S.hostBusy) return; S.hostBusy = true;
  Promise.resolve().then(fn).catch(e => { console.error(e); toast('Bağlantı sorunu, tekrar deneniyor'); })
    .finally(() => setTimeout(() => { S.hostBusy = false; }, 500));
}

// kullanıcının bastığı host butonları: önceki işlem bitene kadar kısa süre bekleyip tekrar dener
function hostAction(fn, cond) {
  const tryIt = n => {
    if (!S.hostBusy) { if (!cond || cond()) doHost(fn); }
    else if (n > 0) setTimeout(() => tryIt(n - 1), 120);
  };
  tryIt(25);
}

async function startGame() {
  const R = S.R; S.busy = true; render();
  try {
    let built;
    if (R.quiz) {
      const qz = (S.myQuizzes || {})[R.quiz] || (await get(ref(db, 'quizzes/' + R.quiz))).val();
      if (!qz || !qz.qs) throw new Error('quiz-missing');
      built = buildGame(0, 'mix', null, shuffle(Object.values(qz.qs)).map(q => Object.assign({cat: qz.cat, d: 'o'}, q)));
    } else built = buildGame(R.count || 10, R.diff || 'mix', R.cats ? R.cats.split('|') : null);
    const {pub, keys, infos} = built;
    await set(ref(db, 'keys/' + S.code), {a: keys, i: infos});
    S.keys = {a: keys, i: infos};
    const scores = {}; Object.keys(R.players || {}).forEach(id => { scores[id] = 0; });
    await update(roomRef(), {status: 'countdown', countAt: serverTimestamp(), questions: pub, qi: -1, qk: '-1',
      qStartAt: null, qDur: null, answers: null, reveal: null, jokers: null, scores, qm: null, pub: null, autoAt: null,
      hp: Object.entries(R.players || {}).filter(([id, p]) => !id.startsWith('bot') && p.online !== false).length,
      gid: Date.now().toString(36) + Math.random().toString(36).slice(2, 7)});
  } catch (e) { console.error(e); toast('Oyun başlatılamadı'); }
  S.busy = false;
}

async function nextQ() {
  const R = S.R; const qi = (typeof R.qi === 'number' ? R.qi : -1) + 1;
  if (qi >= R.questions.length) { await update(roomRef(), {status: 'final'}); return; }
  const q = R.questions[qi];
  await update(roomRef(), {status: 'question', qi, qk: String(qi), qStartAt: serverTimestamp(), qDur: q.t === 'mc' ? 20000 : 30000});
}

function calcGain(q, a, v, frac) {
  if (q.t === 'mc') return v === a ? Math.round(500 + 500 * frac) : 0;
  const tol = q.tolAbs ? q.tolAbs : Math.abs(a) * 0.25;
  const err = Math.abs(v - a) / (tol || 1);
  return err >= 1 ? 0 : Math.round(1000 * (1 - err));
}

async function reveal() {
  const R = S.R, qi = R.qi, q = R.questions[qi];
  if (!S.keys) { const s = await get(ref(db, 'keys/' + S.code)); S.keys = s.val(); }
  const a = S.keys.a[qi], A = ansOf(R, qi), J = R.jokers || {};
  const gains = {}, up = {status: 'reveal'};
  for (const id of Object.keys(R.players || {})) {
    const x = A[id]; let g = 0;
    if (x && typeof x.t === 'number') {
      const dl = R.qStartAt + R.qDur + (J[id] && J[id].freeze === qi ? 8000 : 0);
      if (x.t <= dl + 1500) {
        g = calcGain(q, a, x.v, clamp((dl - x.t) / R.qDur, 0, 1));
        if (!g && q.t === 'mc' && J[id] && J[id].second === qi && typeof x.t2 === 'number' && x.v2 === a && x.v2 !== x.v && x.t2 <= dl + 1500)
          g = Math.round(calcGain(q, a, x.v2, clamp((dl - x.t2) / R.qDur, 0, 1)) / 2);
        if (J[id] && J[id].double === qi) g *= 2;
      }
    }
    gains[id] = g; up['scores/' + id] = ((R.scores && R.scores[id]) || 0) + g;
  }
  const rvObj = {a, gains}, info = S.keys.i && S.keys.i[qi];
  if (info) rvObj.info = info;
  up['reveal/' + qi] = rvObj;
  await update(roomRef(), up);
}

function hostStep() {
  const R = S.R;
  if (!R || !isHost() || S.hostBusy) return;
  const n = now();
  if (R.status === 'lobby' && R.quick) {
    const online = players(R).filter(p => p.online !== false).length;
    if (online >= QUICK_MIN && typeof R.autoAt !== 'number') doHost(() => update(roomRef(), {autoAt: serverTimestamp()}));
    else if (online < QUICK_MIN && typeof R.autoAt === 'number') doHost(() => update(roomRef(), {autoAt: null}));
    else if (typeof R.autoAt === 'number' && (n >= R.autoAt + QUICK_WAIT || online >= QUICK_FULL)) doHost(startGame);
    return;
  }
  if (R.status === 'countdown' && typeof R.countAt === 'number' && n >= R.countAt + 3200) doHost(nextQ);
  else if (R.status === 'question' && typeof R.qStartAt === 'number') {
    const qi = R.qi, A = ansOf(R, qi);
    const online = players(R).filter(p => p.online !== false);
    const J0 = R.jokers || {};
    const answered = online.filter(p => A[p.id] && !(J0[p.id] && J0[p.id].second === qi && A[p.id].v2 == null && R.questions[qi].t === 'mc')).length;
    const anyFreeze = Object.values(R.jokers || {}).some(j => j && j.freeze === qi);
    const end = R.qStartAt + R.qDur + (anyFreeze ? 8000 : 0) + 900;
    if ((online.length > 0 && answered >= online.length && n > R.qStartAt + 600) || n > end) doHost(reveal);
  }
}

async function playAgain() {
  S.busy = true; render();
  try {
    await remove(ref(db, 'keys/' + S.code));
    await update(roomRef(), {status: 'lobby', questions: null, qi: null, qk: null, qStartAt: null, qDur: null,
      countAt: null, answers: null, reveal: null, jokers: null, scores: null, pub: S.R && S.R.public ? 'open' : null});
  } catch (e) { console.error(e); toast('Yeni oyun başlatılamadı'); }
  S.busy = false;
}

/* ================= kendi quizini yaz ================= */
const QZ_MIN = 3, QZ_MAX = 30;
const QZ_ST = {draft: ['Taslak', ''], pending: ['Onay bekliyor', 'wait'], approved: ['Havuzda ✓', 'ok'], rejected: ['Reddedildi', 'bad']};
async function loadMyQuizzes() {
  try {
    const sn = await get(query(ref(db, 'quizzes'), orderByChild('owner'), equalTo(uid())));
    S.myQuizzes = sn.val() || {};
  } catch (e) { console.error(e); S.myQuizzes = S.myQuizzes || {}; toast('Zuqio’ların yüklenemedi'); }
  if (S.screen === 'quizzes') render();
}
// onaylanmış topluluk sorularını havuza ekle
async function loadApproved() {
  try {
    const sn = await get(ref(db, 'approvedQs')); const have = new Set(QUESTIONS.map(qid));
    sn.forEach(c => { const q = c.val(); if (q && q.q && !have.has(qid(q))) { QUESTIONS.push(q); have.add(qid(q)); } });
  } catch (e) { console.error(e); }
}
// yönetici düzeltmeleri: kaldırılan / düzenlenen sorular (qfix/<soru kimliği>)
async function loadFixes() {
  try {
    const sn = await get(ref(db, 'qfix')); const fx = sn.val(); if (!fx) return;
    for (let i = QUESTIONS.length - 1; i >= 0; i--) {
      const q = QUESTIONS[i], k = q.fk || qid(q), f = fx[k]; if (!f) continue;
      if (f.del) { QUESTIONS.splice(i, 1); continue; }
      q.fk = k;
      if (q.t === 'mc' && Array.isArray(f.o) && f.o.length === 4 && f.q) { q.q = f.q; q.o = f.o.slice(); }
      else if (q.t === 'num' && f.q && isFinite(f.a)) { q.q = f.q; q.a = +f.a; if (f.unit) q.unit = f.unit; }
    }
  } catch (e) { console.error(e); }
}
V.quizzes = () => {
  const list = Object.entries(S.myQuizzes || {}).map(([id, q]) => Object.assign({id}, q)).sort((a, b) => (b.t || 0) - (a.t || 0));
  return `
  <div class="screen">
    <div class="top">${backBtn('data-go="friends"')}</div>
    <div class="stack" style="gap:14px">
      <h2>Zuqio’larım</h2>
      <p class="muted">Kendi Zuqio’nu oluştur, arkadaşlarınla hemen oyna. İstersen havuza gönder; onaylanınca herkesin oyunlarında çıkar.</p>
      <button class="btn primary big" data-act="qznew"><span class="ic">${ICON.plus || '+'}</span><span class="lb">YENİ ZUQIO</span></button>
      ${S.myQuizzes == null ? '<p class="status">Yükleniyor…</p>' : !list.length ? '<div class="card"><p class="small muted">Henüz bir Zuqio’n yok.</p></div>' : list.map(q => {
        const st = QZ_ST[q.status] || QZ_ST.draft, n = Object.keys(q.qs || {}).length;
        return `<div class="card stack" style="gap:8px">
          <div class="row between"><b>${esc(q.title)}</b><span class="qzst ${st[1]}">${st[0]}</span></div>
          <span class="small muted">${esc(q.cat)} · ${n} soru</span>
          ${q.status === 'rejected' && q.why ? `<p class="small" style="color:#FF9DA0">Sebep: ${esc(q.why)}</p>` : ''}
          <div class="row" style="gap:8px">
            <button class="btn primary" style="flex:1" data-act="qzplay" data-id="${q.id}" ${n < QZ_MIN ? 'disabled' : ''}>Oda aç ve oyna</button>
            <button class="btn outline" data-act="qzedit" data-id="${q.id}">Düzenle</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
};
function blankQ(t) { return t === 'num' ? {t: 'num', q: '', a: '', unit: ''} : {t: 'mc', q: '', o: ['', '', '', '']}; }
V.qzedit = () => {
  const Z = S.qz, locked = Z.status === 'pending';
  return `
  <div class="screen">
    <div class="top">${backBtn('data-act="qzback"')}${Z.id ? `<span class="qzst ${(QZ_ST[Z.status] || QZ_ST.draft)[1]}">${(QZ_ST[Z.status] || QZ_ST.draft)[0]}</span>` : ''}</div>
    <div class="stack" style="gap:12px">
      <h2>${Z.id ? 'Zuqio’yu düzenle' : 'Yeni Zuqio'}</h2>
      ${locked ? '<div class="card"><p class="small">Bu Zuqio onay bekliyor. Düzenlemek için önce gönderimi geri çek.</p><button class="btn outline" data-act="qzwithdraw" style="margin-top:8px">Gönderimi geri çek</button></div>' : ''}
      <label class="small muted" for="qzt">Zuqio adı</label>
      <input class="field" id="qzt" maxlength="40" value="${esc(Z.title)}" placeholder="Örn. 90'lar dizileri" ${locked ? 'disabled' : ''}>
      <label class="small muted" for="qzc">Kategori</label>
      <select class="field" id="qzc" ${locked ? 'disabled' : ''}>${NON_EN.map(c => `<option ${Z.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      ${Z.qs.map((q, i) => `
        <div class="card stack qzq" style="gap:8px" data-i="${i}">
          <div class="row between"><b>${i + 1}. soru · ${q.t === 'num' ? 'Tahmin' : 'Çoktan seçmeli'}</b>${locked ? '' : `<button class="btn ghost" data-act="qzdel" data-i="${i}" aria-label="Soruyu sil">Sil</button>`}</div>
          <textarea class="field" data-f="q" maxlength="200" rows="2" placeholder="Soru" ${locked ? 'disabled' : ''}>${esc(q.q)}</textarea>
          ${q.t === 'num' ? `
            <div class="row" style="gap:8px"><input class="field" data-f="a" inputmode="decimal" placeholder="Doğru sayı" value="${esc(q.a)}" ${locked ? 'disabled' : ''}>
            <input class="field" data-f="unit" maxlength="20" placeholder="Birim (km, yıl…)" value="${esc(q.unit)}" ${locked ? 'disabled' : ''}></div>`
          : q.o.map((o, k) => `<input class="field qzo ${k === 0 ? 'right' : ''}" data-f="o${k}" maxlength="60" placeholder="${k === 0 ? 'Doğru cevap' : 'Yanlış şık ' + k}" value="${esc(o)}" ${locked ? 'disabled' : ''}>`).join('')}
        </div>`).join('')}
      ${locked || Z.qs.length >= QZ_MAX ? '' : `<div class="row" style="gap:8px">
        <button class="btn outline" style="flex:1" data-act="qzadd" data-t="mc">+ Çoktan seçmeli</button>
        <button class="btn outline" style="flex:1" data-act="qzadd" data-t="num">+ Tahmin</button></div>`}
      <p class="small muted">İlk şık her zaman doğru cevaptır; oyunda şıklar karıştırılır. En az ${QZ_MIN}, en fazla ${QZ_MAX} soru.</p>
    </div>
    <div class="grow" style="min-height:16px"></div>
    ${locked ? '' : `<div class="stack">
      <button class="btn primary big" data-act="qzsave" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">KAYDET</span></button>
      ${Z.status !== 'approved' ? `<button class="btn outline" data-act="qzsubmit" ${S.busy ? 'disabled' : ''}>Kaydet ve havuza gönder</button>` : ''}
      ${Z.id ? '<button class="btn ghost" data-act="qzremove">Zuqio’yu sil</button>' : ''}
    </div>`}
  </div>`;
};
function readQz() {
  const Z = S.qz; if (!Z || Z.status === 'pending') return;
  const t = document.getElementById('qzt'), c = document.getElementById('qzc');
  if (t) Z.title = t.value; if (c) Z.cat = c.value;
  document.querySelectorAll('.qzq').forEach(el => {
    const q = Z.qs[+el.dataset.i]; if (!q) return;
    el.querySelectorAll('[data-f]').forEach(f => {
      const k = f.dataset.f;
      if (k[0] === 'o' && k.length === 2) q.o[+k[1]] = f.value; else q[k] = f.value;
    });
  });
}
function checkQz(Z) {
  if (!Z.title.trim()) return 'Zuqio’na bir ad ver';
  if (Z.qs.length < QZ_MIN) return `En az ${QZ_MIN} soru ekle`;
  for (let i = 0; i < Z.qs.length; i++) {
    const q = Z.qs[i], n = i + 1;
    if (!q.q.trim()) return `${n}. sorunun metni boş`;
    if (q.t === 'mc') {
      const o = q.o.map(x => x.trim());
      if (o.some(x => !x)) return `${n}. sorunun dört şıkkını da doldur`;
      if (new Set(o.map(x => x.toLocaleLowerCase('tr-TR'))).size < 4) return `${n}. soruda aynı şık iki kez yazılmış`;
    } else {
      if (!isFinite(parseFloat(String(q.a).replace(',', '.')))) return `${n}. sorunun cevabı bir sayı olmalı`;
      if (!String(q.unit).trim()) return `${n}. soruya bir birim yaz`;
    }
  }
  return null;
}
async function saveQz(status) {
  readQz(); const Z = S.qz, err = checkQz(Z); if (err) { toast(err); return; }
  const qs = Z.qs.map(q => q.t === 'mc' ? {t: 'mc', q: q.q.trim(), o: q.o.map(x => x.trim())}
    : {t: 'num', q: q.q.trim(), a: parseFloat(String(q.a).replace(',', '.')), unit: String(q.unit).trim()});
  const id = Z.id || ('z' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const data = {owner: uid(), name: S.me.name, title: Z.title.trim().slice(0, 40), cat: Z.cat, qs, status, t: serverTimestamp()};
  S.busy = true; render();
  try {
    await set(ref(db, 'quizzes/' + id), data);
    S.myQuizzes = Object.assign({}, S.myQuizzes, {[id]: Object.assign({}, data, {t: now()})});
    toast(status === 'pending' ? 'Havuza gönderildi, onay bekliyor' : 'Kaydedildi');
    S.busy = false; go('quizzes');
  } catch (e) { console.error(e); S.busy = false; render(); toast('Kaydedilemedi, tekrar dene'); }
}

/* ================= hatalı soru bildirimi ================= */
async function reportQuestion() {
  const R = S.R; if (!R || !R.questions) return;
  const qi = R.qi, q = R.questions[qi]; S.reported = S.reported || {};
  const key = (R.gid || S.code) + ':' + qi;
  if (S.reported[key]) { toast('Bu soruyu zaten bildirdin, teşekkürler!'); return; }
  const note = prompt('Sorunun neresi hatalı? (isteğe bağlı)', '');
  if (note === null) return;
  const rv = R.reveal && R.reveal[qi], a = rv ? rv.a : null;
  const ans = a == null ? '' : (q.t === 'mc' ? q.o[a] : String(a) + ' ' + (q.unit || ''));
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  try {
    await set(ref(db, 'reports/' + id), {q: q.q.slice(0, 400), cat: q.cat || '', ans: String(ans).slice(0, 120), opts: q.t === 'mc' ? q.o.join(' | ').slice(0, 300) : '',
      note: note.trim().slice(0, 300), qk: String(q.id || '').slice(0, 20), by: uid(), name: S.me.name, t: serverTimestamp()});
    S.reported[key] = true; toast('Teşekkürler! Bildirim yöneticiye iletildi.');
  } catch (e) { console.error(e); toast('Bildirim gönderilemedi'); }
}

/* ================= oyuncu eylemleri ================= */
async function answer(v) {
  const R = S.R; if (!R || R.status !== 'question' || !S.q || remaining() <= 0) return;
  if (S.q.sent != null) {
    const A0 = ansOf(R, R.qi)[uid()];
    if (R.questions[R.qi].t !== 'mc' || myJ('second') !== R.qi || S.q.sent2 != null || (A0 && A0.v2 != null) || v === S.q.sent) return;
    S.q.sent2 = v; buzz(30); SFX.play('tap'); render();
    try {
      const base = `rooms/${S.code}/answers/${R.qi}/${uid()}`;
      await set(ref(db, base + '/t2'), serverTimestamp());
      await set(ref(db, base + '/v2'), v);
    } catch (e) { console.error(e); S.q.sent2 = null; render(); toast('İkinci cevap gönderilemedi'); }
    return;
  }
  S.q.sent = v; buzz(30); SFX.play('tap'); render();
  try { await set(ref(db, `rooms/${S.code}/answers/${R.qi}/${uid()}`), {v, t: serverTimestamp()}); }
  catch (e) { console.error(e); S.q.sent = null; render(); toast('Cevap gönderilemedi, süre dolmuş olabilir'); }
}

async function useJoker(key) {
  const R = S.R; if (!R || R.status !== 'question' || myJ(key) != null || (S.q && S.q.sent != null && key !== 'second')) return;
  if (key === 'freeze') S.q.frozenUntil = now() + 8000;
  buzz(20); SFX.play('joker');
  try {
    await set(ref(db, `rooms/${S.code}/jokers/${uid()}/${key}`), R.qi);
    // bot odasında yerel veri tabanı olay göndermeden önce çizim yapılmasın diye durumu hemen işle
    if (S.R === R) { R.jokers = R.jokers || {}; R.jokers[uid()] = Object.assign({}, R.jokers[uid()], {[key]: R.qi}); }
    if (key === 'double') toast('Çifte puan açık: bu soruda puanın ikiye katlanacak');
    if (key === 'freeze') toast('Süre 8 saniyeliğine donduruldu');
    if (key === 'second') toast(S.q && S.q.sent != null ? 'İkinci şans açık: başka bir şık seç, doğruysa yarı puan alırsın' : 'İkinci şans açık: önce tercihini, sonra yedek şıkkı seç');
  } catch (e) { console.error(e); if (key === 'freeze') S.q.frozenUntil = 0; toast('Joker kullanılamadı'); }
  render();
}

/* ================= ekran açık kalsın ================= */
async function wakeOn() { try { if ('wakeLock' in navigator && !S.wake) S.wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
function wakeOff() { try { S.wake && S.wake.release(); } catch (e) {} S.wake = null; }
document.addEventListener('visibilitychange', () => {
  // arka plana geçince müzik ve sesler dursun, geri gelince devam etsin
  try { if (SFX.ctx) { if (document.visibilityState === 'hidden') SFX.ctx.suspend(); else SFX.ctx.resume(); } } catch (e) {}
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.code) { S.wake = null; wakeOn(); markOnline(); } });

/* ================= olaylar ================= */
document.addEventListener('focusin', e => { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) document.body.classList.add('kb'); });
document.addEventListener('focusout', () => document.body.classList.remove('kb'));
app.addEventListener('click', e => {
  SFX.init(); if (S.music && !MUSIC.on) MUSIC.start();
  const el = e.target.closest('[data-act],[data-go]'); if (!el || el.disabled) return;
  if (el.dataset.go) { go(el.dataset.go); return; }
  const a = el.dataset.act;
  if (a === 'login') login();
  else if (a === 'openprofile') { S.pick = S.me.av; S.draft = S.me.name; S.firstProfile = false; go('profile'); }
  else if (a === 'av') { const nm = document.getElementById('pnm'); if (nm) S.draft = nm.value; S.pick = +el.dataset.i; buzz(15); render(); }
  else if (a === 'saveprof') saveProfile();
  else if (a === 'delacct') deleteAccount();
  else if (a === 'logout') { if (confirm('Çıkış yapmak istiyor musun?')) { leaveLocal(); signOut(auth); } }
  else if (a === 'soon') toast(el.dataset.n + ' çok yakında');
  else if (a === 'claim') claimDaily();
  else if (a === 'dqstart') dqStart();
  else if (a === 'dqpick') answerDaily(+el.dataset.i);
  else if (a === 'dqshare') shareDaily();
  else if (a === 'buy') buyItem(el.dataset.id);
  else if (a === 'shoptab') { S.shopTab = el.dataset.t; render(); }
  else if (a === 'react') sendReact(el.dataset.p, +el.dataset.e);
  else if (a === 'equip') equipItem(el.dataset.id);
  else if (a === 'tmusic') { S.music = !S.music; ls.set('zuqio-music', S.music ? '1' : '0'); if (S.music) MUSIC.start(); else MUSIC.stop(); render(); }
  else if (a === 'tsound') { S.sound = !S.sound; ls.set('zuqio-sound', S.sound ? '1' : '0'); if (S.sound) SFX.play('correct'); render(); }
  else if (a === 'thaptic') { S.haptic = !S.haptic; ls.set('zuqio-haptic', S.haptic ? '1' : '0'); if (S.haptic) buzz(40); render(); }
  else if (a === 'create') createRoom();
  else if (a === 'quick') { stopOpenRooms(); quickPlay(); }
  else if (a === 'bot') startBotGame();
  else if (a === 'keepwait') { S.qmSince = now(); S.qmOffered = false; render(); }
  else if (a === 'botagain') { (async () => { await playAgain(); startGame(); })(); }
  else if (a === 'quickfrombot') { leaveLocal(); quickPlay(); }
  else if (a === 'quickagain') { const code = S.code, me = uid(); leaveLocal(); set(ref(db, `rooms/${code}/players/${me}/online`), false).catch(() => {}); quickPlay(); }
  else if (a === 'joincode') joinRoom((document.getElementById('code').value || '').replace(/\D/g, ''));
  else if (a === 'share') shareCode();
  else if (a === 'copycode') copyCode();
  else if (a === 'leave') leaveRoom();
  else if (a === 'count') update(roomRef(), {count: +el.dataset.n}).catch(() => toast('Değiştirilemedi'));
  else if (a === 'diff') update(roomRef(), {diff: el.dataset.v}).catch(() => toast('Değiştirilemedi'));
  else if (a === 'opencats') {
    const c = roomCats(S.R) || [];
    S.catMode = c.includes('İngilizce') ? 'en' : 'quiz';
    const qc = c.filter(x => x !== 'İngilizce');
    S.catAll = !qc.length; S.catSel = new Set(qc);
    S.catsOpen = true; render(); app.scrollTop = 0;
  }
  else if (a === 'openboard') { S.lbTab = S.lbTab || 'd'; S.lbCache = {}; go('board'); loadBoard(); }
  else if (a === 'lbtab') { S.lbTab = el.dataset.t; render(); loadBoard(); }
  else if (a === 'catmode') { S.catMode = el.dataset.m; render(); }
  else if (a === 'catall') { S.catAll = true; S.catSel = new Set(); render(); }
  else if (a === 'cattoggle') {
    // "Hepsi" açıkken ilk dokunuş sadece o kategoriyi seçer; sonrakiler ekler/çıkarır; seçim boşalırsa "Hepsi"ye döner
    const c = CATS[+el.dataset.i];
    if (S.catAll) { S.catAll = false; S.catSel = new Set([c]); }
    else { if (S.catSel.has(c)) S.catSel.delete(c); else S.catSel.add(c); if (!S.catSel.size) S.catAll = true; }
    render();
  }
  else if (a === 'catsdone') {
    const sel = S.catSel; S.catsOpen = false;
    // Bilgi yarışması ve İngilizce öğrenme birbirini dışlar: ikisi aynı oyunda karışmaz
    const isAll = S.catAll || NON_EN.every(c => sel.has(c));
    const cats = S.catMode === 'en' ? 'İngilizce' : (isAll ? null : NON_EN.filter(c => sel.has(c)).join('|'));
    update(roomRef(), {cats}).catch(() => toast('Değiştirilemedi'));
    render(); app.scrollTop = 0;
  }
  else if (a === 'start') startGame();
  else if (a === 'pick') answer(+el.dataset.i);
  else if (a === 'sendnum') {
    const v = parseInt((document.getElementById('guess').value || '').replace(/\D/g, ''), 10);
    if (isNaN(v)) { toast('Bir sayı yaz'); return; }
    answer(v);
  }
  else if (a === 'joker') useJoker(el.dataset.j);
  else if (a === 'next') hostAction(nextQ, () => S.R && S.R.status === 'reveal');
  else if (a === 'again') playAgain();
  else if (a === 'report') reportQuestion();
  else if (a === 'openrooms') { go('rooms'); watchOpenRooms(); }
  else if (a === 'roomsback') { stopOpenRooms(); go('friends'); }
  else if (a === 'joinopen') { stopOpenRooms(); joinRoom(el.dataset.code); }
  else if (a === 'tpublic') { const on = !S.R.public; update(roomRef(), {public: on || null, pub: on ? 'open' : null}).then(() => toast(on ? 'Oda artık açık odalar listesinde' : 'Oda gizlendi')).catch(() => toast('Değiştirilemedi')); }
  else if (a === 'myquizzes') { S.myQuizzes = S.myQuizzes || null; go('quizzes'); loadMyQuizzes(); }
  else if (a === 'qznew') { S.qz = {title: '', cat: NON_EN[0], qs: [blankQ('mc'), blankQ('mc'), blankQ('mc')], status: 'draft'}; go('qzedit'); }
  else if (a === 'qzedit') { const q = S.myQuizzes[el.dataset.id]; S.qz = {id: el.dataset.id, title: q.title, cat: q.cat, status: q.status, why: q.why,
      qs: Object.values(q.qs || {}).map(x => x.t === 'num' ? {t: 'num', q: x.q, a: String(x.a), unit: x.unit} : {t: 'mc', q: x.q, o: x.o.slice()})}; go('qzedit'); }
  else if (a === 'qzback') { go('quizzes'); }
  else if (a === 'qzadd') { readQz(); S.qz.qs.push(blankQ(el.dataset.t)); render(); setTimeout(() => { const all = document.querySelectorAll('.qzq'); all[all.length - 1].scrollIntoView({behavior: 'smooth', block: 'center'}); }, 30); }
  else if (a === 'qzdel') { readQz(); S.qz.qs.splice(+el.dataset.i, 1); render(); }
  else if (a === 'qzsave') saveQz('draft');
  else if (a === 'qzsubmit') { if (confirm('Zuqio onaya gönderilsin mi? Onaylanan sorular herkesin oyunlarında çıkabilir.')) saveQz('pending'); }
  else if (a === 'qzwithdraw') { (async () => { try { await update(ref(db, 'quizzes/' + S.qz.id), {status: 'draft', t: serverTimestamp()}); S.qz.status = 'draft'; S.myQuizzes[S.qz.id].status = 'draft'; render(); } catch (e) { toast('Geri çekilemedi'); } })(); }
  else if (a === 'qzremove') { if (confirm('Bu Zuqio silinsin mi?')) (async () => { try { await remove(ref(db, 'quizzes/' + S.qz.id)); delete S.myQuizzes[S.qz.id]; toast('Silindi'); go('quizzes'); } catch (e) { toast('Silinemedi'); } })(); }
  else if (a === 'qzplay') { const q = S.myQuizzes[el.dataset.id]; createRoom({quiz: el.dataset.id, quizTitle: q.title, quizN: Object.keys(q.qs || {}).length}); }
  else if (a === 'quizoff') update(roomRef(), {quiz: null, quizTitle: null, quizN: null}).catch(() => toast('Değiştirilemedi'));
  else if (a === 'bookdl') downloadBook();
  else if (a === 'winclose') { if (e.target.closest('[data-stop]') && !e.target.closest('.annx')) return; if (S.win) ls.set('zuqio-win-' + S.win.key, '1'); render(); }
  else if (a === 'annclose') { if (e.target.closest('[data-stop]') && !e.target.closest('.annx')) return; if (S.ann) ls.set('zuqio-ann', String(S.ann.t)); render(); }
});
app.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const map = {guess: 'sendnum', code: 'joincode', pnm: 'saveprof'};
  const act = map[e.target.id]; if (act) { const b = app.querySelector(`[data-act="${act}"]`); if (b && !b.disabled) b.click(); }
});

/* ================= başlangıç ================= */
const qp = new URLSearchParams(location.search).get('oda');
if (qp && /^\d{6}$/.test(qp)) { S.pendingCode = qp; history.replaceState(null, '', location.pathname); }
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => {
    // uygulama her öne geldiğinde güncelleme var mı bak
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') r.update().catch(() => {}); });
  }).catch(() => {}));
  // yeni sürüm devreye girince, oyunun ortasında değilsek sayfayı sessizce yenile
  const hadCtrl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadCtrl) return;
    const reload = () => location.reload();
    if (!S.code) reload(); else { const iv = setInterval(() => { if (!S.code) { clearInterval(iv); reload(); } }, 2000); }
  });
}
