// =========================================================
// SIDEBAR + TOPBAR — injetados em todas as páginas internas
// =========================================================

const MENU_ITEMS = [
  { href: "dashboard.html",     label: "Início",              ico: "🏠" },
  { href: "jogos.html",         label: "Jogos",                ico: "⚽️" },
  { href: "treinos.html",       label: "Treinos",              ico: "🏋️‍♀️" },
  { href: "avaliacoes.html",    label: "Avaliações Físicas",   ico: "📊" },
  { href: "plantel.html",       label: "Plantel",              ico: "👥" },
  { href: "estatisticas.html",  label: "Estatísticas",         ico: "📈" },
  { href: "presencas.html",     label: "Folha de Presenças",   ico: "🗓️" },
];

function renderShell(pageTitle) {
  const user = requireAuth();
  if (!user) return;

  const current = window.location.pathname.split("/").pop();
  const collapsed = localStorage.getItem("sgc_sidebar_collapsed") === "1";

  const menuHtml = MENU_ITEMS.map(item => `
    <li>
      <a href="${item.href}" class="${item.href === current ? "active" : ""}">
        <span class="ico">${item.ico}</span>
        <span class="label">${item.label}</span>
      </a>
    </li>
  `).join("");

  document.body.insertAdjacentHTML("afterbegin", `
    <div class="app">
      <aside class="sidebar ${collapsed ? "collapsed" : ""}" id="sidebar">
        <div class="sidebar-top">
          <div class="brand">
            <img src="logo.png" class="brand-logo" alt="logo" onload="this.nextElementSibling&&(this.nextElementSibling.style.display='none')" onerror="this.style.display='none'">
            <div class="brand-dot">SC</div>
            <span class="brand-name">SGC · Núcleo</span>
          </div>
          <button class="toggle-btn" id="toggleSidebar" title="Expandir/Fechar menu">☰</button>
        </div>
        <ul class="nav-menu">${menuHtml}</ul>
        <div class="sidebar-foot">
          <div class="logo-controls">
            <input id="logoInput" type="file" accept="image/*" style="display:none">
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="btn btn-outline" id="logoBtn" title="Alterar emblema">Alterar emblema</button>
              <button class="btn" id="logoRemoveBtn" title="Remover emblema">Remover emblema</button>
            </div>
            <div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,.6)">Núcleo SCP Castelo Branco</div>
          </div>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <img src="logo.png" class="topbar-logo" alt="logo" onerror="this.style.display='none'">
          <h1>${pageTitle}</h1>
          <div class="user-chip">
            <div class="user-avatar">${user.nome.charAt(0)}</div>
            <span class="label">${user.nome}</span>
            <button class="icon-btn" id="logoutBtn" title="Sair">⏻</button>
          </div>
        </div>
        <div class="content" id="pageContent"></div>
      </div>
    </div>
    <div class="toast" id="toast"></div>
  `);

  document.getElementById("toggleSidebar").addEventListener("click", () => {
    const sb = document.getElementById("sidebar");
    sb.classList.toggle("collapsed");
    localStorage.setItem("sgc_sidebar_collapsed", sb.classList.contains("collapsed") ? "1" : "0");
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // logo upload handlers
  const logoInput = document.getElementById('logoInput');
  const logoBtn = document.getElementById('logoBtn');
  const logoRemoveBtn = document.getElementById('logoRemoveBtn');
  function applyLogo(dataUrl) {
    window.logoDataUrl = dataUrl;
    document.querySelectorAll('.brand-logo, .topbar-logo').forEach(img => {
      img.src = dataUrl;
      img.style.display = 'inline-block';
    });
    document.querySelectorAll('.brand-dot').forEach(d => d.style.display = 'none');
  }
  // initialize from saved logo (localStorage)
  const saved = localStorage.getItem('sgc_logo_dataurl');
  if (saved) applyLogo(saved);

  if (logoBtn) logoBtn.addEventListener('click', () => logoInput && logoInput.click());
  if (logoInput) logoInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // Read file as DataURL, then downscale if necessary to avoid huge images in PDF
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 800; // max width/height for stored emblem
        let { width, height } = img;
        let scale = 1;
        if (width > MAX_DIM || height > MAX_DIM) scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        const cw = Math.round(width * scale);
        const ch = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,cw,ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        localStorage.setItem('sgc_logo_dataurl', dataUrl);
        applyLogo(dataUrl);
        showToast('Emblema atualizado.');
      };
      img.onerror = () => { showAlertModal('Não foi possível carregar a imagem selecionada.'); };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });
  if (logoRemoveBtn) logoRemoveBtn.addEventListener('click', () => {
    localStorage.removeItem('sgc_logo_dataurl');
    window.logoDataUrl = null;
    // fallback to static file (logo.png) if exists; let onerror hide it
    document.querySelectorAll('.brand-logo, .topbar-logo').forEach(img => { img.src = 'logo.png'; img.style.display = ''; });
    document.querySelectorAll('.brand-dot').forEach(d => d.style.display = 'flex');
    showToast('Emblema removido.');
  });
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

// Modal confirm helper — returns true if confirmed
function showConfirmModal({ title = 'Confirmação', message = '' } = {}) {
  return new Promise(resolve => {
    const id = 'confirm-' + Date.now();
    const html = `
      <div class="modal-backdrop" id="${id}">
        <div class="modal">
          <h3>${title}</h3>
          <div style="margin-top:8px">${message}</div>
          <div style="text-align:right;margin-top:12px">
            <button class="btn" id="${id}-ok">Confirmar</button>
            <button class="btn btn-outline" id="${id}-cancel">Cancelar</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const backdrop = document.getElementById(id);
    function cleanup(val) { backdrop.remove(); resolve(val); }
    document.getElementById(`${id}-ok`).addEventListener('click', () => cleanup(true));
    document.getElementById(`${id}-cancel`).addEventListener('click', () => cleanup(false));
  });
}

// Simple alert modal (non-blocking); returns a promise resolved when closed
function showAlertModal(message, title = 'Aviso') {
  return new Promise(resolve => {
    const id = 'alert-' + Date.now();
    const html = `
      <div class="modal-backdrop" id="${id}">
        <div class="modal">
          <h3>${title}</h3>
          <div style="margin-top:8px">${message}</div>
          <div style="text-align:right;margin-top:12px">
            <button class="btn" id="${id}-ok">OK</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById(`${id}-ok`).addEventListener('click', () => { document.getElementById(id).remove(); resolve(); });
  });
}

function pageContent() {
  return document.getElementById("pageContent");
}
