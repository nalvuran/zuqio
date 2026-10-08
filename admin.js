import { firebaseConfig, APP_NAME } from './firebase-config.js';
import { QUESTIONS } from './questions.js';
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

const S = {user: null, role: null, tab: 'sum', users: {}, bans: {}, reports: {}, quizzes: {}, pool: {}, fix: {}, edit: null, poolTab: 'b', prizeM: 'cur', prizeRows: null, prizes: {}, pq: '', pcat: '', rooms: {}, admins: {}, ann: null, lb: {}, lbTab: 'd', q: '', open: null, subs: []};

/* ---------------- veri ---------------- */
function watch(path, key) {
  S.subs.push(onValue(ref(db, path), sn => { S[key] = sn.val() || {}; render(); }, err => console.error(path, err)));
}
function startData() {
  watch('users', 'users'); watch('bans', 'bans'); watch('reports', 'reports');
  watch('rooms', 'rooms'); watch('admins', 'admins'); watch('quizzes', 'quizzes'); watch('approvedQs', 'pool'); watch('qfix', 'fix'); watch('prizes', 'prizes');
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
const TABS = {sum: 'Özet', apr: 'Onay', users: 'Üyeler', rep: 'Bildirimler', pool: 'Havuz', lb: 'Liderlik', rooms: 'Odalar', prize: 'Ödül', ann: 'Duyuru', adm: 'Yöneticiler'};

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

function qidOf(q) { let h = 0; const t = q.q + '|' + (q.t === 'mc' ? q.o[0] : q.a); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function findQ(r) {
  const all = [...QUESTIONS, ...Object.values(S.pool)];
  const q = (r.qk && all.find(x => qidOf(x) === r.qk)) || all.find(x => x.q === r.q || (r.q.length >= 400 && x.q.startsWith(r.q)));
  return q ? {q, key: qidOf(q)} : null;
}
function vEdit() {
  const E = S.edit, q = E.q, f = E.f;
  return `<div class="sheet"><div class="card stack">
    <div class="row between"><b>Soruyu düzenle</b><button class="btn ghost" data-act="editclose">Vazgeç</button></div>
    <div class="small muted">${esc(q.cat || '')} · ${q.t === 'num' ? 'Tahmin sorusu' : 'İlk şık doğru cevaptır'}</div>
    <textarea class="field" rows="3" data-e="q">${esc(f.q)}</textarea>
    ${q.t === 'num'
      ? `<div class="row"><input class="field" data-e="a" value="${esc(f.a)}" inputmode="decimal"><input class="field" data-e="unit" value="${esc(f.unit)}"></div>`
      : f.o.map((o, k) => `<input class="field ${k === 0 ? 'ok' : ''}" data-e="o${k}" value="${esc(o)}" placeholder="${k === 0 ? 'Doğru cevap' : 'Yanlış şık'}">`).join('')}
    <div class="row gap"><button class="btn primary" data-act="editsave">Kaydet</button></div>
    <p class="muted small">Kaydedince oyuncularda bir sonraki açılışta düzelmiş hâliyle çıkar.</p>
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
      <div class="row gap"><button class="btn" data-act="repedit" data-id="${r.id}">Düzenle</button><button class="btn danger" data-act="repdel" data-id="${r.id}">Havuzdan kaldır</button></div>
    </div>`).join('')}</div>`;
}

const DL = {k: 'Kolay', o: 'Orta', z: 'Zor'};
function vApprove() {
  const list = Object.entries(S.quizzes).map(([id, q]) => Object.assign({id}, q)).filter(q => q.status === 'pending').sort((a, b) => (a.t || 0) - (b.t || 0));
  if (!list.length) return '<div class="card"><b>Onay bekleyen Zuqio yok</b><p class="muted small">Oyuncular "Havuza gönder" dediğinde burada görünür.</p></div>';
  return `<p class="muted small">Soruları düzenleyebilir, istemediklerinin işaretini kaldırabilirsin. Onaylananlar herkesin oyunlarında çıkar.</p>
  <div class="list">${list.map(z => `<div class="card stack" data-qz="${z.id}">
    <div class="row between"><b style="font-size:1.1rem">${esc(z.title)}</b><span class="small muted">${dt(z.t)}</span></div>
    <div class="small muted">${esc(z.name || (S.users[z.owner] || {}).name || '?')} · ${esc(z.cat)} · ${Object.keys(z.qs || {}).length} soru</div>
    <label class="row small" style="flex-direction:row;gap:8px">Zorluk
      <select class="field" data-z="d" style="width:auto;min-height:40px">${Object.keys(DL).map(k => `<option value="${k}" ${k === 'o' ? 'selected' : ''}>${DL[k]}</option>`).join('')}</select></label>
    ${Object.values(z.qs || {}).map((q, i) => `<div class="aq stack" data-i="${i}">
      <label class="row" style="flex-direction:row;gap:8px;font-weight:700"><input type="checkbox" data-z="on" checked> ${i + 1}. ${q.t === 'num' ? 'Tahmin' : 'Çoktan seçmeli'}</label>
      <textarea class="field" data-z="q" rows="2">${esc(q.q)}</textarea>
      ${q.t === 'num' ? `<div class="row"><input class="field" data-z="a" value="${esc(q.a)}"><input class="field" data-z="unit" value="${esc(q.unit)}"></div>`
        : (q.o || []).map((o, k) => `<input class="field ${k === 0 ? 'ok' : ''}" data-z="o${k}" value="${esc(o)}">`).join('')}
    </div>`).join('')}
    <div class="row gap"><button class="btn primary" data-act="approve" data-id="${z.id}">Onayla</button><button class="btn danger" data-act="reject" data-id="${z.id}">Reddet</button></div>
  </div>`).join('')}</div>`;
}
const monthKey = off => { const x = new Date(Date.now() + 10800000); x.setUTCMonth(x.getUTCMonth() + off, 1); return 'm' + x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0'); };
const curPrizeKey = () => monthKey(S.prizeM === 'prev' ? -1 : 0);
async function loadPrize() {
  S.prizeRows = null; render();
  try { const v = (await get(ref(db, 'lbp/' + curPrizeKey()))).val() || {}; S.prizeRows = Object.entries(v).map(([id, r]) => Object.assign({id}, r)).sort((x, y) => y.s - x.s).slice(0, 15); }
  catch (e) { console.error(e); S.prizeRows = []; }
  render();
}
function vPrize() {
  const k = curPrizeKey(), pz = S.prizes[k], rows = S.prizeRows;
  const mail = (p) => { const u = S.users[p.uid] || {}; return u.email || ''; };
  const win = pz ? `<div class="card stack"><b>Kazanan: ${esc(pz.name)} ${pz.sent ? '<span class="tag">Gönderildi</span>' : '<span class="tag bad">Gönderilmedi</span>'}</b>
      <div class="small muted">${esc(mail(pz) || 'e-posta bulunamadı')} · ${fmt(pz.s)} puan · ${fmt(pz.g)} oyun</div>
      <div class="row gap">${mail(pz) ? `<a class="btn" href="mailto:${encodeURIComponent(mail(pz))}?subject=${encodeURIComponent('Zuqio aylık ödülün: kitap hediyesi 🎉')}&body=${encodeURIComponent('Merhaba ' + pz.name + ',\n\nZuqio’da geçen ayın ödül yarışında 1. oldun, tebrikler! “100 İlginç Bilgi” kitabının PDF’i ekte.\n\nKeyifli okumalar,\nZuqio')}" style="display:inline-flex;align-items:center;text-decoration:none;color:inherit">E-posta yaz</a>` : ''}
      <button class="btn primary" data-act="prsent" data-id="${k}">${pz.sent ? 'Gönderilmedi yap' : 'Gönderildi'}</button><button class="btn danger" data-act="prclear" data-id="${k}">Kazananı kaldır</button></div></div>` : '';
  return `<div class="seg" style="grid-template-columns:repeat(2,1fr)">${[['cur', 'Bu ay'], ['prev', 'Geçen ay']].map(([m, l]) => `<button class="${S.prizeM === m ? 'on' : ''}" data-act="przm" data-t="${m}">${l}</button>`).join('')}</div>
    <p class="muted small">Ödül yarışı: en az 3 gerçek oyunculu odalar, günlük 5.000 puan sınırı. Kazananı kesinleştirmeden önce oyun sayısına ve puanın makul olup olmadığına bak; şüpheli satırı silebilirsin.</p>
    ${win}
    ${rows == null ? '<p class="muted small">Yükleniyor…</p>' : !rows.length ? '<div class="card"><b>Bu ay henüz puan yok</b></div>' : `<div class="list">${rows.map((r, i) => `<div class="row item"><span class="n">${i + 1}</span>
      <div class="grow"><b>${esc(r.n)}</b><div class="small muted">${esc((S.users[r.id] || {}).email || '')} · ${r.g} oyun</div></div><b>${fmt(r.s)}</b>
      <button class="btn ghost" data-act="prwin" data-id="${r.id}">Kazanan yap</button><button class="btn ghost danger-t" data-act="prdel" data-id="${r.id}">Sil</button></div>`).join('')}</div>`}`;
}
function vFixes() {
  const l = Object.entries(S.fix).map(([id, f]) => Object.assign({id}, f)).sort((x, y) => (y.at || 0) - (x.at || 0));
  if (!l.length) return '';
  return `<h3 style="margin:14px 0 6px">Düzeltilen sorular</h3><div class="list">${l.map(f => `<div class="row item"><div class="grow"><b>${esc(f.orig || f.q || f.id)}</b>
    <div class="small muted">${f.del ? 'Havuzdan kaldırıldı' : 'Düzenlendi → ' + esc(f.q || '')}</div></div>
    <button class="btn ghost" data-act="fixundo" data-id="${f.id}">Geri al</button></div>`).join('')}</div>`;
}
function vPool() {
  return `<div class="seg" style="grid-template-columns:repeat(2,1fr)">${[['b', 'Hazır sorular'], ['c', 'Topluluk']].map(([k, l]) => `<button class="${S.poolTab === k ? 'on' : ''}" data-act="pooltab" data-t="${k}">${l}</button>`).join('')}</div>`
    + (S.poolTab === 'b' ? vBuiltin() : vPoolC());
}
function vBuiltin() {
  const cats = [...new Set(QUESTIONS.map(q => q.cat))].sort(), term = S.pq.trim().toLocaleLowerCase('tr');
  let l = QUESTIONS.map(q => ({q, key: qidOf(q)})).filter(x => (!S.pcat || x.q.cat === S.pcat) && (!term || x.q.q.toLocaleLowerCase('tr').includes(term)));
  const total = l.length; l = l.slice(0, 60);
  return `<p class="muted small">${QUESTIONS.length} hazır soru. Ara ya da kategori seç; hatalı olanı düzenle veya kaldır.</p>
    <div class="row gap"><input class="field grow" id="psearch" placeholder="Soruda ara" value="${esc(S.pq)}">
    <select class="field" id="pcat" style="width:auto"><option value="">Tüm kategoriler</option>${cats.map(c => `<option ${c === S.pcat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <p class="muted small">${total} sonuç${total > 60 ? ' · ilk 60 gösteriliyor, aramayı daralt' : ''}</p>
    <div class="list">${l.map(({q, key}) => { const f = S.fix[key], gone = f && f.del;
      return `<div class="item stack" style="gap:6px;${gone ? 'opacity:.55' : ''}"><b>${esc(f && !f.del && f.q ? f.q : q.q)}</b>
      <div class="small muted">${esc(q.cat)} · ${DL[q.d] || ''} · ${q.t === 'num' ? `${esc(String(f && !f.del && f.a != null ? f.a : q.a))} ${esc(q.unit || '')}` : '✓ ' + esc(f && !f.del && f.o ? f.o[0] : q.o[0])}${f ? (f.del ? ' · KALDIRILDI' : ' · düzenlendi') : ''}</div>
      <div class="row gap">${gone ? `<button class="btn" data-act="fixundo" data-id="${key}">Geri al</button>`
        : `<button class="btn" data-act="qedit" data-id="${key}">Düzenle</button><button class="btn danger" data-act="qdel" data-id="${key}">Kaldır</button>`}</div></div>`; }).join('')}</div>`;
}
function vPoolC() {
  const list = Object.entries(S.pool).map(([id, q]) => Object.assign({id}, q)).sort((a, b) => (b.at || 0) - (a.at || 0));
  if (!list.length) return '<div class="card"><b>Havuzda henüz topluluk sorusu yok</b></div>' + vFixes();
  return `<p class="muted small">${list.length} topluluk sorusu havuzda. Uygunsuz ya da hatalı olanı kaldırabilirsin.</p>
  <div class="list">${list.map(q => `<div class="row item"><div class="grow"><b>${esc(q.q)}</b>
    <div class="small muted">${esc(q.cat)} · ${DL[q.d] || ''} · ${q.t === 'num' ? `${q.a} ${esc(q.unit)}` : '✓ ' + esc(q.o[0])} · ${esc(q.byName || '')}</div></div>
    <button class="btn ghost danger-t" data-act="pooldel" data-id="${q.id}">Kaldır</button></div>`).join('')}</div>` + vFixes();
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
  const ae = document.activeElement;
  if (S.edit && ae && ae.matches && ae.matches('input,textarea') && ae.closest('.sheet')) { S.dirty = true; return; }
  if (S.tab === 'apr' && S.user && S.role && ae && ae.matches && ae.matches('input,textarea,select') && ae.closest('[data-qz]')) { S.dirty = true; return; }
  S.dirty = false;
  if (!S.user) { app.innerHTML = vLogin(); return; }
  if (!S.role) { app.innerHTML = vNotAdmin(); return; }
  const keep = document.activeElement && document.activeElement.id;
  const body = {sum: vSum, apr: vApprove, pool: vPool, users: vUsers, rep: vReports, lb: vLb, rooms: vRooms, prize: vPrize, ann: vAnn, adm: vAdmins}[S.tab]();
  const nrep = Object.keys(S.reports).length, npend = Object.values(S.quizzes).filter(q => q.status === 'pending').length;
  app.innerHTML = `<div class="wrap">
    <header class="row between"><h1>${esc(APP_NAME)} <span>Yönetim</span></h1><button class="btn ghost" data-act="logout">Çıkış</button></header>
    <nav class="tabs">${Object.keys(TABS).filter(k => k !== 'adm' || S.role === 'super').map(k =>
      `<button class="${S.tab === k ? 'on' : ''}" data-tab="${k}">${TABS[k]}${k === 'rep' && nrep ? ` <i>${nrep}</i>` : ''}${k === 'apr' && npend ? ` <i>${npend}</i>` : ''}</button>`).join('')}</nav>
    <main>${body}</main>
    ${S.open ? vUser(S.open) : ''}
    ${S.edit ? vEdit() : ''}
  </div>`;
  if (keep === 'psearch') { const i = document.getElementById('psearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  if (keep === 'search') { const i = document.getElementById('search'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}

/* ---------------- olaylar ---------------- */
app.addEventListener('submit', async e => {
  if (e.target.id !== 'lf') return; e.preventDefault();
  const em = document.getElementById('em').value.trim(), pw = document.getElementById('pw').value;
  try { await signInWithEmailAndPassword(auth, em, pw); }
  catch (err) { toast(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(err.code) ? 'E-posta veya şifre hatalı' : 'Giriş yapılamadı (' + err.code + ')'); }
});
app.addEventListener('focusout', () => setTimeout(() => { if (S.dirty) render(); }, 0));
app.addEventListener('input', e => {
  if (e.target.id === 'psearch') { S.pq = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.e && S.edit) { const k = e.target.dataset.e; if (/^o\d$/.test(k)) S.edit.f.o[+k[1]] = e.target.value; else S.edit.f[k] = e.target.value; return; } if (e.target.id === 'search') { S.q = e.target.value; render(); } });
app.addEventListener('change', e => { if (e.target.id === 'pcat') { S.pcat = e.target.value; render(); } });
app.addEventListener('click', async e => {
  if (e.target.classList && e.target.classList.contains('sheet')) { S.open = null; render(); return; }
  const el = e.target.closest('[data-act],[data-tab]'); if (!el) return;
  if (el.dataset.tab) { S.tab = el.dataset.tab; S.open = null; render(); window.scrollTo(0, 0); if (S.tab === 'lb' || S.tab === 'sum') loadLb(); if (S.tab === 'prize') loadPrize(); return; }
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
    else if (a === 'przm') { S.prizeM = el.dataset.t; loadPrize(); return; }
    else if (a === 'prwin') {
      const r = (S.prizeRows || []).find(x => x.id === id), k = curPrizeKey(); if (!r) return;
      if (!confirm(`${r.n} bu ayın kazananı olarak kaydedilsin mi?`)) return;
      await set(ref(db, 'prizes/' + k), {uid: id, name: r.n, av: r.av, fr: r.fr || '', s: r.s, g: r.g, sent: false, at: Date.now()}); toast('Kazanan kaydedildi'); return;
    }
    else if (a === 'prsent') { await update(ref(db, 'prizes/' + id), {sent: !S.prizes[id].sent}); return; }
    else if (a === 'prclear') { if (!confirm('Kazanan kaydı silinsin mi?')) return; await remove(ref(db, 'prizes/' + id)); return; }
    else if (a === 'prdel') { if (!confirm('Bu oyuncunun ödül puanı silinsin mi?')) return; await remove(ref(db, `lbp/${curPrizeKey()}/${id}`)); toast('Silindi'); loadPrize(); return; }
    else if (a === 'pooltab') { S.poolTab = el.dataset.t; render(); return; }
    else if (a === 'qedit' || a === 'qdel') {
      const q = QUESTIONS.find(x => qidOf(x) === id); if (!q) return;
      if (a === 'qdel') {
        if (!confirm('Bu soru havuzdan kaldırılsın mı?\n\n' + q.q)) return;
        await set(ref(db, 'qfix/' + id), {del: true, orig: q.q.slice(0, 200), at: Date.now()}); toast('Soru kaldırıldı'); return;
      }
      const fx = S.fix[id] && !S.fix[id].del ? S.fix[id] : null, s = fx || q;
      S.edit = {rid: null, key: id, q, f: q.t === 'num' ? {q: s.q, a: String(s.a), unit: s.unit || ''} : {q: s.q, o: (s.o || q.o).slice()}};
      render(); return;
    }
    else if (a === 'repedit') {
      const r = S.reports[id], hit = findQ(r); if (!hit) { toast('Soru havuzda bulunamadı (zaten kaldırılmış olabilir)'); return; }
      const fx = S.fix[hit.key] && !S.fix[hit.key].del ? S.fix[hit.key] : null, q = hit.q;
      S.edit = {rid: id, key: hit.key, q, f: q.t === 'num' ? {q: (fx || q).q, a: String((fx || q).a), unit: (fx || q).unit || ''} : {q: (fx || q).q, o: ((fx || q).o || q.o).slice()}};
      render(); return;
    }
    else if (a === 'editclose') { S.edit = null; render(); return; }
    else if (a === 'editsave') {
      const E = S.edit, f = E.f, q = E.q; let out;
      if (q.t === 'num') { const v = parseFloat(String(f.a).replace(',', '.')); if (!f.q.trim() || !isFinite(v)) { toast('Soru ve sayısal cevap gerekli'); return; } out = {q: f.q.trim(), a: v, unit: (f.unit || '').trim()}; }
      else { const o = f.o.map(x => x.trim()); if (!f.q.trim() || o.some(x => !x)) { toast('Soru ve dört şık da dolu olmalı'); return; } out = {q: f.q.trim(), o}; }
      await set(ref(db, 'qfix/' + E.key), Object.assign(out, {orig: q.q.slice(0, 200), at: Date.now()}));
      if (E.rid) await remove(ref(db, 'reports/' + E.rid));
      S.edit = null; toast('Soru düzeltildi'); render(); return;
    }
    else if (a === 'repdel') {
      const r = S.reports[id], hit = findQ(r); if (!hit) { toast('Soru havuzda bulunamadı (zaten kaldırılmış olabilir)'); return; }
      if (!confirm('Bu soru havuzdan kaldırılsın mı?\n\n' + hit.q.q)) return;
      await set(ref(db, 'qfix/' + hit.key), {del: true, orig: hit.q.q.slice(0, 200), at: Date.now()});
      const pk = Object.keys(S.pool).find(k => qidOf(S.pool[k]) === hit.key); if (pk) await remove(ref(db, 'approvedQs/' + pk));
      await remove(ref(db, 'reports/' + id)); toast('Soru havuzdan kaldırıldı');
    }
    else if (a === 'fixundo') { if (!confirm('Bu düzeltme geri alınsın mı? Soru ilk hâliyle havuza döner.')) return; await remove(ref(db, 'qfix/' + id)); toast('Geri alındı'); }
    else if (a === 'resolve') { await remove(ref(db, 'reports/' + id)); toast('Bildirim kapatıldı'); }
    else if (a === 'approve') {
      const card = app.querySelector(`[data-qz="${id}"]`), z = S.quizzes[id], d = card.querySelector('[data-z="d"]').value;
      const up = {}, src = Object.values(z.qs || {}); let n = 0;
      card.querySelectorAll('.aq').forEach(el => {
        if (!el.querySelector('[data-z="on"]').checked) return;
        const o = src[+el.dataset.i], g = k => { const f = el.querySelector(`[data-z="${k}"]`); return f ? f.value.trim() : ''; };
        const q = o.t === 'num' ? {t: 'num', q: g('q'), a: parseFloat(g('a').replace(',', '.')), unit: g('unit')} : {t: 'mc', q: g('q'), o: [g('o0'), g('o1'), g('o2'), g('o3')]};
        if (!q.q || (q.t === 'num' && !isFinite(q.a)) || (q.t === 'mc' && q.o.some(x => !x))) return;
        Object.assign(q, {cat: z.cat, d, src: id, by: z.owner, byName: z.name || '', at: Date.now()});
        up['approvedQs/' + id + '_' + el.dataset.i] = q; n++;
      });
      if (!n) { toast('En az bir soru seçili olmalı'); return; }
      up[`quizzes/${id}/status`] = 'approved'; up[`quizzes/${id}/t`] = serverTimestamp(); up[`quizzes/${id}/why`] = null;
      await update(ref(db), up); toast(`${n} soru havuza eklendi`);
    }
    else if (a === 'reject') {
      const why = prompt('Ret sebebi (oyuncu görecek):', ''); if (why === null) return;
      await update(ref(db, 'quizzes/' + id), {status: 'rejected', why: why.trim().slice(0, 200) || 'Uygun bulunmadı', t: serverTimestamp()}); toast('Reddedildi');
    }
    else if (a === 'pooldel') { if (!confirm('Bu soru havuzdan kaldırılsın mı?')) return; await remove(ref(db, 'approvedQs/' + id)); toast('Kaldırıldı'); }
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
