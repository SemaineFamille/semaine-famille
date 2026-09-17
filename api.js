console.log("api.js chargé");

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
