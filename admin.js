import { firebaseConfig, APP_NAME } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const fb = initializeApp(firebaseConfig, 'admin');
const auth = getAuth(fb);
const db = getDatabase(fb);
const app = document.getElementById('app');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Math.round(n || 0).toLocaleString('tr-TR');
const dt = t => t ? new Date(t).toLocaleString('tr-TR', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'}) : '–';
const ago = t => {
  if (!t) return 'hiç';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'şimdi'; if (m < 60) return m + ' dk önce';
  const h = Math.floor(m / 60); if (h < 24) return h + ' sa önce';
  return Math.floor(h / 24) + ' gün önce';
};
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
const dayIdx = () => Math.floor((Date.now() + 10800000) / 86400000);
function periods() {
  const d = dayIdx(), w = Math.floor((d + 3) / 7);
  const x = new Date(Date.now() + 10800000), m = x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0');
  return {d: 'd' + d, w: 'w' + w, m: 'm' + m};
}

const S = {user: null, role: null, tab: 'sum', users: {}, bans: {}, reports: {}, rooms: {}, admins: {}, ann: null, lb: {}, lbTab: 'd', q: '', open: null, subs: []};

/* ---------------- veri ---------------- */
function watch(path, key) {
  S.subs.push(onValue(ref(db, path), sn => { S[key] = sn.val() || {}; render(); }, err => console.error(path, err)));
}
function startData() {
  watch('users', 'users'); watch('bans', 'bans'); watch('reports', 'reports');
  watch('rooms', 'rooms'); watch('admins', 'admins');
  S.subs.push(onValue(ref(db, 'announce'), sn => { S.ann = sn.val(); render(); }));
  loadLb();
}
function stopData() { S.subs.forEach(u => u()); S.subs = []; }
async function loadLb() {
  const P = periods(), out = {};
  for (const k of Object.keys(P)) { try { out[k] = (await get(ref(db, 'lb/' + P[k]))).val() || {}; } catch (e) { out[k] = {}; } }
  S.lb = out; render();
}

/* ---------------- ekranlar ---------------- */
const TABS = {sum: 'Özet', users: 'Üyeler', rep: 'Bildirimler', lb: 'Liderlik', rooms: 'Odalar', ann: 'Duyuru', adm: 'Yöneticiler'};

function vLogin() {
  return `<div class="wrap narrow">
    <h1>${esc(APP_NAME)} <span>Yönetim</span></h1>
    <form class="card stack" id="lf">
      <label>E-posta<input class="field" id="em" type="email" autocomplete="username" required></label>
      <label>Şifre<input class="field" id="pw" type="password" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit">Giriş yap</button>
    </form>
    <p class="muted small">Bu sayfa sadece yöneticiler içindir.</p>
  </div>`;
}

function vNotAdmin() {
  return `<div class="wrap narrow">
    <h1>${esc(APP_NAME)} <span>Yönetim</span></h1>
    <div class="card stack">
      <b>Bu hesap henüz yönetici değil</b>
      <p class="small">İlk kurulum için bu hesabın kimliğini (UID) Firebase'de yönetici olarak bir kez eklemen gerekiyor:</p>
      <div class="uid"><code>${esc(S.user.uid)}</code><button class="btn" data-act="copyuid">Kopyala</button></div>
      <ol class="small">
        <li>Firebase'de <b>Realtime Database → Data</b> sekmesini aç.</li>
        <li>En üstteki satırın yanındaki <b>+</b> işaretine bas.</li>
        <li>Key: <code>admins</code> yaz, değeri boş bırakıp yanındaki <b>+</b> ile alt satır ekle.</li>
        <li>Alt satırda Key: yukarıdaki UID, Value: <code>super</code> yaz ve <b>Add</b> de.</li>
        <li>Bu sayfayı yenile.</li>
      </ol>
    </div>
    <button class="btn ghost" data-act="logout">Çıkış yap</button>
  </div>`;
}

function stat(label, val, sub) { return `<div class="stat"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`; }

function vSum() {
  const us = Object.values(S.users), today = dayIdx(), week = Date.now() - 7 * 864e5;
  const activeToday = us.filter(u => u.seen && Math.floor((u.seen + 10800000) / 864e5) === today).length;
  const newWeek = us.filter(u => (u.createdAt || 0) > week).length;
  const gamesToday = Object.values(S.lb.d || {}).reduce((a, r) => a + (r.g || 0), 0);
  const rooms = Object.values(S.rooms).filter(r => r && r.status && r.status !== 'final').length;
  const nrep = Object.keys(S.reports).length;
  return `<div class="stats">
      ${stat('Toplam üye', fmt(us.length))}
      ${stat('Bugün aktif', fmt(activeToday))}
      ${stat('Son 7 günde katılan', fmt(newWeek))}
      ${stat('Bugün oynanan', fmt(gamesToday), 'oyuncu-oyun, antrenman hariç')}
      ${stat('Açık oda', fmt(rooms))}
      ${stat('Bekleyen bildirim', fmt(nrep), nrep ? '<a data-tab="rep">İncele →</a>' : '')}
    </div>
    <div class="card stack" style="margin-top:14px">
      <b>Bu ayın liderleri</b>
      ${lbRows('m', 5, false) || '<p class="muted small">Henüz puan yok.</p>'}
    </div>`;
}

function vUsers() {
  const q = S.q.trim().toLocaleLowerCase('tr-TR');
  const list = Object.entries(S.users).map(([id, u]) => Object.assign({id}, u))
    .filter(u => !q || (u.name || '').toLocaleLowerCase('tr-TR').includes(q) || (u.email || '').toLowerCase().includes(q))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return `<input class="field" id="search" placeholder="Ad veya e-posta ara" value="${esc(S.q)}">
    <p class="muted small">${list.length} üye</p>
    <div class="list">${list.map(u => {
      const banned = !!S.bans[u.id], adm = S.admins[u.id];
      return `<button class="row item" data-act="user" data-id="${u.id}">
        <div class="grow"><b>${esc(u.name || '(adsız)')}</b> ${adm ? `<span class="tag">${adm === 'super' ? 'süper yönetici' : 'yönetici'}</span>` : ''}${banned ? '<span class="tag bad">askıda</span>' : ''}
          <div class="small muted">${esc(u.email || 'e-posta bilinmiyor')}</div></div>
        <div class="right small muted">🪙 ${fmt(u.wallet && u.wallet.coins)}<br>${ago(u.seen)}</div>
      </button>`;
    }).join('')}</div>`;
}

function vUser(id) {
  const u = S.users[id] || {}, ban = S.bans[id], P = periods();
  const lbm = (S.lb.m || {})[id];
  const owned = Object.keys(u.owned || {});
  return `<div class="sheet"><div class="card stack">
    <div class="row between"><b style="font-size:1.2rem">${esc(u.name || '(adsız)')}</b><button class="btn ghost" data-act="close">Kapat</button></div>
    <dl>
      <dt>E-posta</dt><dd>${esc(u.email || '–')}</dd>
      <dt>Üyelik</dt><dd>${dt(u.createdAt)}</dd>
      <dt>Son görülme</dt><dd>${dt(u.seen)} (${ago(u.seen)})</dd>
      <dt>Jeton</dt><dd>${fmt(u.wallet && u.wallet.coins)} · seri ${u.wallet && u.wallet.streak || 0} gün · koruyucu ${u.wallet && u.wallet.shield || 0}</dd>
      <dt>Bu ay</dt><dd>${lbm ? `${fmt(lbm.s)} puan · ${lbm.g} oyun` : 'puan yok'}</dd>
      <dt>Satın aldıkları</dt><dd>${owned.length ? esc(owned.join(', ')) : '–'}</dd>
      <dt>UID</dt><dd><code>${esc(id)}</code></dd>
    </dl>
    ${ban ? `<div class="warn">Askıda · ${dt(ban.t)}${ban.why ? ' · ' + esc(ban.why) : ''}</div>
      <button class="btn" data-act="unban" data-id="${id}">Askıyı kaldır</button>`
    : S.admins[id] === 'super' ? '' : `<button class="btn danger" data-act="ban" data-id="${id}">Hesabı askıya al</button>`}
  </div></div>`;
}

function vReports() {
  const list = Object.entries(S.reports).map(([id, r]) => Object.assign({id}, r)).sort((a, b) => (b.t || 0) - (a.t || 0));
  if (!list.length) return '<div class="card"><b>Bekleyen bildirim yok</b><p class="muted small">Oyuncular "Bu soruda hata var" dediğinde burada görünür.</p></div>';
  return `<p class="muted small">Soruları düzeltmek için bildirimi kopyalayıp Claude'a gönderebilirsin; düzeltilince "Çözüldü" de.</p>
    <div class="list">${list.map(r => `<div class="card stack rep">
      <div class="row between"><span class="tag">${esc(r.cat || 'Kategori yok')}</span><span class="small muted">${dt(r.t)}</span></div>
      <b>${esc(r.q)}</b>
      ${r.opts ? `<div class="small muted">Şıklar: ${esc(r.opts)}</div>` : ''}
      <div class="small">Kayıtlı doğru cevap: <b>${esc(r.ans || '–')}</b></div>
      ${r.note ? `<div class="note">“${esc(r.note)}”</div>` : ''}
      <div class="small muted">Bildiren: ${esc(r.name || '')}</div>
      <div class="row gap"><button class="btn" data-act="copyrep" data-id="${r.id}">Kopyala</button><button class="btn primary" data-act="resolve" data-id="${r.id}">Çözüldü</button></div>
    </div>`).join('')}</div>`;
}

function lbRows(k, limit, actions) {
  const rows = Object.entries(S.lb[k] || {}).map(([id, r]) => Object.assign({id}, r)).sort((a, b) => b.s - a.s).slice(0, limit);
  return rows.map((r, i) => `<div class="row item"><span class="n">${i + 1}</span><div class="grow"><b>${esc(r.n)}</b><div class="small muted">${r.g} oyun</div></div>
    <b>${fmt(r.s)}</b>${actions ? `<button class="btn ghost danger-t" data-act="lbdel" data-id="${r.id}" aria-label="Sil">Sil</button>` : ''}</div>`).join('');
}
function vLb() {
  const L = {d: 'Günlük', w: 'Haftalık', m: 'Aylık'};
  return `<div class="seg">${Object.keys(L).map(k => `<button class="${S.lbTab === k ? 'on' : ''}" data-act="lbtab" data-t="${k}">${L[k]}</button>`).join('')}</div>
    <div class="list">${lbRows(S.lbTab, 100, true) || '<p class="muted small">Bu dönemde puan yok.</p>'}</div>
    <div class="row gap" style="margin-top:12px"><button class="btn" data-act="lbreload">Yenile</button><button class="btn danger" data-act="lbreset">Bu dönemi sıfırla</button></div>
    <p class="muted small">Şüpheli bir skoru silmek o oyuncunun bu dönemdeki toplamını kaldırır.</p>`;
}

function vRooms() {
  const st = {lobby: 'Bekliyor', countdown: 'Başlıyor', question: 'Oyunda', reveal: 'Oyunda', final: 'Bitti'};
  const list = Object.entries(S.rooms).map(([id, r]) => Object.assign({id}, r)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!list.length) return '<div class="card"><b>Şu an açık oda yok</b></div>';
  return `<div class="list">${list.map(r => {
    const ps = Object.values(r.players || {}), on = ps.filter(p => p.online !== false).length;
    const host = (r.players || {})[r.host];
    return `<div class="card stack">
      <div class="row between"><b>${esc(r.id)}</b><span class="tag">${r.quick ? 'Hızlı oyun' : 'Özel oda'} · ${st[r.status] || r.status}</span></div>
      <div class="small muted">Sahibi: ${esc(host ? host.name : '?')} · ${on}/${ps.length} çevrimiçi · ${ago(r.createdAt)}${r.status === 'question' || r.status === 'reveal' ? ` · soru ${(r.qi || 0) + 1}/${(r.questions || []).length}` : ''}</div>
      <div class="small">${ps.map(p => esc(p.name)).join(', ')}</div>
      <div><button class="btn danger" data-act="closeroom" data-id="${r.id}">Odayı kapat</button></div>
    </div>`;
  }).join('')}</div>`;
}

function vAnn() {
  const A = S.ann;
  return `<div class="card stack">
    <b>Duyuru</b>
    <p class="small muted">Uygulamayı açan herkes ana ekranda görür; kapatana kadar kalır.</p>
    <textarea class="field" id="anntext" maxlength="300" rows="3" placeholder="Örn. Cuma akşamı 21:00'de büyük turnuva!">${esc(A && A.text || '')}</textarea>
    <div class="row gap"><button class="btn primary" data-act="annpub">Yayınla</button>${A ? '<button class="btn danger" data-act="anndel">Kaldır</button>' : ''}</div>
    ${A ? `<p class="small muted">Yayında · ${dt(A.t)}</p>` : '<p class="small muted">Şu an yayında duyuru yok.</p>'}
  </div>`;
}

function vAdmins() {
  if (S.role !== 'super') return '<div class="card"><p class="small">Yönetici atamayı sadece süper yönetici yapabilir.</p></div>';
  const list = Object.entries(S.admins);
  return `<div class="list">${list.map(([id, role]) => {
    const u = S.users[id] || {};
    return `<div class="row item"><div class="grow"><b>${esc(u.name || (id === S.user.uid ? 'Sen' : id.slice(0, 8)))}</b><div class="small muted">${esc(u.email || '')} · ${role === 'super' ? 'süper yönetici' : 'yönetici'}</div></div>
      ${role !== 'super' ? `<button class="btn ghost danger-t" data-act="admdel" data-id="${id}">Kaldır</button>` : ''}</div>`;
  }).join('')}</div>
  <div class="card stack" style="margin-top:12px">
    <b>Yönetici ekle</b>
    <p class="small muted">Kişi uygulamaya en az bir kez giriş yapmış olmalı. Yöneticiler soruları, odaları ve üyeleri yönetebilir ama yeni yönetici atayamaz.</p>
    <input class="field" id="admemail" type="email" placeholder="Üyenin e-postası">
    <button class="btn primary" data-act="admadd">Ekle</button>
  </div>`;
}

function render() {
  if (!S.user) { app.innerHTML = vLogin(); return; }
  if (!S.role) { app.innerHTML = vNotAdmin(); return; }
  const keep = document.activeElement && document.activeElement.id;
  const body = {sum: vSum, users: vUsers, rep: vReports, lb: vLb, rooms: vRooms, ann: vAnn, adm: vAdmins}[S.tab]();
  const nrep = Object.keys(S.reports).length;
  app.innerHTML = `<div class="wrap">
    <header class="row between"><h1>${esc(APP_NAME)} <span>Yönetim</span></h1><button class="btn ghost" data-act="logout">Çıkış</button></header>
    <nav class="tabs">${Object.keys(TABS).filter(k => k !== 'adm' || S.role === 'super').map(k =>
      `<button class="${S.tab === k ? 'on' : ''}" data-tab="${k}">${TABS[k]}${k === 'rep' && nrep ? ` <i>${nrep}</i>` : ''}</button>`).join('')}</nav>
    <main>${body}</main>
    ${S.open ? vUser(S.open) : ''}
  </div>`;
  if (keep === 'search') { const i = document.getElementById('search'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}

/* ---------------- olaylar ---------------- */
app.addEventListener('submit', async e => {
  if (e.target.id !== 'lf') return; e.preventDefault();
  const em = document.getElementById('em').value.trim(), pw = document.getElementById('pw').value;
  try { await signInWithEmailAndPassword(auth, em, pw); }
  catch (err) { toast(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(err.code) ? 'E-posta veya şifre hatalı' : 'Giriş yapılamadı (' + err.code + ')'); }
});
app.addEventListener('input', e => { if (e.target.id === 'search') { S.q = e.target.value; render(); } });
app.addEventListener('click', async e => {
  if (e.target.classList && e.target.classList.contains('sheet')) { S.open = null; render(); return; }
  const el = e.target.closest('[data-act],[data-tab]'); if (!el) return;
  if (el.dataset.tab) { S.tab = el.dataset.tab; S.open = null; render(); window.scrollTo(0, 0); if (S.tab === 'lb' || S.tab === 'sum') loadLb(); return; }
  const a = el.dataset.act, id = el.dataset.id;
  try {
    if (a === 'logout') { stopData(); await signOut(auth); }
    else if (a === 'copyuid') { await navigator.clipboard.writeText(S.user.uid); toast('Kopyalandı'); }
    else if (a === 'user') { S.open = id; render(); }
    else if (a === 'close') { S.open = null; render(); }
    else if (a === 'ban') {
      const why = prompt('Askıya alma sebebi (oyuncu görecek, isteğe bağlı):', ''); if (why === null) return;
      await set(ref(db, 'bans/' + id), {t: serverTimestamp(), by: S.user.uid, why: why.trim().slice(0, 200)}); toast('Hesap askıya alındı');
    }
    else if (a === 'unban') { await remove(ref(db, 'bans/' + id)); toast('Askı kaldırıldı'); }
    else if (a === 'copyrep') {
      const r = S.reports[id];
      const txt = `Hatalı soru bildirimi\nKategori: ${r.cat}\nSoru: ${r.q}\n${r.opts ? 'Şıklar: ' + r.opts + '\n' : ''}Kayıtlı doğru cevap: ${r.ans}\nNot: ${r.note || '-'}`;
      await navigator.clipboard.writeText(txt); toast('Kopyalandı');
    }
    else if (a === 'resolve') { await remove(ref(db, 'reports/' + id)); toast('Bildirim kapatıldı'); }
    else if (a === 'lbtab') { S.lbTab = el.dataset.t; render(); }
    else if (a === 'lbreload') loadLb();
    else if (a === 'lbdel') {
      const r = (S.lb[S.lbTab] || {})[id]; if (!confirm(`${r ? r.n : ''} adlı oyuncunun bu dönemdeki puanı silinsin mi?`)) return;
      await remove(ref(db, `lb/${periods()[S.lbTab]}/${id}`)); toast('Silindi'); loadLb();
    }
    else if (a === 'lbreset') {
      if (!confirm('Bu dönemin tüm tablosu silinecek. Emin misin?')) return;
      await remove(ref(db, 'lb/' + periods()[S.lbTab])); toast('Dönem sıfırlandı'); loadLb();
    }
    else if (a === 'closeroom') { if (!confirm(id + ' kodlu oda kapatılsın mı? İçindekiler ana menüye döner.')) return; await remove(ref(db, 'rooms/' + id)); toast('Oda kapatıldı'); }
    else if (a === 'annpub') {
      const text = document.getElementById('anntext').value.trim(); if (!text) { toast('Bir metin yaz'); return; }
      await set(ref(db, 'announce'), {text, t: serverTimestamp()}); toast('Duyuru yayında');
    }
    else if (a === 'anndel') { await remove(ref(db, 'announce')); toast('Duyuru kaldırıldı'); }
    else if (a === 'admadd') {
      const em = document.getElementById('admemail').value.trim().toLowerCase(); if (!em) return;
      const hit = Object.entries(S.users).find(([, u]) => (u.email || '').toLowerCase() === em);
      if (!hit) { toast('Bu e-postayla giriş yapmış bir üye yok'); return; }
      await set(ref(db, 'admins/' + hit[0]), 'admin'); toast(`${hit[1].name} artık yönetici`);
    }
    else if (a === 'admdel') { if (!confirm('Yöneticilik kaldırılsın mı?')) return; await remove(ref(db, 'admins/' + id)); toast('Kaldırıldı'); }
  } catch (err) { console.error(err); toast('İşlem yapılamadı: ' + (err.code || err.message)); }
});

onAuthStateChanged(auth, async u => {
  stopData(); S.user = u; S.role = null; S.open = null;
  if (u) {
    try { S.role = (await get(ref(db, 'admins/' + u.uid))).val(); } catch (e) { S.role = null; }
    if (S.role) startData();
  }
  render();
});
render();
