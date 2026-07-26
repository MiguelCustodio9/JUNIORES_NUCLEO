// =========================================================
// SIDEBAR + TOPBAR — injetados em todas as páginas internas
// =========================================================

const MENU_ITEMS = [
  { href: "dashboard.html",     label: "Início",              ico: "🏠" },
  { href: "jogos.html",         label: "Jogos",                ico: "⚽" },
  { href: "treinos.html",       label: "Treinos",              ico: "🏋" },
  { href: "avaliacoes.html",    label: "Avaliações Físicas",   ico: "📊" },
  { href: "plantel.html",       label: "Plantel",              ico: "👥" },
  { href: "estatisticas.html",  label: "Estatísticas",         ico: "📈" },
  { href: "presencas.html",     label: "Folha de Presenças",   ico: "📋" },
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
            <div class="brand-dot">SC</div>
            <span class="brand-name">SGC · Núcleo</span>
          </div>
          <button class="toggle-btn" id="toggleSidebar" title="Expandir/Fechar menu">☰</button>
        </div>
        <ul class="nav-menu">${menuHtml}</ul>
        <div class="sidebar-foot"><span>Núcleo SCP Castelo Branco</span></div>
      </aside>
      <div class="main">
        <div class="topbar">
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
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

function pageContent() {
  return document.getElementById("pageContent");
}
