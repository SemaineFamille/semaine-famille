console.log("api.js chargé");
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOJEus1Fev5I4YZsSbjpIXXlgGJBY7QmFkkqZtkXYD6eEPwqmgCl8r2hfrO1X9eyqxSA/exec';
const ADMIN_CODE = '2019';

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
   const startTime = performance.now();
  const qs = buildQueryString(params);
  const url = SCRIPT_URL + '?' + qs;
  const readRequest = isReadRequest(params);

  if (readRequest && APP_CACHE.responses.has(url)) {
    return APP_CACHE.responses.get(url);
  }

  if (APP_CACHE.inflight.has(url)) {
    return APP_CACHE.inflight.get(url);
  }

 console.log("FETCH URL", url);
const startNetwork = performance.now();

const p = fetch(url, {
  method: 'GET'
})
const p = fetch(url, {
  method: 'GET'
})
.then(async r => {
console.log(
"HEADERS ARRIVES",
params.sheet,
Math.round(performance.now() - startNetwork) + " ms"
);
  console.log(
    "RESPONSE",
    params.sheet,
    r.status,
    r.url
  );

  if (!r.ok) {
    throw new Error(
      "HTTP " + r.status +
      " sur " + params.sheet
    );
  }

  return r.text();
})

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
console.log(
  "API",
  params.sheet,
  Math.round(performance.now() - startTime) + " ms"
);
      console.log(
  "TEXT LENGTH",
  params.sheet,
  text.length
);

console.log(
  "BODY LU",
  params.sheet,
  Math.round(performance.now() - startNetwork) + " ms"
);
      return text;
    })
  .catch(err => {

  console.error(
    "ECHEC API",
    params.sheet,
    err
  );

  throw err;
})
    .finally(() => {
      APP_CACHE.inflight.delete(url);
    });

  APP_CACHE.inflight.set(url, p);
  return p;
}
function parseLines(text) {
  if (!text || text.trim() === '' || text.trim() === 'ok') return [];
  return text.split('~~~~').map(l => l.trim()).filter(Boolean);
}
