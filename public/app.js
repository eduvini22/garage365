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

// Permitir login com Enter
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-senha').addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });

  // Verifica se já tem token salvo
  if (getToken()) {
    mostrarApp();
    carregarVeiculos();
  } else {
    mostrarLogin();
  }
});
// ──────────────────────────────────────────────────────────────

function preencherValor() {
  const select = document.getElementById('servico');
  const opcao = select.options[select.selectedIndex];
  const valor = opcao.getAttribute('data-valor');
  if (valor) document.getElementById('valor').value = valor;
}

function abrirWhatsApp(telefone) {
  const numero = '55' + telefone.replace(/\D/g, '');
  const mensagem = 'Olá, seu carro está pronto! Pode vir buscar.';
  const encoded = encodeURIComponent(mensagem);
  window.open(`https://wa.me/${numero}?text=${encoded}`, '_blank');
}

async function carregarVeiculos() {
  const res = await fetchAuth(`${API}/veiculos`);
  if (!res) return;
  const veiculos = await res.json();
  const div = document.getElementById('veiculos');

  if (veiculos.length === 0) {
    div.innerHTML = '<p style="color:#555; font-size:13px;">Nenhum veículo registrado ainda.</p>';
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
      </div>
    </div>
  `).join('');
}

async function registrarEntrada() {
  const cliente = document.getElementById('cliente').value;
  const telefone = document.getElementById('telefone').value;
  const modelo = document.getElementById('modelo').value;
  const placa = document.getElementById('placa').value;
  const servico = document.getElementById('servico').value;
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
      </div>
    `;
  }).join('');
}