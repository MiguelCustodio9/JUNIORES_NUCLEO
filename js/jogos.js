// =========================================================
// JOGOS
// =========================================================

const PARTES_CORPO = ['pé direito','pé esquerdo','cabeça','outra parte do corpo'];
const ZONAS_GOLO = ['fora da área','dentro da área'];
const MOMENTOS_GOLO = ['bola corrida','livre indireto','livre direto','livre de 10 metros','pénalti','canto','5x4 ofensivo','5x4 defensivo','4x3 ofensivo','contra-ataque','fora ofensivo','fora defensivo'];

// Limites configuráveis
const MAX_CONVOCADAS = 14;
const MAX_TITULARES_POR_PARTE = 6;

const CAMPOS_ESTATISTICA = [
  ["passes_certos", "Passes certos"], ["passes_falhados", "Passes falhados"],
  ["remates_baliza", "Remates à baliza"], ["remates_fora", "Remates fora"], ["remates_postes", "Remates ao poste/barra"],
  ["dribles_certos", "Dribles certos"], ["dribles_falhados", "Dribles falhados"],
  ["grandes_oportunidades", "Grandes oportunidades criadas"], ["perdas_bola", "Perdas de bola"], ["recuperacoes_bola", "Recuperações de bola"],
  ["defesas_completas", "Defesas completas (GR)"], ["defesas_incompletas", "Defesas incompletas (GR)"],
  ["saidas_conseguidas", "Saídas conseguidas (GR)"], ["saidas_nao_conseguidas", "Saídas não conseguidas (GR)"],
  ["erros_originam_golo", "Erros que originam golo"],
];

async function iniciarJogos() {
  pageContent().innerHTML = `<div class="card"><div class="card-header"><h3>Jogos</h3></div><div id="listaJogos" class="grid grid-3"></div></div>`;
  carregarJogos();
}

async function carregarJogos() {
  const { data } = await supabaseClient.from("jogos").select("*").order("data_jogo", { ascending: false });
  const cont = document.getElementById("listaJogos");
  if (!data || data.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="circle">⚽</div><p>Ainda não há jogos registados.</p></div>`;
    return;
  }
  cont.innerHTML = data.map(j => `
    <div class="card" style="margin-bottom:0;position:relative">
      <div style="position:absolute;right:12px;top:12px;z-index:6">
        <button class="icon-btn danger" onclick="event.stopPropagation(); eliminarJogo('${j.id}')">🗑</button>
      </div>
      <div style="cursor:pointer" onclick="abrirJogo('${j.id}')">
        <div style="font-weight:800">Vs ${j.adversario_nome || "—"}</div>
        <div style="font-size:12.5px;color:var(--cinza-500)">${j.competicao || "—"} · J${j.jornada || "—"} · ${j.data_jogo || "—"}</div>
        <div style="margin-top:8px"><span class="badge badge-green">${j.golos_equipa ?? 0} - ${j.golos_adversario ?? 0}</span></div>
      </div>
    </div>
  `).join("");
}

async function eliminarJogo(id) {
  const confirmar = await showConfirmModal({ title: 'Confirmação', message: 'Tem a certeza de que pretende eliminar o jogo e todos os dados associados?' });
  if (!confirmar) return;
  // apagar dados relacionados
  await Promise.all([
    supabaseClient.from('jogo_convocatorias').delete().eq('jogo_id', id),
    supabaseClient.from('jogo_titulares').delete().eq('jogo_id', id),
    supabaseClient.from('jogo_substituicoes').delete().eq('jogo_id', id),
    supabaseClient.from('jogo_golos').delete().eq('jogo_id', id),
    supabaseClient.from('jogo_estatisticas').delete().eq('jogo_id', id),
    supabaseClient.from('jogos').delete().eq('id', id),
  ]);
  showToast('Jogo eliminado com sucesso.');
  carregarJogos();
}

function abrirModalJogo() { document.getElementById("modalJogo").classList.add("open"); }
function fecharModalJogo() { document.getElementById("modalJogo").classList.remove("open"); }

document.addEventListener("submit", async (e) => {
  if (e.target.id !== "formJogo") return;
  e.preventDefault();
  const payload = {
    competicao: document.getElementById("j_competicao").value || null,
    jornada: document.getElementById("j_jornada").value || null,
    adversario_nome: document.getElementById("j_adversario_nome").value || null,
    adversario_sigla: document.getElementById("j_adversario_sigla").value || null,
    adversario_logo_url: document.getElementById("j_adversario_logo_url").value || null,
    local: document.getElementById("j_local").value || null,
    localidade: document.getElementById("j_localidade").value || null,
    data_jogo: document.getElementById("j_data_jogo").value || null,
    duracao_parte: Number(document.getElementById("j_duracao_parte").value),
  };
  const { error } = await supabaseClient.from("jogos").insert(payload);
  if (error) { await showAlertModal("Ocorreu um erro ao criar o jogo: " + error.message); return; }
  fecharModalJogo();
  showToast("Jogo criado com sucesso.");
  carregarJogos();
});

let jogoAtual = null;
let atletasCache = [];

async function abrirJogo(id) {
  const { data: jogo } = await supabaseClient.from("jogos").select("*").eq("id", id).single();
  jogoAtual = jogo;
  const { data: atletas } = await supabaseClient.from("atletas").select("id, nome_curto, posicao").order("nome_curto");
  atletasCache = atletas || [];

  pageContent().innerHTML = `
    <a href="#" onclick="iniciarJogos();return false;" style="font-size:13px;color:var(--verde-700);font-weight:700">← Voltar aos jogos</a>
    <div class="card" style="margin-top:14px">
      <div class="card-header">
        <h3>Vs ${jogo.adversario_nome || "—"} — ${jogo.competicao || ""} J${jogo.jornada || ""}</h3>
        <button class="btn" onclick="gerarPdfJogo()">Gerar relatório PDF</button>
      </div>
      <p style="color:var(--cinza-500);font-size:13.5px">${jogo.local || "—"} · ${jogo.localidade || "—"} · ${jogo.data_jogo || "—"} · Partes de ${jogo.duracao_parte || "—"} min</p>
    </div>

    <div class="tabs">
      <div class="tab active" data-jt="convocatoria">Convocatória & Titulares</div>
      <div class="tab" data-jt="substituicoes">Substituições</div>
      <div class="tab" data-jt="golos">Golos</div>
      <div class="tab" data-jt="estatisticas">Estatísticas individuais</div>
      <div class="tab" data-jt="resumo">Resumo & Classificações</div>
    </div>
    <div id="jogoTabContent"></div>

    <div class="modal-backdrop" id="modalSubstituicao">
      <div class="modal">
        <div class="modal-header"><h3>Nova substituição</h3><button class="close-x" onclick="document.getElementById('modalSubstituicao').classList.remove('open')">✕</button></div>
        <form id="formSubstituicao" style="padding:12px"></form>
      </div>
    </div>

    <div class="modal-backdrop" id="modalGolo">
      <div class="modal" style="max-width:640px">
        <div class="modal-header"><h3>Novo golo</h3><button class="close-x" onclick="document.getElementById('modalGolo').classList.remove('open')">✕</button></div>
        <form id="formGolo" style="padding:12px"></form>
      </div>
    </div>
  `;
  document.querySelectorAll("[data-jt]").forEach(t => t.addEventListener("click", () => {
    document.querySelectorAll("[data-jt]").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    renderJogoTab(t.dataset.jt);
  }));
  renderJogoTab("convocatoria");
}

  // modais para substituições e golos serão injetados no DOM quando o jogo abrir

async function renderJogoTab(tab) {
  const cont = document.getElementById("jogoTabContent");
  // obter convocatórias para filtrar atletas não convocadas
  const { data: todasConv } = await supabaseClient.from("jogo_convocatorias").select("*").eq("jogo_id", jogoAtual.id);
  const convocadasIds = new Set((todasConv || []).filter(c => c.convocada).map(c => c.atleta_id));

  if (tab === "convocatoria") {
    const { data: convocatorias } = await supabaseClient.from("jogo_convocatorias").select("*").eq("jogo_id", jogoAtual.id);
    const { data: titulares } = await supabaseClient.from("jogo_titulares").select("*").eq("jogo_id", jogoAtual.id);
    const convocadasIds = new Set((convocatorias || []).filter(c => c.convocada).map(c => c.atleta_id));
    const titularesP1 = new Set((titulares || []).filter(t => t.parte === 1).map(t => t.atleta_id));
    const titularesP2 = new Set((titulares || []).filter(t => t.parte === 2).map(t => t.atleta_id));

    cont.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Convocatória</h3></div>
        <table>
          <thead><tr><th>Atleta</th><th>Convocada</th><th>Titular 1ª parte</th><th>Titular 2ª parte</th><th>Capitã</th><th>Vice-capitã</th></tr></thead>
          <tbody>
            ${atletasCache.map(a => `
              <tr>
                <td>${a.nome_curto}</td>
                <td><input type="checkbox" onchange="toggleConvocada('${a.id}', this.checked)" ${convocadasIds.has(a.id) ? "checked" : ""}></td>
                <td><input type="checkbox" onchange="toggleTitular('${a.id}', 1, this.checked)" ${titularesP1.has(a.id) ? "checked" : ""}></td>
                <td><input type="checkbox" onchange="toggleTitular('${a.id}', 2, this.checked)" ${titularesP2.has(a.id) ? "checked" : ""}></td>
                <td><input type="radio" name="capitao" onchange="definirCapitao('${a.id}')" ${jogoAtual.capitao_id === a.id ? "checked" : ""}></td>
                <td><input type="radio" name="vice" onchange="definirVice('${a.id}')" ${jogoAtual.vice_capitao_id === a.id ? "checked" : ""}></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  if (tab === "substituicoes") {
    const { data: subs } = await supabaseClient.from("jogo_substituicoes").select("*, entra:atleta_entra_id(nome_curto), sai:atleta_sai_id(nome_curto)").eq("jogo_id", jogoAtual.id).order("minuto");
    cont.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Substituições</h3><button class="btn btn-outline" onclick="novaSubstituicao()">+ Adicionar</button></div>
        <table><thead><tr><th>Parte</th><th>Minuto</th><th>Entra</th><th>Sai</th><th></th></tr></thead><tbody>
          ${(subs || []).map(s => `<tr><td>${s.parte}</td><td>${s.minuto}'</td><td>${s.entra?.nome_curto ?? "—"}</td><td>${s.sai?.nome_curto ?? "—"}</td>
            <td><button class="icon-btn danger" onclick="eliminarSubstituicao('${s.id}')">🗑</button></td></tr>`).join("") || `<tr><td colspan="5" style="color:var(--cinza-500)">Sem substituições registadas.</td></tr>`}
        </tbody></table>
      </div>`;
  }

  if (tab === "golos") {
    const { data: golos } = await supabaseClient.from("jogo_golos").select("*, marcador:marcador_id(nome_curto), assistente:assistente_id(nome_curto)").eq("jogo_id", jogoAtual.id).order("minuto");
    // excluir golos cuja marcadora não está convocada
    const golosFiltrados = (golos || []).filter(g => convocadasIds.has(g.marcador_id));
    cont.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Golos</h3><button class="btn btn-outline" onclick="novoGolo()">+ Adicionar golo</button></div>
        <table><thead><tr><th>Min.</th><th>Marcador</th><th>Assistente</th><th>Parte do corpo</th><th>Zona</th><th>Momento</th><th></th></tr></thead><tbody>
          ${(golosFiltrados || []).map(g => `<tr><td>${g.minuto ?? "—"}'</td><td>${g.marcador?.nome_curto ?? "—"}</td><td>${g.assistente?.nome_curto ?? "—"}</td>
            <td>${g.parte_corpo || "—"}</td><td>${g.zona || "—"}</td><td>${g.momento || "—"}</td>
            <td><button class="icon-btn danger" onclick="eliminarGolo('${g.id}')">🗑</button></td></tr>`).join("") || `<tr><td colspan="7" style="color:var(--cinza-500)">Sem golos registados.</td></tr>`}
        </tbody></table>
      </div>`;
  }

  if (tab === "estatisticas") {
    const { data: stats } = await supabaseClient.from("jogo_estatisticas").select("*").eq("jogo_id", jogoAtual.id);
    const mapaStats = Object.fromEntries((stats || []).map(s => [s.atleta_id, s]));
    cont.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Estatísticas individuais em tempo real</h3></div>
        <p style="color:var(--cinza-500);font-size:13px;margin-top:-8px">Clica em "Editar" para introduzires os valores de cada atleta durante ou após o jogo.</p>
        <table><thead><tr><th>Atleta</th><th>Passes certos</th><th>Remates à baliza</th><th>Recuperações</th><th></th></tr></thead><tbody>
              ${atletasCache.filter(a => convocadasIds.has(a.id)).map(a => { const s = mapaStats[a.id] || {}; return `<tr>
                <td>${a.nome_curto}</td><td>${s.passes_certos ?? "—"}</td><td>${s.remates_baliza ?? "—"}</td><td>${s.recuperacoes_bola ?? "—"}</td>
                <td><button class="btn btn-outline" onclick="abrirModalEstatisticas('${a.id}','${a.nome_curto.replace(/'/g, "\\'")}')">Editar</button></td>
              </tr>`; }).join("")}
            </tbody></table>
      </div>
      <div class="modal-backdrop" id="modalEstatisticas">
        <div class="modal" style="max-width:700px">
          <div class="modal-header"><h3 id="tituloEstatisticas">Estatísticas</h3><button class="close-x" onclick="document.getElementById('modalEstatisticas').classList.remove('open')">✕</button></div>
          <form id="formEstatisticas"></form>
        </div>
      </div>`;
  }

  if (tab === "resumo") {
    await renderResumoJogo(cont);
  }
}

// ---------- Convocatória / titulares / capitã ----------
async function toggleConvocada(atletaId, valor) {
  if (valor) {
    // contar convocadas actuais
    const { data: todas } = await supabaseClient.from("jogo_convocatorias").select("convocada").eq("jogo_id", jogoAtual.id);
    const atuais = (todas || []).filter(c => c.convocada).length;
    if (atuais >= MAX_CONVOCADAS) {
      await showAlertModal(`O número máximo de ${MAX_CONVOCADAS} atletas convocadas foi atingido. Por favor, remova uma convocada antes de adicionar outra.`);
      // reverter estado do checkbox no UI
      renderJogoTab("convocatoria");
      return;
    }
  }
  const { data: existente } = await supabaseClient.from("jogo_convocatorias").select("id").eq("jogo_id", jogoAtual.id).eq("atleta_id", atletaId).maybeSingle();
  if (existente) await supabaseClient.from("jogo_convocatorias").update({ convocada: valor }).eq("id", existente.id);
  else await supabaseClient.from("jogo_convocatorias").insert({ jogo_id: jogoAtual.id, atleta_id: atletaId, convocada: valor });
  // after change, re-render to reflect limits and counts
  renderJogoTab("convocatoria");
}
async function toggleTitular(atletaId, parte, valor) {
  // verificar se atleta está convocada antes de marcar titular
  const { data: conv } = await supabaseClient.from("jogo_convocatorias").select("convocada").eq("jogo_id", jogoAtual.id).eq("atleta_id", atletaId).maybeSingle();
  if (valor && !(conv && conv.convocada)) {
    await showAlertModal('A atleta não está convocada. Só é possível marcar titulares entre as atletas convocadas. Por favor, verifique a convocatória.');
    renderJogoTab("convocatoria");
    return;
  }
  if (valor) {
    // contar titulares já marcados para esta parte
    const { data: t } = await supabaseClient.from("jogo_titulares").select("atleta_id").eq("jogo_id", jogoAtual.id).eq("parte", parte);
    const count = (t || []).length;
    if (count >= MAX_TITULARES_POR_PARTE) {
      await showAlertModal(`Já existem ${count} titulares na ${parte}ª parte. O limite é ${MAX_TITULARES_POR_PARTE}.`);
      renderJogoTab("convocatoria");
      return;
    }
    // evitar múltiplas inserções
    const { data: existente } = await supabaseClient.from("jogo_titulares").select("id").eq("jogo_id", jogoAtual.id).eq("atleta_id", atletaId).eq("parte", parte).maybeSingle();
    if (!existente) await supabaseClient.from("jogo_titulares").insert({ jogo_id: jogoAtual.id, atleta_id: atletaId, parte });
  } else {
    await supabaseClient.from("jogo_titulares").delete().eq("jogo_id", jogoAtual.id).eq("atleta_id", atletaId).eq("parte", parte);
  }
  renderJogoTab("convocatoria");
}
async function definirCapitao(atletaId) {
  // Se a atleta é atualmente vice, removemos a vice-capitania
  const novoVice = jogoAtual.vice_capitao_id === atletaId ? null : jogoAtual.vice_capitao_id;
  const { error } = await supabaseClient.from("jogos").update({ capitao_id: atletaId, vice_capitao_id: novoVice }).eq("id", jogoAtual.id);
  if (error) { await showAlertModal('Ocorreu um erro ao definir capitã: ' + error.message); return; }
  jogoAtual.capitao_id = atletaId;
  jogoAtual.vice_capitao_id = novoVice;
  // Re-renderizar a tab para refletir alterações (desmarca vice se aplicável)
  renderJogoTab("convocatoria");
}
async function definirVice(atletaId) {
  // Não permitir que a capitã seja também vice-capitã
  if (jogoAtual.capitao_id === atletaId) {
    await showAlertModal('Uma jogadora que é capitã não pode ser vice-capitã ao mesmo tempo. Por favor, escolha outra jogadora.');
    // reverter seleção de rádio (se foi marcada acidentalmente)
    renderJogoTab("convocatoria");
    return;
  }
  const { error } = await supabaseClient.from("jogos").update({ vice_capitao_id: atletaId }).eq("id", jogoAtual.id);
  if (error) { await showAlertModal('Ocorreu um erro ao definir vice-capitã: ' + error.message); return; }
  jogoAtual.vice_capitao_id = atletaId;
  renderJogoTab("convocatoria");
}

// ---------- Substituições ----------
async function novaSubstituicao() {
  // abrir modal e popular selects com convocadas
  const { data: todasConv } = await supabaseClient.from("jogo_convocatorias").select("*").eq("jogo_id", jogoAtual.id);
  const convocadasIds = new Set((todasConv || []).filter(c => c.convocada).map(c => c.atleta_id));
  const options = atletasCache.filter(a => convocadasIds.has(a.id)).map(a => `<option value="${a.id}">${a.nome_curto}</option>`).join("");
  document.getElementById('formSubstituicao').innerHTML = `
    <div class="grid grid-2">
      <div class="field"><label>Parte</label><select id="s_parte"><option value="1">1</option><option value="2">2</option></select></div>
      <div class="field"><label>Minuto</label><input id="s_minuto" type="number" min="0"></div>
      <div class="field"><label>Entra</label><select id="s_entra">${options}</select></div>
      <div class="field"><label>Sai</label><select id="s_sai">${options}</select></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
      <button type="button" class="btn btn-outline" onclick="document.getElementById('modalSubstituicao').classList.remove('open')">Cancelar</button>
      <button type="submit" class="btn">Guardar</button>
    </div>
  `;
  document.getElementById('formSubstituicao').onsubmit = async (e) => {
    e.preventDefault();
    const parte = Number(document.getElementById('s_parte').value);
    const minuto = Number(document.getElementById('s_minuto').value || 0);
    const entra = document.getElementById('s_entra').value;
    const sai = document.getElementById('s_sai').value;
    // validações: parte válida, minuto no intervalo, entra != sai
    const duracao = jogoAtual.duracao_parte ? Number(jogoAtual.duracao_parte) : 20;
    if (![1,2].includes(parte)) { await showAlertModal('Parte inválida. Por favor, verifique a seleção.'); return; }
    if (!Number.isInteger(minuto) || minuto < 0 || minuto > duracao) { await showAlertModal(`Minuto inválido. Por favor indique um minuto entre 0 e ${duracao}.`); return; }
    if (!entra || !sai) { await showAlertModal('Por favor, selecione a atleta que entra e a que sai.'); return; }
    if (entra === sai) { await showAlertModal('A atleta que entra não pode ser a mesma que sai. Por favor, corrija a seleção.'); return; }
    // evitar duplicados exactos
    const { data: existe } = await supabaseClient.from('jogo_substituicoes').select('id').eq('jogo_id', jogoAtual.id).eq('parte', parte).eq('minuto', minuto).eq('atleta_entra_id', entra).eq('atleta_sai_id', sai).maybeSingle();
    if (existe) { await showAlertModal('Substituição idêntica já se encontra registada.'); return; }
    await supabaseClient.from('jogo_substituicoes').insert({ jogo_id: jogoAtual.id, parte, minuto, atleta_entra_id: entra, atleta_sai_id: sai });
    document.getElementById('modalSubstituicao').classList.remove('open');
    renderJogoTab('substituicoes');
  };
  document.getElementById('modalSubstituicao').classList.add('open');
}
async function eliminarSubstituicao(id) {
  const confirmar = await showConfirmModal({ title: 'Confirmação', message: 'Tem a certeza de que pretende eliminar esta substituição?' });
  if (!confirmar) return;
  await supabaseClient.from("jogo_substituicoes").delete().eq("id", id);
  renderJogoTab("substituicoes");
}

// ---------- Golos ----------
async function novoGolo() {
  // abrir modal para criar golo (apenas convocadas como opções)
  const [{ data: todasConv }] = await Promise.all([
    supabaseClient.from("jogo_convocatorias").select("*").eq("jogo_id", jogoAtual.id),
  ]).catch(() => [{ data: [] }]);
  const convocadasIds = new Set((todasConv || []).filter(c => c.convocada).map(c => c.atleta_id));
  const options = atletasCache.filter(a => convocadasIds.has(a.id)).map(a => `<option value="${a.id}">${a.nome_curto}</option>`).join("");
  document.getElementById('formGolo').innerHTML = `
    <div class="grid grid-2">
      <div class="field"><label>Minuto</label><input id="g_minuto" type="number" min="0"></div>
      <div class="field"><label>Parte</label><select id="g_parte"><option value="1">1</option><option value="2">2</option></select></div>
      <div class="field"><label>Marcador</label><select id="g_marcador">${options}</select></div>
      <div class="field"><label>Assistente (opcional)</label><select id="g_assistente"><option value="">—</option>${options}</select></div>
      <div class="field"><label>Parte do corpo</label><select id="g_parte_corpo">${PARTES_CORPO.map(p=>`<option value="${p}">${p}</option>`).join('')}</select></div>
      <div class="field"><label>Zona</label><select id="g_zona">${ZONAS_GOLO.map(z=>`<option value="${z}">${z}</option>`).join('')}</select></div>
      <div class="field" style="grid-column:1/3"><label>Momento</label><select id="g_momento">${MOMENTOS_GOLO.map(m=>`<option value="${m}">${m}</option>`).join('')}</select></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
      <button type="button" class="btn btn-outline" onclick="document.getElementById('modalGolo').classList.remove('open')">Cancelar</button>
      <button type="submit" class="btn">Guardar</button>
    </div>
  `;
  document.getElementById('formGolo').onsubmit = async (e) => {
    e.preventDefault();
    const minuto = Number(document.getElementById('g_minuto').value || 0);
    const parte = Number(document.getElementById('g_parte').value);
    const marcador = document.getElementById('g_marcador').value;
    const assistente = document.getElementById('g_assistente').value || null;
    const parte_corpo = document.getElementById('g_parte_corpo').value || null;
    const zona = document.getElementById('g_zona').value || null;
    const momento = document.getElementById('g_momento').value || null;
    // validações: parte/minuto válidos, marcador existe, marcador != assistente
    const duracaoG = jogoAtual.duracao_parte ? Number(jogoAtual.duracao_parte) : 20;
    if (![1,2].includes(parte)) { await showAlertModal('Parte inválida. Por favor, verifique a seleção.'); return; }
    if (!Number.isInteger(minuto) || minuto < 0 || minuto > duracaoG) { await showAlertModal(`Minuto inválido. Por favor indique um minuto entre 0 e ${duracaoG}.`); return; }
    if (!marcador) { await showAlertModal('Por favor, selecione a marcadora.'); return; }
    if (assistente && assistente === marcador) { await showAlertModal('A marcadora não pode ser também a assistente. Por favor, corrija a seleção.'); return; }
    await supabaseClient.from('jogo_golos').insert({ jogo_id: jogoAtual.id, marcador_id: marcador, assistente_id: assistente, parte_corpo, zona, momento, minuto, parte });
    document.getElementById('modalGolo').classList.remove('open');
    renderJogoTab('golos');
  };
  document.getElementById('modalGolo').classList.add('open');
}
async function eliminarGolo(id) {
  const confirmar = await showConfirmModal({ title: 'Confirmação', message: 'Tem a certeza de que pretende eliminar este golo?' });
  if (!confirmar) return;
  await supabaseClient.from("jogo_golos").delete().eq("id", id);
  renderJogoTab("golos");
}

// ---------- Estatísticas individuais ----------
async function abrirModalEstatisticas(atletaId, nome) {
  const { data: s } = await supabaseClient.from("jogo_estatisticas").select("*").eq("jogo_id", jogoAtual.id).eq("atleta_id", atletaId).maybeSingle();
  document.getElementById("tituloEstatisticas").textContent = `Estatísticas — ${nome}`;
  document.getElementById("formEstatisticas").innerHTML = `
    <div class="grid grid-2">
      ${CAMPOS_ESTATISTICA.map(([id, label]) => `<div class="field"><label>${label}</label><input type="number" min="0" id="e_${id}" value="${s?.[id] ?? 0}"></div>`).join("")}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button type="button" class="btn btn-outline" onclick="document.getElementById('modalEstatisticas').classList.remove('open')">Cancelar</button>
      <button type="submit" class="btn">Guardar</button>
    </div>
  `;
  document.getElementById("formEstatisticas").onsubmit = async (e) => {
    e.preventDefault();
    const payload = { jogo_id: jogoAtual.id, atleta_id: atletaId };
    CAMPOS_ESTATISTICA.forEach(([id]) => { payload[id] = Number(document.getElementById(`e_${id}`).value || 0); });
    const { data: existente } = await supabaseClient.from("jogo_estatisticas").select("id").eq("jogo_id", jogoAtual.id).eq("atleta_id", atletaId).maybeSingle();
    const query = existente
      ? supabaseClient.from("jogo_estatisticas").update(payload).eq("id", existente.id)
      : supabaseClient.from("jogo_estatisticas").insert(payload);
    const { error } = await query;
    if (error) { await showAlertModal("Ocorreu um erro ao guardar as estatísticas: " + error.message); return; }
    document.getElementById("modalEstatisticas").classList.remove("open");
    showToast("Estatísticas guardadas com sucesso.");
    renderJogoTab("estatisticas");
  };
  document.getElementById("modalEstatisticas").classList.add("open");
}

// ---------- Cálculo de minutos jogados a partir das substituições ----------
function calcularMinutosJogados(titulares, substituicoes, duracaoParte) {
  const minutos = {};
  [1, 2].forEach(parte => {
    const onField = {};
    titulares.filter(t => t.parte === parte).forEach(t => { onField[t.atleta_id] = 0; });
    const subsParte = substituicoes.filter(s => s.parte === parte).sort((a, b) => a.minuto - b.minuto);
    subsParte.forEach(s => {
      if (s.atleta_sai_id !== null && onField[s.atleta_sai_id] !== undefined) {
        minutos[s.atleta_sai_id] = (minutos[s.atleta_sai_id] || 0) + (s.minuto - onField[s.atleta_sai_id]);
        delete onField[s.atleta_sai_id];
      }
      if (s.atleta_entra_id !== null) onField[s.atleta_entra_id] = s.minuto;
    });
    Object.entries(onField).forEach(([id, start]) => {
      minutos[id] = (minutos[id] || 0) + (duracaoParte - start);
    });
  });
  return minutos;
}

// ---------- Algoritmo de classificação média decimal ----------
function calcularClassificacao(stats, golosMarcados, assistencias, minutosJogados, duracaoTotal) {
  if (!minutosJogados || minutosJogados <= 0) return null;
  const s = stats || {};
  const positivo =
    (s.passes_certos || 0) * 0.02 + (s.remates_baliza || 0) * 0.3 + (s.remates_postes || 0) * 0.15 +
    (s.dribles_certos || 0) * 0.2 + (s.grandes_oportunidades || 0) * 0.5 + (s.recuperacoes_bola || 0) * 0.15 +
    (s.defesas_completas || 0) * 0.4 + (s.saidas_conseguidas || 0) * 0.3 +
    golosMarcados * 1.2 + assistencias * 0.8;
  const negativo =
    (s.passes_falhados || 0) * 0.05 + (s.remates_fora || 0) * 0.05 + (s.dribles_falhados || 0) * 0.1 +
    (s.perdas_bola || 0) * 0.15 + (s.defesas_incompletas || 0) * 0.2 + (s.saidas_nao_conseguidas || 0) * 0.15 +
    (s.erros_originam_golo || 0) * 1.0;

  const fatorTempo = Math.max(minutosJogados / duracaoTotal, 0.15); // penaliza pouco tempo de jogo
  let nota = 6.0 + (positivo - negativo) / fatorTempo / 6;
  nota = Math.min(10, Math.max(0, nota));
  return Math.round(nota * 10) / 10;
}

// ---------- Resumo geral do jogo ----------
async function renderResumoJogo(cont) {
  const [{ data: stats }, { data: golos }, { data: titulares }, { data: substituicoes }, { data: conv }] = await Promise.all([
    supabaseClient.from("jogo_estatisticas").select("*").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_golos").select("*").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_titulares").select("*").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_substituicoes").select("*").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_convocatorias").select("*").eq("jogo_id", jogoAtual.id),
  ]);

  const convocadasIds = new Set((conv || []).filter(c => c.convocada).map(c => c.atleta_id));
  // filtrar estatisticas e golos apenas para convocadas
  const statsFiltrados = (stats || []).filter(s => convocadasIds.has(s.atleta_id));
  const golosFiltrados = (golos || []).filter(g => convocadasIds.has(g.marcador_id));

  const duracaoTotal = (jogoAtual.duracao_parte || 20) * 2;
  const minutosPorAtleta = calcularMinutosJogados(titulares || [], substituicoes || [], jogoAtual.duracao_parte || 20);

  const somaCampos = {};
  CAMPOS_ESTATISTICA.forEach(([id]) => { somaCampos[id] = (statsFiltrados || []).reduce((s, r) => s + (r[id] || 0), 0); });

  const linhasClassificacao = atletasCache.filter(a => convocadasIds.has(a.id)).map(a => {
    const s = (statsFiltrados || []).find(x => x.atleta_id === a.id);
    const golosMarcados = (golosFiltrados || []).filter(g => g.marcador_id === a.id).length;
    const assistencias = (golos || []).filter(g => g.assistente_id === a.id).length;
    const minutos = minutosPorAtleta[a.id] || 0;
    const classificacao = calcularClassificacao(s, golosMarcados, assistencias, minutos, duracaoTotal);
    return { nome: a.nome_curto, minutos, golos: golosMarcados, assistencias, classificacao };
  }).filter(l => l.minutos > 0).sort((a, b) => (b.classificacao || 0) - (a.classificacao || 0));

  cont.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Estatísticas gerais do jogo (soma da equipa)</h3></div>
      <div class="grid grid-4">
        ${CAMPOS_ESTATISTICA.map(([id, label]) => `<div class="stat-pill"><div class="num">${somaCampos[id]}</div><div class="lbl">${label}</div></div>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Classificações médias de desempenho</h3></div>
      <p style="color:var(--cinza-500);font-size:12.5px;margin-top:-8px">
        Calculadas a partir dos minutos jogados (estimados pelas substituições) e das estatísticas registadas.
      </p>
      <table>
        <thead><tr><th>Atleta</th><th>Minutos</th><th>Golos</th><th>Assistências</th><th>Classificação</th></tr></thead>
        <tbody>
          ${linhasClassificacao.map(l => `<tr><td>${l.nome}</td><td>${l.minutos}'</td><td>${l.golos}</td><td>${l.assistencias}</td>
            <td><span class="badge badge-green">${l.classificacao ?? "—"}</span></td></tr>`).join("") || `<tr><td colspan="5" style="color:var(--cinza-500)">Sem dados suficientes (regista titulares/substituições e estatísticas).</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

async function gerarPdfJogo() {
  const [{ data: stats }, { data: golos }, { data: titulares }, { data: substituicoes }, { data: conv }] = await Promise.all([
    supabaseClient.from("jogo_estatisticas").select("*, atletas(nome_curto)").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_golos").select("*, marcador:marcador_id(nome_curto), assistente:assistente_id(nome_curto)").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_titulares").select("*").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_substituicoes").select("*").eq("jogo_id", jogoAtual.id),
    supabaseClient.from("jogo_convocatorias").select("*").eq("jogo_id", jogoAtual.id),
  ]);
  const convocadasIds = new Set((conv || []).filter(c => c.convocada).map(c => c.atleta_id));
  const statsFiltrados = (stats || []).filter(s => convocadasIds.has(s.atleta_id));
  const golosFiltrados = (golos || []).filter(g => convocadasIds.has(g.marcador_id));

  const duracaoTotal = (jogoAtual.duracao_parte || 20) * 2;
  const minutosPorAtleta = calcularMinutosJogados(titulares || [], substituicoes || [], jogoAtual.duracao_parte || 20);

  const doc = novoPdf(`Relatório de Jogo — Vs ${jogoAtual.adversario_nome || "—"}`, `${jogoAtual.competicao || ""} · J${jogoAtual.jornada || ""} · ${jogoAtual.data_jogo || "—"}`);
  let y = 34;

  doc.setFontSize(12); doc.text("Golos", 14, y); y += 4;
  y = tabelaPdf(doc, y, ["Min.", "Marcador", "Assistente", "Momento"], (golosFiltrados || []).map(g => [g.minuto ?? "—", g.marcador?.nome_curto ?? "—", g.assistente?.nome_curto ?? "—", g.momento ?? "—"]));

  doc.setFontSize(12); doc.text("Estatísticas individuais e classificação", 14, y); y += 4;
  const linhas = (statsFiltrados || []).map(s => {
    const golosMarcados = (golosFiltrados || []).filter(g => g.marcador_id === s.atleta_id).length;
    const assistencias = (golosFiltrados || []).filter(g => g.assistente_id === s.atleta_id).length;
    const minutos = minutosPorAtleta[s.atleta_id] || 0;
    const classificacao = calcularClassificacao(s, golosMarcados, assistencias, minutos, duracaoTotal);
    return [s.atletas?.nome_curto ?? "—", `${minutos}'`, s.passes_certos ?? 0, s.remates_baliza ?? 0, s.recuperacoes_bola ?? 0, classificacao ?? "—"];
  });
  tabelaPdf(doc, y, ["Atleta", "Minutos", "Passes certos", "Remates à baliza", "Recuperações", "Classificação"], linhas);

  guardarPdf(doc, `relatorio_jogo_${(jogoAtual.adversario_nome || "adversario").replace(/\s+/g, "_")}.pdf`);
}
