// =========================================================
// PLANTEL — listagem + criação/edição de atletas
// =========================================================

const POSICOES = ['guarda-redes','fixo','fixo/ala','fixo/pivot','universal','ala','ala/pivot','ala/fixo','pivot','pivot/fixo','pivot/ala'];
const PES = ['esquerdina','destra','ambidestra'];
const ESCALOES_ETARIOS = ['petizes','traquinas','benjamins','infantis','iniciadas','juvenis','juniores'];

let editandoId = null;

async function iniciarPlantel() {
  const c = pageContent();
  c.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Atletas</h3>
        <input id="pesquisa" placeholder="Pesquisar por nome..." style="padding:9px 14px;border-radius:999px;border:1.5px solid var(--cinza-200);font-size:13px">
      </div>
      <div id="listaAtletas" class="grid grid-3"></div>
    </div>
  `;
  document.getElementById("pesquisa").addEventListener("input", (e) => carregarAtletas(e.target.value));
  await carregarAtletas();
}

async function carregarAtletas(filtro = "") {
  const { data, error } = await supabaseClient.from("atletas").select("*").order("nome_curto");
  const cont = document.getElementById("listaAtletas");
  if (error) { cont.innerHTML = `<p>Erro a carregar atletas.</p>`; return; }

  const lista = (data || []).filter(a => a.nome_curto.toLowerCase().includes(filtro.toLowerCase()));
  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="circle">👥</div><p>Ainda não há atletas registadas.</p></div>`;
    return;
  }

  cont.innerHTML = lista.map(a => `
    <div class="card" style="margin-bottom:0;cursor:pointer" onclick="window.location.href='atleta-detalhe.html?id=${a.id}'">
      <div style="display:flex;align-items:center;gap:14px">
        <img class="avatar-round" src="${a.foto_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(a.nome_curto)}">
        <div>
          <div style="font-weight:800">${a.nome_curto} ${a.numero_camisola ? `<span class="badge badge-green">#${a.numero_camisola}</span>` : ""}</div>
          <div style="font-size:12.5px;color:var(--cinza-500)">${a.posicao || "—"} · ${a.escalao_etario || "—"}</div>
        </div>
      </div>
      <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:4px" onclick="event.stopPropagation()">
        <button class="icon-btn" onclick="abrirModalEdicao('${a.id}')" title="Editar">✎</button>
        <button class="icon-btn danger" onclick="eliminarAtleta('${a.id}')" title="Eliminar">🗑</button>
      </div>
    </div>
  `).join("");
}

function campoTexto(id, label, valor = "", tipo = "text") {
  return `<div class="field"><label>${label}</label><input type="${tipo}" id="${id}" value="${valor ?? ""}"></div>`;
}
function campoSelect(id, label, opcoes, valor = "") {
  return `<div class="field"><label>${label}</label><select id="${id}">
    <option value="">—</option>
    ${opcoes.map(o => `<option value="${o}" ${o === valor ? "selected" : ""}>${o}</option>`).join("")}
  </select></div>`;
}

function abrirModalNovo() {
  editandoId = null;
  document.getElementById("modalTitulo").textContent = "Nova atleta";
  montarFormAtleta({});
  document.getElementById("modalAtleta").classList.add("open");
}

async function abrirModalEdicao(id) {
  editandoId = id;
  const { data } = await supabaseClient.from("atletas").select("*").eq("id", id).single();
  document.getElementById("modalTitulo").textContent = "Editar atleta";
  montarFormAtleta(data || {});
  document.getElementById("modalAtleta").classList.add("open");
}

function fecharModal() {
  document.getElementById("modalAtleta").classList.remove("open");
}

function montarFormAtleta(a) {
  document.getElementById("formAtleta").innerHTML = `
    <div class="grid grid-2">
      ${campoTexto("nome_curto", "Nome curto *", a.nome_curto)}
      ${campoTexto("nome_completo", "Nome completo *", a.nome_completo)}
      ${campoTexto("numero_camisola", "Número da camisola", a.numero_camisola, "number")}
      ${campoTexto("data_nascimento", "Data de nascimento", a.data_nascimento, "date")}
      ${campoTexto("foto_url", "URL da foto", a.foto_url)}
      ${campoSelect("posicao", "Posição", POSICOES, a.posicao)}
      ${campoSelect("pe_preferido", "Pé preferido", PES, a.pe_preferido)}
      ${campoTexto("pais_nascimento", "País de nascimento", a.pais_nascimento)}
      ${campoTexto("nacionalidade", "Nacionalidade", a.nacionalidade)}
      ${campoTexto("anos_pratica_federada", "Anos de prática federada", a.anos_pratica_federada, "number")}
      ${campoTexto("clube_anterior", "Clube anterior", a.clube_anterior)}
      ${campoTexto("telefone", "Nº de telefone", a.telefone)}
      ${campoSelect("escalao_etario", "Escalão etário", ESCALOES_ETARIOS, a.escalao_etario)}
      ${campoTexto("desportos_extra_futsal", "Desportos extra-futsal", a.desportos_extra_futsal)}
      ${campoTexto("atividades_extra_desporto", "Atividades extra-desporto", a.atividades_extra_desporto)}
      ${campoTexto("nome_pai", "Nome do pai", a.nome_pai)}
      ${campoTexto("contacto_pai", "Contacto do pai", a.contacto_pai)}
      ${campoTexto("nome_mae", "Nome da mãe", a.nome_mae)}
      ${campoTexto("contacto_mae", "Contacto da mãe", a.contacto_mae)}
      ${campoTexto("email_encarregado_educacao", "Email do encarregado de educação", a.email_encarregado_educacao, "email")}
      ${campoTexto("escola", "Escola", a.escola)}
      ${campoTexto("ano_escolar", "Ano escolar", a.ano_escolar)}
      ${campoTexto("disciplina_favorita", "Disciplina favorita (exceto Ed. Física)", a.disciplina_favorita)}
      ${campoTexto("peso", "Peso (kg)", a.peso, "number")}
      ${campoTexto("altura", "Altura (cm)", a.altura, "number")}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px">
      <button type="button" class="btn btn-outline" onclick="fecharModal()">Cancelar</button>
      <button type="submit" class="btn">Guardar</button>
    </div>
  `;
  document.getElementById("formAtleta").onsubmit = guardarAtleta;
}

async function guardarAtleta(e) {
  e.preventDefault();
  const val = id => document.getElementById(id)?.value || null;
  const payload = {
    nome_curto: val("nome_curto"),
    nome_completo: val("nome_completo"),
    numero_camisola: val("numero_camisola") ? Number(val("numero_camisola")) : null,
    data_nascimento: val("data_nascimento"),
    foto_url: val("foto_url"),
    posicao: val("posicao"),
    pe_preferido: val("pe_preferido"),
    pais_nascimento: val("pais_nascimento"),
    nacionalidade: val("nacionalidade"),
    anos_pratica_federada: val("anos_pratica_federada") ? Number(val("anos_pratica_federada")) : null,
    clube_anterior: val("clube_anterior"),
    telefone: val("telefone"),
    escalao_etario: val("escalao_etario"),
    desportos_extra_futsal: val("desportos_extra_futsal"),
    atividades_extra_desporto: val("atividades_extra_desporto"),
    nome_pai: val("nome_pai"),
    contacto_pai: val("contacto_pai"),
    nome_mae: val("nome_mae"),
    contacto_mae: val("contacto_mae"),
    email_encarregado_educacao: val("email_encarregado_educacao"),
    escola: val("escola"),
    ano_escolar: val("ano_escolar"),
    disciplina_favorita: val("disciplina_favorita"),
    peso: val("peso") ? Number(val("peso")) : null,
    altura: val("altura") ? Number(val("altura")) : null,
  };

  if (!payload.nome_curto || !payload.nome_completo) {
    await showAlertModal("Por favor, preencha pelo menos o nome curto e o nome completo.");
    return;
  }

  const query = editandoId
    ? supabaseClient.from("atletas").update(payload).eq("id", editandoId)
    : supabaseClient.from("atletas").insert(payload);

  const { error } = await query;
  if (error) { await showAlertModal("Ocorreu um erro ao guardar: " + error.message); return; }

  fecharModal();
  showToast("Atleta guardada com sucesso.");
  carregarAtletas();
}

async function eliminarAtleta(id) {
  const confirmar = await showConfirmModal({ title: 'Confirmação', message: 'Tem a certeza de que pretende eliminar esta atleta e todos os seus dados associados?' });
  if (!confirmar) return;
  const { error } = await supabaseClient.from("atletas").delete().eq("id", id);
  if (error) { await showAlertModal("Ocorreu um erro ao eliminar: " + error.message); return; }
  showToast("Atleta eliminada com sucesso.");
  carregarAtletas();
}
