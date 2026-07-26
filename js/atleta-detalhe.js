// =========================================================
// FICHA INDIVIDUAL DA ATLETA
// =========================================================

function getIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

let atletaAtual = null;

async function iniciarFichaAtleta() {
  const id = getIdFromUrl();
  if (!id) { pageContent().innerHTML = "<p>Atleta não encontrada.</p>"; return; }

  const { data } = await supabaseClient.from("atletas").select("*").eq("id", id).single();
  atletaAtual = data;
  if (!data) { pageContent().innerHTML = "<p>Atleta não encontrada.</p>"; return; }

  const imc = (data.peso && data.altura) ? (data.peso / Math.pow(data.altura / 100, 2)).toFixed(1) : "—";

  pageContent().innerHTML = `
    <a href="plantel.html" style="font-size:13px;color:var(--verde-700);font-weight:700">← Voltar ao plantel</a>
    <div class="card" style="margin-top:14px">
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
        <img class="avatar-round" style="width:88px;height:88px" src="${data.foto_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(data.nome_curto)}">
        <div style="flex:1;min-width:220px">
          <h2>${data.nome_completo} ${data.numero_camisola ? `<span class="badge badge-green">#${data.numero_camisola}</span>` : ""}</h2>
          <p style="color:var(--cinza-500)">${data.posicao || "—"} · ${data.escalao_etario || "—"} · ${data.nacionalidade || "—"}</p>
        </div>
        <button class="btn" onclick="gerarPdfAtleta()">Gerar PDF da ficha</button>
      </div>
      <div class="grid grid-4" style="margin-top:20px">
        <div class="stat-pill"><div class="num">${imc}</div><div class="lbl">IMC</div></div>
        <div class="stat-pill"><div class="num">${data.peso ?? "—"}</div><div class="lbl">Peso (kg)</div></div>
        <div class="stat-pill"><div class="num">${data.altura ?? "—"}</div><div class="lbl">Altura (cm)</div></div>
        <div class="stat-pill"><div class="num">${data.anos_pratica_federada ?? "—"}</div><div class="lbl">Anos de prática</div></div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" data-tab="dados">Dados pessoais</div>
      <div class="tab" data-tab="escola">Escola & Notas</div>
      <div class="tab" data-tab="lesoes">Lesões</div>
      <div class="tab" data-tab="saude">Histórico de saúde</div>
      <div class="tab" data-tab="avaliacoes">Avaliações</div>
    </div>
    <div id="tabContent"></div>
  `;

  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    renderTab(t.dataset.tab);
  }));
  renderTab("dados");
}

function linhaInfo(label, valor) {
  return `<tr><td style="font-weight:700;color:var(--verde-900);width:40%">${label}</td><td>${valor ?? "—"}</td></tr>`;
}

function renderTab(tab) {
  const a = atletaAtual;
  const cont = document.getElementById("tabContent");

  if (tab === "dados") {
    cont.innerHTML = `
      <div class="card">
        <table>
          ${linhaInfo("Nome curto", a.nome_curto)}
          ${linhaInfo("Data de nascimento", a.data_nascimento)}
          ${linhaInfo("Pé preferido", a.pe_preferido)}
          ${linhaInfo("País de nascimento", a.pais_nascimento)}
          ${linhaInfo("Clube anterior", a.clube_anterior)}
          ${linhaInfo("Nº de telefone", a.telefone)}
          ${linhaInfo("Desportos extra-futsal", a.desportos_extra_futsal)}
          ${linhaInfo("Atividades extra-desporto", a.atividades_extra_desporto)}
          ${linhaInfo("Nome do pai", a.nome_pai)}
          ${linhaInfo("Contacto do pai", a.contacto_pai)}
          ${linhaInfo("Nome da mãe", a.nome_mae)}
          ${linhaInfo("Contacto da mãe", a.contacto_mae)}
          ${linhaInfo("Email do encarregado de educação", a.email_encarregado_educacao)}
        </table>
      </div>`;
  }

  if (tab === "escola") {
    cont.innerHTML = `
      <div class="card">
        <table style="margin-bottom:18px">
          ${linhaInfo("Escola", a.escola)}
          ${linhaInfo("Ano escolar", a.ano_escolar)}
          ${linhaInfo("Disciplina favorita", a.disciplina_favorita)}
        </table>
        <div class="card-header"><h3>Notas escolares</h3>
          <button class="btn btn-outline" onclick="novaNota()">+ Adicionar nota</button>
        </div>
        <table id="tabelaNotas"><thead><tr><th>Período</th><th>Disciplina</th><th>Nota</th><th></th></tr></thead><tbody></tbody></table>
      </div>`;
    carregarNotas();
  }

  if (tab === "lesoes") {
    cont.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Lesões</h3>
          <button class="btn btn-outline" onclick="novaLesao()">+ Adicionar lesão</button>
        </div>
        <table id="tabelaLesoes"><thead><tr><th>Título</th><th>Descrição</th><th>Recuperação</th><th>Estado</th><th></th></tr></thead><tbody></tbody></table>
      </div>`;
    carregarLesoes();
  }

  if (tab === "saude") {
    cont.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Histórico de problemas de saúde</h3>
          <button class="btn btn-outline" onclick="novoHistoricoSaude()">+ Adicionar registo</button>
        </div>
        <table id="tabelaSaude"><thead><tr><th>Data</th><th>Descrição</th><th></th></tr></thead><tbody></tbody></table>
      </div>`;
    carregarSaude();
  }

  if (tab === "avaliacoes") {
    cont.innerHTML = `<div class="card"><p style="color:var(--cinza-500)">Consulta os valores completos de avaliações físicas em <a href="avaliacoes.html" style="color:var(--verde-700);font-weight:700">Avaliações Físicas</a>.</p><div id="resumoAvals"></div></div>`;
    carregarResumoAvaliacoes();
  }
}

// ---------- NOTAS ----------
async function carregarNotas() {
  const { data } = await supabaseClient.from("notas_escolares").select("*").eq("atleta_id", atletaAtual.id).order("periodo");
  document.querySelector("#tabelaNotas tbody").innerHTML = (data || []).map(n => `
    <tr><td>${n.periodo}</td><td>${n.disciplina}</td><td>${n.nota}</td>
      <td><button class="icon-btn danger" onclick="eliminarLinha('notas_escolares','${n.id}', carregarNotas)">🗑</button></td></tr>
  `).join("") || `<tr><td colspan="4" style="color:var(--cinza-500)">Sem registos.</td></tr>`;
}
async function novaNota() {
  const periodo = prompt("Período (ex: 1º Período):"); if (!periodo) return;
  const disciplina = prompt("Disciplina:"); if (!disciplina) return;
  const nota = prompt("Nota:"); if (!nota) return;
  await supabaseClient.from("notas_escolares").insert({ atleta_id: atletaAtual.id, periodo, disciplina, nota });
  carregarNotas();
}

// ---------- LESÕES ----------
async function carregarLesoes() {
  const { data } = await supabaseClient.from("lesoes").select("*").eq("atleta_id", atletaAtual.id).order("data_inicio", { ascending: false });
  document.querySelector("#tabelaLesoes tbody").innerHTML = (data || []).map(l => `
    <tr><td>${l.titulo}</td><td>${l.descricao || "—"}</td><td>${l.tempo_recuperacao || "—"}</td>
      <td>${l.recuperada ? '<span class="badge badge-green">Recuperada</span>' : '<span class="badge badge-red">Em recuperação</span>'}</td>
      <td><button class="icon-btn danger" onclick="eliminarLinha('lesoes','${l.id}', carregarLesoes)">🗑</button></td></tr>
  `).join("") || `<tr><td colspan="5" style="color:var(--cinza-500)">Sem lesões registadas.</td></tr>`;
}
async function novaLesao() {
  const titulo = prompt("Título da lesão:"); if (!titulo) return;
  const descricao = prompt("Descrição breve:") || "";
  const tempo_recuperacao = prompt("Tempo de recuperação previsto:") || "";
  await supabaseClient.from("lesoes").insert({ atleta_id: atletaAtual.id, titulo, descricao, tempo_recuperacao });
  carregarLesoes();
}

// ---------- SAÚDE ----------
async function carregarSaude() {
  const { data } = await supabaseClient.from("historico_saude").select("*").eq("atleta_id", atletaAtual.id).order("data_registo", { ascending: false });
  document.querySelector("#tabelaSaude tbody").innerHTML = (data || []).map(s => `
    <tr><td>${s.data_registo || "—"}</td><td>${s.descricao}</td>
      <td><button class="icon-btn danger" onclick="eliminarLinha('historico_saude','${s.id}', carregarSaude)">🗑</button></td></tr>
  `).join("") || `<tr><td colspan="3" style="color:var(--cinza-500)">Sem registos.</td></tr>`;
}
async function novoHistoricoSaude() {
  const descricao = prompt("Descrição do registo de saúde:"); if (!descricao) return;
  await supabaseClient.from("historico_saude").insert({ atleta_id: atletaAtual.id, descricao });
  carregarSaude();
}

async function eliminarLinha(tabela, id, callback) {
  if (!confirm("Eliminar este registo?")) return;
  await supabaseClient.from(tabela).delete().eq("id", id);
  callback();
}

// ---------- AVALIAÇÕES (resumo) ----------
async function carregarResumoAvaliacoes() {
  const { data } = await supabaseClient
    .from("avaliacao_valores")
    .select("*, avaliacoes_fisicas(titulo, data_avaliacao)")
    .eq("atleta_id", atletaAtual.id);

  const cont = document.getElementById("resumoAvals");
  if (!data || data.length === 0) {
    cont.innerHTML = `<p style="color:var(--cinza-500);margin-top:14px">Sem avaliações registadas ainda.</p>`;
    return;
  }
  cont.innerHTML = `<table style="margin-top:14px"><thead><tr><th>Avaliação</th><th>Data</th><th>Agachamentos</th><th>Flexões</th><th>Abdominais</th></tr></thead><tbody>
    ${data.map(v => `<tr><td>${v.avaliacoes_fisicas?.titulo ?? "—"}</td><td>${v.avaliacoes_fisicas?.data_avaliacao ?? "—"}</td><td>${v.agachamentos ?? "—"}</td><td>${v.flexoes ?? "—"}</td><td>${v.abdominais ?? "—"}</td></tr>`).join("")}
  </tbody></table>`;
}

// ---------- PDF ----------
async function gerarPdfAtleta() {
  const a = atletaAtual;
  const imc = (a.peso && a.altura) ? (a.peso / Math.pow(a.altura / 100, 2)).toFixed(1) : "—";
  const doc = novoPdf(`Ficha Individual — ${a.nome_completo}`, `Nº ${a.numero_camisola ?? "—"} · ${a.posicao ?? "—"}`);

  let y = 34;
  y = tabelaPdf(doc, y, ["Campo", "Valor"], [
    ["Nome curto", a.nome_curto || "—"],
    ["Data de nascimento", a.data_nascimento || "—"],
    ["Posição", a.posicao || "—"],
    ["Pé preferido", a.pe_preferido || "—"],
    ["Nacionalidade", a.nacionalidade || "—"],
    ["Escalão etário", a.escalao_etario || "—"],
    ["Peso / Altura / IMC", `${a.peso ?? "—"} kg / ${a.altura ?? "—"} cm / ${imc}`],
    ["Clube anterior", a.clube_anterior || "—"],
    ["Anos de prática federada", a.anos_pratica_federada ?? "—"],
    ["Telefone", a.telefone || "—"],
    ["Escola / Ano", `${a.escola || "—"} / ${a.ano_escolar || "—"}`],
    ["Encarregado de educação (email)", a.email_encarregado_educacao || "—"],
  ]);

  const { data: lesoes } = await supabaseClient.from("lesoes").select("*").eq("atleta_id", a.id);
  if (lesoes && lesoes.length) {
    doc.setFontSize(12); doc.text("Lesões", 14, y); y += 4;
    y = tabelaPdf(doc, y, ["Título", "Descrição", "Recuperação"], lesoes.map(l => [l.titulo, l.descricao || "—", l.tempo_recuperacao || "—"]));
  }

  guardarPdf(doc, `ficha_${a.nome_curto.replace(/\s+/g, "_")}.pdf`);
}
