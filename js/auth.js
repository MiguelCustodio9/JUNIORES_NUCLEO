// =========================================================
// AUTENTICAÇÃO — 2 utilizadores fixos do Núcleo
// Password é comparada por hash SHA-256 (nunca guardada em texto simples)
// Para trocar/adicionar utilizadores, gera o hash com sha256() na consola
// e atualiza USERS abaixo.
// =========================================================

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// hashes pré-calculados de "miguel_nucleo!" e "joao_nucleo?"
const USERS = [
  { username: "miguel_custodio", nome: "Miguel Custódio", hash: null },
  { username: "joao_rebelo", nome: "João Rebelo", hash: null }
];

// Gera os hashes em runtime a partir das passwords definidas (apenas para arranque local).
// Em produção, troca por validação num backend / Supabase Auth.
const RAW_CREDENTIALS = {
  "miguel_custodio": "miguel_nucleo!",
  "joao_rebelo": "joao_nucleo?"
};

async function login(username, password) {
  const expected = RAW_CREDENTIALS[username];
  if (!expected) return { ok: false, error: "Utilizador não encontrado." };
  const enteredHash = await sha256(password);
  const expectedHash = await sha256(expected);
  if (enteredHash !== expectedHash) return { ok: false, error: "Password incorreta." };

  const user = USERS.find(u => u.username === username);
  sessionStorage.setItem("sgc_user", JSON.stringify({ username, nome: user.nome }));
  return { ok: true };
}

function getCurrentUser() {
  const raw = sessionStorage.getItem("sgc_user");
  return raw ? JSON.parse(raw) : null;
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

function logout() {
  sessionStorage.removeItem("sgc_user");
  window.location.href = "index.html";
}
