/* ═══════════════════════════════════════════════════
   DentalScan · script.js
═══════════════════════════════════════════════════ */

// ── Section navigation ────────────────────────────
function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  const navEl = document.querySelector(`[data-section="${name}"]`);
  if (navEl) navEl.classList.add('active');
  if (name === 'map' && !mapInitialized) {
    initMap();
    mapInitialized = true;
  }
  if (name === 'history') {
    loadHistory();
  }
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(el.dataset.section);
  });
});

// ── Confidence slider ─────────────────────────────
function updateConf(val) {
  document.getElementById('confValue').textContent = parseFloat(val).toFixed(2);
}

// ── Drag and drop ─────────────────────────────────
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('click', () => {
  if (!document.getElementById('uploadPreview').style.display ||
    document.getElementById('uploadPreview').style.display === 'none') {
    document.getElementById('image').click();
  }
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    setPreview(file);
  }
});

document.getElementById('image').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) setPreview(file);
});

function setPreview(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('previewImg').src = ev.target.result;
    document.getElementById('uploadIdle').style.display = 'none';
    document.getElementById('uploadPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);

  // Sync to the file input if drag-dropped
  const dt = new DataTransfer();
  dt.items.add(file);
  document.getElementById('image').files = dt.files;
}

function clearPreview() {
  document.getElementById('previewImg').src = '';
  document.getElementById('uploadIdle').style.display = 'flex';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('image').value = '';
}



