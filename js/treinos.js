// =========================================================
// TREINOS
// =========================================================

const ESTADOS_PRESENCA = ['presente','não presente justificado','não presente injustificado','lesionado/doente presente','lesionado/doente não presente'];

async function iniciarTreinos() {
  pageContent().innerHTML = `<div class="card"><div class="card-header"><h3>Treinos</h3></div><div id="listaTreinos" class="grid grid-3"></div></div>`;
  carregarTreinos();
}

async function carregarTreinos() {
  const { data } = await supabaseClient.from("treinos").select("*").order("data_treino", { ascending: false });
  const cont = document.getElementById("listaTreinos");
  if (!data || data.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="circle">🏋</div><p>Ainda não há treinos registados.</p></div>`;
    return;
  }
  cont.innerHTML = data.map(t => `
    <div class="card" style="margin-bottom:0;position:relative">
      <div style="position:absolute;right:12px;top:12px;z-index:6">
        <button class="icon-btn danger" onclick="event.stopPropagation(); eliminarTreino('${t.id}')">🗑</button>
      </div>
      <div style="cursor:pointer" onclick="abrirTreino('${t.id}')">
        <div style="font-weight:800">Treino nº ${t.numero ?? "—"}</div>
        <div style="font-size:12.5px;color:var(--cinza-500)">${t.dia_semana || "—"} · ${t.data_treino || "—"}</div>
      </div>
    </div>
  `).join("");
}

async function eliminarTreino(id) {
  const confirmar = await showConfirmModal({ title: 'Confirmação', message: 'Tem a certeza de que pretende eliminar o treino e as presenças associadas?' });
  if (!confirmar) return;
  await Promise.all([
    supabaseClient.from('treino_presencas').delete().eq('treino_id', id),
    supabaseClient.from('treinos').delete().eq('id', id),
  ]);
  showToast('Treino eliminado com sucesso.');
  carregarTreinos();
}

function abrirModalTreino() { document.getElementById("modalTreino").classList.add("open"); }
function fecharModalTreino() { document.getElementById("modalTreino").classList.remove("open"); }

document.addEventListener("submit", async (e) => {
  if (e.target.id !== "formTreino") return;
  e.preventDefault();
  const payload = {
    numero: document.getElementById("t_numero").value || null,
    dia_semana: document.getElementById("t_dia_semana").value,
    data_treino: document.getElementById("t_data").value || null,
  };
  const { error } = await supabaseClient.from("treinos").insert(payload);
  if (error) { await showAlertModal("Ocorreu um erro ao criar o treino: " + error.message); return; }
  fecharModalTreino();
  showToast("Treino criado com sucesso.");
  carregarTreinos();
});

let treinoAtualId = null;

async function abrirTreino(id) {
  treinoAtualId = id;
  const { data: treino } = await supabaseClient.from("treinos").select("*").eq("id", id).single();
  const { data: atletas } = await supabaseClient.from("atletas").select("id, nome_curto").order("nome_curto");
  const { data: presencas } = await supabaseClient.from("treino_presencas").select("*").eq("treino_id", id);
  const mapaPresencas = Object.fromEntries((presencas || []).map(p => [p.atleta_id, p]));

  pageContent().innerHTML = `
    <a href="#" onclick="iniciarTreinos();return false;" style="font-size:13px;color:var(--verde-700);font-weight:700">← Voltar aos treinos</a>
    <div class="card" style="margin-top:14px">
      <div class="card-header">
        <h3>Treino nº ${treino.numero ?? "—"} — ${treino.dia_semana || ""} (${treino.data_treino || "—"})</h3>
        <button class="btn" onclick="gerarPdfTreino()">Gerar PDF</button>
      </div>
      <table>
        <thead><tr><th>Atleta</th><th>Presença</th><th>Nível de cansaço (0–10)</th></tr></thead>
        <tbody>
          ${(atletas || []).map(a => {
            const p = mapaPresencas[a.id] || {};
            return `<tr>
              <td>${a.nome_curto}</td>
              <td>
                <select onchange="guardarPresenca('${a.id}', this.value, null)">
                  <option value="">—</option>
                  ${ESTADOS_PRESENCA.map(s => `<option value="${s}" ${p.estado === s ? "selected" : ""}>${s}</option>`).join("")}
                </select>
              </td>
              <td><input type="number" min="0" max="10" value="${p.cansaco ?? ""}" style="width:80px;padding:8px;border-radius:10px;border:1.5px solid var(--cinza-200)"
                onchange="guardarPresenca('${a.id}', null, this.value)"></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function guardarPresenca(atletaId, estado, cansaco) {
  const { data: existente } = await supabaseClient.from("treino_presencas").select("*").eq("treino_id", treinoAtualId).eq("atleta_id", atletaId).maybeSingle();
  const payload = {
    treino_id: treinoAtualId,
    atleta_id: atletaId,
    estado: estado !== null ? (estado || null) : (existente?.estado ?? null),
    cansaco: cansaco !== null ? (cansaco === "" ? null : Number(cansaco)) : (existente?.cansaco ?? null),
  };
  if (existente) {
    await supabaseClient.from("treino_presencas").update(payload).eq("id", existente.id);
  } else {
    await supabaseClient.from("treino_presencas").insert(payload);
  }
  showToast("Alterações guardadas com sucesso.");
}

async function gerarPdfTreino() {
  const { data: treino } = await supabaseClient.from("treinos").select("*").eq("id", treinoAtualId).single();
  const { data: presencas } = await supabaseClient.from("treino_presencas").select("*, atletas(nome_curto)").eq("treino_id", treinoAtualId);

  const doc = novoPdf(`Relatório de Treino nº ${treino.numero ?? "—"}`, `${treino.dia_semana || ""} · ${treino.data_treino || "—"}`);
  tabelaPdf(doc, 34, ["Atleta", "Presença", "Cansaço (0-10)"],
    (presencas || []).map(p => [p.atletas?.nome_curto ?? "—", p.estado || "—", p.cansaco ?? "—"]));
  guardarPdf(doc, `treino_${treino.numero ?? treinoAtualId}.pdf`);
}
