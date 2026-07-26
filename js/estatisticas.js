// =========================================================
// ESTATÍSTICAS GERAIS
// =========================================================

function idade(dataNascimento) {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let a = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) a--;
  return a;
}

async function iniciarEstatisticas() {
  pageContent().innerHTML = `<div class="card"><p style="color:var(--cinza-500)">A carregar estatísticas...</p></div>`;

  const [{ data: atletas }, { data: presencas }, { data: golos }, { data: statsJogos }, { data: lesoes }] = await Promise.all([
    supabaseClient.from("atletas").select("*"),
    supabaseClient.from("treino_presencas").select("*"),
    supabaseClient.from("jogo_golos").select("*, marcador:marcador_id(nome_curto), assistente:assistente_id(nome_curto)"),
    supabaseClient.from("jogo_estatisticas").select("*, atletas(nome_curto)"),
    supabaseClient.from("lesoes").select("*"),
  ]);

  const nAtletas = (atletas || []).length;
  const portuguesas = (atletas || []).filter(a => (a.nacionalidade || "").toLowerCase().includes("portug")).length;
  const naoNacionais = nAtletas - portuguesas;
  const juniores = (atletas || []).filter(a => a.escalao_etario === "juniores").length;
  const naoJuniores = nAtletas - juniores;
  const idades = (atletas || []).map(a => idade(a.data_nascimento)).filter(i => i !== null);
  const mediaIdades = idades.length ? (idades.reduce((s, i) => s + i, 0) / idades.length).toFixed(1) : "—";
  const maisVelha = (atletas || []).filter(a => a.data_nascimento).sort((a, b) => new Date(a.data_nascimento) - new Date(b.data_nascimento))[0];
  const maisNova = (atletas || []).filter(a => a.data_nascimento).sort((a, b) => new Date(b.data_nascimento) - new Date(a.data_nascimento))[0];

  const posicoesCount = {};
  (atletas || []).forEach(a => { if (a.posicao) posicoesCount[a.posicao] = (posicoesCount[a.posicao] || 0) + 1; });

  const treinosIds = new Set((presencas || []).map(p => p.treino_id));
  const nTreinos = treinosIds.size;
  const presentesCount = (presencas || []).filter(p => p.estado && p.estado.startsWith("presente")).length;
  const faltasCount = (presencas || []).filter(p => p.estado && p.estado.includes("não presente")).length;
  const mediaPresentesPorTreino = nTreinos ? (presentesCount / nTreinos).toFixed(1) : "—";

  const golosPorAtleta = {};
  const assistsPorAtleta = {};
  (golos || []).forEach(g => {
    if (g.marcador?.nome_curto) golosPorAtleta[g.marcador.nome_curto] = (golosPorAtleta[g.marcador.nome_curto] || 0) + 1;
    if (g.assistente?.nome_curto) assistsPorAtleta[g.assistente.nome_curto] = (assistsPorAtleta[g.assistente.nome_curto] || 0) + 1;
  });
  const rankingGolos = Object.entries(golosPorAtleta).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const rankingAssists = Object.entries(assistsPorAtleta).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const jogosComEstatisticas = new Set((statsJogos || []).map(s => s.jogo_id)).size;
  const mediaPassesCertos = (statsJogos || []).length ? ((statsJogos || []).reduce((s, r) => s + (r.passes_certos || 0), 0) / statsJogos.length).toFixed(1) : "—";
  const mediaRecuperacoes = (statsJogos || []).length ? ((statsJogos || []).reduce((s, r) => s + (r.recuperacoes_bola || 0), 0) / statsJogos.length).toFixed(1) : "—";

  const classificacaoPorAtleta = {};
  (statsJogos || []).forEach(s => {
    if (s.classificacao) {
      const nome = s.atletas?.nome_curto || "—";
      classificacaoPorAtleta[nome] = classificacaoPorAtleta[nome] || [];
      classificacaoPorAtleta[nome].push(s.classificacao);
    }
  });
  const rankingClassificacao = Object.entries(classificacaoPorAtleta)
    .map(([nome, vals]) => [nome, (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)])
    .sort((a, b) => b[1] - a[1]).slice(0, 10);

  pageContent().innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Visão geral do plantel</h3></div>
      <div class="grid grid-4">
        <div class="stat-pill"><div class="num">${nAtletas}</div><div class="lbl">Atletas</div></div>
        <div class="stat-pill"><div class="num">${portuguesas}</div><div class="lbl">Portuguesas</div></div>
        <div class="stat-pill"><div class="num">${naoNacionais}</div><div class="lbl">Não nacionais</div></div>
        <div class="stat-pill"><div class="num">${juniores}</div><div class="lbl">Juniores</div></div>
        <div class="stat-pill"><div class="num">${naoJuniores}</div><div class="lbl">Não juniores</div></div>
        <div class="stat-pill"><div class="num">${mediaIdades}</div><div class="lbl">Idade média</div></div>
        <div class="stat-pill"><div class="num">${maisVelha?.nome_curto ?? "—"}</div><div class="lbl">Mais velha</div></div>
        <div class="stat-pill"><div class="num">${maisNova?.nome_curto ?? "—"}</div><div class="lbl">Mais nova</div></div>
        <div class="stat-pill"><div class="num">${(lesoes || []).length}</div><div class="lbl">Lesões registadas</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Jogadoras por posição</h3></div>
      <div class="grid grid-4">
        ${Object.entries(posicoesCount).map(([p, n]) => `<div class="stat-pill"><div class="num">${n}</div><div class="lbl">${p}</div></div>`).join("") || "<p style='color:var(--cinza-500)'>Sem dados.</p>"}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Treinos</h3></div>
      <div class="grid grid-4">
        <div class="stat-pill"><div class="num">${mediaPresentesPorTreino}</div><div class="lbl">Média presentes/treino</div></div>
        <div class="stat-pill"><div class="num">${presentesCount}</div><div class="lbl">Total presenças</div></div>
        <div class="stat-pill"><div class="num">${faltasCount}</div><div class="lbl">Total faltas</div></div>
        <div class="stat-pill"><div class="num">${nTreinos}</div><div class="lbl">Treinos registados</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Jogos (médias sobre ${jogosComEstatisticas} jogo(s) com estatísticas)</h3></div>
      <div class="grid grid-4">
        <div class="stat-pill"><div class="num">${mediaPassesCertos}</div><div class="lbl">Média passes certos</div></div>
        <div class="stat-pill"><div class="num">${mediaRecuperacoes}</div><div class="lbl">Média recuperações</div></div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><h3>Ranking de golos</h3></div>
        <table><tbody>${rankingGolos.map(([n, v]) => `<tr><td>${n}</td><td style="text-align:right;font-weight:800">${v}</td></tr>`).join("") || `<tr><td style="color:var(--cinza-500)">Sem golos registados.</td></tr>`}</tbody></table>
      </div>
      <div class="card">
        <div class="card-header"><h3>Ranking de assistências</h3></div>
        <table><tbody>${rankingAssists.map(([n, v]) => `<tr><td>${n}</td><td style="text-align:right;font-weight:800">${v}</td></tr>`).join("") || `<tr><td style="color:var(--cinza-500)">Sem assistências registadas.</td></tr>`}</tbody></table>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Ranking de classificação média em jogo</h3></div>
      <table><tbody>${rankingClassificacao.map(([n, v]) => `<tr><td>${n}</td><td style="text-align:right;font-weight:800">${v}</td></tr>`).join("") || `<tr><td style="color:var(--cinza-500)">Regista estatísticas de jogo para gerar este ranking.</td></tr>`}</tbody></table>
    </div>
  `;
}
