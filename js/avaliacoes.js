// =========================================================
// AVALIAÇÕES FÍSICAS
// =========================================================

const CAMPOS_NUM = [
  ["agachamentos", "Agachamentos (nº)"], ["flexoes", "Flexões (nº)"], ["abdominais", "Abdominais (nº)"],
];
const CAMPOS_TEMPO = [
  ["sprint_20m", "Sprint 20m (mm:ss)"], ["sprint_40m", "Sprint 40m (mm:ss)"],
  ["shuttle_run", "Shuttle run (mm:ss)"], ["corrida_resistencia", "Corrida resistência 10 voltas (mm:ss)"],
];
const CAMPOS_0A5 = [
  ["flexibilidade_bracos", "Flexibilidade de braços"], ["flexibilidade_pernas", "Flexibilidade das pernas"],
  ["rotacao_tronco", "Rotação do tronco"], ["equilibrio_direito", "Equilíbrio lado direito"],
  ["equilibrio_esquerdo", "Equilíbrio lado esquerdo"], ["equilibrio_total", "Equilíbrio total"],
  ["coordenacao_dentro_fora", "Coordenação apoios dentro/fora"], ["coordenacao_lateralizados", "Coordenação apoios lateralizados"],
  ["corrida_lateral_esq", "Corrida lateral esquerda"], ["corrida_lateral_dir", "Corrida lateral direita"],
  ["corrida_costas", "Corrida de costas"], ["passe", "Passe"], ["rececao", "Receção"],
  ["conducao", "Condução"], ["remate", "Remate"],
];
const TODOS_CAMPOS = [...CAMPOS_NUM, ...CAMPOS_TEMPO, ...CAMPOS_0A5];

async function iniciarAvaliacoes() {
  pageContent().innerHTML = `<div class="card"><div class="card-header"><h3>Avaliações Físicas</h3></div><div id="listaAvals" class="grid grid-3"></div></div>`;
  carregarAvaliacoes();
}

async function carregarAvaliacoes() {
  const { data } = await supabaseClient.from("avaliacoes_fisicas").select("*").order("data_avaliacao", { ascending: false });
  const cont = document.getElementById("listaAvals");
  if (!data || data.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="circle">📊</div><p>Ainda não há avaliações registadas.</p></div>`;
    return;
  }
  cont.innerHTML = data.map(av => `
    <div class="card" style="margin-bottom:0;position:relative">
      <div style="position:absolute;right:12px;top:12px;z-index:6">
        <button class="icon-btn danger" onclick="event.stopPropagation(); eliminarAvaliacao('${av.id}')">🗑</button>
      </div>
      <div style="cursor:pointer" onclick="abrirAvaliacao('${av.id}')">
        <div style="font-weight:800">${av.titulo}</div>
        <div style="font-size:12.5px;color:var(--cinza-500)">${av.data_avaliacao || "—"}</div>
      </div>
    </div>
  `).join("");
}

async function eliminarAvaliacao(id) {
  const confirmar = await showConfirmModal({ title: 'Confirmação', message: 'Tem a certeza de que pretende eliminar a avaliação e todos os valores associados?' });
  if (!confirmar) return;
  await Promise.all([
    supabaseClient.from('avaliacao_valores').delete().eq('avaliacao_id', id),
    supabaseClient.from('avaliacoes_fisicas').delete().eq('id', id),
  ]);
  showToast('Avaliação eliminada com sucesso.');
  carregarAvaliacoes();
}

function abrirModalAvaliacao() { document.getElementById("modalAvaliacao").classList.add("open"); }
function fecharModalAvaliacao() { document.getElementById("modalAvaliacao").classList.remove("open"); }

document.addEventListener("submit", async (e) => {
  if (e.target.id !== "formAvaliacao") return;
  e.preventDefault();
  const payload = { titulo: document.getElementById("av_titulo").value, data_avaliacao: document.getElementById("av_data").value || null };
  const { error } = await supabaseClient.from("avaliacoes_fisicas").insert(payload);
  if (error) { showAlertModal("Ocorreu um erro ao criar a avaliação: " + error.message); return; }
  fecharModalAvaliacao();
  showToast("Avaliação criada com sucesso.");
  carregarAvaliacoes();
});

let avaliacaoAtualId = null;

async function abrirAvaliacao(id) {
  avaliacaoAtualId = id;
  const { data: av } = await supabaseClient.from("avaliacoes_fisicas").select("*").eq("id", id).single();
  const { data: atletas } = await supabaseClient.from("atletas").select("id, nome_curto").order("nome_curto");
  const { data: valores } = await supabaseClient.from("avaliacao_valores").select("*").eq("avaliacao_id", id);
  const mapaValores = Object.fromEntries((valores || []).map(v => [v.atleta_id, v]));

  pageContent().innerHTML = `
    <a href="#" onclick="iniciarAvaliacoes();return false;" style="font-size:13px;color:var(--verde-700);font-weight:700">← Voltar às avaliações</a>
    <div class="card" style="margin-top:14px">
      <div class="card-header">
        <h3>${av.titulo} — ${av.data_avaliacao || "—"}</h3>
        <button class="btn" onclick="gerarPdfAvaliacao()">Gerar PDF</button>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Atleta</th>
              ${TODOS_CAMPOS.map(c => `<th>${c[1]}</th>`).join('')}
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${(atletas || []).map(a => {
              const v = mapaValores[a.id] || {};
              const cols = TODOS_CAMPOS.map(([id]) => v[id] ?? "—").map(val => `<td>${val}</td>`).join('');
              return `<tr>
                <td>${a.nome_curto}</td>
                ${cols}
                <td><button class="btn btn-outline" onclick="abrirModalValores('${a.id}','${a.nome_curto.replace(/'/g, "\\'")}')">Editar valores</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Médias e ranking</h3></div>
      <div id="resumoAval"></div>
    </div>
  `;
  renderResumoAvaliacao(atletas, mapaValores);
}

function renderResumoAvaliacao(atletas, mapaValores) {
  const linhas = TODOS_CAMPOS.map(([campo, label]) => {
    const valores = (atletas || [])
      .map(a => ({ nome: a.nome_curto, val: mapaValores[a.id]?.[campo] }))
      .filter(v => v.val !== undefined && v.val !== null && v.val !== "");
    if (valores.length === 0) return null;

    const numericos = valores.filter(v => typeof v.val === "number");
    const media = numericos.length ? (numericos.reduce((s, v) => s + Number(v.val), 0) / numericos.length).toFixed(2) : "—";

    // ranking: quem tem valor mais alto ganha 1 ponto (menos pontos = melhor posição)
    const ordenado = [...valores].sort((a, b) => Number(b.val) - Number(a.val));
    const melhor = ordenado[0];

    return `<tr><td style="font-weight:700">${label}</td><td>${media}</td><td>${melhor ? `${melhor.nome} (${melhor.val})` : "—"}</td></tr>`;
  }).filter(Boolean).join("");

  document.getElementById("resumoAval").innerHTML = linhas
    ? `<table><thead><tr><th>Parâmetro</th><th>Média</th><th>Melhor valor</th></tr></thead><tbody>${linhas}</tbody></table>`
    : `<p style="color:var(--cinza-500)">Ainda sem valores suficientes para calcular médias.</p>`;
}

let atletaValoresId = null;

async function abrirModalValores(atletaId, nomeAtleta) {
  atletaValoresId = atletaId;
  const { data: v } = await supabaseClient.from("avaliacao_valores").select("*").eq("avaliacao_id", avaliacaoAtualId).eq("atleta_id", atletaId).maybeSingle();
  document.getElementById("tituloValores").textContent = `Valores — ${nomeAtleta}`;

  const campoNum = (id, label, val) => `<div class="field"><label>${label}</label><input type="number" id="v_${id}" value="${val ?? ""}"></div>`;
  const campoTempo = (id, label, val) => `<div class="field"><label>${label}</label><input type="text" placeholder="00:00" id="v_${id}" value="${val ?? ""}"></div>`;
  const campo05 = (id, label, val) => `<div class="field"><label>${label} (0–5)</label><input type="number" min="0" max="5" id="v_${id}" value="${val ?? ""}"></div>`;

  document.getElementById("formValores").innerHTML = `
    <div class="grid grid-2">
      ${CAMPOS_NUM.map(([id, l]) => campoNum(id, l, v?.[id])).join("")}
      ${CAMPOS_TEMPO.map(([id, l]) => campoTempo(id, l, v?.[id])).join("")}
      ${CAMPOS_0A5.map(([id, l]) => campo05(id, l, v?.[id])).join("")}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
      <button type="button" class="btn btn-outline" onclick="fecharModalValores()">Cancelar</button>
      <button type="submit" class="btn">Guardar valores</button>
    </div>
  `;
  document.getElementById("formValores").onsubmit = guardarValores;
  document.getElementById("modalValores").classList.add("open");
}
function fecharModalValores() { document.getElementById("modalValores").classList.remove("open"); }

async function guardarValores(e) {
  e.preventDefault();
  const payload = { avaliacao_id: avaliacaoAtualId, atleta_id: atletaValoresId };
  CAMPOS_NUM.forEach(([id]) => { const el = document.getElementById(`v_${id}`); payload[id] = el.value ? Number(el.value) : null; });
  CAMPOS_TEMPO.forEach(([id]) => { const el = document.getElementById(`v_${id}`); payload[id] = el.value || null; });
  CAMPOS_0A5.forEach(([id]) => { const el = document.getElementById(`v_${id}`); payload[id] = el.value ? Number(el.value) : null; });

  const { data: existente } = await supabaseClient.from("avaliacao_valores").select("id").eq("avaliacao_id", avaliacaoAtualId).eq("atleta_id", atletaValoresId).maybeSingle();
  const query = existente
    ? supabaseClient.from("avaliacao_valores").update(payload).eq("id", existente.id)
    : supabaseClient.from("avaliacao_valores").insert(payload);
  const { error } = await query;
  if (error) { showAlertModal("Ocorreu um erro ao guardar os valores: " + error.message); return; }

  fecharModalValores();
  showToast("Valores guardados com sucesso.");
  abrirAvaliacao(avaliacaoAtualId);
}

async function gerarPdfAvaliacao() {
  const { data: av } = await supabaseClient.from("avaliacoes_fisicas").select("*").eq("id", avaliacaoAtualId).single();
  const { data: valores } = await supabaseClient.from("avaliacao_valores").select("*, atletas(nome_curto)").eq("avaliacao_id", avaliacaoAtualId);
  // Gerar PDF incluindo todos os campos definidos em TODOS_CAMPOS
  const doc = novoPdf(`Avaliação Física — ${av.titulo}`, av.data_avaliacao || "");
  const head = ['Atleta', ...TODOS_CAMPOS.map(c => c[1])];
  const body = (valores || []).map(v => {
    const linha = [v.atletas?.nome_curto ?? "—"];
    TODOS_CAMPOS.forEach(([id]) => linha.push(v[id] ?? "—"));
    return linha;
  });
  tabelaPdf(doc, 34, head, body, { styles: { fontSize: 8 } });
  guardarPdf(doc, `avaliacao_${av.titulo.replace(/\s+/g, "_")}.pdf`);
}
