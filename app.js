
document.addEventListener("DOMContentLoaded", () => {
  const lastChild = localStorage.getItem("lastChild");
  if (lastChild) {
    openChild(lastChild);
    showScreen("child");
  } else {
    showScreen("home");
  }

  // ✅ charge les pastilles au démarrage
  loadBadges();
});

function showScreen(name) {
  const home = document.getElementById("homeScreen");
  const child = document.getElementById("childScreen");

  if (home) home.style.display = (name === "home" ? "block" : "none");
  if (child) child.style.display = (name === "child" ? "block" : "none");
}

function openChild(childNameOrId) {
  const title = document.getElementById("childTitle");
  if (title) title.textContent = childNameOrId;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/semaine-famille/sw.js");
}


const SCRIPT_URL='https://script.google.com/macros/s/AKfycbxOJEus1Fev5I4YZsSbjpIXXlgGJBY7QmFkkqZtkXYD6eEPwqmgCl8r2hfrO1X9eyqxSA/exec';
const ADMIN_CODE='2019';
function rollingDates(days) {
  const base = new Date(); base.setHours(0,0,0,0);
  const result = [];
  const joursNoms = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    result.push({
      date: `${d.getFullYear()}-${mm}-${dd}`,
      label: `${joursNoms[d.getDay()]} ${dd}/${mm}`
    });
  }
  return result;
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
 
function formatDateYYYYMMDD(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
 
function dateMinusDays(ymd, days){
  const d = new Date(ymd + 'T00:00:00');
  d.setDate(d.getDate() - days);
  return formatDateYYYYMMDD(d);
}

function getJourFromYMD(ymd){
  const d = new Date(ymd + 'T00:00:00');
  const idx = (d.getDay() === 0) ? 6 : d.getDay() - 1; // 0=dim -> 6
  return { jour: JOURS[idx], jourIdx: idx };
}

 
const JOURS=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const JOURS_LABEL=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const JOURS_COURTS=['Lu','Ma','Me','Je','Ve','Sa','Di'];
const MEMBRES=['alessia','antonin','clement','diego','jeremie','melanie','yann'];
const MEMBRES_LABEL=['Alessia','Antonin','Clément','Diego','Jérémie','Mélanie','Yann'];
const MOIS_NOMS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const TACHES_FIXES=[
  {id:'lessive',    label:'Monter ta lessive',       icon:'👕'},
  {id:'vaisselle',  label:'Vider le lave-vaisselle', icon:'🍽️'},
  {id:'aspirateur', label:"Passer l'aspirateur",     icon:'🧹'}
];

function normalizeMemberKey(name){
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')                 // sépare lettres + accents
    .replace(/[\u0300-\u036f]/g,'')   // enlève accents
    .replace(/[^a-z]/g,'');           // enlève espaces & autres
}

// Qui voit quoi / qui peut modifier quoi ?
function getPresenceAccess(){
  if(isParent){
    return {
      visible: [...MEMBRES],          // voit tout
      editable: ['melanie','yann']    // modifie seulement Mélanie & Yann
    };
  }
  const me = normalizeMemberKey(currentUser); // Alessia -> alessia, Jérémie -> jeremie
  return {
    visible: [me],                    // voit seulement soi
    editable: [me]                    // modifie seulement soi
  };
}

// Lire la valeur actuelle d'un membre (depuis checkbox si visible, sinon depuis presencesData)

function getPresenceValue(key, member){
  const hidden = document.getElementById(`presence_${key}_${member}`);
  if(hidden) return hidden.value; // '' | 'TRUE' | 'FALSE'

  const cb = document.getElementById(`cb_${key}_${member}`);
  if(cb) return cb.checked ? 'TRUE' : 'FALSE';

  return presencesData?.[key]?.[member] ?? '';
}


 
const TACHES_RECURRENTES = [
  { personne:'Alessia',    tache:'Défaire ton lit', icon:'🛏️', dateDebut:'2026-05-15', frequence:3 },
  { personne:'Diego',      tache:'Défaire ton lit', icon:'🛏️', dateDebut:'2026-05-15', frequence:3 },
  { personne:'Clément',    tache:'Défaire ton lit', icon:'🛏️', dateDebut:'2026-05-29', frequence:3 },
  { personne:'Antonin',    tache:'Défaire ton lit', icon:'🛏️', dateDebut:'2026-05-29', frequence:3 },
  { personne:'Jérémie',    tache:'Défaire ton lit', icon:'🛏️', dateDebut:'2026-05-15', frequence:2 },
  { personne:'Mél & Yann', tache:'Défaire ton lit', icon:'🛏️', dateDebut:'2026-05-15', frequence:2 },
];
 
function isTacheRecurrenteActive(tache, dateStr) {
  const today = new Date(dateStr || new Date().toISOString().split('T')[0]);
  const dow = today.getDay();
  if(dow !== 4 && dow !== 5) return false;
  const vendredi = new Date(today);
  if(dow === 4) vendredi.setDate(today.getDate() + 1);
  const debut = new Date(tache.dateDebut);
  if(vendredi < debut) return false;
  const msParSemaine = 7 * 24 * 60 * 60 * 1000;
  const semaines = Math.round((vendredi - debut) / msParSemaine);
  return semaines % tache.frequence === 0;
}
 
let tachesPonctuelles = [];
 
const TACHES_PARENTS = [
  { label:'Laver tapis salle de bain', icon:'🛁', type:'premier_du_mois' },
  { label:'Laver linges et serviettes', icon:'🧺', type:'mercredi' },
];
 

function isTacheParentActiveForDate(tache, dateStr) {
  const d = new Date((dateStr || formatDateYYYYMMDD()) + 'T00:00:00');
  const dow = d.getDay();
  const jour = d.getDate();

  if (tache.type === 'premier_du_mois') return jour === 1;
  if (tache.type === 'mercredi') return dow === 3;

  return false;
}
 
let currentUser=null, isParent=false;
let presencesData={},menuData={},coursesData={},tachesData=[],tachesConfig=[],jobData={};
let currentListe='generale',currentAdminEnfant='Alessia';
let calYear,calMonth,selectedDay=null;
let pinValue='';
 
const ANNIVERSAIRES = [
  { nom: 'Alessia',  jour: 1,  mois: 1  },
  { nom: 'Antonin',  jour: 15, mois: 5  },
  { nom: 'Clément',  jour: 22, mois: 2  },
  { nom: 'Jérémie',  jour: 24, mois: 4  },
  { nom: 'Diego',    jour: 9,  mois: 10 },
  { nom: 'Yann',     jour: 10, mois: 3  },
  { nom: 'Mélanie',  jour: 28, mois: 3  },
];
 
function checkCelebrations() {
  const now = new Date();
  const jour = now.getDate();
  const mois = now.getMonth() + 1;
  const container = document.getElementById('celebration-banner');
  if (!container) return;
  if (jour === 25 && mois === 12) {
    container.innerHTML = `
      <div class="celebration noel">
        <div class="celebration-icons">🎄⛄🎁✨🦌🔔</div>
        <div class="celebration-title">Joyeux Noël !</div>
        <div class="celebration-msg">Toute la famille vous souhaite un merveilleux Noël plein de joie et de cadeaux ! 🎅</div>
        <div class="celebration-icons">❄️🌟🎶🕯️🍪☃️</div>
      </div>`;
    launchConfetti('noel');
    return;
  }
  const anniv = ANNIVERSAIRES.filter(a => a.jour === jour && a.mois === mois);
  if (anniv.length > 0) {
    const noms = anniv.map(a => a.nom);
    const nomStr = noms.length === 1 ? noms[0] : noms.slice(0,-1).join(', ') + ' et ' + noms[noms.length-1];
    const multiple = noms.length > 1;
    container.innerHTML = `
      <div class="celebration anniv">
        <div class="celebration-icons">🎂🎉🎈🥳🎁🎊</div>
        <div class="celebration-title">Joyeux anniversaire ${nomStr} !</div>
        <div class="celebration-msg">Toute la famille te souhaite${multiple?'nt':''} un magnifique anniversaire plein de bonheur ! 🌟</div>
        <div class="celebration-icons">🎂🍰🥂🎶💝✨</div>
      </div>`;
    launchConfetti('anniv');
  }
}
 
function launchConfetti(type) {
  const colors = type === 'noel'
    ? ['#c0392b','#27ae60','#f1c40f','#ffffff','#2980b9']
    : ['#9C27B0','#F50870','#FEEA3B','#00BCD4','#FF5722'];
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 8 + 4,
    d: Math.random() * 120 + 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltAngleIncrement: Math.random() * 0.07 + 0.05
  }));
  let angle = 0, count = 0;
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
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
    });
    count++;
    if (count < 300) requestAnimationFrame(draw);
    else canvas.style.display = 'none';
  }
  draw();
}
 
let deferredPrompt;
 
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();
  deferredPrompt=e;
  const btn=document.getElementById('installBtn');
  if(btn) btn.style.display='block';
});
 
window.addEventListener('appinstalled',()=>{
  showToast('✅ App installée sur votre écran d\'accueil !');
  deferredPrompt=null;
});
 
function installApp(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(()=>{deferredPrompt=null;});
  }
}
 
function login(user){
  currentUser=user;
  isParent=(user==='parent');
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainNav').style.display='block';
  const userName=isParent?'👨‍👩‍👧‍👦 Parents':user;
  document.getElementById('navUserName').textContent=userName;
  document.getElementById('accueil-title').textContent=`⭐ Bonjour ${isParent?'!':user+' !'} `;
  document.getElementById('jobTab').style.display='';
  document.getElementById('adminTab').style.display=isParent?'':'none';
  const qnav=document.getElementById('quick-nav-grid');
  if(isParent){
    qnav.innerHTML=`
      <button class="quick-btn" onclick="showPage('present')"><span class="icon">👥</span>Présences</button>
      <button class="quick-btn" onclick="showPage('menu')"><span class="icon">🍽️</span>Menu</button>
      <button class="quick-btn" onclick="showPage('courses')"><span class="icon">🛒</span>Courses</button>
      <button class="quick-btn" onclick="showPage('taches')"><span class="icon">✅</span>Tâches</button>
      <button class="quick-btn" onclick="showPage('job')"><span class="icon">📅</span>Job</button>
      <button class="quick-btn" onclick="location.href='CFF.html'"><span class="icon">🚆</span>CFF</button>
      <button class="quick-btn" onclick="location.href='magicpass.html'"><span class="icon">✨🏔️</span>MAGIC</button>
      <button class="quick-btn" onclick="location.href='VACANCES.html'"><span class="icon">🌴</span>VACANCES</button>

      
      <button class="quick-btn" onclick="requestAdmin()" style="background:linear-gradient(135deg,#FF5722,#FF9800)"><span class="icon">⚙️</span>Admin</button>`;
  } else {
    qnav.innerHTML=`
      <button class="quick-btn" onclick="showPage('taches')"><span class="icon">✅</span>Mes tâches</button>
      <button class="quick-btn" onclick="showPage('present')"><span class="icon">👥</span>Présences</button>
      <button class="quick-btn" onclick="showPage('menu')"><span class="icon">🍽️</span>Menu</button>
      <button class="quick-btn" onclick="showPage('courses')"><span class="icon">🛒</span>Courses</button>
      <button class="quick-btn" onclick="showPage('job')"><span class="icon">📅</span>Job</button>
      <button class="quick-btn" onclick="location.href='CFF.html'"><span class="icon">🚆</span>CFF</button>
      <button class="quick-btn" onclick="location.href='magicpass.html'"><span class="icon">✨🏔️</span>MAGIC</button>
      <button class="quick-btn" onclick="location.href='VACANCES.html'"><span class="icon">🌴</span>VACANCES</button>

 `;
  }
  if(CSS.supports('padding-top: env(safe-area-inset-top)')){
    document.querySelector('.nav').style.paddingTop='env(safe-area-inset-top)';
  }
  checkCelebrations();
  showPage('accueil');
  if(!isParent) loadTaches();
}
 

function logout(){
  currentUser = null;
  isParent = false;
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('mainNav').style.display = 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-accueil').classList.add('active');

  // ✅ recharge les pastilles
  loadBadges();
}
 
function requestAdmin(){
  if(document.getElementById('page-admin').classList.contains('unlocked')){
    showPage('admin');
    return;
  }
  pinValue='';
  updatePinDisplay();
  document.getElementById('pinError').textContent='';
  document.getElementById('adminModal').classList.add('show');
}
 
function pinPress(digit){
  if(pinValue.length>=4) return;
  pinValue+=digit;
  updatePinDisplay();
  if(pinValue.length===4) checkPin();
}
 
function pinDelete(){
  pinValue=pinValue.slice(0,-1);
  updatePinDisplay();
}
 
function pinClear(){
  pinValue='';
  updatePinDisplay();
}
 
function updatePinDisplay(){
  for(let i=0;i<4;i++){
    document.getElementById(`dot${i}`).classList.toggle('filled',i<pinValue.length);
  }
}
 
function checkPin(){
  if(pinValue===ADMIN_CODE){
    document.getElementById('adminModal').classList.remove('show');
    document.getElementById('page-admin').classList.add('unlocked');
    showPage('admin');
  } else {
    document.getElementById('pinError').textContent='Code incorrect, réessayez';
    pinValue='';
    updatePinDisplay();
    setTimeout(()=>{document.getElementById('pinError').textContent='';},2000);
  }
}
 
function closeAdminModal(){
  document.getElementById('adminModal').classList.remove('show');
  pinValue='';
  updatePinDisplay();
}
 
function showToast(msg){
  const t=document.getElementById('toast');

  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}
 
async function apiCall(params){
  try{
    const r=await fetch(SCRIPT_URL+'?'+new URLSearchParams(params).toString());
    return await r.text();
  }catch(e){console.error(e);return '';}
}

async function loadBadges(){
  const [cText, tText, pText] = await Promise.all([
    apiCall({action:'lire', sheet:'TACHES_CONFIG'}),
    apiCall({action:'lire', sheet:'TACHES'}),
    apiCall({action:'lire', sheet:'TACHES_PONCTUELLES'})
  ]);

  tachesConfig = [];
  parseLines(cText).forEach(l => {
    const c = l.split('|');
    if(c.length >= 10){
      tachesConfig.push({
        tache:c[0],
        enfant:c[1],
        lundi:c[2],
        mardi:c[3],
        mercredi:c[4],
        jeudi:c[5],
        vendredi:c[6],
        samedi:c[7],
        dimanche:c[8]
      });
    }
  });

  tachesData = [];
  parseLines(tText).forEach(l => {
    const c = l.split('|');
    if(c.length >= 4){
      tachesData.push({
        tache:c[0],
        enfant:c[1],
        jour:c[2],
        etat:c[3]
      });
    }
  });

  tachesPonctuelles = [];
  parseLines(pText).forEach(l => {
    const c = l.split('|');
    if(c.length >= 3){
      let date = c[2].trim();
      const parsed = new Date(date);
      if(!isNaN(parsed.getTime())){
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth()+1).padStart(2,'0');
        const d = String(parsed.getDate()).padStart(2,'0');
        date = `${y}-${m}-${d}`;
      }

      tachesPonctuelles.push({
        tache:c[0],
        enfant:c[1],
        date:date
      });
    }
  });

  const today = formatDateYYYYMMDD(new Date());
  const { jour } = getJourFromYMD(today);

  const profils = ['Alessia','Antonin','Clément','Diego','Jérémie','Mél & Yann'];
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
}

function parseLines(text){
  if(!text||text.trim()==='ok'||text.trim()==='') return [];
  return text.split('~~~~').map(l=>l.trim()).filter(l=>l.length>0);
}
 
function getTodayJour(){
  const d=new Date().getDay();
  return JOURS[d===0?6:d-1];
}


function chargerCFF() {
  fetch(SCRIPT_URL + "?sheet=CFF&action=lire")
    .then(r => r.text())
    .then(data => {
      let lignes = data.split("~~~~");
      let html = "";

      lignes.forEach(ligne => {
        let parts = ligne.split("|");
        if (parts.length > 0) {
          html += `<div>${ligne}</div>`;
        }
      });

      document.getElementById("cffList").innerHTML = html;
    });
}

function openCFF() {
  location.href = 'CFF.html';
}
function chargerMAGICPASS() {
  fetch(SCRIPT_URL + "?sheet=magicpass&action=lire")
    .then(r => r.text())
    .then(data => {
      let lignes = data.split("~~~~");
      let html = "";

      lignes.forEach(ligne => {
        let parts = ligne.split("|");
        if (parts.length > 0) {
          html += `<div>${ligne}</div>`;
        }
      });

      document.getElementById("magicpassList").innerHTML = html;
    });
}

function openMAGICPASS() {
  location.href = 'magicpass.html';
}
function chargerVACANCES() {
  fetch(API + '?sheet=VACANCES&action=model&userId=' + userId).then(r=>r.json())
    .then(data => {
      let lignes = data.split("~~~~");
      let html = "";

      lignes.forEach(ligne => {
        let parts = ligne.split("|");
        if (parts.length > 0) {
          html += `<div>${ligne}</div>`;
        }
      });

      document.getElementById("VACANCESList").innerHTML = html;
    });
}

function openVACANCES() {
  location.href = 'VACANCES.html';
}
 
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  // met le bouton actif visuellement

function showPage(name){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const el = document.getElementById('page-' + name);
  if (el) {
    el.classList.add('active');
  } else {
    console.log("Page inexistante:", name);
    return; // ✅ évite le crash
  }

  const order=['accueil','present','menu','courses','taches','job','admin'];
  const idx = order.indexOf(name);
  if (idx >= 0) document.querySelectorAll('.nav-tab')[idx].classList.add('active');

  if (name==='present') loadPresences();
  if (name==='menu') loadMenu();
  if (name==='courses') loadCourses(currentListe);
  if (name==='taches') loadTaches();
  if (name==='job') initCal();
  if (name==='admin') loadAdminConfig();
}
 

function setPresenceChoice(key, member, value){
  const hidden = document.getElementById(`presence_${key}_${member}`);
  if(!hidden) return;

  hidden.value = value;

  const btnPresent = document.getElementById(`btn_present_${key}_${member}`);
  const btnAbsent  = document.getElementById(`btn_absent_${key}_${member}`);
  const status     = document.getElementById(`status_${key}_${member}`);

  if(btnPresent) btnPresent.classList.toggle('active', value === 'TRUE');
  if(btnAbsent)  btnAbsent.classList.toggle('active', value === 'FALSE');

  if(status){
    status.className = 'presence-status';
    if(value === 'TRUE'){
      status.textContent = '✅ Présent';
      status.classList.add('present');
    } else if(value === 'FALSE'){
      status.textContent = '❌ Absent';
      status.classList.add('absent');
    } else {
      status.textContent = '⏳ Pas encore répondu';
      status.classList.add('pending');
    }
  }

  updateTotal(key);
}


function buildPresencesUI(){
  const { visible, editable } = getPresenceAccess();
  const dates = rollingDates(7);

  let html = '';

  dates.forEach(({label, date}) => {
    html += `<div class="jour-header">${label}</div>`;

    ['midi','soir'].forEach((repas) => {
      const key = `${date}_${repas}`;
      const data = presencesData[key] || {};

      const count = MEMBRES.filter(m => getPresenceValue(key, m) === 'TRUE').length;

      html += `<div class="repas-label">${repas.toUpperCase()}
        <span class="total-badge" id="total_${key}">${count} présent${count>1?'s':''}</span>
      </div>
      <div class="checkboxes-grid">`;

      MEMBRES.forEach((m, mi) => {
        if(!visible.includes(m)) return;

        const canEdit = editable.includes(m);
        const value = (data[m] ?? '').trim();

        // ✅ Cas enfant : boutons Présent / Absent
        if(!isParent && canEdit){
          html += `
            <div class="presence-choice-wrap">
              <div class="presence-choice-name">${MEMBRES_LABEL[mi]}</div>

              <input type="hidden" id="presence_${key}_${m}" value="${value}">

              <div class="presence-choice-buttons">
                <button type="button"
                  class="presence-btn present ${value === 'TRUE' ? 'active' : ''}"
                  id="btn_present_${key}_${m}"
                  onclick="setPresenceChoice('${key}','${m}','TRUE')">
                  ✅ Présent
                </button>

                <button type="button"
                  class="presence-btn absent ${value === 'FALSE' ? 'active' : ''}"
                  id="btn_absent_${key}_${m}"
                  onclick="setPresenceChoice('${key}','${m}','FALSE')">
                  ❌ Absent
                </button>
              </div>

              <div id="status_${key}_${m}" class="presence-status ${
                value === 'TRUE' ? 'present' : value === 'FALSE' ? 'absent' : 'pending'
              }">
                ${
                  value === 'TRUE'
                    ? '✅ Présent'
                    : value === 'FALSE'
                    ? '❌ Absent'
                    : '⏳ Pas encore répondu'
                }
              </div>
            </div>
          `;
        } else {
          // ✅ Cas parent / lecture seule : checkbox comme avant
          const checked = (value === 'TRUE');

          html += `
            <label class="checkbox-item" style="${canEdit ? '' : 'opacity:0.55;'}">
              <input type="checkbox"
                id="cb_${key}_${m}"
                data-key="${key}"
                ${checked ? 'checked' : ''}
                ${canEdit ? '' : 'disabled'}
                onchange="updateTotal(this.dataset.key)">
              <span>${MEMBRES_LABEL[mi]}</span>
            </label>
          `;
        }
      });

      html += `</div><div class="divider"></div>`;
    });
  });

  document.getElementById('present-content').innerHTML = html;

  // Un enfant ne voit pas le bouton "Effacer"
  document.querySelectorAll('#page-present .btn-secondary').forEach(btn => {
    btn.style.display = isParent ? '' : 'none';
  });
}



 

function updateTotal(key){
  const count = MEMBRES.filter(m => getPresenceValue(key, m) === 'TRUE').length;
  const el = document.getElementById(`total_${key}`);
  if(el) el.textContent = `${count} présent${count>1?'s':''}`;
}


async function loadPresences(){
  document.getElementById('present-loading').style.display='block';
  document.getElementById('present-content').style.display='none';
  const start = todayYMD();
  const text = await apiCall({action:'lire', sheet:'PRESENCES', start, days:7});
  presencesData = {};
  parseLines(text).forEach(line => {
    const c = line.split('|');
    if(c.length >= 9) {
      // ✅ Convertit la date peu importe son format
      let rawDate = c[0].trim();
      let dateKey = rawDate;
      const parsed = new Date(rawDate);
      if(!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth()+1).padStart(2,'0');
        const d = String(parsed.getDate()).padStart(2,'0');
        dateKey = `${y}-${m}-${d}`;
      }
      const repasKey = c[1].trim().toLowerCase();
presencesData[`${dateKey}_${repasKey}`] = {
  alessia:c[2].trim(), antonin:c[3].trim(), clement:c[4].trim(),
  diego:c[5].trim(), jeremie:c[6].trim(), melanie:c[7].trim(),
  yann:c[8].trim()
};

    }
  });
  document.getElementById('present-loading').style.display='none';
  document.getElementById('present-content').style.display='block';
  buildPresencesUI();
}
 

async function savePresences(){
  showToast('Enregistrement...');
  const { editable } = getPresenceAccess();
  const editableSet = new Set(editable);

  const dates = rollingDates(7);
  for(const {date} of dates){
    for(const repas of ['midi','soir']){
      const key = `${date}_${repas}`;
      const p = {action:'enregistrer', sheet:'PRESENCES', jour:date, repas};

      // Pour chaque membre :
      // - si modifiable -> on lit la checkbox
      // - sinon -> on garde la valeur déjà en mémoire (presencesData)
MEMBRES.forEach(m => {
  if(editableSet.has(m)){
    p[m] = getPresenceValue(key, m); // '' | TRUE | FALSE
  } else {
    p[m] = presencesData?.[key]?.[m] ?? '';
  }
});

      await apiCall(p);
    }
  }
  showToast('✅ Présences enregistrées !');
}


 
async function clearPresences(){
  if(!confirm('Effacer toutes les présences ?')) return;
  await apiCall({action:'effacer',sheet:'PRESENCES'});
  presencesData={};
  buildPresencesUI();
  showToast('🗑️ Présences effacées');
}
 
async function loadMenu(){
  document.getElementById('menu-loading').style.display='block';
  document.getElementById('menu-content').style.display='none';
  const start = todayYMD();
  const [pText, mText] = await Promise.all([
    apiCall({action:'lire', sheet:'PRESENCES', start, days:7}),
    apiCall({action:'lire', sheet:'MENU'})
  ]);
  presencesData = {};
  parseLines(pText).forEach(line => {
  const c = line.split('|');
  if(c.length >= 9) {
    let rawDate = c[0].trim();
    let dateKey = rawDate;
    const parsed = new Date(rawDate);
    if(!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth()+1).padStart(2,'0');
      const d = String(parsed.getDate()).padStart(2,'0');
      dateKey = `${y}-${m}-${d}`;
    }
    presencesData[`${dateKey}_${c[1].trim()}`] = {
      alessia:c[2].trim(), antonin:c[3].trim(), clement:c[4].trim(),
      diego:c[5].trim(), jeremie:c[6].trim(), melanie:c[7].trim(),
      yann:c[8].trim()
    };
  }
});
  menuData = {};
parseLines(mText).forEach(line => {
  const c = line.split('|');
  if(c.length >= 3) {
    let rawDate = c[0].trim();
    let dateKey = rawDate;
    const parsed = new Date(rawDate);
    if(!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth()+1).padStart(2,'0');
      const d = String(parsed.getDate()).padStart(2,'0');
      dateKey = `${y}-${m}-${d}`;
    }
    menuData[`${dateKey}_${c[1].trim()}`] = c.slice(2).join('|').trim();
  }
});
  const dates = rollingDates(7);
  let html = '';
  dates.forEach(function(item) {
  var label = item.label;
  var date = item.date;

    html += `<div class="menu-jour-card"><div class="jour-header" style="margin-bottom:12px">${label}</div>`;
    ['midi','soir'].forEach(repas => {
      const key = `${date}_${repas}`;
      const count = MEMBRES.filter(m => presencesData[key]?.[m]==='TRUE').length;
      const val = (menuData[key]||'').replace(/"/g,'&quot;').replace(/^-$/,'').trim();
      html += `<div class="menu-repas-row">
        <span class="menu-repas-label">${repas}</span>
        <input type="text" class="menu-repas-input" id="menu_${key}" placeholder="Repas du ${repas}..." value="${val}">
        <span class="menu-presences">${count}</span>
      </div>`;
    });
    html += `</div>`;
  });
  document.getElementById('menu-content').innerHTML = html;
  document.getElementById('menu-loading').style.display='none';
  document.getElementById('menu-content').style.display='block';
}
 
async function saveMenu(){
  showToast('Enregistrement...');
  const dates = rollingDates(7);
  for(const {date} of dates){
    for(const repas of ['midi','soir']){
      const plat = document.getElementById(`menu_${date}_${repas}`)?.value?.trim() || '';
      await apiCall({action:'enregistrer', sheet:'MENU', jour:date, repas, plat: plat||'-'});
    }
  }
  showToast('✅ Menu enregistré !');
}
 
async function clearMenu(){
  if(!confirm('Effacer tout le menu ?')) return;
  await apiCall({action:'effacer',sheet:'MENU'});
  loadMenu();
  showToast('🗑️ Menu effacé');
}
 
function showListe(liste,btn){
  currentListe=liste;
  document.querySelectorAll('#page-courses .inner-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  loadCourses(liste);
}
 
async function loadCourses(liste){
  document.getElementById('courses-list').innerHTML='<div class="loading">Chargement...</div>';
  const text=await apiCall({action:'lire',sheet:'COURSES',liste});
  coursesData[liste]=[];
  parseLines(text).forEach(line=>{
    const pipe=line.indexOf('|');
    const ingredient=pipe>=0?line.substring(0,pipe).trim():line.trim();
    if(ingredient) coursesData[liste].push(ingredient);
  });
  renderCourses(liste);
}
 
function renderCourses(liste){
  const container=document.getElementById('courses-list');
  if(!coursesData[liste]?.length){container.innerHTML='<div class="loading">Liste vide</div>';return;}
  container.innerHTML=coursesData[liste].map((item,i)=>
    `<div class="course-item" id="ci_${i}">
      <span>${item}</span>
      <button class="btn-delete" onclick="deleteCourse(${i},'${item.replace(/'/g,"\\'").replace(/\\/g,'\\\\')}')">✕</button>
    </div>`
  ).join('');
}
 
async function addCourse(){
  const input=document.getElementById('input-course');
  const ingredient=input.value.trim();
  if(!ingredient) return;
  await apiCall({action:'ajouter',sheet:'COURSES',ingredient,liste:currentListe});
  input.value='';
  showToast('✅ Ajouté !');
  loadCourses(currentListe);
}
 
async function deleteCourse(idx,ingredient){
  await apiCall({action:'supprimer',sheet:'COURSES',ingredient,liste:currentListe});
  coursesData[currentListe].splice(idx,1);
  renderCourses(currentListe);
  showToast('🗑️ Supprimé');
}
 
async function clearListe(){
  if(!confirm('Vider toute cette liste ?')) return;
  await apiCall({action:'effacer_liste',sheet:'COURSES',liste:currentListe});
  coursesData[currentListe]=[];
  renderCourses(currentListe);
  showToast('🗑️ Liste vidée');
}
 
async function loadTaches(){
  document.getElementById('taches-content').innerHTML='<div class="loading"><div class="spinner"></div>Chargement...</div>';
  const [cText,tText,pText]=await Promise.all([
    apiCall({action:'lire',sheet:'TACHES_CONFIG'}),
    apiCall({action:'lire',sheet:'TACHES'}),
    apiCall({action:'lire',sheet:'TACHES_PONCTUELLES'})
  ]);
  tachesConfig=[];
  parseLines(cText).forEach(line=>{
    const c=line.split('|');
    if(c.length>=10) tachesConfig.push({tache:c[0],enfant:c[1],lundi:c[2],mardi:c[3],mercredi:c[4],jeudi:c[5],vendredi:c[6],samedi:c[7],dimanche:c[8],active:c[9]?.trim()});
  });
  tachesData=[];
  parseLines(tText).forEach(line=>{
    const c=line.split('|');
    if(c.length>=4) tachesData.push({tache:c[0],enfant:c[1],jour:c[2],etat:c[3]?.trim()});
  });
  tachesPonctuelles=[];
  parseLines(pText).forEach(line=>{
    const c=line.split('|');
    if(c.length>=3){
      const rawDate=c[2].trim();
      let date=rawDate;
      const parsed=new Date(rawDate);
      if(!isNaN(parsed.getTime())){
        const y=parsed.getFullYear();
        const m=String(parsed.getMonth()+1).padStart(2,'0');
        const d=String(parsed.getDate()).padStart(2,'0');
        date=`${y}-${m}-${d}`;
      }
      tachesPonctuelles.push({tache:c[0],enfant:c[1],date:date,icon:'📌'});
    }
  });
  renderTaches();
}
 
function getTacheIcon(label){return TACHES_FIXES.find(t=>t.label===label)?.icon||'📋';}
 

function getToutesLesTachesEnfant(enfant, jour, dateYMD) {
  const dateStr = dateYMD || formatDateYYYYMMDD(new Date());
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dow = dateObj.getDay(); // 0=dim, 4=jeu, 5=ven
  const taches = [];

  // 1) Tâches fixes configurées (par jour de semaine)
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

  // 1bis) Tâches spéciales parents
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

  // 2) Tâches récurrentes
  if (dow === 4 || dow === 5) {
    TACHES_RECURRENTES
      .filter(t => t.personne === enfant)
      .forEach(t => {
        if (isTacheRecurrenteActive(t, dateStr)) {
          const vendredi = new Date(dateStr + "T00:00:00");
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

  // 3) Tâches ponctuelles
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
  // On ne garde ici que le "retard hier" pour les tâches fixes/récurrentes (car elles ne sont pas datées)
  const todayStr = formatDateYYYYMMDD(new Date());
  const yesterdayStr = dateMinusDays(todayStr, 1);

  const { jour: jourHier } = getJourFromYMD(yesterdayStr);

  // 🔥 IMPORTANT : on passe la date d'hier pour éviter d'embarquer les ponctuelles d'aujourd'hui
  const toutesHier = getToutesLesTachesEnfant(enfant, jourHier, yesterdayStr);

  // Retard = non fait (selon ton modèle actuel : fixes stockées par jour de semaine)
  return toutesHier.filter(t => {
    
const etat = tachesData.find(td =>
  td.tache === t.tache &&
  td.enfant === enfant &&
  td.jour === t.jourReel   // ✅ uniquement date
);

    return !etat || (etat.etat || '').trim() !== 'Fait';
  }).map(t => ({
    ...t,
    enRetard:true,
    dueDate: yesterdayStr
  }));
}
 

function getPonctuellesEnRetard(enfant){
  const todayStr = formatDateYYYYMMDD(new Date());

  const enfantsPonct = (enfant === 'Mél & Yann')
    ? ['Mél & Yann','Mélanie','Yann']
    : [enfant];

  // Ponctuelles dont la date est passée
  const overdue = tachesPonctuelles.filter(t =>
    enfantsPonct.includes(t.enfant) && t.date < todayStr
  );

  // On garde uniquement celles non validées (etat "Fait" enregistré avec jour = date)
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
    jourReel: t.date,      // clé d'enregistrement
    dueDate: t.date,       // affichage
    enfantReel: t.enfant
  }));
}

 
function renderTaches(){
  const today=new Date();
  const dow=today.getDay();
  const jourIdx=dow===0?6:dow-1;
  const jour=JOURS[jourIdx];
  if(isParent){
    renderTachesParentSelf(jour,jourIdx);
    return;
  }
  const enfant=currentUser==='parent'?'Mél & Yann':currentUser;
  const toutesLesTaches=getToutesLesTachesEnfant(enfant,jour);
  const enRetardFixes = getTachesEnRetard(enfant);
  const enRetardPonct = getPonctuellesEnRetard(enfant);
  const enRetard = [...enRetardPonct, ...enRetardFixes];

  const nonFaites=toutesLesTaches.filter(t=>{
    const etat=tachesData.find(td=>td.tache===t.tache&&td.enfant===enfant&&td.jour===t.jourReel);
    return !etat||etat.etat?.trim()!=='Fait';
  });
  if(!toutesLesTaches.length&&!enRetard.length){
    document.getElementById('taches-content').innerHTML=`<div class="card"><div class="all-done"><span class="big-icon">🎉</span><p>Aucune tâche pour aujourd'hui !</p></div></div>`;
    return;
  }
  if(!nonFaites.length&&!enRetard.length){
    document.getElementById('taches-content').innerHTML=`<div class="card"><div class="all-done"><span class="big-icon">🌟</span><p>Bravo ${enfant} !<br>Toutes tes tâches sont faites !</p></div></div>`;
    return;
  }
  let html='';
  if(enRetard.length){
    html+=`<div class="card" style="border-left:4px solid var(--orange)">
      <div class="card-title" style="color:var(--orange)">⚠️ En retard — Hier</div>
      <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">${enRetard.length} tâche${enRetard.length>1?'s':''} non faite${enRetard.length>1?'s':''} hier</p>`;
    enRetard.forEach(t=>{
      const idSafe='retard_'+t.tache.replace(/[^a-z]/gi,'_');
      html+=`<div class="tache-item" id="${idSafe}">
        <div class="tache-info"><span class="tache-icon">${t.icon}</span><span class="tache-name">${t.tache}</span></div>
        <button class="tache-toggle non-fait" onclick="toggleTache('${t.tache.replace(/'/g,"\\'")}','${t.jourReel}',false,'${enfant}')">⬜ À faire</button>
      </div>`;
    });
    html+=`</div>`;
  }
  if(nonFaites.length){
    html+=`<div class="card">
      <div class="card-title">✅ Mes tâches — ${JOURS_LABEL[jourIdx]}</div>
      <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">${nonFaites.length} tâche${nonFaites.length>1?'s':''} à faire</p>`;
    nonFaites.forEach(t=>{
      const idSafe=t.tache.replace(/[^a-z]/gi,'_');
      const badge=t.badge?`<span style="font-size:0.7rem;background:var(--orange);color:white;padding:2px 7px;border-radius:20px;margin-left:6px">${t.badge}</span>`:'';
      html+=`<div class="tache-item" id="tache_${idSafe}">
        <div class="tache-info"><span class="tache-icon">${t.icon}</span><div><span class="tache-name">${t.tache}</span>${badge}</div></div>
        <button class="tache-toggle non-fait" onclick="toggleTache('${t.tache.replace(/'/g,"\\'")}','${t.jourReel}',false,'${enfant}')">⬜ À faire</button>
      </div>`;
    });
    html+=`</div>`;
  }
  document.getElementById('taches-content').innerHTML=html;
}
 
function renderTachesParentSelf(jour,jourIdx){
  const enfant='Mél & Yann';
  const toutesLesTaches=getToutesLesTachesEnfant(enfant,jour);
  const enRetard=getTachesEnRetard(enfant);
  const nonFaites=toutesLesTaches.filter(t=>{
    const etat=tachesData.find(td=>td.tache===t.tache&&td.enfant===enfant&&td.jour===t.jourReel);
    return !etat||etat.etat?.trim()!=='Fait';
  });
  if(!toutesLesTaches.length&&!enRetard.length){
    document.getElementById('taches-content').innerHTML=`<div class="card"><div class="all-done"><span class="big-icon">🎉</span><p>Aucune tâche pour vous aujourd'hui !</p></div></div>`;
    return;
  }
  if(!nonFaites.length&&!enRetard.length){
    document.getElementById('taches-content').innerHTML=`<div class="card"><div class="all-done"><span class="big-icon">🌟</span><p>Bravo !<br>Toutes vos tâches sont faites !</p></div></div>`;
    return;
  }
  let html='';
  if(enRetard.length){
    html+=`<div class="card" style="border-left:4px solid var(--orange)">
      <div class="card-title" style="color:var(--orange)">⚠️ En retard — Hier</div>
      <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">${enRetard.length} tâche${enRetard.length>1?'s':''} non faite${enRetard.length>1?'s':''} hier</p>`;
    enRetard.forEach(t=>{
      const idSafe='retard_'+t.tache.replace(/[^a-z]/gi,'_');
      html+=`<div class="tache-item" id="${idSafe}">
        <div class="tache-info"><span class="tache-icon">${t.icon}</span><span class="tache-name">${t.tache}</span></div>
        <button class="tache-toggle non-fait" onclick="toggleTache('${t.tache.replace(/'/g,"\\'")}','${t.jourReel}',false,'${enfant}')">⬜ À faire</button>
      </div>`;
    });
    html+=`</div>`;
  }
  if(nonFaites.length){
    html+=`<div class="card">
      <div class="card-title">✅ Nos tâches — ${JOURS_LABEL[jourIdx]}</div>
      <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">${nonFaites.length} tâche${nonFaites.length>1?'s':''} à faire</p>`;
    nonFaites.forEach(t=>{
      const idSafe=t.tache.replace(/[^a-z]/gi,'_');
      const sous=t.enfantReel?`<span style="display:block;font-size:0.78rem;color:var(--text-light)">${t.enfantReel}</span>`:'';
      html+=`<div class="tache-item" id="tache_${idSafe}">
        <div class="tache-info"><span class="tache-icon">${t.icon}</span><div><span class="tache-name">${t.tache}</span>${sous}</div></div>
        <button class="tache-toggle non-fait" onclick="toggleTache('${t.tache.replace(/'/g,"\\'")}','${t.jourReel}',false,'${enfant}')">⬜ À faire</button>
      </div>`;
    });
    html+=`</div>`;
  }
  document.getElementById('taches-content').innerHTML=html;
}
 
function renderTachesParent(jour,ji){
  let html='';
  const tachesParentsActives=TACHES_PARENTS.filter(t=>isTacheParentActive(t));
  const dateStr=new Date().toISOString().split('T')[0];
  const ponctParents=tachesPonctuelles.filter(t=>(t.enfant==='Mél & Yann'||['Mélanie','Yann'].includes(t.enfant))&&t.date===dateStr);
  if(tachesParentsActives.length||ponctParents.length){
    html+=`<div class="card"><div class="card-title">🏠 Mélanie & Yann — ${JOURS_LABEL[ji]}</div>`;
    tachesParentsActives.forEach(t=>{
      html+=`<div class="tache-item"><div class="tache-info"><span class="tache-icon">${t.icon}</span><span class="tache-name">${t.label}</span></div><span class="tache-toggle non-fait" style="cursor:default">⬜ À faire</span></div>`;
    });
    ponctParents.forEach(t=>{
      html+=`<div class="tache-item"><div class="tache-info"><span class="tache-icon">📌</span><span class="tache-name">${t.tache} <span style="font-size:0.75rem;color:var(--text-light)">(${t.enfant})</span></span></div><span class="tache-toggle non-fait" style="cursor:default">⬜ À faire</span></div>`;
    });
    html+=`</div>`;
  }
  const enfants=['Alessia','Antonin','Clément','Diego','Jérémie'];
  enfants.forEach(enfant=>{
    const toutesLesTaches=getToutesLesTachesEnfant(enfant,jour);
    if(!toutesLesTaches.length) return;
    const faites=toutesLesTaches.filter(t=>{
      const etat=tachesData.find(td=>td.tache===t.tache&&td.enfant===enfant&&td.jour===t.jourReel);
      return etat&&etat.etat?.trim()==='Fait';
    });
    html+=`<div class="card"><div class="card-title">${enfant} — ${faites.length}/${toutesLesTaches.length} faites</div>`;
    toutesLesTaches.forEach(t=>{
      const etat=tachesData.find(td=>td.tache===t.tache&&td.enfant===enfant&&td.jour===t.jourReel);
      const fait=etat?.etat?.trim()==='Fait';
      const badge=t.badge?`<span style="font-size:0.7rem;background:var(--orange);color:white;padding:2px 7px;border-radius:20px;margin-left:6px">${t.badge}</span>`:'';
      html+=`<div class="tache-item"><div class="tache-info"><span class="tache-icon">${t.icon}</span><div><span class="tache-name">${t.tache}</span>${badge}</div></div><span class="tache-toggle ${fait?'fait':'non-fait'}" style="cursor:default">${fait?'✅ Fait':'⬜ À faire'}</span></div>`;
    });
    html+=`</div>`;
  });
  if(!html) html='<div class="card"><div class="loading">Aucune tâche aujourd\'hui</div></div>';
  document.getElementById('taches-content').innerHTML=html;
}
 
async function toggleTache(tache,jour,estFait,enfant){
  const id='tache_'+tache.replace(/[^a-z]/gi,'_');
  const el=document.getElementById(id);
  if(el) el.classList.add('done');
  await apiCall({action:'enregistrer',sheet:'TACHES',tache,enfant,jour,etat:'Fait'});
  showToast('✅ Bien joué !');
  setTimeout(()=>loadTaches(),400);
}
 
function initCal(){
  const now=new Date();
  calYear=now.getFullYear();
  calMonth=now.getMonth();
  loadJob();
}
 
async function loadJob(){
  const text=await apiCall({action:'lire',sheet:'JOB',mois:MOIS_NOMS[calMonth],annee:String(calYear)});
  jobData={};
  parseLines(text).forEach(line=>{
    const c=line.split('|');
    if(c.length>=5){
      const jour=c[2].trim(),personne=c[3].trim(),type=c[4].trim();
      if(type&&type!=='vide'){
        if(!jobData[jour]) jobData[jour]={};
        jobData[jour][personne]=type;
      }
    }
  });
  renderCal();
}
 

function renderCal() {
  document.getElementById('cal-month-title').textContent = `${MOIS_NOMS[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');

  let html = JOURS_COURTS.map(j => `<div class="cal-day-name">${j}</div>`).join('');

  let dow = new Date(calYear, calMonth, 1).getDay();
  dow = dow === 0 ? 6 : dow - 1;
  for (let i = 0; i < dow; i++) html += `<div class="cal-day empty"></div>`;

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
      <div class="cal-day ${hasData ? 'has-data' : ''} ${isToday ? 'today' : ''}"
           onclick="openJobModal(${d})">
        <span class="day-num ${isToday ? 'today-num' : ''}">${d}</span>
        ${iconsHtml}
      </div>
    `;
  }

  grid.innerHTML = html;
}

 
function changeMonth(dir){
  calMonth+=dir;
  if(calMonth<0){calMonth=11;calYear--;}
  if(calMonth>11){calMonth=0;calYear++;}
  loadJob();
}
 
function openJobModal(day){
  selectedDay=day;
  const dd=jobData[String(day)]||{};
  document.getElementById('modalTitle').textContent=`${day} ${MOIS_NOMS[calMonth]} ${calYear}`;
  document.getElementById('modalSub').textContent='Qui travaille ce jour ?';
  const isA=(p,t)=>dd[p]===t;
  document.getElementById('modalBtns').innerHTML=`
    <button class="modal-btn" style="background:#4CAF50;color:white" onclick="saveJob('Jeremie','travaille')"><img src="image/Jeremie.png" class="modal-icon"> Jérémie - travaille ${isA('Jeremie','travaille')?'✓':''}</button>
    <button class="modal-btn" style="background:#E91E93;color:white" onclick="saveJob('Melanie','jour')"><img src="image/Melanie.png" class="modal-icon"> Mélanie — Jour ${isA('Melanie','jour')?'✓':''}</button>
    <button class="modal-btn" style="background:#9C27B0;color:white" onclick="saveJob('Melanie','nuit')"><img src="image/Melanie.png" class="modal-icon"> Mélanie — Nuit ${isA('Melanie','nuit')?'✓':''}</button>
    <button class="modal-btn" style="background:#F9A825;color:#333" onclick="saveJob('Yann','jour')"><img src="image/Yann.png" class="modal-icon"> Yann — Jour ${isA('Yann','jour')?'✓':''}</button>
    <button class="modal-btn" style="background:#FF8F00;color:white" onclick="saveJob('Yann','nuit')"><img src="image/Yann.png" class="modal-icon"> Yann — Nuit ${isA('Yann','nuit')?'✓':''}</button>
    <div class="modal-section"></div>
    <button class="modal-btn" style="background:#f44336;color:white" onclick="clearJobDay()">❌ Effacer ce jour</button>
    <button class="modal-btn" style="background:#eee;color:#333" onclick="closeModal()">Annuler</button>`;
  document.getElementById('jobModal').classList.add('show');
}
 
async function saveJob(personne,type){
  closeModal();
  await apiCall({action:'enregistrer',sheet:'JOB',mois:MOIS_NOMS[calMonth],annee:String(calYear),jour:String(selectedDay),personne,type});
  if(!jobData[String(selectedDay)]) jobData[String(selectedDay)]={};
  jobData[String(selectedDay)][personne]=type;
  renderCal();
  showToast('✅ Enregistré !');
}
 
async function clearJobDay(){
  closeModal();
  for(const p of ['Jeremie','Melanie','Yann']){
    await apiCall({action:'enregistrer',sheet:'JOB',mois:MOIS_NOMS[calMonth],annee:String(calYear),jour:String(selectedDay),personne:p,type:'vide'});
  }
  delete jobData[String(selectedDay)];
  renderCal();
  showToast('🗑️ Jour effacé');
}
 
function closeModal(){document.getElementById('jobModal').classList.remove('show');}
 
function showAdminEnfant(enfant,btn){
  currentAdminEnfant=enfant;
  document.querySelectorAll('#admin-tabs .inner-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderAdminForm();
}
 
function renderAdminForm(){
  let html='';
  TACHES_FIXES.forEach(tache=>{
    const ex=tachesConfig.find(t=>t.tache===tache.label&&t.enfant===currentAdminEnfant);
    html+=`<div class="admin-tache-block"><div class="admin-tache-header"><span>${tache.icon}</span>${tache.label}</div><div class="admin-days-grid">`;
    JOURS.forEach((jour,ji)=>{
      const checked=ex&&ex[jour]==='TRUE'?'checked':'';
      html+=`<div class="day-check"><label for="a_${tache.id}_${jour}">${JOURS_COURTS[ji]}</label><input type="checkbox" id="a_${tache.id}_${jour}" ${checked}></div>`;
    });
    html+=`</div></div>`;
  });
  document.getElementById('admin-taches-form').innerHTML=html;
}
 
async function loadAdminConfig(){
  const text=await apiCall({action:'lire',sheet:'TACHES_CONFIG'});
  tachesConfig=[];
  parseLines(text).forEach(line=>{
    const c=line.split('|');
    if(c.length>=10) tachesConfig.push({tache:c[0],enfant:c[1],lundi:c[2],mardi:c[3],mercredi:c[4],jeudi:c[5],vendredi:c[6],samedi:c[7],dimanche:c[8],active:c[9]?.trim()});
  });
  renderAdminForm();
  renderPreview(currentPreviewEnfant);
  loadPonctuelles();
  const today=formatDateYYYYMMDD();
  if(document.getElementById('ponct-date')) document.getElementById('ponct-date').value=today;
}
 
async function saveTachePonctuelle(){
  const tache=document.getElementById('ponct-tache').value.trim();
  const enfant=document.getElementById('ponct-enfant').value;
  const date=document.getElementById('ponct-date').value;
  if(!tache||!date){showToast('⚠️ Remplis tous les champs');return;}
  await apiCall({action:'enregistrer',sheet:'TACHES_PONCTUELLES',tache,enfant,date});
  document.getElementById('ponct-tache').value='';
  document.getElementById('ponct-date').value='';
  showToast('📌 Tâche ponctuelle ajoutée !');
  loadPonctuelles();
}
 async function loadLoginReminders(){
  const board = document.getElementById('loginReminderBoard');
  if(!board) return;

  board.innerHTML = `<div class="loading">Chargement des rappels...</div>`;

  const [cText, tText, pText] = await Promise.all([
    apiCall({action:'lire', sheet:'TACHES_CONFIG'}),
    apiCall({action:'lire', sheet:'TACHES'}),
    apiCall({action:'lire', sheet:'TACHES_PONCTUELLES'})
  ]);

  // recharge les données globales
  tachesConfig = [];
  parseLines(cText).forEach(line => {
    const c = line.split('|');
    if(c.length >= 10){
      tachesConfig.push({
        tache:c[0], enfant:c[1],
        lundi:c[2], mardi:c[3], mercredi:c[4], jeudi:c[5],
        vendredi:c[6], samedi:c[7], dimanche:c[8],
        active:c[9]?.trim()
      });
    }
  });

  tachesData = [];
  parseLines(tText).forEach(line => {
    const c = line.split('|');
    if(c.length >= 4){
      tachesData.push({
        tache:c[0],
        enfant:c[1],
        jour:c[2],
        etat:c[3]?.trim()
      });
    }
  });

  tachesPonctuelles = [];
  parseLines(pText).forEach(line => {
    const c = line.split('|');
    if(c.length >= 3){
      tachesPonctuelles.push({
        tache:c[0],
        enfant:c[1],
        date:c[2].trim(),
        icon:'📌'
      });
    }
  });

  const todayStr = formatDateYYYYMMDD(new Date());
  const { jour } = getJourFromYMD(todayStr);

  const profils = ['Alessia','Antonin','Clément','Diego','Jérémie','Mél & Yann'];

  const phrases = {
    'Alessia':  'Alessia, tes petites missions du jour t’attendent 🌟',
    'Antonin':  'Antonin, mission contrôle des tâches aujourd’hui 👀',
    'Clément':  'Clément, un petit coup d’œil à tes tâches ? ✅',
    'Diego':    'Diego, pense à vérifier ce qu’il y a à faire 🎯',
    'Jérémie':  'Jérémie, tes tâches du jour sont prêtes 🚀',
    'Mél & Yann':'Parents, petit check des tâches du jour 🏠'
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

    if(!nonFaites.length) return '';

    return `
      <div class="login-reminder-card">
        <div class="login-reminder-title">${nom}</div>
        <div class="login-reminder-text">
          ${phrases[nom]}<br>
          <strong>${nonFaites.length}</strong> tâche${nonFaites.length > 1 ? 's' : ''} à faire aujourd’hui.
        </div>
      </div>
    `;
  }).filter(Boolean);

  if(!cards.length){
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

async function loadPonctuelles(){
  const text=await apiCall({action:'lire',sheet:'TACHES_PONCTUELLES'});
  const items=[];
  parseLines(text).forEach(line=>{
    const c=line.split('|');
    if(c.length>=3) items.push({tache:c[0],enfant:c[1],date:c[2].trim()});
  });
  const today=formatDateYYYYMMDD();
  const futures=items.filter(i=>i.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
  const container=document.getElementById('ponct-list');
  if(!futures.length){container.innerHTML='<div class="loading" style="padding:8px">Aucune tâche ponctuelle à venir</div>';return;}
  container.innerHTML=futures.map(i=>`
    <div class="tache-item" style="margin-bottom:4px">
      <div class="tache-info">
        <span class="tache-icon">📌</span>
        <div><span class="tache-name">${i.tache}</span><span style="display:block;font-size:0.78rem;color:var(--text-light)">${i.enfant} — ${i.date}</span></div>
      </div>
      <button class="btn-delete" onclick="deletePonctuelle('${i.tache.replace(/'/g,"\\'")}','${i.enfant}','${i.date}')">✕</button>
    </div>`).join('');
}
 
async function deletePonctuelle(tache,enfant,date){
  await apiCall({action:'supprimer',sheet:'TACHES_PONCTUELLES',tache,enfant,date});
  showToast('🗑️ Tâche supprimée');
  loadPonctuelles();
}
 
async function saveAdminConfig(){
  showToast('Enregistrement...');
  for(const tache of TACHES_FIXES){
    const p={action:'enregistrer',sheet:'TACHES_CONFIG',tache:tache.label,enfant:currentAdminEnfant,active:'TRUE'};
    JOURS.forEach(jour=>{p[jour]=document.getElementById(`a_${tache.id}_${jour}`)?.checked?'TRUE':'FALSE';});
    await apiCall(p);
  }
  showToast('✅ Configuration enregistrée !');
  loadAdminConfig();
}

async function ajouter(){
  const p = document.getElementById("pers").value;
  const montant = parseFloat(document.getElementById("montant").value);

  if (!isFinite(montant) || montant <= 0) {
    alert("⚠️ Montant invalide");
    return;
  }

  const body = new URLSearchParams({
    sheet:"CFF",
    action:"ajouter",
    personne:p,
    montant
  });

  const res = await fetch(API, { method:"POST", body }).then(r => r.text());

  if (res.trim() !== "ok") {
    alert(res);
    return;
  }

  document.getElementById("montant").value = "";
  await loadTrips();
}

let currentPreviewEnfant='Alessia';
 
function showPreviewEnfant(enfant,btn){
  currentPreviewEnfant=enfant;
  document.querySelectorAll('#preview-tabs .inner-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  if(enfant==='Mél & Yann') renderPreviewParents();
  else renderPreview(enfant);
}
 
function renderPreviewParents(){
  const today = new Date();
  const dow = today.getDay();
  const jourIdx = dow === 0 ? 6 : dow - 1;
  const jour = JOURS[jourIdx];
  const dateStr = formatDateYYYYMMDD(today);

  const enfant = 'Mél & Yann';
  const toutesLesTaches = getToutesLesTachesEnfant(enfant, jour, dateStr);

  if(!toutesLesTaches.length){
    document.getElementById('preview-content').innerHTML = `
      <div class="all-done">
        <span class="big-icon">😊</span>
        <p>Aucune tâche pour Mélanie & Yann aujourd'hui !</p>
      </div>`;
    return;
  }

  const faites = toutesLesTaches.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );
    return etat && etat.etat?.trim() === 'Fait';
  });

  const nonFaites = toutesLesTaches.filter(t => {
    const etat = tachesData.find(td =>
      td.tache === t.tache &&
      td.enfant === enfant &&
      td.jour === t.jourReel
    );
    return !etat || etat.etat?.trim() !== 'Fait';
  });

  let html = `
    <p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">
      ${JOURS_LABEL[jourIdx]} — ${faites.length}/${toutesLesTaches.length} faite${faites.length>1?'s':''}
    </p>`;

  if(!nonFaites.length){
    html += `
      <div class="all-done">
        <span class="big-icon">🌟</span>
        <p>Tout est fait !</p>
      </div>`;
  } else {
    html += `<p style="font-size:0.8rem;font-weight:700;color:var(--rose);margin-bottom:8px">⬜ À faire :</p>`;
    nonFaites.forEach(t => {
      const sous = t.enfantReel
        ? `<span style="font-size:0.75rem;color:var(--text-light)">(${t.enfantReel})</span>`
        : '';
      html += `
        <div class="tache-item">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <span class="tache-name">${t.tache} ${sous}</span>
          </div>
          <span class="tache-toggle non-fait" style="cursor:default">⬜ À faire</span>
        </div>`;
    });
  }

  if(faites.length){
    html += `<p style="font-size:0.8rem;font-weight:700;color:#4CAF50;margin:12px 0 8px">✅ Déjà fait :</p>`;
    faites.forEach(t => {
      const sous = t.enfantReel
        ? `<span style="font-size:0.75rem;color:var(--text-light)">(${t.enfantReel})</span>`
        : '';
      html += `
        <div class="tache-item" style="opacity:0.6">
          <div class="tache-info">
            <span class="tache-icon">${t.icon}</span>
            <span class="tache-name" style="text-decoration:line-through">${t.tache} ${sous}</span>
          </div>
          <span class="tache-toggle fait" style="cursor:default">✅ Fait</span>
        </div>`;
    });
  }

  document.getElementById('preview-content').innerHTML = html;
}

 
function renderPreview(enfant){
  const today=new Date();
  const dow=today.getDay();
  const jourIdx=dow===0?6:dow-1;
  const jour=JOURS[jourIdx];
  const toutesLesTaches=getToutesLesTachesEnfant(enfant,jour);
  if(!toutesLesTaches.length){
    document.getElementById('preview-content').innerHTML=`<div class="all-done"><span class="big-icon">😴</span><p>Aucune tâche pour ${enfant} aujourd'hui</p></div>`;
    return;
  }
  const faites=toutesLesTaches.filter(t=>{
    const etat=tachesData.find(td=>td.tache===t.tache&&td.enfant===enfant&&td.jour===t.jourReel);
    return etat&&etat.etat?.trim()==='Fait';
  });
  const nonFaites=toutesLesTaches.filter(t=>{
    const etat=tachesData.find(td=>td.tache===t.tache&&td.enfant===enfant&&td.jour===t.jourReel);
    return !etat||etat.etat?.trim()!=='Fait';
  });
  let html=`<p style="font-size:0.85rem;color:var(--text-light);font-weight:600;margin-bottom:12px">${JOURS_LABEL[jourIdx]} — ${faites.length}/${toutesLesTaches.length} faite${faites.length>1?'s':''}</p>`;
  if(!nonFaites.length){
    html+=`<div class="all-done"><span class="big-icon">🌟</span><p>Tout est fait !</p></div>`;
  } else {
    html+=`<p style="font-size:0.8rem;font-weight:700;color:var(--rose);margin-bottom:8px">⬜ À faire :</p>`;
    nonFaites.forEach(t=>{
      const badge=t.badge?`<span style="font-size:0.7rem;background:var(--orange);color:white;padding:2px 7px;border-radius:20px;margin-left:6px">${t.badge}</span>`:'';
      html+=`<div class="tache-item"><div class="tache-info"><span class="tache-icon">${t.icon}</span><div><span class="tache-name">${t.tache}</span>${badge}</div></div><span class="tache-toggle non-fait" style="cursor:default">⬜ À faire</span></div>`;
    });
  }
  if(faites.length){
    html+=`<p style="font-size:0.8rem;font-weight:700;color:#4CAF50;margin:12px 0 8px">✅ Déjà fait :</p>`;
    faites.forEach(t=>{
      html+=`<div class="tache-item" style="opacity:0.6"><div class="tache-info"><span class="tache-icon">${t.icon}</span><span class="tache-name" style="text-decoration:line-through">${t.tache}</span></div><span class="tache-toggle fait" style="cursor:default">✅ Fait</span></div>`;
    });
  }
  document.getElementById('preview-content').innerHTML=html;
}
function selectChild(childNameOrId) {
  localStorage.setItem("lastChild", childNameOrId); // stocké durablement [1](https://developer.mozilla.org/fr/docs/Web/API/Window/localStorage)
  openChild(childNameOrId);
  showScreen("child");

}

function updateBadges(counts){
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
    if(!el) return;

    const n = counts[nom] || 0;

    if(n > 0){
      el.textContent = n > 9 ? '9+' : String(n);
      el.style.display = 'flex';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
  });
}
window.addEventListener('DOMContentLoaded', loadBadges)
