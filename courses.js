function showListe(liste, btn) {
  currentListe = liste;
  document.querySelectorAll('#page-courses .inner-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadCourses(liste);
}

async function loadCourses(liste) {
   console.time("loadCourses");

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
   console.timeEnd("loadCourses");
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
