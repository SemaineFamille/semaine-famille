/* =========================================================
   APP FAMILIALE - BLOC 1/3
   Base + navigation + API + Présences + Menu
   Version optimisée
========================================================= */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOJEus1Fev5I4YZsSbjpIXXlgGJBY7QmFkkqZtkXYD6eEPwqmgCl8r2hfrO1X9eyqxSA/exec';
const ADMIN_CODE = '2019';

/* =========================================================
   Cache front / anti-requêtes doublées
========================================================= */
const APP_CACHE = {
  responses: new Map(),
  inflight: new Map(),
  pagesLoaded: {
    present: false,
    menu: false,
    courses: false,
    taches: false,
    job: false,
    admin: false
  },
  presencesLoadedAt: 0,
  presencesTtlMs: 60 * 1000,
  menuLoadedAt: 0,
  menuTtlMs: 60 * 1000,
  badgesPromise: null
};

function buildQueryString(params) {
  return new URLSearchParams(params).toString();
}

function isReadRequest(params) {
  return String(params?.action || '').trim() === 'lire';
}

function clearReadCacheBySheet(sheetName) {
  if (!sheetName) {
    APP_CACHE.responses.clear();
    return;
  }

  const marker = `sheet=${encodeURIComponent(sheetName)}`;
  for (const key of APP_CACHE.responses.keys()) {
    if (key.includes(marker)) {
      APP_CACHE.responses.delete(key);
    }
  }
}

async function apiCall(params) {
  const qs = buildQueryString(params);
  const url = SCRIPT_URL + '?' + qs;
  const readRequest = isReadRequest(params);

  if (readRequest && APP_CACHE.responses.has(url)) {
    return APP_CACHE.responses.get(url);
  }

  if (APP_CACHE.inflight.has(url)) {
    return APP_CACHE.inflight.get(url);
  }

  const p = fetch(url, { method: 'GET' })
    .then(r => r.text())
    .then(text => {
      if (readRequest) {
        APP_CACHE.responses.set(url, text);
      } else {
        const sheet = params?.sheet || '';
        clearReadCacheBySheet(sheet);

        if (sheet === 'PRESENCES') {
          APP_CACHE.pagesLoaded.present = false;
          APP_CACHE.pagesLoaded.menu = false;   // le menu affiche aussi les présences
          APP_CACHE.presencesLoadedAt = 0;
        }

        if (sheet === 'MENU') {
          APP_CACHE.pagesLoaded.menu = false;
          APP_CACHE.menuLoadedAt = 0;
        }

        if (
          sheet === 'TACHES' ||
          sheet === 'TACHES_CONFIG' ||
          sheet === 'TACHES_PONCTUELLES'
        ) {
          APP_CACHE.pagesLoaded.taches = false;
          APP_CACHE.badgesPromise = null;
        }

        if (sheet === 'COURSES') {
          APP_CACHE.pagesLoaded.courses = false;
        }

        if (sheet === 'JOB') {
          APP_CACHE.pagesLoaded.job = false;
        }
      }

      return text;
    })
    .catch(err => {
      console.error(err);
      return '';
    })
    .finally(() => {
      APP_CACHE.inflight.delete(url);
    });

  APP_CACHE.inflight.set(url, p);
  return p;
}

/* =========================================================
   Initialisation
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  hideRollingWeekClearButtons();

  const lastChild = localStorage.getItem('lastChild');
  if (lastChild) {
    openChild(lastChild);
    showScreen('child');
  } else {
    showScreen('home');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/semaine-famille/sw.js').catch(console.error);
  }

  await loadBadges();
});

/* =========================================================
   Helpers date / format
========================================================= */
function rollingDates(days) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const result = [];
  const joursNoms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');

    result.push({
      date: `${d.getFullYear()}-${mm}-${dd}`,
      label: `${joursNoms[d.getDay()]} ${dd}/${mm}`
    });
  }

  return result;
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateYYYYMMDD(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  return s;
}

function dateMinusDays(ymd, days) {
  const d = new Date(ymd + 'T00:00:00');
  d.setDate(d.getDate() - days);
  return formatDateYYYYMMDD(d);
}

function getJourFromYMD(ymd) {
  const d = new Date(ymd + 'T00:00:00');
  const idx = (d.getDay() === 0) ? 6 : d.getDay() - 1;
  return { jour: JOURS[idx], jourIdx: idx };
}

function parseLines(text) {
  if (!text || text.trim() === '' || text.trim() === 'ok') return [];
  return text.split('~~~~').map(l => l.trim()).filter(Boolean);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeJsString(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}


/* =========================================================
   Constantes globales
========================================================= */
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABEL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const JOURS_COURTS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MEMBRES = ['alessia', 'antonin', 'clement', 'diego', 'jeremie', 'melanie', 'yann'];
const MEMBRES_LABEL = ['Alessia', 'Antonin', 'Clément', 'Diego', 'Jérémie', 'Mélanie', 'Yann'];
const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];


const TACHES_RECURRENTES = [
  { personne: 'Alessia', tache: 'Défaire ton lit', icon: '🛏️', dateDebut: '2026-06-05', frequence: 4 },
  { personne: 'Diego', tache: 'Défaire ton lit', icon: '🛏️', dateDebut: '2026-06-05', frequence: 4 },
  { personne: 'Clément', tache: 'Défaire ton lit', icon: '🛏️', dateDebut: '2026-05-29', frequence: 3 },
  { personne: 'Antonin', tache: 'Défaire ton lit', icon: '🛏️', dateDebut: '2026-05-29', frequence: 3 },
  { personne: 'Jérémie', tache: 'Défaire ton lit', icon: '🛏️', dateDebut: '2026-05-29', frequence: 3 },
  { personne: 'Mél & Yann', tache: 'Défaire ton lit', icon: '🛏️', dateDebut: '2026-05-15', frequence: 2 },
  { personne: 'Alessia', tache: 'Monter ta lessive', icon: '👕', dateDebut: '2026-06-04', frequence: 1 },
   { personne: 'Clément', tache: 'Monter ta lessive', icon: '👕', dateDebut: '2026-06-04', frequence: 1 },
   { personne: 'Antonin', tache: 'Mettre ta lessive à la buanderie', icon: '👕', dateDebut: '2026-06-04', frequence: 1 },
   { personne: 'Jérémie', tache: 'Monter ta lessive', icon: '👕', dateDebut: '2026-06-04', frequence: 1 }
];

const TACHES_PARENTS = [
  { label: 'Laver tapis salle de bain', icon: '🛁', type: 'premier_du_mois' },
  { label: 'Laver linges et serviettes', icon: '🧺', type: 'mercredi' },
   { label: 'Sortir le panier de légumes', icon: '🍆', type: 'mardi' }
];

const ANNIVERSAIRES = [
  { nom: 'Alessia', jour: 1, mois: 1 },
  { nom: 'Antonin', jour: 15, mois: 5 },
  { nom: 'Clément', jour: 22, mois: 2 },
  { nom: 'Jérémie', jour: 24, mois: 4 },
  { nom: 'Diego', jour: 9, mois: 10 },
  { nom: 'Yann', jour: 10, mois: 3 },
  { nom: 'Mélanie', jour: 28, mois: 3 }
];

/* =========================================================
   État global
========================================================= */
let currentUser = null;
let isParent = false;

let presencesData = {};
let menuData = {};
let coursesData = {};
let tachesData = [];
let tachesConfig = [];
let tachesPonctuelles = [];
let jobData = {};

let currentListe = 'generale';
let currentAdminEnfant = 'Alessia';

let calYear, calMonth, selectedDay = null;
let pinValue = '';
let deferredPrompt;
let currentPreviewEnfant = 'Alessia';

/* =========================================================
   Helpers UI
========================================================= */
function showScreen(name) {
  const home = document.getElementById('homeScreen');
  const child = document.getElementById('childScreen');

  if (home) home.style.display = (name === 'home' ? 'block' : 'none');
  if (child) child.style.display = (name === 'child' ? 'block' : 'none');
}

function openChild(childNameOrId) {
  const title = document.getElementById('childTitle');
  if (title) title.textContent = childNameOrId;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;

  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function hideRollingWeekClearButtons() {
  document.querySelectorAll('#page-present .btn-secondary, #page-menu .btn-secondary').forEach(btn => {
    btn.style.display = 'none';
  });
}

function normalizeMemberKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function getPresenceAccess() {
  if (isParent) {
    return {
      visible: [...MEMBRES],
      editable: ['melanie', 'yann']
    };
  }

  const me = normalizeMemberKey(currentUser);
  return {
    visible: [me],
    editable: [me]
  };
}

function getPresenceValue(key, member) {
  const hidden = document.getElementById(`presence_${key}_${member}`);
  if (hidden) return hidden.value;

  const cb = document.getElementById(`cb_${key}_${member}`);
  if (cb) return cb.checked ? 'TRUE' : 'FALSE';

  return presencesData?.[key]?.[member] ?? '';
}

function updateTotal(key) {
  const count = MEMBRES.filter(m => getPresenceValue(key, m) === 'TRUE').length;
  const el = document.getElementById(`total_${key}`);
  if (el) {
    el.textContent = `${count} présent${count > 1 ? 's' : ''}`;
  }
}

function parsePresencesText(text) {
  const data = {};

  parseLines(text).forEach(line => {
    const c = line.split('|');
    if (c.length >= 9) {
      const dateKey = parseIsoDate(c[0]);
      const repasKey = String(c[1] || '').trim().toLowerCase();

      data[`${dateKey}_${repasKey}`] = {
        alessia: c[2].trim(),
        antonin: c[3].trim(),
        clement: c[4].trim(),
        diego: c[5].trim(),
        jeremie: c[6].trim(),
        melanie: c[7].trim(),
        yann: c[8].trim()
      };
    }
  });

  return data;
}

function parseMenuText(text) {
  const data = {};

  parseLines(text).forEach(line => {
    const c = line.split('|');
    if (c.length >= 3) {
      const dateKey = parseIsoDate(c[0]);
      const repasKey = String(c[1] || '').trim().toLowerCase();
      data[`${dateKey}_${repasKey}`] = c.slice(2).join('|').trim();
    }
  });

  return data;
}

/* =========================================================
   PWA install
========================================================= */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'block';
});

window.addEventListener('appinstalled', () => {
  showToast('✅ App installée sur votre écran d’accueil !');
  deferredPrompt = null;
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
    });
  }
}

/* =========================================================
   Login / logout / navigation
========================================================= */
function login(user) {
  currentUser = user;
  isParent = (user === 'parent');

  const loginScreen = document.getElementById('loginScreen');
  const mainNav = document.getElementById('mainNav');
  const navUserName = document.getElementById('navUserName');
  const accueilTitle = document.getElementById('accueil-title');
  const jobTab = document.getElementById('jobTab');
  const adminTab = document.getElementById('adminTab');
  const qnav = document.getElementById('quick-nav-grid');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (mainNav) mainNav.style.display = 'block';

  const userName = isParent ? '👨‍👩‍👧‍👦 Parents' : user;
  if (navUserName) navUserName.textContent = userName;
  if (accueilTitle) accueilTitle.textContent = `⭐ Bonjour ${isParent ? '!' : user + ' !'}`;

  if (jobTab) jobTab.style.display = '';
  if (adminTab) adminTab.style.display = isParent ? '' : 'none';

  if (qnav) {
    if (isParent) {
      qnav.innerHTML = `
        <button class="quick-btn" onclick="showPage('present')"><span class="icon">👥</span>Présences</button>
        <button class="quick-btn" onclick="showPage('menu')"><span class="icon">🍽️</span>Menu</button>
        <button class="quick-btn" onclick="showPage('courses')"><span class="icon">🛒</span>Courses</button>
        <button class="quick-btn" onclick="showPage('taches')"><span class="icon">✅</span>Tâches</button>
        <button class="quick-btn" onclick="showPage('job')"><span class="icon">📅</span>Job</button>
        <button class="quick-btn" onclick="location.href='CFF.html'"><span class="icon">🚆</span>CFF</button>
        <button class="quick-btn" onclick="location.href='magicpass.html'"><span class="icon">✨🏔️</span>MAGIC</button>
        <button class="quick-btn" onclick="location.href='VACANCES.html'"><span class="icon">🌴</span>VACANCES</button>
        <button class="quick-btn" onclick="location.href='Agenda.html'"><span class="icon">👀</span>Agenda</button>
        <button class="quick-btn" onclick="requestAdmin()" style="background:linear-gradient(135deg,#FF5722,#FF9800)"><span class="icon">⚙️</span>Admin</button>
      `;
    } else {
      qnav.innerHTML = `
        <button class="quick-btn" onclick="showPage('taches')"><span class="icon">✅</span>Mes tâches</button>
        <button class="quick-btn" onclick="showPage('present')"><span class="icon">👥</span>Présences</button>
        <button class="quick-btn" onclick="showPage('menu')"><span class="icon">🍽️</span>Menu</button>
        <button class="quick-btn" onclick="showPage('courses')"><span class="icon">🛒</span>Courses</button>
        <button class="quick-btn" onclick="showPage('job')"><span class="icon">📅</span>Job</button>
        <button class="quick-btn" onclick="location.href='CFF.html'"><span class="icon">🚆</span>CFF</button>
        <button class="quick-btn" onclick="location.href='magicpass.html'"><span class="icon">✨🏔️</span>MAGIC</button>
        <button class="quick-btn" onclick="location.href='VACANCES.html'"><span class="icon">🌴</span>VACANCES</button>
        <button class="quick-btn" onclick="location.href='Agenda.html'"><span class="icon">👀</span>Agenda</button>
      `;
    }
  }

  if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
    const nav = document.querySelector('.nav');
    if (nav) nav.style.paddingTop = 'env(safe-area-inset-top)';
  }

  hideRollingWeekClearButtons();
  checkCelebrations();
  showPage('accueil');

  if (!isParent) {
    loadTaches();
  }
}

function logout() {
  currentUser = null;
  isParent = false;

  const loginScreen = document.getElementById('loginScreen');
  const mainNav = document.getElementById('mainNav');
  const accueil = document.getElementById('page-accueil');

  if (loginScreen) loginScreen.classList.remove('hidden');
  if (mainNav) mainNav.style.display = 'none';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (accueil) accueil.classList.add('active');

  hideRollingWeekClearButtons();
  loadBadges();
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const el = document.getElementById('page-' + name);
  if (!el) {
    console.log('Page inexistante:', name);
    return;
  }

  el.classList.add('active');

  const order = ['accueil', 'present', 'menu', 'courses', 'taches', 'job', 'admin'];
  const idx = order.indexOf(name);
  const tabs = document.querySelectorAll('.nav-tab');
  if (idx >= 0 && tabs[idx]) {
    tabs[idx].classList.add('active');
  }

  hideRollingWeekClearButtons();

  if (name === 'present') return loadPresences(false);
  if (name === 'menu') return loadMenu(false);
  if (name === 'courses') return loadCourses(currentListe);
  if (name === 'taches') return loadTaches();
  if (name === 'job') return initCal();
  if (name === 'admin') return loadAdminConfig();
}

/* =========================================================
   Présences
========================================================= */
function setPresenceChoice(key, member, value) {
  const hidden = document.getElementById(`presence_${key}_${member}`);
  if (!hidden) return;

  hidden.value = value;

  const btnPresent = document.getElementById(`btn_present_${key}_${member}`);
  const btnAbsent = document.getElementById(`btn_absent_${key}_${member}`);
  const status = document.getElementById(`status_${key}_${member}`);

  if (btnPresent) btnPresent.classList.toggle('active', value === 'TRUE');
  if (btnAbsent) btnAbsent.classList.toggle('active', value === 'FALSE');

  if (status) {
    status.classList.remove('present', 'absent', 'pending');

    if (value === 'TRUE') {
      status.textContent = '✅';
      status.classList.add('present');
    } else if (value === 'FALSE') {
      status.textContent = '❌';
      status.classList.add('absent');
    } else {
      status.textContent = '⏳ Pas encore répondu';
      status.classList.add('pending');
    }
  }

  updateTotal(key);
}

function buildPresencesUI() {
  const { visible, editable } = getPresenceAccess();
  const dates = rollingDates(7);

  let html = '';

  dates.forEach(({ label, date }) => {
    html += `<div class="jour-header">${label}</div>`;

    ['midi', 'soir'].forEach((repas) => {
      const key = `${date}_${repas}`;
      const data = presencesData[key] || {};
      const count = MEMBRES.filter(m => getPresenceValue(key, m) === 'TRUE').length;

      html += `
        <div class="repas-label">
          ${repas.toUpperCase()}
          <span class="total-badge" id="total_${key}">${count} présent${count > 1 ? 's' : ''}</span>
        </div>
        <div class="checkboxes-grid">
      `;

      MEMBRES.forEach((m, mi) => {
        if (!visible.includes(m)) return;

        const canEdit = editable.includes(m);
        const value = (data[m] ?? '').trim();

        if (!isParent && canEdit) {
          html += `
            <div class="presence-choice-wrap">
              <div class="presence-choice-name">${MEMBRES_LABEL[mi]}</div>

              <input type="hidden" id="presence_${key}_${m}" value="${escapeHtml(value)}">

              <div class="presence-choice-buttons">
                <button
                  type="button"
                  class="presence-btn present ${value === 'TRUE' ? 'active' : ''}"
                  id="btn_present_${key}_${m}"
                  onclick="setPresenceChoice('${key}','${m}','TRUE')">
                  ✅
                </button>

                <button
                  type="button"
                  class="presence-btn absent ${value === 'FALSE' ? 'active' : ''}"
                  id="btn_absent_${key}_${m}"
                  onclick="setPresenceChoice('${key}','${m}','FALSE')">
                  ❌
                </button>
              </div>

              <div
                id="status_${key}_${m}"
                class="presence-status ${value === 'TRUE' ? 'present' : value === 'FALSE' ? 'absent' : 'pending'}">
                ${value === 'TRUE' ? '✅' : value === 'FALSE' ? '❌' : '⏳ Pas encore répondu'}
              </div>
            </div>
          `;
        } else {
          let icone = '';
          if (value === 'TRUE') icone = '✅';
          else if (value === 'FALSE') icone = '❌';

          html += `
            <div class="checkbox-item" style="${canEdit ? '' : 'opacity:0.75;'}">
              ${
                canEdit
                  ? `<input
                      type="checkbox"
                      id="cb_${key}_${m}"
                      data-key="${key}"
                      ${value === 'TRUE' ? 'checked' : ''}
                      onchange="updateTotal(this.dataset.key)">`
                  : `<span class="presence-parent-icon">${icone}</span>`
              }
              <span>${MEMBRES_LABEL[mi]}</span>
            </div>
          `;
        }
      });

      html += `</div><div class="divider"></div>`;
    });
  });

  const content = document.getElementById('present-content');
  if (content) content.innerHTML = html;

  hideRollingWeekClearButtons();
}

async function loadPresences(force = false) {
  const loadingEl = document.getElementById('present-loading');
  const contentEl = document.getElementById('present-content');

  if (loadingEl) loadingEl.style.display = 'block';
  if (contentEl) contentEl.style.display = 'none';

  const now = Date.now();
  const start = todayYMD();

  if (
    !force &&
    APP_CACHE.pagesLoaded.present &&
    (now - APP_CACHE.presencesLoadedAt < APP_CACHE.presencesTtlMs)
  ) {
    buildPresencesUI();
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    return;
  }

  const text = await apiCall({ action: 'lire', sheet: 'PRESENCES', start, days: 7 });
  presencesData = parsePresencesText(text);

  APP_CACHE.pagesLoaded.present = true;
  APP_CACHE.presencesLoadedAt = Date.now();

  buildPresencesUI();

  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
}

async function savePresences() {
   showToast('Enregistrement...');

  const { editable } = getPresenceAccess();
  const editableSet = new Set(editable);
  const dates = rollingDates(7);
  const items = [];

  for (const { date } of dates) {
    for (const repas of ['midi', 'soir']) {
      const key = `${date}_${repas}`;

      const row = {
        jour: date,
        repas
      };

      MEMBRES.forEach(m => {
        if (editableSet.has(m)) {
          row[m] = getPresenceValue(key, m);
        } else {
          row[m] = presencesData?.[key]?.[m] ?? '';
        }
      });

      items.push(row);
    }
  }

  const payload = { items };

  await apiCall({
    action: 'enregistrer_batch',
    sheet: 'PRESENCES',
    payload: JSON.stringify(payload)
  });

  APP_CACHE.pagesLoaded.present = false;
  APP_CACHE.presencesLoadedAt = 0;

  await loadPresences(true);
  showToast('✅ Présences enregistrées !');
}


/* on garde la fonction mais elle ne sera plus utilisée par l’UI */
async function clearPresences() {
  return;
}

/* =========================================================
   Menu
========================================================= */
async function loadMenu(force = false) {
  const loadingEl = document.getElementById('menu-loading');
  const contentEl = document.getElementById('menu-content');

  if (loadingEl) loadingEl.style.display = 'block';
  if (contentEl) contentEl.style.display = 'none';

  const now = Date.now();
  const start = todayYMD();

  if (
    !force &&
    APP_CACHE.pagesLoaded.menu &&
    (now - APP_CACHE.menuLoadedAt < APP_CACHE.menuTtlMs)
  ) {
    renderMenuUI();
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    return;
  }

  const [pText, mText] = await Promise.all([
    apiCall({ action: 'lire', sheet: 'PRESENCES', start, days: 7 }),
    apiCall({ action: 'lire', sheet: 'MENU' })
  ]);

  presencesData = parsePresencesText(pText);
  menuData = parseMenuText(mText);

  APP_CACHE.pagesLoaded.menu = true;
  APP_CACHE.menuLoadedAt = Date.now();

  renderMenuUI();

  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
}

function renderMenuUI() {
  const dates = rollingDates(7);
  let html = '';

  dates.forEach(({ label, date }) => {
    html += `
      <div class="menu-jour-card">
        <div class="jour-header" style="margin-bottom:12px">${label}</div>
    `;

    ['midi', 'soir'].forEach(repas => {
      const key = `${date}_${repas}`;
      const count = MEMBRES.filter(m => presencesData[key]?.[m] === 'TRUE').length;
      const val = escapeHtml((menuData[key] || '').replace(/^-$/, '').trim());

      html += `
        <div class="menu-repas-row">
          <span class="menu-repas-label">${repas}</span>
          <input
            type="text"
            class="menu-repas-input"
            id="menu_${key}"
            placeholder="Repas du ${repas}..."
            value="${val}">
          <span class="menu-presences">${count}</span>
        </div>
      `;
    });

    html += `</div>`;
  });

  const content = document.getElementById('menu-content');
  if (content) content.innerHTML = html;

  hideRollingWeekClearButtons();
}

async function saveMenu() {
   showToast('Enregistrement...');

  const dates = rollingDates(7);
  const items = [];

  for (const { date } of dates) {
    for (const repas of ['midi', 'soir']) {
      const plat = document.getElementById(`menu_${date}_${repas}`)?.value?.trim() || '-';

      items.push({
        jour: date,
        repas,
        plat
      });
    }
  }

  const payload = { items };

  await apiCall({
    action: 'enregistrer_batch',
    sheet: 'MENU',
    payload: JSON.stringify(payload)
  });

  APP_CACHE.pagesLoaded.menu = false;
  APP_CACHE.menuLoadedAt = 0;

  await loadMenu(true);
  showToast('✅ Menu enregistré !');
}



/* on garde la fonction mais elle ne sera plus utilisée par l’UI */
async function clearMenu() {
  return;
}

/* =========================================================
   Présences / badges diverses
========================================================= */
function getTodayJour() {
  const d = new Date().getDay();
  return JOURS[d === 0 ? 6 : d - 1];
}

function selectChild(childNameOrId) {
  localStorage.setItem('lastChild', childNameOrId);
  openChild(childNameOrId);
  showScreen('child');
}

function updateBadges(counts) {
  const map = {
    'Alessia': 'badge_alessia',
    'Antonin': 'badge_antonin',
    'Clément': 'badge_clement',
    'Diego': 'badge_diego',
    'Jérémie': 'badge_jeremie',
    'Mél & Yann': 'badge_parents'
  };

  Object.entries(map).forEach(([nom, id]) => {
    const el = document.getElementById(id);
    if (!el) return;

    const n = counts[nom] || 0;
    if (n > 0) {
      el.textContent = n > 9 ? '9+' : String(n);
      el.style.display = 'flex';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
  });
}
/* =========================================================
   APP FAMILIALE - BLOC 2/3
   Courses + Badges + Tâches
========================================================= */

/* =========================================================
   COURSES
========================================================= */
function showListe(liste, btn) {
  currentListe = liste;
  document.querySelectorAll('#page-courses .inner-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadCourses(liste);
}

async function loadCourses(liste) {
  const container = document.getElementById('courses-list');
  if (container) {
    container.innerHTML = '<div class="loading">Chargement...</div>';
  }

  const text = await apiCall({ action: 'lire', sheet: 'COURSES', liste });
  coursesData[liste] = [];

  parseLines(text).forEach(line => {
    const pipe = line.indexOf('|');
    const ingredient = pipe >= 0 ? line.substring(0, pipe).trim() : line.trim();
    if (ingredient) coursesData[liste].push(ingredient);
  });

  APP_CACHE.pagesLoaded.courses = true;
  renderCourses(liste);
}

function renderCourses(liste) {
  const container = document.getElementById('courses-list');
  if (!container) return;

  if (!coursesData[liste] || !coursesData[liste].length) {
    container.innerHTML = '<div class="loading">Liste vide</div>';
    return;
  }

  container.innerHTML = coursesData[liste].map((item, i) => `
    <div class="course-item" id="ci_${i}">
      <span>${escapeHtml(item)}</span>
      <button class="btn-delete" onclick="deleteCourse(${i})">✕</button>
    </div>
  `).join('');
}

async function addCourse() {
  const input = document.getElementById('input-course');
  if (!input) return;

  const ingredient = input.value.trim();
  if (!ingredient) return;

  await apiCall({
    action: 'ajouter',
    sheet: 'COURSES',
    ingredient,
    liste: currentListe
  });

  input.value = '';
  showToast('✅ Ajouté !');
  await loadCourses(currentListe);
}

async function deleteCourse(idx) {

  const ingredient = coursesData[currentListe][idx];

  await apiCall({
    action: 'supprimer',
    sheet: 'COURSES',
    ingredient,
    liste: currentListe
  });

  coursesData[currentListe].splice(idx, 1);

  renderCourses(currentListe);
  showToast('🗑️ Supprimé');
}

async function clearListe() {
  if (!confirm('Vider toute cette liste ?')) return;

  await apiCall({
    action: 'effacer_liste',
    sheet: 'COURSES',
    liste: currentListe
  });

  coursesData[currentListe] = [];
  renderCourses(currentListe);
  showToast('🗑️ Liste vidée');
}

/* =========================================================
   BADGES
========================================================= */
async function loadBadges() {
  if (APP_CACHE.badgesPromise) {
    return APP_CACHE.badgesPromise;
  }

  APP_CACHE.badgesPromise = (async () => {
    const [cText, tText, pText] = await Promise.all([
      apiCall({ action: 'lire', sheet: 'TACHES_CONFIG' }),
      apiCall({ action: 'lire', sheet: 'TACHES' }),
      apiCall({ action: 'lire', sheet: 'TACHES_PONCTUELLES' })
    ]);

    tachesConfig = [];
    parseLines(cText).forEach(line => {
      const c = line.split('|');
      if (c.length >= 10) {
        tachesConfig.push({
          tache: c[0],
          enfant: c[1],
          lundi: c[2],
          mardi: c[3],
          mercredi: c[4],
          jeudi: c[5],
          vendredi: c[6],
          samedi: c[7],
          dimanche: c[8],
          active: (c[9] || '').trim()
        });
      }
    });

    tachesData = [];
    parseLines(tText).forEach(line => {
      const c = line.split('|');
      if (c.length >= 4) {
        tachesData.push({
          tache: c[0],
          enfant: c[1],
          jour: parseIsoDate(c[2]),
          etat: (c[3] || '').trim()
        });
      }
    });

    tachesPonctuelles = [];
    parseLines(pText).forEach(line => {
      const c = line.split('|');
      if (c.length >= 3) {
        tachesPonctuelles.push({
          tache: c[0],
          enfant: c[1],
          date: parseIsoDate(c[2]),
          icon: '📌'
        });
      }
    });

    const today = formatDateYYYYMMDD(new Date());
    const { jour } = getJourFromYMD(today);

    const profils = ['Alessia', 'Antonin', 'Clément', 'Diego', 'Jérémie', 'Mél & Yann'];
    const counts = {};

    profils.forEach(nom => {
      const taches = getToutesLesTachesEnfant(nom, jour, today);

      const nonFaites = taches.filter(t => {
        const fait = tachesData.find(td =>
          td.tache === t.tache &&
          td.enfant === nom &&
          td.jour === t.jourReel &&
          (td.etat || '').trim() === 'Fait'
        );
        return !fait;
      });

      counts[nom] = nonFaites.length;
    });

    updateBadges(counts);
  })();

  try {
    await APP_CACHE.badgesPromise;
  } finally {
    APP_CACHE.badgesPromise = null;
  }
}

/* =========================================================
   HELPERS TÂCHES
========================================================= */
function getTacheIcon(label) {
  return TACHES_FIXES.find(t => t.label === label)?.icon || '📋';
}

function isTacheRecurrenteActive(tache, dateStr) {
  const today = new Date((dateStr || formatDateYYYYMMDD()) + 'T00:00:00');
  const dow = today.getDay();

  if (dow !== 4 && dow !== 5) return false;

  const vendredi = new Date(today);
  if (dow === 4) vendredi.setDate(today.getDate() + 1);

  const debut = new Date(tache.dateDebut + 'T00:00:00');
  if (vendredi < debut) return false;

  const msParSemaine = 7 * 24 * 60 * 60 * 1000;
  const semaines = Math.round((vendredi - debut) / msParSemaine);

  return semaines % tache.frequence === 0;
}

function isTacheParentActiveForDate(tache, dateStr) {
  const d = new Date((dateStr || formatDateYYYYMMDD()) + 'T00:00:00');
  const dow = d.getDay();
  const jour = d.getDate();

  if (tache.type === 'premier_du_mois') return jour === 1;
  if (tache.type === 'mercredi') return dow === 3;

  return false;
}

function getToutesLesTachesEnfant(enfant, jour, dateYMD) {
  const dateStr = dateYMD || formatDateYYYYMMDD(new Date());
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dow = dateObj.getDay(); // 0=dim, 4=jeu, 5=ven
  const taches = [];

  // 1) Tâches fixes (config)
  tachesConfig
    .filter(t => t.enfant === enfant && t[jour] === 'TRUE')
    .forEach(t => {
      taches.push({
        tache: t.tache,
        icon: getTacheIcon(t.tache),
        source: 'fixe',
        jourReel: dateStr,
        dueDate: dateStr
      });
    });

  // 2) Tâches spéciales parents
  if (enfant === 'Mél & Yann') {
    TACHES_PARENTS
      .filter(t => isTacheParentActiveForDate(t, dateStr))
      .forEach(t => {
        taches.push({
          tache: t.label,
          icon: t.icon,
          source: 'parent',
          jourReel: dateStr,
          dueDate: dateStr
        });
      });
  }

  // 3) Tâches récurrentes
  if (dow === 4 || dow === 5) {
    TACHES_RECURRENTES
      .filter(t => t.personne === enfant)
      .forEach(t => {
        if (isTacheRecurrenteActive(t, dateStr)) {
          const vendredi = new Date(dateStr + 'T00:00:00');
          if (dow === 4) vendredi.setDate(vendredi.getDate() + 1);

          const dueDate = formatDateYYYYMMDD(vendredi);

          if (!taches.find(x => x.tache === t.tache)) {
            taches.push({
              tache: t.tache,
              icon: t.icon,
              source: 'recurrente',
              jourReel: dueDate,
              dueDate: dueDate,
              badge: dow === 4 ? '⏰ Demain' : ''
            });
          }
        }
      });
  }

  // 4) Tâches ponctuelles
  const enfantsPonct = (enfant === 'Mél & Yann')
    ? ['Mél & Yann', 'Mélanie', 'Yann']
    : [enfant];

  tachesPonctuelles
    .filter(t => enfantsPonct.includes(t.enfant) && t.date === dateStr)
    .forEach(t => {
      taches.push({
        tache: t.tache,
        icon: '📌',
        source: 'ponctuelle',
        jourReel: dateStr,
        dueDate: dateStr,
        enfantReel: t.enfant
      });
    });

  return taches;
}

function getTachesEnRetard(enfant) {
  const todayStr = formatDateYYYYMMDD(new Date());
  const yesterdayStr = dateMinusDays(todayStr, 1);
  const { jour: jourHier } = getJourFromYMD(yesterdayStr);

  const toutesHier = getToutesLesTachesEnfant(enfant, jourHier, yesterdayStr);

  return toutesHier.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );

    return !etat || (etat.etat || '').trim() !== 'Fait';
  }).map(t => ({
    ...t,
    enRetard: true,
    dueDate: yesterdayStr
  }));
}

function getPonctuellesEnRetard(enfant) {
  const todayStr = formatDateYYYYMMDD(new Date());

  const enfantsPonct = (enfant === 'Mél & Yann')
    ? ['Mél & Yann', 'Mélanie', 'Yann']
    : [enfant];

  const overdue = tachesPonctuelles.filter(t =>
    enfantsPonct.includes(t.enfant) &&
    t.date < todayStr
  );

  return overdue.filter(t => {
    const done = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.date &&
      (td.etat || '').trim() === 'Fait'
    );
    return !done;
  }).map(t => ({
    tache: t.tache,
    icon: '📌',
    source: 'ponctuelle',
    jourReel: t.date,
    dueDate: t.date,
    enfantReel: t.enfant
  }));
}

/* =========================================================
   CHARGEMENT TÂCHES
========================================================= */
async function loadTaches(force = false) {
  const container = document.getElementById('taches-content');
  if (container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement...</div>';
  }

  if (!force && APP_CACHE.pagesLoaded.taches) {
    renderTaches();
    return;
  }

  const [cText, tText, pText] = await Promise.all([
    apiCall({ action: 'lire', sheet: 'TACHES_CONFIG' }),
    apiCall({ action: 'lire', sheet: 'TACHES' }),
    apiCall({ action: 'lire', sheet: 'TACHES_PONCTUELLES' })
  ]);

  tachesConfig = [];
  parseLines(cText).forEach(line => {
    const c = line.split('|');
    if (c.length >= 10) {
      tachesConfig.push({
        tache: c[0],
        enfant: c[1],
        lundi: c[2],
        mardi: c[3],
        mercredi: c[4],
        jeudi: c[5],
        vendredi: c[6],
        samedi: c[7],
        dimanche: c[8],
        active: (c[9] || '').trim()
      });
    }
  });

  tachesData = [];
  parseLines(tText).forEach(line => {
    const c = line.split('|');
    if (c.length >= 4) {
      tachesData.push({
        tache: c[0],
        enfant: c[1],
        jour: parseIsoDate(c[2]),
        etat: (c[3] || '').trim()
      });
    }
  });

  tachesPonctuelles = [];
  parseLines(pText).forEach(line => {
    const c = line.split('|');
    if (c.length >= 3) {
      tachesPonctuelles.push({
        tache: c[0],
        enfant: c[1],
        date: parseIsoDate(c[2]),
        icon: '📌'
      });
    }
  });

  APP_CACHE.pagesLoaded.taches = true;
  renderTaches();
}

/* =========================================================
   RENDU TÂCHES
========================================================= */
function renderTaches() {
  const today = new Date();
  const dow = today.getDay();
  const jourIdx = dow === 0 ? 6 : dow - 1;
  const jour = JOURS[jourIdx];

  if (isParent) {
    renderTachesParentSelf(jour, jourIdx);
    return;
  }

  const enfant = currentUser === 'parent' ? 'Mél & Yann' : currentUser;
  const toutesLesTaches = getToutesLesTachesEnfant(enfant, jour, formatDateYYYYMMDD(today));
  const enRetardFixes = getTachesEnRetard(enfant);
  const enRetardPonct = getPonctuellesEnRetard(enfant);
  const enRetard = [...enRetardPonct, ...enRetardFixes];

  const nonFaites = toutesLesTaches.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );
    return !etat || (etat.etat || '').trim() !== 'Fait';
  });

  const container = document.getElementById('taches-content');
  if (!container) return;

  if (!toutesLesTaches.length && !enRetard.length) {
    container.innerHTML = `
      <div class="card">
        <div class="all-done">
          <span class="big-icon">🎉</span>
          <p>Aucune tâche pour aujourd'hui !</p>
        </div>
      </div>
    `;
    return;
  }

  if (!nonFaites.length && !enRetard.length) {
    container.innerHTML = `
      <div class="card">
        <div class="all-done">
          <span class="big-icon">🌟</span>
          <p>Bravo ${escapeHtml(enfant)} !<br>Toutes tes tâches sont faites !</p>
        </div>
      </div>
    `;
    return;
  }

  let html = '';

  if (enRetard.length) {
    html += `
      <div class="card" style="border-left:4px solid var(--orange)">
        <div class="card-title" style="color:var(--orange)">⚠️ En retard — Hier</div>
        <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">
          ${enRetard.length} tâche${enRetard.length > 1 ? 's' : ''} non faite${enRetard.length > 1 ? 's' : ''} hier
        </p>
    `;

    enRetard.forEach(t => {
      const idSafe = 'retard_' + t.tache.replace(/[^a-z0-9]/gi, '_');
      html += `
        <div class="tache-item" id="${idSafe}">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <span class="tache-name">${escapeHtml(t.tache)}</span>
          </div>
          <button class="tache-toggle non-fait"
            onclick="toggleTache('${escapeJsString(t.tache)}','${escapeJsString(t.jourReel)}',false,'${escapeJsString(enfant)}')">
            ⬜ À faire
          </button>
        </div>
      `;
    });

    html += `</div>`;
  }

  if (nonFaites.length) {
    html += `
      <div class="card">
        <div class="card-title">✅ Mes tâches — ${JOURS_LABEL[jourIdx]}</div>
        <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">
          ${nonFaites.length} tâche${nonFaites.length > 1 ? 's' : ''} à faire
        </p>
    `;

    nonFaites.forEach(t => {
      const idSafe = t.tache.replace(/[^a-z0-9]/gi, '_');
      const badge = t.badge
        ? `<span style="font-size:0.7rem;background:var(--orange);color:white;padding:2px 7px;border-radius:20px;margin-left:6px">${escapeHtml(t.badge)}</span>`
        : '';

      html += `
        <div class="tache-item" id="tache_${idSafe}">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <div>
              <span class="tache-name">${escapeHtml(t.tache)}</span>${badge}
            </div>
          </div>
          <button class="tache-toggle non-fait"
            onclick="toggleTache('${escapeJsString(t.tache)}','${escapeJsString(t.jourReel)}',false,'${escapeJsString(enfant)}')">
            ⬜ À faire
          </button>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;
}


function renderTachesParentSelf(jour, jourIdx) {
  const enfant = 'Mél & Yann';
  const dateStr = formatDateYYYYMMDD(new Date());
  const toutesLesTaches = getToutesLesTachesEnfant(enfant, jour, dateStr);
  const enRetardFixes = getTachesEnRetard(enfant);
  const enRetardPonct = getPonctuellesEnRetard(enfant);
  const enRetard = [...enRetardPonct, ...enRetardFixes];

  const nonFaites = toutesLesTaches.filter(t => {
    const enfantValidation = t.enfantReel || enfant;
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfantValidation &&
      td.jour === t.jourReel
    );
    return !etat || (etat.etat || '').trim() !== 'Fait';
  });

  const container = document.getElementById('taches-content');
  if (!container) return;

  if (!toutesLesTaches.length && !enRetard.length) {
    container.innerHTML = `
      <div class="card">
        <div class="all-done">
          <span class="big-icon">🎉</span>
          <p>Aucune tâche pour vous aujourd'hui !</p>
        </div>
      </div>
    `;
    return;
  }

  if (!nonFaites.length && !enRetard.length) {
    container.innerHTML = `
      <div class="card">
        <div class="all-done">
          <span class="big-icon">🌟</span>
          <p>Bravo !<br>Toutes vos tâches sont faites !</p>
        </div>
      </div>
    `;
    return;
  }

  let html = '';

  if (enRetard.length) {
    html += `
      <div class="card" style="border-left:4px solid var(--orange)">
        <div class="card-title" style="color:var(--orange)">⚠️ En retard — Hier</div>
        <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">
          ${enRetard.length} tâche${enRetard.length > 1 ? 's' : ''} non faite${enRetard.length > 1 ? 's' : ''} hier
        </p>
    `;

    enRetard.forEach(t => {
      const idSafe = 'retard_' + t.tache.replace(/[^a-z0-9]/gi, '_');
      const enfantClic = t.enfantReel || enfant;

      html += `
        <div class="tache-item" id="${idSafe}">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <span class="tache-name">${escapeHtml(t.tache)}</span>
          </div>
          <button class="tache-toggle non-fait"
            onclick="toggleTache('${escapeJsString(t.tache)}','${escapeJsString(t.jourReel)}',false,'${escapeJsString(enfantClic)}')">
            ⬜ À faire
          </button>
        </div>
      `;
    });

    html += `</div>`;
  }

  if (nonFaites.length) {
    html += `
      <div class="card">
        <div class="card-title">✅ Nos tâches — ${JOURS_LABEL[jourIdx]}</div>
        <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">
          ${nonFaites.length} tâche${nonFaites.length > 1 ? 's' : ''} à faire
        </p>
    `;

    nonFaites.forEach(t => {
      const idSafe = t.tache.replace(/[^a-z0-9]/gi, '_');
      const sous = t.enfantReel
        ? `<span style="display:block;font-size:0.78rem;color:var(--text-light)">${escapeHtml(t.enfantReel)}</span>`
        : '';
      const enfantClic = t.enfantReel || enfant;

      html += `
        <div class="tache-item" id="tache_${idSafe}">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <div>
              <span class="tache-name">${escapeHtml(t.tache)}</span>${sous}
            </div>
          </div>
          <button class="tache-toggle non-fait"
            onclick="toggleTache('${escapeJsString(t.tache)}','${escapeJsString(t.jourReel)}',false,'${escapeJsString(enfantClic)}')">
            ⬜ À faire
          </button>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;
}


async function toggleTache(tache, jour, estFait, enfant) {
  const id = 'tache_' + String(tache).replace(/[^a-z0-9]/gi, '_');
  const el = document.getElementById(id);
  if (el) el.classList.add('done');

  await apiCall({
    action: 'enregistrer',
    sheet: 'TACHES',
    tache,
    enfant,
    jour,
    etat: 'Fait'
  });

  APP_CACHE.pagesLoaded.taches = false;
  APP_CACHE.badgesPromise = null;

  showToast('✅ Bien joué !');
  setTimeout(async () => {
    await loadTaches(true);
    await loadBadges();
  }, 250);
}

/* =========================================================
   RAPPELS LOGIN
========================================================= */
async function loadLoginReminders() {
  const board = document.getElementById('loginReminderBoard');
  if (!board) return;

  board.innerHTML = '<div class="loading">Chargement des rappels...</div>';

  const [cText, tText, pText] = await Promise.all([
    apiCall({ action: 'lire', sheet: 'TACHES_CONFIG' }),
    apiCall({ action: 'lire', sheet: 'TACHES' }),
    apiCall({ action: 'lire', sheet: 'TACHES_PONCTUELLES' })
  ]);

  tachesConfig = [];
  parseLines(cText).forEach(line => {
    const c = line.split('|');
    if (c.length >= 10) {
      tachesConfig.push({
        tache: c[0],
        enfant: c[1],
        lundi: c[2],
        mardi: c[3],
        mercredi: c[4],
        jeudi: c[5],
        vendredi: c[6],
        samedi: c[7],
        dimanche: c[8],
        active: (c[9] || '').trim()
      });
    }
  });

  tachesData = [];
  parseLines(tText).forEach(line => {
    const c = line.split('|');
    if (c.length >= 4) {
      tachesData.push({
        tache: c[0],
        enfant: c[1],
        jour: parseIsoDate(c[2]),
        etat: (c[3] || '').trim()
      });
    }
  });

  tachesPonctuelles = [];
  parseLines(pText).forEach(line => {
    const c = line.split('|');
    if (c.length >= 3) {
      tachesPonctuelles.push({
        tache: c[0],
        enfant: c[1],
        date: parseIsoDate(c[2]),
        icon: '📌'
      });
    }
  });

  const todayStr = formatDateYYYYMMDD(new Date());
  const { jour } = getJourFromYMD(todayStr);

  const profils = ['Alessia', 'Antonin', 'Clément', 'Diego', 'Jérémie', 'Mél & Yann'];

  const phrases = {
    'Alessia': 'Alessia, tes petites missions du jour t’attendent 🌟',
    'Antonin': 'Antonin, mission contrôle des tâches aujourd’hui 👀',
    'Clément': 'Clément, un petit coup d’œil à tes tâches ? ✅',
    'Diego': 'Diego, pense à vérifier ce qu’il y a à faire 🎯',
    'Jérémie': 'Jérémie, tes tâches du jour sont prêtes 🚀',
    'Mél & Yann': 'Parents, petit check des tâches du jour 🏠'
  };

  const cards = profils.map(nom => {
    const taches = getToutesLesTachesEnfant(nom, jour, todayStr);

    const nonFaites = taches.filter(t => {
      const etat = tachesData.find(td =>
        td.tache === t.tache &&
        td.enfant === nom &&
        td.jour === t.jourReel &&
        (td.etat || '').trim() === 'Fait'
      );
      return !etat;
    });

    if (!nonFaites.length) return '';

    return `
      <div class="login-reminder-card">
        <div class="login-reminder-title">${escapeHtml(nom)}</div>
        <div class="login-reminder-text">
          ${phrases[nom]}<br>
          <strong>${nonFaites.length}</strong> tâche${nonFaites.length > 1 ? 's' : ''} à faire aujourd’hui.
        </div>
      </div>
    `;
  }).filter(Boolean);

  if (!cards.length) {
    board.innerHTML = `
      <div class="login-reminder-card">
        <div class="login-reminder-title">✨ Aujourd’hui</div>
        <div class="login-reminder-text">Aucune tâche en attente pour le moment.</div>
      </div>
    `;
    return;
  }

  board.innerHTML = cards.join('');
}
/* =========================================================
   APP FAMILIALE - BLOC 3/3
   Admin + Job + Preview + Célébrations + Divers
========================================================= */

/* =========================================================
   ADMIN / PIN
========================================================= */
function requestAdmin() {
  const pageAdmin = document.getElementById('page-admin');
  if (pageAdmin && pageAdmin.classList.contains('unlocked')) {
    showPage('admin');
    return;
  }

  pinValue = '';
  updatePinDisplay();

  const pinError = document.getElementById('pinError');
  if (pinError) pinError.textContent = '';

  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.add('show');
}

function pinPress(digit) {
  if (pinValue.length >= 4) return;
  pinValue += digit;
  updatePinDisplay();

  if (pinValue.length === 4) {
    checkPin();
  }
}

function pinDelete() {
  pinValue = pinValue.slice(0, -1);
  updatePinDisplay();
}

function pinClear() {
  pinValue = '';
  updatePinDisplay();
}

function updatePinDisplay() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`dot${i}`);
    if (el) el.classList.toggle('filled', i < pinValue.length);
  }
}

function checkPin() {
  if (pinValue === ADMIN_CODE) {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.remove('show');

    const pageAdmin = document.getElementById('page-admin');
    if (pageAdmin) pageAdmin.classList.add('unlocked');

    showPage('admin');
  } else {
    const pinError = document.getElementById('pinError');
    if (pinError) pinError.textContent = 'Code incorrect, réessayez';

    pinValue = '';
    updatePinDisplay();

    setTimeout(() => {
      const err = document.getElementById('pinError');
      if (err) err.textContent = '';
    }, 2000);
  }
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('show');

  pinValue = '';
  updatePinDisplay();
}

/* =========================================================
   CÉLÉBRATIONS / CONFETTIS
========================================================= */
function checkCelebrations() {
  const now = new Date();
  const jour = now.getDate();
  const mois = now.getMonth() + 1;
  const container = document.getElementById('celebration-banner');
  if (!container) return;

  container.innerHTML = '';

  if (jour === 25 && mois === 12) {
    container.innerHTML = `
      <div class="celebration noel">
        <div class="celebration-icons">🎄⛄🎁✨🦌🔔</div>
        <div class="celebration-title">Joyeux Noël !</div>
        <div class="celebration-msg">
          Toute la famille vous souhaite un merveilleux Noël plein de joie et de cadeaux ! 🎅
        </div>
        <div class="celebration-icons">❄️🌟🎶🕯️🍪☃️</div>
      </div>
    `;
    launchConfetti('noel');
    return;
  }

  const anniv = ANNIVERSAIRES.filter(a => a.jour === jour && a.mois === mois);
  if (anniv.length > 0) {
    const noms = anniv.map(a => a.nom);
    const nomStr = noms.length === 1
      ? noms[0]
      : noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1];

    const multiple = noms.length > 1;

    container.innerHTML = `
      <div class="celebration anniv">
        <div class="celebration-icons">🎂🎉🎈🥳🎁🎊</div>
        <div class="celebration-title">Joyeux anniversaire ${escapeHtml(nomStr)} !</div>
        <div class="celebration-msg">
          Toute la famille te souhaite${multiple ? 'nt' : ''} un magnifique anniversaire plein de bonheur ! 🌟
        </div>
        <div class="celebration-icons">🎂🍰🥂🎶💝✨</div>
      </div>
    `;
    launchConfetti('anniv');
  }
}

function launchConfetti(type) {
  const colors = type === 'noel'
    ? ['#c0392b', '#27ae60', '#f1c40f', '#ffffff', '#2980b9']
    : ['#9C27B0', '#F50870', '#FEEA3B', '#00BCD4', '#FF5722'];

  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 8 + 4,
    d: Math.random() * 120 + 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltAngleIncrement: Math.random() * 0.07 + 0.05
  }));

  let angle = 0;
  let count = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    angle += 0.01;

    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncrement;
      p.y += (Math.cos(angle + p.d) + 2) * 1.5;
      p.tilt = Math.sin(p.tiltAngle) * 12;

      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();

      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
    });

    count++;
    if (count < 300) {
      requestAnimationFrame(draw);
    } else {
      canvas.style.display = 'none';
    }
  }

  draw();
}

/* =========================================================
   JOB / CALENDRIER
========================================================= */
function initCal() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  loadJob();
}

async function loadJob() {
  const text = await apiCall({
    action: 'lire',
    sheet: 'JOB',
    mois: MOIS_NOMS[calMonth],
    annee: String(calYear)
  });

  jobData = {};

  parseLines(text).forEach(line => {
    const c = line.split('|');
    if (c.length >= 5) {
      const jour = c[2].trim();
      const personne = c[3].trim();
      const type = c[4].trim();

      if (type && type !== 'vide') {
        if (!jobData[jour]) jobData[jour] = {};
        jobData[jour][personne] = type;
      }
    }
  });

  APP_CACHE.pagesLoaded.job = true;
  renderCal();
}

function renderCal() {
  const title = document.getElementById('cal-month-title');
  if (title) title.textContent = `${MOIS_NOMS[calMonth]} ${calYear}`;

  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  let html = JOURS_COURTS.map(j => `<div class="cal-day-name">${j}</div>`).join('');

  let dow = new Date(calYear, calMonth, 1).getDay();
  dow = dow === 0 ? 6 : dow - 1;

  for (let i = 0; i < dow; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  const days = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const isNow = today.getFullYear() === calYear && today.getMonth() === calMonth;

  const emptySlot = `<span style="display:inline-block;width:30px;height:30px"></span>`;

  for (let d = 1; d <= days; d++) {
    const dd = jobData[String(d)] || {};
    const isToday = isNow && d === today.getDate();
    const hasData = Object.keys(dd).length > 0;

    const iconJeremie = dd['Jeremie']
      ? `<img src="image/Jeremie.png" class="cal-icon cal-jour" alt="Jérémie">`
      : emptySlot;

    const iconMelanie = dd['Melanie'] === 'jour'
      ? `<img src="image/Melanie.png" class="cal-icon cal-jour" alt="Mélanie">`
      : dd['Melanie'] === 'nuit'
      ? `<img src="image/Melanie.png" class="cal-icon cal-nuit" alt="Mélanie">`
      : emptySlot;

    const iconYann = dd['Yann'] === 'jour'
      ? `<img src="image/Yann.png" class="cal-icon cal-jour" alt="Yann">`
      : dd['Yann'] === 'nuit'
      ? `<img src="image/Yann.png" class="cal-icon cal-nuit" alt="Yann">`
      : emptySlot;

    const iconsHtml = `
      <div class="day-icons">
        <div class="slot slot-jeremie">${iconJeremie}</div>
        <div class="slot slot-melanie">${iconMelanie}</div>
        <div class="slot slot-yann">${iconYann}</div>
      </div>
    `;

    html += `
      <div class="cal-day ${hasData ? 'has-data' : ''} ${isToday ? 'today' : ''}" onclick="openJobModal(${d})">
        <span class="day-num ${isToday ? 'today-num' : ''}">${d}</span>
        ${iconsHtml}
      </div>
    `;
  }

  grid.innerHTML = html;
}

function changeMonth(dir) {
  calMonth += dir;

  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }

  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }

  loadJob();
}

function openJobModal(day) {
  selectedDay = day;
  const dd = jobData[String(day)] || {};

  const title = document.getElementById('modalTitle');
  const sub = document.getElementById('modalSub');
  const btns = document.getElementById('modalBtns');

  if (title) title.textContent = `${day} ${MOIS_NOMS[calMonth]} ${calYear}`;
  if (sub) sub.textContent = 'Qui travaille ce jour ?';

  const isA = (p, t) => dd[p] === t;

  if (btns) {
    btns.innerHTML = `
      <button class="modal-btn" style="background:#4CAF50;color:white" onclick="saveJob('Jeremie','travaille')">
        <img src="image/Jeremie.png" class="modal-icon"> Jérémie - travaille ${isA('Jeremie','travaille') ? '✓' : ''}
      </button>
      <button class="modal-btn" style="background:#E91E93;color:white" onclick="saveJob('Melanie','jour')">
        <img src="image/Melanie.png" class="modal-icon"> Mélanie — Jour ${isA('Melanie','jour') ? '✓' : ''}
      </button>
      <button class="modal-btn" style="background:#9C27B0;color:white" onclick="saveJob('Melanie','nuit')">
        <img src="image/Melanie.png" class="modal-icon"> Mélanie — Nuit ${isA('Melanie','nuit') ? '✓' : ''}
      </button>
      <button class="modal-btn" style="background:#F9A825;color:#333" onclick="saveJob('Yann','jour')">
        <img src="image/Yann.png" class="modal-icon"> Yann — Jour ${isA('Yann','jour') ? '✓' : ''}
      </button>
      <button class="modal-btn" style="background:#FF8F00;color:white" onclick="saveJob('Yann','nuit')">
        <img src="image/Yann.png" class="modal-icon"> Yann — Nuit ${isA('Yann','nuit') ? '✓' : ''}
      </button>
      <div class="modal-section"></div>
      <button class="modal-btn" style="background:#f44336;color:white" onclick="clearJobDay()">❌ Effacer ce jour</button>
      <button class="modal-btn" style="background:#eee;color:#333" onclick="closeModal()">Annuler</button>
    `;
  }

  const modal = document.getElementById('jobModal');
  if (modal) modal.classList.add('show');
}

async function saveJob(personne, type) {
  closeModal();

  await apiCall({
    action: 'enregistrer',
    sheet: 'JOB',
    mois: MOIS_NOMS[calMonth],
    annee: String(calYear),
    jour: String(selectedDay),
    personne,
    type
  });

  if (!jobData[String(selectedDay)]) jobData[String(selectedDay)] = {};
  jobData[String(selectedDay)][personne] = type;

  renderCal();
  showToast('✅ Enregistré !');
}

async function clearJobDay() {
  closeModal();

  for (const p of ['Jeremie', 'Melanie', 'Yann']) {
    await apiCall({
      action: 'enregistrer',
      sheet: 'JOB',
      mois: MOIS_NOMS[calMonth],
      annee: String(calYear),
      jour: String(selectedDay),
      personne: p,
      type: 'vide'
    });
  }

  delete jobData[String(selectedDay)];
  renderCal();
  showToast('🗑️ Jour effacé');
}

function closeModal() {
  const modal = document.getElementById('jobModal');
  if (modal) modal.classList.remove('show');
}



/* =========================================================
   TÂCHES PONCTUELLES
========================================================= */
async function saveTachePonctuelle() {
  const tache = document.getElementById('ponct-tache')?.value.trim() || '';
  const enfant = document.getElementById('ponct-enfant')?.value || '';
  const date = document.getElementById('ponct-date')?.value || '';

  if (!tache || !date) {
    showToast('⚠️ Remplis tous les champs');
    return;
  }

  await apiCall({
    action: 'enregistrer',
    sheet: 'TACHES_PONCTUELLES',
    tache,
    enfant,
    date
  });

  const tacheInput = document.getElementById('ponct-tache');
  const dateInput = document.getElementById('ponct-date');
  if (tacheInput) tacheInput.value = '';
  if (dateInput) dateInput.value = '';

  APP_CACHE.pagesLoaded.taches = false;
  APP_CACHE.badgesPromise = null;

  showToast('📌 Tâche ponctuelle ajoutée !');
  await loadPonctuelles();
  await loadBadges();
}

async function loadPonctuelles() {
  const text = await apiCall({ action: 'lire', sheet: 'TACHES_PONCTUELLES' });

  const items = [];
  parseLines(text).forEach(line => {
    const c = line.split('|');
    if (c.length >= 3) {
      items.push({
        tache: c[0],
        enfant: c[1],
        date: parseIsoDate(c[2])
      });
    }
  });

  const today = formatDateYYYYMMDD();
  const futures = items
    .filter(i => i.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const container = document.getElementById('ponct-list');
  if (!container) return;

  if (!futures.length) {
    container.innerHTML = `<div class="loading" style="padding:8px">Aucune tâche ponctuelle à venir</div>`;
    return;
  }

  container.innerHTML = futures.map(i => `
    <div class="tache-item" style="margin-bottom:4px">
      <div class="tache-info">
        <span class="tache-icon">📌</span>
        <div>
          <span class="tache-name">${escapeHtml(i.tache)}</span>
          <span style="display:block;font-size:0.78rem;color:var(--text-light)">
            ${escapeHtml(i.enfant)} — ${escapeHtml(i.date)}
          </span>
        </div>
      </div>
      <button class="btn-delete" onclick="deletePonctuelle(${JSON.stringify(i.tache)}, ${JSON.stringify(i.enfant)}, ${JSON.stringify(i.date)})">✕</button>
    </div>
  `).join('');
}

async function deletePonctuelle(tache, enfant, date) {
  await apiCall({
    action: 'supprimer',
    sheet: 'TACHES_PONCTUELLES',
    tache,
    enfant,
    date
  });

  APP_CACHE.pagesLoaded.taches = false;
  APP_CACHE.badgesPromise = null;

  showToast('🗑️ Tâche supprimée');
  await loadPonctuelles();
  await loadBadges();
}

/* =========================================================
   PREVIEW ENFANT
========================================================= */
function showPreviewEnfant(enfant, btn) {
  currentPreviewEnfant = enfant;
  document.querySelectorAll('#preview-tabs .inner-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (enfant === 'Mél & Yann') {
    renderPreviewParents();
  } else {
    renderPreview(enfant);
  }
}

function renderPreviewParents() {
  const today = new Date();
  const dow = today.getDay();
  const jourIdx = dow === 0 ? 6 : dow - 1;
  const jour = JOURS[jourIdx];
  const dateStr = formatDateYYYYMMDD(today);

  const enfant = 'Mél & Yann';
  const toutesLesTaches = getToutesLesTachesEnfant(enfant, jour, dateStr);

  const container = document.getElementById('preview-content');
  if (!container) return;

  if (!toutesLesTaches.length) {
    container.innerHTML = `
      <div class="all-done">
        <span class="big-icon">😊</span>
        <p>Aucune tâche pour Mélanie & Yann aujourd'hui !</p>
      </div>
    `;
    return;
  }

  const faites = toutesLesTaches.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );
    return etat && (etat.etat || '').trim() === 'Fait';
  });

  const nonFaites = toutesLesTaches.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );
    return !etat || (etat.etat || '').trim() !== 'Fait';
  });

  let html = `
    <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">
      ${JOURS_LABEL[jourIdx]} — ${faites.length}/${toutesLesTaches.length} faite${faites.length > 1 ? 's' : ''}
    </p>
  `;

  if (!nonFaites.length) {
    html += `
      <div class="all-done">
        <span class="big-icon">🌟</span>
        <p>Tout est fait !</p>
      </div>
    `;
  } else {
    html += `<p style="font-size:0.8rem;font-weight:700;color:var(--rose);margin-bottom:8px">⬜ À faire :</p>`;

    nonFaites.forEach(t => {
      const sous = t.enfantReel
        ? `<span style="font-size:0.75rem;color:var(--text-light)">(${escapeHtml(t.enfantReel)})</span>`
        : '';

      html += `
        <div class="tache-item">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <span class="tache-name">${escapeHtml(t.tache)} ${sous}</span>
          </div>
          <span class="tache-toggle non-fait" style="cursor:default">⬜ À faire</span>
        </div>
      `;
    });
  }

  if (faites.length) {
    html += `<p style="font-size:0.8rem;font-weight:700;color:#4CAF50;margin:12px 0 8px">✅ Déjà fait :</p>`;

    faites.forEach(t => {
      const sous = t.enfantReel
        ? `<span style="font-size:0.75rem;color:var(--text-light)">(${escapeHtml(t.enfantReel)})</span>`
        : '';

      html += `
        <div class="tache-item" style="opacity:0.6">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <span class="tache-name" style="text-decoration:line-through">${escapeHtml(t.tache)} ${sous}</span>
          </div>
          <span class="tache-toggle fait" style="cursor:default">✅ Fait</span>
        </div>
      `;
    });
  }

  container.innerHTML = html;
}

function renderPreview(enfant) {
  const today = new Date();
  const dow = today.getDay();
  const jourIdx = dow === 0 ? 6 : dow - 1;
  const jour = JOURS[jourIdx];
  const dateStr = formatDateYYYYMMDD(today);

  const toutesLesTaches = getToutesLesTachesEnfant(enfant, jour, dateStr);
  const container = document.getElementById('preview-content');
  if (!container) return;

  if (!toutesLesTaches.length) {
    container.innerHTML = `
      <div class="all-done">
        <span class="big-icon">😴</span>
        <p>Aucune tâche pour ${escapeHtml(enfant)} aujourd'hui</p>
      </div>
    `;
    return;
  }

  const faites = toutesLesTaches.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );
    return etat && (etat.etat || '').trim() === 'Fait';
  });

  const nonFaites = toutesLesTaches.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );
    return !etat || (etat.etat || '').trim() !== 'Fait';
  });

  let html = `
    <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">
      ${JOURS_LABEL[jourIdx]} — ${faites.length}/${toutesLesTaches.length} faite${faites.length > 1 ? 's' : ''}
    </p>
  `;

  if (!nonFaites.length) {
    html += `
      <div class="all-done">
        <span class="big-icon">🌟</span>
        <p>Tout est fait !</p>
      </div>
    `;
  } else {
    html += `<p style="font-size:0.8rem;font-weight:700;color:var(--rose);margin-bottom:8px">⬜ À faire :</p>`;

    nonFaites.forEach(t => {
      const badge = t.badge
        ? `<span style="font-size:0.7rem;background:var(--orange);color:white;padding:2px 7px;border-radius:20px;margin-left:6px">${escapeHtml(t.badge)}</span>`
        : '';

      html += `
        <div class="tache-item">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <div>
              <span class="tache-name">${escapeHtml(t.tache)}</span>${badge}
            </div>
          </div>
          <span class="tache-toggle non-fait" style="cursor:default">⬜ À faire</span>
        </div>
      `;
    });
  }

  if (faites.length) {
    html += `<p style="font-size:0.8rem;font-weight:700;color:#4CAF50;margin:12px 0 8px">✅ Déjà fait :</p>`;

    faites.forEach(t => {
      html += `
        <div class="tache-item" style="opacity:0.6">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <span class="tache-name" style="text-decoration:line-through">${escapeHtml(t.tache)}</span>
          </div>
          <span class="tache-toggle fait" style="cursor:default">✅ Fait</span>
        </div>
      `;
    });
  }

  container.innerHTML = html;
}

/* =========================================================
   DIVERS / NAV EXTERNES
========================================================= */
function chargerCFF() {
  fetch(SCRIPT_URL + '?sheet=CFF&action=lire')
    .then(r => r.text())
    .then(data => {
      const lignes = data.split('~~~~');
      let html = '';

      lignes.forEach(ligne => {
        const parts = ligne.split('|');
        if (parts.length > 0) html += `<div>${escapeHtml(ligne)}</div>`;
      });

      const el = document.getElementById('cffList');
      if (el) el.innerHTML = html;
    })
    .catch(console.error);
}

function openCFF() {
  location.href = 'CFF.html';
}

function chargerMAGICPASS() {
  fetch(SCRIPT_URL + '?sheet=MAGICPASS&action=lire')
    .then(r => r.text())
    .then(data => {
      const lignes = data.split('~~~~');
      let html = '';

      lignes.forEach(ligne => {
        const parts = ligne.split('|');
        if (parts.length > 0) html += `<div>${escapeHtml(ligne)}</div>`;
      });

      const el = document.getElementById('magicpassList');
      if (el) el.innerHTML = html;
    })
    .catch(console.error);
}

function openMAGICPASS() {
  location.href = 'magicpass.html';
}

function chargerVACANCES() {
  location.href = 'VACANCES.html';
}

function openVACANCES() {
  location.href = 'VACANCES.html';
}
