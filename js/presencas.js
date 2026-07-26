// =========================================================
// FOLHA DE PRESENÇAS CONSOLIDADA
// =========================================================

async function iniciarPresencas() {
  pageContent().innerHTML = `<div class="card"><p style="color:var(--cinza-500)">A carregar...</p></div>`;

  const { data: treinos } = await supabaseClient.from("treinos").select("*").order("data_treino");
  const { data: atletas } = await supabaseClient.from("atletas").select("id, nome_curto").order("nome_curto");
  const { data: presencas } = await supabaseClient.from("treino_presencas").select("*");

  window.__presencasData = { treinos: treinos || [], atletas: atletas || [], presencas: presencas || [] };

  if (!treinos || treinos.length === 0 || !atletas || atletas.length === 0) {
    pageContent().innerHTML = `<div class="card"><div class="empty-state"><div class="circle">📋</div><p>Regista treinos e atletas para veres a folha de presenças.</p></div></div>`;
    return;
  }

  const mapa = {};
  presencas.forEach(p => { mapa[`${p.treino_id}_${p.atleta_id}`] = p.estado; });

  const simboloEstado = (estado) => {
    if (!estado) return "—";
    if (estado === "presente") return '<span class="badge badge-green">P</span>';
    if (estado.includes("injustificado")) return '<span class="badge badge-red">FI</span>';
    if (estado.includes("justificado")) return '<span class="badge badge-gray">FJ</span>';
    if (estado.includes("presente")) return '<span class="badge badge-gray">LP</span>';
    return '<span class="badge badge-red">LNP</span>';
  };

  pageContent().innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Folha de presenças geral</h3>
        <button class="btn" onclick="gerarPdfPresencas()">Gerar PDF geral</button>
      </div>
      <p style="color:var(--cinza-500);font-size:12px">P = Presente · FJ = Falta justificada · FI = Falta injustificada · LP = Lesionada/doente presente · LNP = Lesionada/doente não presente</p>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Atleta</th>${treinos.map(t => `<th>T${t.numero ?? "-"}<br><span style="font-weight:400">${t.data_treino || ""}</span></th>`).join("")}</tr></thead>
          <tbody>
            ${atletas.map(a => `<tr><td style="font-weight:700">${a.nome_curto}</td>${treinos.map(t => `<td>${simboloEstado(mapa[`${t.id}_${a.id}`])}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function gerarPdfPresencas() {
  const { treinos, atletas, presencas } = window.__presencasData;
  const mapa = {};
  presencas.forEach(p => { mapa[`${p.treino_id}_${p.atleta_id}`] = p.estado; });

  const abrev = (estado) => {
    if (!estado) return "-";
    if (estado === "presente") return "P";
    if (estado.includes("injustificado")) return "FI";
    if (estado.includes("justificado")) return "FJ";
    if (estado.includes("presente")) return "LP";
    return "LNP";
  };

  const doc = novoPdf("Folha de Presenças Geral", "Legenda: P / FJ / FI / LP / LNP");
  const head = ["Atleta", ...treinos.map(t => `T${t.numero ?? "-"}`)];
  const body = atletas.map(a => [a.nome_curto, ...treinos.map(t => abrev(mapa[`${t.id}_${a.id}`]))]);
  tabelaPdf(doc, 34, head, body);
  guardarPdf(doc, "folha_presencas_geral.pdf");
}
