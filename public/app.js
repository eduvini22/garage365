const API = '';

// ─── TOKEN ────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('garage_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

async function fetchAuth(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) }
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('garage_token');
    mostrarLogin();
    return null;
  }

  return res;
}
// ──────────────────────────────────────────────────────────────

// ─── LOGIN ────────────────────────────────────────────────────
function mostrarLogin() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('tela-login').style.display = 'flex';
}

function mostrarApp() {
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

async function fazerLogin() {
  const usuario = document.getElementById('login-usuario').value.trim();
  const senha = document.getElementById('login-senha').value.trim();
  const erro = document.getElementById('login-erro');

  if (!usuario || !senha) {
    erro.textContent = 'Preencha usuário e senha.';
    erro.style.display = 'block';
    return;
  }

  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, senha })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem('garage_token', data.token);
    erro.style.display = 'none';
    mostrarApp();
    document.getElementById('filtro-data').value = dataHoje();
    document.getElementById('filtro-fat').value = dataHoje();
    carregarVeiculos();
  } else {
    erro.textContent = data.erro || 'Credenciais inválidas.';
    erro.style.display = 'block';
  }
}

function fazerLogout() {
  localStorage.removeItem('garage_token');
  mostrarLogin();
}

// Permitir login com Enter + verificar se já está logado ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-senha').addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });

  if (getToken()) {
    mostrarApp();
    document.getElementById('filtro-data').value = dataHoje();
    document.getElementById('filtro-fat').value = dataHoje();
    carregarVeiculos();
  } else {
    mostrarLogin();
  }
});
// ──────────────────────────────────────────────────────────────

// ─── UTILITÁRIOS ──────────────────────────────────────────────
function toggleAdicional(btn) {
  btn.classList.toggle('ativo');
  preencherValor();
}

function preencherValor() {
  const select = document.getElementById('servico');
  const opcao = select.options[select.selectedIndex];
  const valorPrincipal = parseFloat(opcao.getAttribute('data-valor')) || 0;

  const botoesAtivos = document.querySelectorAll('.toggle-btn.ativo');
  let valorAdicionais = 0;
  botoesAtivos.forEach(b => {
    valorAdicionais += parseFloat(b.getAttribute('data-valor')) || 0;
  });

  const total = valorPrincipal + valorAdicionais;
  document.getElementById('valor').value = total > 0 ? total : '';
}

function montarTextoServico() {
  const select = document.getElementById('servico');
  const principal = select.value;
  const adicionaisMarcados = Array.from(document.querySelectorAll('.toggle-btn.ativo'))
    .map(b => b.getAttribute('data-servico'));

  if (adicionaisMarcados.length === 0) return principal;
  return principal + (principal ? ' + ' : '') + adicionaisMarcados.join(' + ');
}

function limparAdicionais() {
  document.querySelectorAll('.toggle-btn.ativo').forEach(b => b.classList.remove('ativo'));
}

function abrirWhatsApp(telefone) {
  const numero = '55' + telefone.replace(/\D/g, '');
  const mensagem = 'Olá, seu carro está pronto! Pode vir buscar.';
  const encoded = encodeURIComponent(mensagem);
  window.open(`https://wa.me/${numero}?text=${encoded}`, '_blank');
}

function dataHoje() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// ─── ABAS ─────────────────────────────────────────────────────
function trocarAba(aba) {
  document.getElementById('aba-veiculos').style.display = aba === 'veiculos' ? 'flex' : 'none';
  document.getElementById('aba-faturamento').style.display = aba === 'faturamento' ? 'block' : 'none';
  document.getElementById('aba-historico').style.display = aba === 'historico' ? 'block' : 'none';
  document.getElementById('aba-clientes').style.display = aba === 'clientes' ? 'block' : 'none';
  document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
  event.target.classList.add('ativa');
  if (aba === 'faturamento') carregarFaturamento();
  if (aba === 'clientes') carregarClientes();
}

// ─── FILTROS DE DATA ──────────────────────────────────────────
function filtrarHoje() {
  document.getElementById('filtro-data').value = dataHoje();
  carregarVeiculos();
}

function filtrarTodos() {
  document.getElementById('filtro-data').value = '';
  carregarVeiculos();
}

function filtrarHojeFat() {
  document.getElementById('filtro-fat').value = dataHoje();
  carregarFaturamento();
}

function filtrarTodosFat() {
  document.getElementById('filtro-fat').value = '';
  carregarFaturamento();
}

// ─── VEÍCULOS ─────────────────────────────────────────────────
async function carregarVeiculos() {
  const data = document.getElementById('filtro-data').value;
  const url = data ? `${API}/veiculos?data=${data}` : `${API}/veiculos`;
  const res = await fetchAuth(url);
  if (!res) return;
  const veiculos = await res.json();
  const div = document.getElementById('veiculos');

  if (veiculos.length === 0) {
    div.innerHTML = '<p style="color:#555; font-size:13px;">Nenhum veículo encontrado.</p>';
    return;
  }

  div.innerHTML = veiculos.map(v => `
    <div class="card ${v.status.replace(' ', '-')}">
      <div class="card-info">
        <strong>${v.modelo} — ${v.placa}</strong>
        <p>👤 ${v.cliente} ${v.telefone ? `| 📞 ${v.telefone}` : ''}</p>
        <p>🔧 ${v.servico}</p>
        <p>💰 R$ ${v.valor} ${v.pagamento ? `| ${v.pagamento}` : ''}</p>
        <p>🕐 Entrada: ${v.entrada}</p>
        ${v.saida ? `<p>🏁 Saída: ${v.saida}</p>` : ''}
      </div>
      <span class="status ${v.status.replace(' ', '-')}">${v.status.toUpperCase()}</span>
      <div class="acoes">
        ${v.status === 'fila'
          ? `<button onclick="mudarStatus(${v.id}, 'em servico')">▶ Iniciar</button>`
          : ''}
        ${v.status === 'em servico'
          ? `<button class="saida" onclick="registrarSaida(${v.id})">✅ Finalizar</button>`
          : ''}
        ${v.status === 'pronto' && v.telefone
          ? `<button class="whatsapp" onclick="abrirWhatsApp('${v.telefone}')">📲 Avisar cliente</button>`
          : ''}
        <button class="editar" onclick='abrirModal(${v.id}, ${JSON.stringify(v.cliente)}, ${JSON.stringify(v.telefone || "")}, ${JSON.stringify(v.modelo)}, ${JSON.stringify(v.placa)}, ${JSON.stringify(v.servico)}, ${v.valor || 0}, ${JSON.stringify(v.pagamento || "")})'>✏️ Editar</button>
        <button class="excluir" onclick="excluirVeiculo(${v.id})">🗑 Excluir</button>
      </div>
    </div>
  `).join('');
}

async function registrarEntrada() {
  const cliente = document.getElementById('cliente').value;
  const telefone = document.getElementById('telefone').value;
  const modelo = document.getElementById('modelo').value;
  const placa = document.getElementById('placa').value;
  const servico = montarTextoServico();
  const valor = document.getElementById('valor').value;
  const pagamento = document.getElementById('pagamento').value;

  if (!cliente || !modelo || !placa || !servico) {
    alert('Preencha todos os campos obrigatórios!');
    return;
  }

  await fetchAuth(`${API}/veiculos`, {
    method: 'POST',
    body: JSON.stringify({ cliente, telefone, modelo, placa, servico, valor, pagamento })
  });

  ['cliente', 'telefone', 'modelo', 'placa', 'valor'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('servico').value = '';
  document.getElementById('pagamento').value = '';
  document.getElementById('aviso-cliente').style.display = 'none';
  limparAdicionais();

  carregarVeiculos();
}

async function mudarStatus(id, status) {
  await fetchAuth(`${API}/veiculos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  carregarVeiculos();
}

async function registrarSaida(id) {
  const res = await fetchAuth(`${API}/veiculos/${id}/saida`, { method: 'PATCH' });
  if (!res) return;
  const veiculo = await res.json();
  if (veiculo.telefone) abrirWhatsApp(veiculo.telefone);
  carregarVeiculos();
}

async function excluirVeiculo(id) {
  if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
  await fetchAuth(`${API}/veiculos/${id}`, { method: 'DELETE' });
  carregarVeiculos();
}

// ─── MODAL DE EDIÇÃO ──────────────────────────────────────────
function abrirModal(id, cliente, telefone, modelo, placa, servico, valor, pagamento) {
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-cliente').value = cliente;
  document.getElementById('edit-telefone').value = telefone;
  document.getElementById('edit-modelo').value = modelo;
  document.getElementById('edit-placa').value = placa;
  document.getElementById('edit-servico').value = servico;
  document.getElementById('edit-valor').value = valor;
  document.getElementById('edit-pagamento').value = pagamento;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

async function salvarEdicao() {
  const id = document.getElementById('edit-id').value;
  const cliente = document.getElementById('edit-cliente').value;
  const telefone = document.getElementById('edit-telefone').value;
  const modelo = document.getElementById('edit-modelo').value;
  const placa = document.getElementById('edit-placa').value;
  const servico = document.getElementById('edit-servico').value;
  const valor = document.getElementById('edit-valor').value;
  const pagamento = document.getElementById('edit-pagamento').value;

  await fetchAuth(`${API}/veiculos/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ cliente, telefone, modelo, placa, servico, valor, pagamento })
  });

  fecharModal();
  carregarVeiculos();
}

// ─── FATURAMENTO ──────────────────────────────────────────────
async function carregarFaturamento() {
  const data = document.getElementById('filtro-fat').value;
  const url = data ? `${API}/veiculos?data=${data}` : `${API}/veiculos`;
  const res = await fetchAuth(url);
  if (!res) return;
  const veiculos = await res.json();

  const prontos = veiculos.filter(v => v.status === 'pronto');
  const emServico = veiculos.filter(v => v.status === 'em servico').length;
  const total = prontos.reduce((soma, v) => soma + (v.valor || 0), 0);
  const ticketMedio = prontos.length > 0 ? (total / prontos.length).toFixed(2) : 0;

  const porPagamento = {};
  prontos.forEach(v => {
    const tipo = v.pagamento || 'Não informado';
    porPagamento[tipo] = (porPagamento[tipo] || 0) + (v.valor || 0);
  });

  document.getElementById('metricas').innerHTML = `
    <div class="metrica">
      <div class="metrica-label">Total do dia</div>
      <div class="metrica-valor verde">R$ ${total.toFixed(2)}</div>
    </div>
    <div class="metrica">
      <div class="metrica-label">Carros finalizados</div>
      <div class="metrica-valor branco">${prontos.length}</div>
    </div>
    <div class="metrica">
      <div class="metrica-label">Em andamento</div>
      <div class="metrica-valor azul">${emServico}</div>
    </div>
    <div class="metrica">
      <div class="metrica-label">Ticket médio</div>
      <div class="metrica-valor">R$ ${ticketMedio}</div>
    </div>
  `;

  const linhasPagamento = Object.entries(porPagamento).map(([tipo, val]) => `
    <div class="fat-linha">
      <span class="fat-label">${tipo}</span>
      <span class="fat-valor">R$ ${val.toFixed(2)}</span>
    </div>
  `).join('');

  document.getElementById('fat-detalhes').innerHTML = `
    <div class="fat-linha"><span class="fat-label" style="color:#E8621A;font-weight:700;">Por forma de pagamento</span></div>
    <div class="fat-divider"></div>
    ${linhasPagamento || '<p style="color:#555; font-size:12px;">Nenhum pagamento registrado ainda.</p>'}
    <div class="fat-divider"></div>
    <div class="fat-linha total">
      <span class="fat-label">Total geral</span>
      <span class="fat-valor">R$ ${total.toFixed(2)}</span>
    </div>
  `;
}

// ─── HISTÓRICO ────────────────────────────────────────────────
async function buscarHistorico() {
  const termo = document.getElementById('busca-historico').value.trim();
  const div = document.getElementById('resultados-historico');

  if (termo === '') {
    div.innerHTML = '<p style="color:#555; font-size:13px;">Digite algo no campo acima para buscar.</p>';
    return;
  }

  const res = await fetchAuth(`${API}/historico?busca=${encodeURIComponent(termo)}`);
  if (!res) return;
  const resultados = await res.json();

  if (resultados.length === 0) {
    div.innerHTML = '<p style="color:#555; font-size:13px;">Nenhum resultado encontrado.</p>';
    return;
  }

  div.innerHTML = `
    <p style="color:#888; font-size:12px; margin-bottom:12px;">
      ${resultados.length} atendimento(s) encontrado(s)
    </p>
  ` + resultados.map(v => `
    <div class="card ${v.status.replace(' ', '-')}">
      <div class="card-info">
        <strong>${v.modelo} — ${v.placa}</strong>
        <p>👤 ${v.cliente} ${v.telefone ? `| 📞 ${v.telefone}` : ''}</p>
        <p>🔧 ${v.servico}</p>
        <p>💰 R$ ${v.valor} ${v.pagamento ? `| ${v.pagamento}` : ''}</p>
        <p>🕐 Entrada: ${v.entrada}</p>
        ${v.saida ? `<p>🏁 Saída: ${v.saida}</p>` : ''}
      </div>
      <span class="status ${v.status.replace(' ', '-')}">${v.status.toUpperCase()}</span>
    </div>
  `).join('');
}

// ─── CLIENTES ─────────────────────────────────────────────────
async function buscarClientePorTelefone() {
  const telefone = document.getElementById('telefone').value.trim();
  const aviso = document.getElementById('aviso-cliente');
  if (!telefone) { aviso.style.display = 'none'; return; }

  const res = await fetchAuth(`${API}/clientes/buscar?telefone=${encodeURIComponent(telefone)}`);
  if (!res) return;
  const cliente = await res.json();

  if (cliente) {
    document.getElementById('cliente').value = cliente.nome;
    aviso.textContent = `✓ Cliente encontrado: ${cliente.nome} (${cliente.visitas}ª visita)`;
    aviso.style.display = 'block';
  } else {
    aviso.style.display = 'none';
  }
}

async function cadastrarCliente() {
  const nome = document.getElementById('novo-cliente-nome').value;
  const telefone = document.getElementById('novo-cliente-telefone').value;
  if (!nome || !telefone) { alert('Preencha nome e telefone!'); return; }

  const res = await fetchAuth(`${API}/clientes`, {
    method: 'POST',
    body: JSON.stringify({ nome, telefone })
  });
  if (!res) return;
  const data = await res.json();
  if (data.erro) { alert(data.erro); return; }

  document.getElementById('novo-cliente-nome').value = '';
  document.getElementById('novo-cliente-telefone').value = '';
  carregarClientes();
}

async function excluirCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente? O histórico de carros dele será mantido.')) return;
  await fetchAuth(`${API}/clientes/${id}`, { method: 'DELETE' });
  carregarClientes();
}

async function carregarClientes() {
  const res = await fetchAuth(`${API}/clientes`);
  if (!res) return;
  const clientes = await res.json();
  const div = document.getElementById('lista-clientes');

  if (clientes.length === 0) {
    div.innerHTML = '<p style="color:#555; font-size:13px;">Nenhum cliente cadastrado ainda.</p>';
    return;
  }

  div.innerHTML = clientes.map(c => {
    const fiel = c.visitas >= 5;
    const ultimaVisitaTexto = c.ultimaVisita
      ? `Última visita: ${c.ultimaVisita.split(' ')[0]}`
      : 'Ainda não trouxe veículo';
    return `
      <div class="card">
        <div class="card-info">
          <strong>${c.nome} ${fiel ? '⭐' : ''}</strong>
          <p>📞 ${c.telefone}</p>
          <p>🔁 ${c.visitas} visita(s) ${fiel ? '| Cliente fiel' : ''}</p>
          <p>💰 Total gasto: R$ ${c.totalGasto.toFixed(2)}</p>
          <p>🕐 ${ultimaVisitaTexto}</p>
        </div>
        <div class="acoes">
          <button class="excluir" onclick="excluirCliente(${c.id})">🗑 Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}