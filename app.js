import { firebaseConfig, APP_NAME } from './firebase-config.js';
import { QUESTIONS } from './questions.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, onValue, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = getDatabase(fb);

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
  hint:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
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
function avSVG(i){
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
  freeze: {label:'Buz', icon:'ice'}
};
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.round(n).toLocaleString('tr-TR');
const fmtQ = (q, v) => q && q.tolAbs ? String(Math.round(v)) : fmt(v);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
const icon = i => `<img src="ic${i}.png" alt="" draggable="false">`;
const avatar = (av, cls = '') => `<div class="avatar ${cls}">${avSVG(av || 0)}</div>`;
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

/* ================= durum ================= */
const S = {
  user: null, me: null, screen: 'loading', code: null, R: null, keys: null,
  offset: 0, unsubRoom: null, lastKey: '', hostBusy: false, q: null,
  pick: 0, draft: '', firstProfile: false, pendingCode: null, wake: null, busy: false
};
const uid = () => S.user && S.user.uid;
const now = () => Date.now() + S.offset;
const roomRef = (p = '') => ref(db, `rooms/${S.code}${p ? '/' + p : ''}`);

onValue(ref(db, '.info/serverTimeOffset'), s => { S.offset = s.val() || 0; });
onValue(ref(db, '.info/connected'), s => { if (s.val()) markOnline(); });

function go(screen) { S.screen = screen; render(); app.scrollTop = 0; }

/* ================= ekranlar ================= */
const V = {};
const LOGO = () => `<div class="hero">
  <div class="logo4">${[0, 1, 2, 3].map(icon).join('')}</div>
  <div class="wordmark">${esc(APP_NAME.toUpperCase()).replace('Q', '<span>Q</span>')}</div>
  <p class="slogan">Soruyu bil, <span class="y">seçimini yap</span>, <span class="g">kazan</span>!</p>
</div>`;

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
        ${AV.map((a, i) => `<button role="radio" aria-checked="${S.pick === i}" aria-label="Avatar ${i + 1}" class="${S.pick === i ? 'on' : ''}" data-act="av" data-i="${i}">${avSVG(i)}</button>`).join('')}
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
    <div class="top"><span></span><button class="me-chip" data-act="openprofile" aria-label="Profili düzenle">${esc(S.me.name)}${avatar(S.me.av)}</button></div>
    <div class="grow"></div>${LOGO()}
    <div class="grow" style="min-height:24px"></div>
    <div class="stack" style="gap:14px">
      <button class="btn primary big" data-act="soon" data-n="Hızlı oyna"><span class="ic">${ICON.play}</span><span class="lb">HIZLI OYNA</span></button>
      <button class="btn purple big" data-go="friends"><span class="ic">${ICON.users}</span><span class="lb">ARKADAŞLARINLA OYNA</span></button>
      <button class="btn outline big" data-act="soon" data-n="Liderlik tablosu"><span class="ic">${ICON.trophy}</span><span class="lb">LİDERLİK TABLOSU</span></button>
    </div>
    <nav class="bottomnav" aria-label="Diğer">
      <button data-act="soon" data-n="Ayarlar">${ICON.gear}AYARLAR</button>
      <button data-act="soon" data-n="Mağaza">${ICON.shop}MAĞAZA</button>
      <button data-go="how">${ICON.help}NASIL OYNANIR?</button>
      <button data-act="soon" data-n="Günlük ödül">${ICON.gift}GÜNLÜK ÖDÜL</button>
    </nav>
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
        <button class="btn" data-act="soon" data-n="Açık odalar">${ICON.list}Açık odalar</button>
      </div>
    </div>
  </div>`;

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

V.lobby = () => {
  const R = S.R, ps = players(R), host = isHost();
  return `
  <div class="screen">
    <div class="top">${backBtn('data-act="leave"', 'Odadan çık')}<span class="tag">${host ? 'Oda sahibi sensin' : 'Oyun bekleniyor'}</span></div>
    <div class="card stack" style="align-items:center;gap:6px">
      <span class="small muted">Oda kodu</span>
      <div class="code">${S.code}</div>
      <button class="btn ghost" data-act="share">Kodu paylaş</button>
    </div>
    <div class="row between" style="margin:18px 0 10px"><b>Oyuncular</b><span class="muted small">${ps.length} kişi</span></div>
    <div class="plist">
      ${ps.map(p => `<div class="pitem ${p.online === false ? 'off' : ''}">${avatar(p.av)}<b>${esc(p.name)}</b>
        <span style="margin-left:auto" class="row">${p.id === R.host ? '<span class="tag">Oda sahibi</span>' : ''}${p.id === uid() ? '<span class="tag">Sen</span>' : ''}</span></div>`).join('')}
    </div>
    <div class="grow" style="min-height:20px"></div>
    ${host ? `
      <span class="small muted" style="margin-bottom:8px">Soru sayısı</span>
      <div class="chips" style="margin-bottom:14px">${[5, 10, 15].map(n => `<button class="${(R.count || 10) === n ? 'on' : ''}" data-act="count" data-n="${n}">${n}</button>`).join('')}</div>
      <button class="btn primary big" data-act="start" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">OYUNU BAŞLAT</span></button>`
    : `<p class="status">Oda sahibinin oyunu başlatması bekleniyor…</p>`}
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
  if (!mine && remaining() <= 0) return 'Süre doldu';
  return mine ? `Cevabın alındı · ${n}/${ps.length} oyuncu cevapladı` : `${n}/${ps.length} oyuncu cevapladı`;
}

V.question = () => {
  const R = S.R, qi = R.qi, q = R.questions[qi];
  const A = ansOf(R, qi), mineV = A[uid()] ? A[uid()].v : (S.q.sent != null ? S.q.sent : null);
  const locked = mineV != null || remaining() <= 0;
  const isNum = q.t === 'num';
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
        if (mineV != null) cls.push(mineV === i ? 'mine' : 'dim');
        return `<button class="${cls.join(' ')}" data-act="pick" data-i="${i}" ${locked ? 'disabled' : ''} aria-label="${SHAPE_NAMES[i]}: ${esc(o)}">${icon(i)}<span>${esc(o)}</span></button>`;
      }).join('')}</div>`;
  const jk = key => {
    const used = myJ(key) != null, active = myJ(key) === qi;
    return `<button class="joker ${active ? 'on' : ''}" data-act="joker" data-j="${key}" ${used || locked ? 'disabled' : ''}>${ICON[JOKER_INFO[key].icon]}${JOKER_INFO[key].label}</button>`;
  };
  return `
  <div class="screen">
    <div class="qhead">
      <div class="stack" style="gap:6px">
        <span class="small muted">Soru ${qi + 1} / ${R.questions.length}</span>
        <span><span class="tag">${esc(q.cat)}${isNum ? ' · Tahmin' : ''}</span></span>
      </div>
      <div class="hex" id="hex">${Math.ceil(remaining() / 1000)}</div>
    </div>
    <div class="bar"><i id="tbar"></i></div>
    <p class="qtext">${esc(q.q)}</p>
    <div class="grow" style="min-height:16px"></div>
    <p class="status" id="st">${statusText()}</p>
    <div class="jokers" role="group" aria-label="Jokerler">${jk(isNum ? 'hint' : 'half')}${jk('double')}${jk('freeze')}</div>
    ${ans}
  </div>`;
};

function rankList(R, qi) {
  const gains = (R.reveal && R.reveal[qi] && R.reveal[qi].gains) || {};
  const sc = R.scores || {};
  return players(R).sort((a, b) => (sc[b.id] || 0) - (sc[a.id] || 0)).map((p, i) => `
    <div class="rank ${p.id === uid() ? 'me' : ''}"><span class="n">${i + 1}</span>${avatar(p.av)}<b>${esc(p.name)}</b>
      <span class="pts">${fmt(sc[p.id] || 0)}</span><span class="delta">${gains[p.id] ? '+' + fmt(gains[p.id]) : ''}</span></div>`).join('');
}

V.reveal = () => {
  const R = S.R, qi = R.qi, q = R.questions[qi], rv = (R.reveal && R.reveal[qi]) || {};
  const mine = ansOf(R, qi)[uid()], gain = (rv.gains || {})[uid()] || 0, a = rv.a;
  let cls, title, sub;
  if (!mine) { cls = 'bad'; title = 'Süre doldu'; sub = q.t === 'mc' ? `Doğru cevap: ${esc(q.o[a])}` : `Doğru cevap: ${fmtQ(q, a)} ${esc(q.unit)}`; }
  else if (q.t === 'mc') {
    const ok = mine.v === a;
    cls = ok ? 'good' : 'bad'; title = ok ? `+${fmt(gain)}` : 'Yanlış';
    sub = ok ? (myJ('double') === qi ? 'Doğru! Çifte puan işe yaradı' : 'Doğru!') : `Doğru cevap: ${esc(q.o[a])}`;
  } else {
    cls = gain >= 700 ? 'good' : gain > 0 ? 'mid' : 'bad';
    title = gain > 0 ? `+${fmt(gain)}` : 'Çok uzak';
    sub = `Doğru cevap: ${fmtQ(q, a)} ${esc(q.unit)} · Senin tahminin: ${fmtQ(q, mine.v)}`;
  }
  const last = qi === R.questions.length - 1;
  return `
  <div class="screen">
    <div class="verdict ${cls}"><b>${title}</b><p>${sub}</p></div>
    <div class="row between" style="margin:20px 0 10px"><b>Sıralama</b><span class="small muted">Soru ${qi + 1} / ${R.questions.length}</span></div>
    <div class="stack" style="gap:8px">${rankList(R, qi)}</div>
    <div class="grow" style="min-height:16px"></div>
    <button class="linkbtn" data-act="report">Bu soruda hata var, bildir</button>
    ${isHost()
      ? `<button class="btn primary big" data-act="next"><span class="ic">${ICON.play}</span><span class="lb">${last ? 'SONUÇLARI GÖR' : 'SONRAKİ SORU'}</span></button>`
      : `<p class="status">${hostOnline() ? 'Oda sahibi sonraki soruya geçecek…' : 'Oda sahibinin bağlantısı koptu, bekleniyor…'}</p>`}
  </div>`;
};

V.final = () => {
  const R = S.R, sc = R.scores || {};
  const s = players(R).sort((a, b) => (sc[b.id] || 0) - (sc[a.id] || 0));
  const myRank = s.findIndex(p => p.id === uid()) + 1;
  const pod = (p, place, h) => p ? `<div class="pod"><div class="row" style="justify-content:center">${avatar(p.av)}</div><div class="nm">${esc(p.name)}</div><div class="sc">${fmt(sc[p.id] || 0)}</div><div class="blk" style="height:${h}px;background:${COLORS[(place - 1) % 4]}">${place}</div></div>` : '<div></div>';
  return `
  <div class="screen">
    <h2 style="text-align:center;margin-top:10px">${myRank === 1 ? 'Kazandın!' : `${myRank}. oldun`}</h2>
    <div class="podium">${pod(s[1], 2, 70)}${pod(s[0], 1, 104)}${pod(s[2], 3, 50)}</div>
    <div class="stack" style="gap:8px;margin-top:8px">${s.slice(3).map((p, i) => `<div class="rank ${p.id === uid() ? 'me' : ''}"><span class="n">${i + 4}</span>${avatar(p.av)}<b>${esc(p.name)}</b><span class="pts">${fmt(sc[p.id] || 0)}</span></div>`).join('')}</div>
    <div class="grow" style="min-height:20px"></div>
    <div class="stack">
      ${isHost()
        ? `<button class="btn primary big" data-act="again" ${S.busy ? 'disabled' : ''}><span class="ic">${ICON.play}</span><span class="lb">TEKRAR OYNA</span></button>
           <button class="btn ghost" data-act="leave">Odayı kapat</button>`
        : `<p class="status">Oda sahibi yeni bir oyun başlatabilir.</p><button class="btn ghost" data-act="leave">Odadan çık</button>`}
    </div>
  </div>`;
};

function render() {
  if (!V[S.screen]) S.screen = 'home';
  let keep = null; const g = document.getElementById('guess');
  if (g && !g.disabled) keep = g.value;
  app.innerHTML = V[S.screen]();
  if (keep != null) { const g2 = document.getElementById('guess'); if (g2 && !g2.disabled) g2.value = keep; }
  tick();
}

/* ================= saat ================= */
function tick() {
  if (S.screen === 'question' && S.R && S.R.status === 'question') {
    const r = remaining(), dl = S.R.qDur || 20000;
    const hex = document.getElementById('hex'), bar = document.getElementById('tbar'), st = document.getElementById('st');
    const frozen = S.q && S.q.frozenUntil > now();
    if (hex) { hex.textContent = Math.ceil(r / 1000); hex.className = 'hex' + (frozen ? ' ice' : r < 5000 ? ' low' : ''); }
    if (bar) bar.style.width = clamp(r / dl * 100, 0, 100) + '%';
    if (st) st.textContent = statusText();
    if (r <= 0 && S.q && !S.q.timeUpShown) { S.q.timeUpShown = true; render(); }
  }
  if (S.screen === 'count' && S.R) { const el = document.getElementById('cnt'); if (el && el.textContent !== String(countNum())) { el.textContent = countNum(); buzz(20); } }
}
setInterval(() => { tick(); hostStep(); }, 150);

/* ================= giriş ve profil ================= */
getRedirectResult(auth).catch(() => {});

onAuthStateChanged(auth, async u => {
  S.user = u;
  if (!u) { S.me = null; go('login'); return; }
  try {
    const snap = await get(ref(db, 'users/' + u.uid));
    if (snap.exists()) { S.me = snap.val(); afterLogin(); }
    else {
      S.firstProfile = true; S.pick = Math.floor(Math.random() * 8);
      S.draft = (u.displayName || '').split(' ')[0].slice(0, 16);
      go('profile');
    }
  } catch (e) { console.error(e); toast('Profil yüklenemedi. Sayfayı yenile.'); }
});

async function afterLogin() {
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

async function saveProfile() {
  const v = (document.getElementById('pnm').value || '').trim().slice(0, 16);
  if (!v) { toast('Bir ad yaz'); return; }
  S.busy = true; render();
  try {
    const data = {name: v, av: S.pick, plan: (S.me && S.me.plan) || 'free', createdAt: (S.me && S.me.createdAt) || serverTimestamp()};
    await set(ref(db, 'users/' + uid()), data);
    S.me = {name: v, av: S.pick, plan: data.plan, createdAt: S.me && S.me.createdAt};
    const first = S.firstProfile; S.firstProfile = false; S.busy = false;
    toast('Profil kaydedildi');
    if (first) afterLogin(); else go('home');
  } catch (e) { console.error(e); S.busy = false; render(); toast('Kaydedilemedi, tekrar dene'); }
}

/* ================= oda ================= */
function enterRoom(code) {
  if (S.unsubRoom) S.unsubRoom();
  S.code = code; S.R = null; S.keys = null; S.lastKey = ''; S.q = null;
  ls.set('zuqio-room', code);
  markOnline();
  S.unsubRoom = onValue(roomRef(), snap => onRoom(snap.val()), err => { console.error(err); toast('Odaya erişilemedi'); leaveLocal(); go('home'); });
  wakeOn();
}

function leaveLocal() {
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
  if (!R) { leaveLocal(); toast('Oda kapatıldı'); go('home'); return; }
  if (!R.players || !R.players[uid()]) { leaveLocal(); toast('Odadan çıktın'); go('home'); return; }
  S.R = R;
  const map = {lobby: 'lobby', countdown: 'count', question: 'question', reveal: 'reveal', final: 'final'};
  const scr = map[R.status] || 'lobby';
  const key = R.status + ':' + (R.qi != null ? R.qi : '');
  if (key !== S.lastKey) {
    S.lastKey = key;
    if (R.status === 'question') S.q = {qi: R.qi, frozenUntil: 0, sent: null, timeUpShown: false};
    if (R.status === 'reveal') { const g = (R.reveal && R.reveal[R.qi] && R.reveal[R.qi].gains || {})[uid()] || 0; buzz(g > 0 ? [30, 40, 30] : 120); }
    S.screen = scr; render(); app.scrollTop = 0; return;
  }
  if (S.screen !== scr) { S.screen = scr; render(); return; }
  if (scr === 'question') {
    // yalnızca durum satırı ve kilitleme değişir; yazılan tahmini kaybetmemek için tam çizim yapma
    const mine = ansOf(R, R.qi)[uid()];
    if (mine && S.q && S.q.sent == null) { S.q.sent = mine.v; render(); }
    else tick();
  } else render();
}

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function createRoom() {
  if (S.busy) return; S.busy = true; render();
  try {
    let code = null;
    for (let i = 0; i < 6 && !code; i++) { const c = genCode(); const s = await get(ref(db, 'rooms/' + c)); if (!s.exists()) code = c; }
    if (!code) throw new Error('no-code');
    await set(ref(db, 'rooms/' + code), {
      host: uid(), status: 'lobby', count: 10, createdAt: serverTimestamp(),
      players: {[uid()]: {name: S.me.name, av: S.me.av, online: true, joinedAt: serverTimestamp()}}
    });
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
    await set(ref(db, `rooms/${code}/players/${uid()}`), {name: S.me.name, av: S.me.av, online: true, joinedAt: serverTimestamp()});
    S.busy = false; enterRoom(code); return true;
  } catch (e) { console.error(e); S.busy = false; if (!silent) render(); toast('Odaya katılılamadı'); return false; }
}

async function leaveRoom() {
  const R = S.R; if (!R) { leaveLocal(); go('home'); return; }
  if (isHost()) {
    if (!confirm('Odayı kapatırsan herkes odadan çıkar. Emin misin?')) return;
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

function buildGame(count) {
  const pool = shuffle(QUESTIONS).slice(0, count);
  const pub = [], keys = [];
  for (const q of pool) {
    if (q.t === 'mc') {
      const order = shuffle([0, 1, 2, 3]);
      const o = order.map(i => q.o[i]), a = order.indexOf(0);
      const h = shuffle([0, 1, 2, 3].filter(i => i !== a)).slice(0, 2);
      pub.push({t: 'mc', cat: q.cat, q: q.q, o, h}); keys.push(a);
    } else {
      const w = q.tolAbs ? q.tolAbs * 0.8 : q.a * 0.3;
      const lo0 = Math.max(0, q.a - w * Math.random());
      const lo = q.tolAbs ? Math.floor(lo0) : Math.min(niceRound(lo0, false), q.a);
      const hi = q.tolAbs ? Math.ceil(lo0 + w) : Math.max(niceRound(lo0 + w, true), q.a);
      const f = v => q.tolAbs ? String(v) : fmt(v);
      const item = {t: 'num', cat: q.cat, q: q.q, unit: q.unit, hint: `${f(lo)} ile ${f(hi)} ${q.unit} arasında`};
      if (q.tolAbs) item.tolAbs = q.tolAbs;
      pub.push(item); keys.push(q.a);
    }
  }
  return {pub, keys};
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
    const {pub, keys} = buildGame(R.count || 10);
    await set(ref(db, 'keys/' + S.code), {a: keys});
    S.keys = {a: keys};
    const scores = {}; Object.keys(R.players || {}).forEach(id => { scores[id] = 0; });
    await update(roomRef(), {status: 'countdown', countAt: serverTimestamp(), questions: pub, qi: -1, qk: '-1',
      qStartAt: null, qDur: null, answers: null, reveal: null, jokers: null, scores});
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
        if (J[id] && J[id].double === qi) g *= 2;
      }
    }
    gains[id] = g; up['scores/' + id] = ((R.scores && R.scores[id]) || 0) + g;
  }
  up['reveal/' + qi] = {a, gains};
  await update(roomRef(), up);
}

function hostStep() {
  const R = S.R;
  if (!R || !isHost() || S.hostBusy) return;
  const n = now();
  if (R.status === 'countdown' && typeof R.countAt === 'number' && n >= R.countAt + 3200) doHost(nextQ);
  else if (R.status === 'question' && typeof R.qStartAt === 'number') {
    const qi = R.qi, A = ansOf(R, qi);
    const online = players(R).filter(p => p.online !== false);
    const answered = online.filter(p => A[p.id]).length;
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
      countAt: null, answers: null, reveal: null, jokers: null, scores: null});
  } catch (e) { console.error(e); toast('Yeni oyun başlatılamadı'); }
  S.busy = false;
}

/* ================= oyuncu eylemleri ================= */
async function answer(v) {
  const R = S.R; if (!R || R.status !== 'question' || !S.q || S.q.sent != null || remaining() <= 0) return;
  S.q.sent = v; buzz(30); render();
  try { await set(ref(db, `rooms/${S.code}/answers/${R.qi}/${uid()}`), {v, t: serverTimestamp()}); }
  catch (e) { console.error(e); S.q.sent = null; render(); toast('Cevap gönderilemedi, süre dolmuş olabilir'); }
}

async function useJoker(key) {
  const R = S.R; if (!R || R.status !== 'question' || myJ(key) != null || (S.q && S.q.sent != null)) return;
  if (key === 'freeze') S.q.frozenUntil = now() + 8000;
  buzz(20);
  try {
    await set(ref(db, `rooms/${S.code}/jokers/${uid()}/${key}`), R.qi);
    if (key === 'double') toast('Çifte puan açık: bu soruda puanın ikiye katlanacak');
    if (key === 'freeze') toast('Süre 8 saniyeliğine donduruldu');
  } catch (e) { console.error(e); if (key === 'freeze') S.q.frozenUntil = 0; toast('Joker kullanılamadı'); }
  render();
}

/* ================= ekran açık kalsın ================= */
async function wakeOn() { try { if ('wakeLock' in navigator && !S.wake) S.wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
function wakeOff() { try { S.wake && S.wake.release(); } catch (e) {} S.wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.code) { S.wake = null; wakeOn(); markOnline(); } });

/* ================= olaylar ================= */
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-go]'); if (!el || el.disabled) return;
  if (el.dataset.go) { go(el.dataset.go); return; }
  const a = el.dataset.act;
  if (a === 'login') login();
  else if (a === 'openprofile') { S.pick = S.me.av; S.draft = S.me.name; S.firstProfile = false; go('profile'); }
  else if (a === 'av') { const nm = document.getElementById('pnm'); if (nm) S.draft = nm.value; S.pick = +el.dataset.i; buzz(15); render(); }
  else if (a === 'saveprof') saveProfile();
  else if (a === 'logout') { if (confirm('Çıkış yapmak istiyor musun?')) { leaveLocal(); signOut(auth); } }
  else if (a === 'soon') toast(el.dataset.n + ' çok yakında');
  else if (a === 'create') createRoom();
  else if (a === 'joincode') joinRoom((document.getElementById('code').value || '').replace(/\D/g, ''));
  else if (a === 'share') shareCode();
  else if (a === 'leave') leaveRoom();
  else if (a === 'count') update(roomRef(), {count: +el.dataset.n}).catch(() => toast('Değiştirilemedi'));
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
  else if (a === 'report') toast('Teşekkürler! Bildirim özelliği yakında yönetici paneline bağlanacak.');
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
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
