const STATUS_META = {
  aberto: { label: "Aberto", color: "#E8912B" },
  em_andamento: { label: "Em andamento", color: "#3B6EA5" },
  aguardando_cliente: { label: "Aguardando cliente", color: "#6B5B95" },
  resolvido: { label: "Resolvido", color: "#4C7A3B" },
  fechado: { label: "Fechado", color: "#8C8577" },
};

const PRIORIDADE_META = {
  baixa: { label: "Baixa", color: "#4C7A3B" },
  media: { label: "Média", color: "#E8912B" },
  alta: { label: "Alta", color: "#B23A2E" },
  urgente: { label: "Urgente", color: "#7A1F16" },
};

let currentUser = null;
let clientes = [];
let categorias = [];
let chamados = [];
let statusChart = null;
let categoriaChart = null;

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function badge(meta) {
  return `<span class="badge" style="background:${meta.color}">${meta.label}</span>`;
}

async function requireSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session.user;
}

async function loadReferenceData() {
  const [{ data: cli }, { data: cat }] = await Promise.all([
    supabaseClient.from("clientes").select("*").order("nome"),
    supabaseClient.from("categorias").select("*").order("nome"),
  ]);
  clientes = cli || [];
  categorias = cat || [];

  const selCliente = document.getElementById("chamadoCliente");
  selCliente.innerHTML = clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");

  const selCategoria = document.getElementById("chamadoCategoria");
  selCategoria.innerHTML = categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
}

async function loadChamados() {
  const { data, error } = await supabaseClient
    .from("chamados")
    .select("*, clientes(id,nome), categorias(id,nome,cor)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  chamados = data || [];
  renderDashboard();
  renderChamadosTable();
  renderClientesTable();
}

// ---------- Dashboard ----------
function renderDashboard() {
  const statsGrid = document.getElementById("statsGrid");
  const total = chamados.length;
  const abertos = chamados.filter((c) => !["resolvido", "fechado"].includes(c.status)).length;
  const resolvidos = chamados.filter((c) => c.status === "resolvido" || c.status === "fechado");
  const temposResolucao = resolvidos
    .filter((c) => c.resolved_at)
    .map((c) => (new Date(c.resolved_at) - new Date(c.created_at)) / 36e5);
  const tempoMedio = temposResolucao.length
    ? (temposResolucao.reduce((a, b) => a + b, 0) / temposResolucao.length).toFixed(1)
    : "-";
  const urgentes = chamados.filter((c) => c.prioridade === "urgente" && !["resolvido", "fechado"].includes(c.status)).length;

  statsGrid.innerHTML = `
    <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Chamados totais</div></div>
    <div class="stat-card"><div class="stat-value">${abertos}</div><div class="stat-label">Em aberto</div></div>
    <div class="stat-card"><div class="stat-value">${urgentes}</div><div class="stat-label">Urgentes em aberto</div></div>
    <div class="stat-card"><div class="stat-value">${tempoMedio}h</div><div class="stat-label">Tempo médio de resolução</div></div>
  `;

  const statusCounts = Object.keys(STATUS_META).map((k) => chamados.filter((c) => c.status === k).length);
  const statusLabels = Object.values(STATUS_META).map((m) => m.label);
  const statusColors = Object.values(STATUS_META).map((m) => m.color);

  const catLabels = categorias.map((c) => c.nome);
  const catCounts = categorias.map((c) => chamados.filter((ch) => ch.categoria_id === c.id).length);
  const catColors = categorias.map((c) => c.cor);

  if (statusChart) statusChart.destroy();
  statusChart = new Chart(document.getElementById("chartStatus"), {
    type: "doughnut",
    data: { labels: statusLabels, datasets: [{ data: statusCounts, backgroundColor: statusColors }] },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } } },
  });

  if (categoriaChart) categoriaChart.destroy();
  categoriaChart = new Chart(document.getElementById("chartCategoria"), {
    type: "bar",
    data: { labels: catLabels, datasets: [{ data: catCounts, backgroundColor: catColors }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}

// ---------- Chamados ----------
function filteredChamados() {
  const texto = document.getElementById("filtroTexto").value.trim().toLowerCase();
  const status = document.getElementById("filtroStatus").value;
  const prioridade = document.getElementById("filtroPrioridade").value;

  return chamados.filter((c) => {
    if (status && c.status !== status) return false;
    if (prioridade && c.prioridade !== prioridade) return false;
    if (texto) {
      const alvo = `${c.titulo} ${c.clientes ? c.clientes.nome : ""}`.toLowerCase();
      if (!alvo.includes(texto)) return false;
    }
    return true;
  });
}

function renderChamadosTable() {
  const list = filteredChamados();
  const tbody = document.getElementById("chamadosTableBody");
  document.getElementById("chamadosEmpty").style.display = list.length ? "none" : "block";

  tbody.innerHTML = list
    .map(
      (c) => `
    <tr data-id="${c.id}">
      <td>#${c.numero}</td>
      <td>${c.titulo}</td>
      <td>${c.clientes ? c.clientes.nome : "-"}</td>
      <td>${c.categorias ? c.categorias.nome : "-"}</td>
      <td>${badge(PRIORIDADE_META[c.prioridade])}</td>
      <td>${badge(STATUS_META[c.status])}</td>
      <td>${fmtDate(c.created_at)}</td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => openChamadoModal(tr.dataset.id));
  });
}

async function openChamadoModal(id) {
  const modal = document.getElementById("modalChamado");
  const form = document.getElementById("formChamado");
  form.reset();
  document.getElementById("chamadoId").value = "";
  document.getElementById("fieldStatus").style.display = "none";
  document.getElementById("interacoesSection").style.display = "none";

  if (id) {
    const c = chamados.find((x) => x.id === id);
    document.getElementById("modalChamadoTitle").textContent = `Chamado #${c.numero}`;
    document.getElementById("chamadoId").value = c.id;
    document.getElementById("chamadoTitulo").value = c.titulo;
    document.getElementById("chamadoCliente").value = c.cliente_id || "";
    document.getElementById("chamadoCategoria").value = c.categoria_id || "";
    document.getElementById("chamadoPrioridade").value = c.prioridade;
    document.getElementById("chamadoDescricao").value = c.descricao || "";
    document.getElementById("chamadoStatus").value = c.status;
    document.getElementById("fieldStatus").style.display = "block";
    document.getElementById("interacoesSection").style.display = "block";
    await loadInteracoes(id);
  } else {
    document.getElementById("modalChamadoTitle").textContent = "Novo chamado";
  }
  modal.classList.add("visible");
}

async function loadInteracoes(chamadoId) {
  const { data } = await supabaseClient
    .from("interacoes")
    .select("*")
    .eq("chamado_id", chamadoId)
    .order("created_at", { ascending: true });

  const list = document.getElementById("interacoesList");
  list.innerHTML = (data || [])
    .map((i) => `<div class="interacao-item"><div class="meta">${fmtDate(i.created_at)}</div>${i.mensagem}</div>`)
    .join("") || `<div class="empty-state">Nenhuma interação ainda.</div>`;
}

document.getElementById("formInteracao").addEventListener("submit", async (e) => {
  e.preventDefault();
  const chamadoId = document.getElementById("chamadoId").value;
  const input = document.getElementById("interacaoMensagem");
  const mensagem = input.value.trim();
  if (!mensagem || !chamadoId) return;

  await supabaseClient.from("interacoes").insert({
    chamado_id: chamadoId,
    autor_id: currentUser.id,
    mensagem,
  });
  input.value = "";
  await loadInteracoes(chamadoId);
});

document.getElementById("formChamado").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("chamadoId").value;
  const payload = {
    titulo: document.getElementById("chamadoTitulo").value.trim(),
    cliente_id: document.getElementById("chamadoCliente").value || null,
    categoria_id: document.getElementById("chamadoCategoria").value || null,
    prioridade: document.getElementById("chamadoPrioridade").value,
    descricao: document.getElementById("chamadoDescricao").value.trim(),
  };

  if (id) {
    payload.status = document.getElementById("chamadoStatus").value;
    await supabaseClient.from("chamados").update(payload).eq("id", id);
  } else {
    payload.atendente_id = currentUser.id;
    await supabaseClient.from("chamados").insert(payload);
  }

  document.getElementById("modalChamado").classList.remove("visible");
  await loadChamados();
});

document.getElementById("btnNovoChamado").addEventListener("click", () => openChamadoModal(null));

["filtroTexto", "filtroStatus", "filtroPrioridade"].forEach((id) => {
  document.getElementById(id).addEventListener("input", renderChamadosTable);
});

// ---------- Clientes ----------
function filteredClientes() {
  const texto = document.getElementById("filtroClienteTexto").value.trim().toLowerCase();
  if (!texto) return clientes;
  return clientes.filter((c) =>
    `${c.nome} ${c.email || ""} ${c.telefone || ""}`.toLowerCase().includes(texto)
  );
}

function renderClientesTable() {
  const list = filteredClientes();
  const tbody = document.getElementById("clientesTableBody");
  document.getElementById("clientesEmpty").style.display = list.length ? "none" : "block";

  tbody.innerHTML = list
    .map((c) => {
      const qtd = chamados.filter((ch) => ch.cliente_id === c.id).length;
      return `<tr><td>${c.nome}</td><td>${c.email || "-"}</td><td>${c.telefone || "-"}</td><td>${c.documento || "-"}</td><td>${qtd}</td></tr>`;
    })
    .join("");
}

document.getElementById("filtroClienteTexto").addEventListener("input", renderClientesTable);

document.getElementById("btnNovoCliente").addEventListener("click", () => {
  document.getElementById("formCliente").reset();
  document.getElementById("modalCliente").classList.add("visible");
});

document.getElementById("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    nome: document.getElementById("clienteNome").value.trim(),
    email: document.getElementById("clienteEmail").value.trim() || null,
    telefone: document.getElementById("clienteTelefone").value.trim() || null,
    documento: document.getElementById("clienteDocumento").value.trim() || null,
    observacoes: document.getElementById("clienteObs").value.trim() || null,
    created_by: currentUser.id,
  };
  await supabaseClient.from("clientes").insert(payload);
  document.getElementById("modalCliente").classList.remove("visible");
  await loadReferenceData();
  renderClientesTable();
});

// ---------- Modais genéricos ----------
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.target.closest(".modal-overlay").classList.remove("visible");
  });
});
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("visible");
  });
});

// ---------- Navegação ----------
document.querySelectorAll(".app-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".app-nav button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
  });
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// ---------- Init ----------
const ALLOWED_DOMAIN = "@ralston.com.br";

(async function init() {
  currentUser = await requireSession();
  if (!currentUser) return;

  const email = (currentUser.email || "").toLowerCase();
  const isGoogleLogin = (currentUser.app_metadata?.provider || "") === "google";
  if (isGoogleLogin && !email.endsWith(ALLOWED_DOMAIN)) {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html?erro=dominio";
    return;
  }

  document.getElementById("userLabel").textContent = currentUser.user_metadata?.nome || currentUser.email;
  await loadReferenceData();
  await loadChamados();
})();
