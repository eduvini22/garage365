const API = '';

// Preenche o valor ao selecionar serviço
function preencherValor() {
  const select = document.getElementById('servico');
  const opcao = select.options[select.selectedIndex];
  const valor = opcao.getAttribute('data-valor');
  if (valor) document.getElementById('valor').value = valor;
}

// Abre WhatsApp com mensagem automática
function abrirWhatsApp(telefone) {
  const numero = '55' + telefone.replace(/\D/g, '');
  const mensagem = 'Olá, seu carro está pronto! Pode vir buscar.';
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
}

function trocarAba(aba) {
  document.getElementById('aba-veiculos').style.display = aba === 'veiculos' ? 'flex' : 'none';
  document.getElementById('aba-faturamento').style.display = aba === 'faturamento' ? 'block' : 'none';
  document.getElementById('aba-historico').style.display = aba === 'historico' ? 'block' : 'none';
  document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
  event.target.classList.add('ativa');
  if (aba === 'faturamento') carregarFaturamento();
}


// Filtros de data — aba veículos
function filtrarHoje() {
  document.getElementById('filtro-data').value = dataHoje();
  carregarVeiculos();
}

function filtrarTodos() {
  document.getElementById('filtro-data').value = '';
  carregarVeiculos();
}

// Filtros de data — aba faturamento
function filtrarHojeFat() {
  document.getElementById('filtro-fat').value = dataHoje();
  carregarFaturamento();
}

function filtrarTodosFat() {
  document.getElementById('filtro-fat').value = '';
  carregarFaturamento();
}

// Retorna a data de hoje no formato YYYY-MM-DD
function dataHoje() {
  return new Date().toISOString().split('T')[0];
}

// Carrega e exibe os veículos
async function carregarVeiculos() {
  const data = document.getElementById('filtro-data').value;
  const url = data ? `${API}/veiculos?data=${data}` : `${API}/veiculos`;
  const res = await fetch(url);
  const veiculos = await res.json();
  const div = document.getElementById('veiculos');

  if (veiculos.length === 0) {
    div.innerHTML = '<p style="color:#555;font-size:13px;">Nenhum veículo encontrado.</p>';
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
          ? `<button onclick="mudarStatus(${v.id}, 'em servico')">▶ Iniciar</button>` : ''}
        ${v.status === 'em servico'
          ? `<button class="saida" onclick="registrarSaida(${v.id})">✅ Finalizar</button>` : ''}
        ${v.status === 'pronto' && v.telefone
          ? `<button class="whatsapp" onclick="abrirWhatsApp('${v.telefone}')">📲 Avisar</button>` : ''}
        <button class="editar" onclick="abrirModal(${v.id}, '${v.cliente}', '${v.telefone || ''}', '${v.modelo}', '${v.placa}', '${v.servico}', ${v.valor || 0}, '${v.pagamento || ''}')">✏️ Editar</button>
        <button class="excluir" onclick="excluirVeiculo(${v.id})">🗑 Excluir</button>
      </div>
    </div>
  `).join('');
}

// Registra entrada
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

  await fetch(`${API}/veiculos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cliente, telefone, modelo, placa, servico, valor, pagamento })
  });

  ['cliente','telefone','modelo','placa','valor'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('servico').value = '';
  document.getElementById('pagamento').value = '';
  carregarVeiculos();
}

// Muda status
async function mudarStatus(id, status) {
  await fetch(`${API}/veiculos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  carregarVeiculos();
}

// Registra saída e abre WhatsApp
async function registrarSaida(id) {
  const res = await fetch(`${API}/veiculos/${id}/saida`, { method: 'PATCH' });
  const veiculo = await res.json();
  if (veiculo.telefone) abrirWhatsApp(veiculo.telefone);
  carregarVeiculos();
}

// Exclui veículo com confirmação
async function excluirVeiculo(id) {
  if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
  await fetch(`${API}/veiculos/${id}`, { method: 'DELETE' });
  carregarVeiculos();
}

// Abre o modal de edição já preenchido
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

// Fecha o modal
function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// Salva a edição
async function salvarEdicao() {
  const id = document.getElementById('edit-id').value;
  const cliente = document.getElementById('edit-cliente').value;
  const telefone = document.getElementById('edit-telefone').value;
  const modelo = document.getElementById('edit-modelo').value;
  const placa = document.getElementById('edit-placa').value;
  const servico = document.getElementById('edit-servico').value;
  const valor = document.getElementById('edit-valor').value;
  const pagamento = document.getElementById('edit-pagamento').value;

  await fetch(`${API}/veiculos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cliente, telefone, modelo, placa, servico, valor, pagamento })
  });

  fecharModal();
  carregarVeiculos();
}

// Carrega faturamento
async function carregarFaturamento() {
  const data = document.getElementById('filtro-fat').value;
  const url = data ? `${API}/veiculos?data=${data}` : `${API}/veiculos`;
  const res = await fetch(url);
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
    ${linhasPagamento}
    <div class="fat-divider"></div>
    <div class="fat-linha total">
      <span class="fat-label">Total geral</span>
      <span class="fat-valor">R$ ${total.toFixed(2)}</span>
    </div>
  `;
}

// Inicia com filtro de hoje e carrega veículos
document.getElementById('filtro-data').value = dataHoje();
document.getElementById('filtro-fat').value = dataHoje();
carregarVeiculos();

// Busca o histórico conforme o usuário digita
async function buscarHistorico() {
  const termo = document.getElementById('busca-historico').value.trim();
  const div = document.getElementById('resultados-historico');

  if (termo === '') {
    div.innerHTML = '<p style="color:#555; font-size:13px;">Digite algo no campo acima para buscar.</p>';
    return;
  }

  const res = await fetch(`${API}/historico?busca=${encodeURIComponent(termo)}`);
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