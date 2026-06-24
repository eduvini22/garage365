const express = require('express');
const cors = require('cors');
const db = require('./database');
const { verificarToken, gerarToken } = require('./auth');

const app = express();

// ─── Credenciais do dono ───────────────────────────────────────
// Nunca colocar valores reais aqui. Configure LOGIN_USUARIO e
// LOGIN_SENHA nas variáveis de ambiente da Render (ou num .env
// local que está no .gitignore). Sem isso, o servidor não inicia.
const USUARIO = process.env.LOGIN_USUARIO;
const SENHA   = process.env.LOGIN_SENHA;

if (!USUARIO || !SENHA) {
  console.error('Erro: configure LOGIN_USUARIO e LOGIN_SENHA nas variáveis de ambiente.');
  process.exit(1);
}
// ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota de login (pública)
app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === USUARIO && senha === SENHA) {
    const token = gerarToken(usuario);
    return res.json({ token });
  }
  res.status(401).json({ erro: 'Usuário ou senha incorretos' });
});

// Buscar cliente pelo telefone (autocomplete)
app.get('/clientes/buscar', verificarToken, (req, res) => {
  const { telefone } = req.query;
  if (!telefone) return res.json(null);
  const cliente = db.prepare('SELECT * FROM clientes WHERE telefone = ?').get(telefone);
  if (!cliente) return res.json(null);

  const veiculos = db.prepare(
    'SELECT * FROM veiculos WHERE cliente_id = ? ORDER BY entrada DESC'
  ).all(cliente.id);

  const totalGasto = veiculos
    .filter(v => v.status === 'pronto')
    .reduce((soma, v) => soma + (v.valor || 0), 0);

  res.json({
    ...cliente,
    visitas: veiculos.length,
    totalGasto,
    ultimaVisita: veiculos[0] ? veiculos[0].entrada : null
  });
});

// Listar todos os clientes (para a aba de clientes)
app.get('/clientes', verificarToken, (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nome ASC').all();
  const comDados = clientes.map(c => {
    const veiculos = db.prepare('SELECT * FROM veiculos WHERE cliente_id = ?').all(c.id);
    const totalGasto = veiculos
      .filter(v => v.status === 'pronto')
      .reduce((soma, v) => soma + (v.valor || 0), 0);
    return {
      ...c,
      visitas: veiculos.length,
      totalGasto,
      ultimaVisita: veiculos[0] ? veiculos.sort((a,b)=>b.entrada.localeCompare(a.entrada))[0].entrada : null
    };
  });
  res.json(comDados);
});

// Cadastrar cliente novo
app.post('/clientes', verificarToken, (req, res) => {
  const { nome, telefone } = req.body;
  try {
    const result = db.prepare(
      'INSERT INTO clientes (nome, telefone) VALUES (?, ?)'
    ).run(nome, telefone);
    res.json({ id: result.lastInsertRowid, nome, telefone });
  } catch (err) {
    res.status(400).json({ erro: 'Telefone já cadastrado para outro cliente.' });
  }
});

// Excluir cliente — mantém os veículos/histórico dele intactos,
// apenas desfaz o vínculo (cliente_id passa a null nos veículos antigos)
app.delete('/clientes/:id', verificarToken, (req, res) => {
  db.prepare('UPDATE veiculos SET cliente_id = NULL WHERE cliente_id = ?').run(req.params.id);
  db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  res.json({ mensagem: 'Cliente removido!' });
});

// Listar veículos (com filtro opcional por data)
app.get('/veiculos', verificarToken, (req, res) => {
  const { data } = req.query;
  let veiculos;
  if (data) {
    veiculos = db.prepare(
      "SELECT * FROM veiculos WHERE date(entrada) = ? ORDER BY entrada DESC"
    ).all(data);
  } else {
    veiculos = db.prepare(
      'SELECT * FROM veiculos ORDER BY entrada DESC'
    ).all();
  }
  res.json(veiculos);
});

// Registrar entrada — também vincula/cria o cliente automaticamente
app.post('/veiculos', verificarToken, (req, res) => {
  const { cliente, telefone, modelo, placa, servico, valor, pagamento } = req.body;

  let clienteRow = db.prepare('SELECT * FROM clientes WHERE telefone = ?').get(telefone);

  if (!clienteRow && telefone) {
    const novo = db.prepare('INSERT INTO clientes (nome, telefone) VALUES (?, ?)').run(cliente, telefone);
    clienteRow = { id: novo.lastInsertRowid };
  }

  const result = db.prepare(
    'INSERT INTO veiculos (cliente_id, cliente, telefone, modelo, placa, servico, valor, pagamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(clienteRow ? clienteRow.id : null, cliente, telefone, modelo, placa, servico, valor, pagamento);

  res.json({ id: result.lastInsertRowid, mensagem: 'Veículo registrado!' });
});

// Atualizar status
app.patch('/veiculos/:id/status', verificarToken, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE veiculos SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ mensagem: 'Status atualizado!' });
});

// Registrar saída
app.patch('/veiculos/:id/saida', verificarToken, (req, res) => {
  db.prepare(
    "UPDATE veiculos SET saida = datetime('now','localtime'), status = 'pronto' WHERE id = ?"
  ).run(req.params.id);
  const veiculo = db.prepare('SELECT * FROM veiculos WHERE id = ?').get(req.params.id);
  res.json(veiculo);
});

// Editar veículo
app.put('/veiculos/:id', verificarToken, (req, res) => {
  const { cliente, telefone, modelo, placa, servico, valor, pagamento } = req.body;
  db.prepare(
    'UPDATE veiculos SET cliente=?, telefone=?, modelo=?, placa=?, servico=?, valor=?, pagamento=? WHERE id=?'
  ).run(cliente, telefone, modelo, placa, servico, valor, pagamento, req.params.id);
  res.json({ mensagem: 'Veículo atualizado!' });
});

// Deletar veículo
app.delete('/veiculos/:id', verificarToken, (req, res) => {
  db.prepare('DELETE FROM veiculos WHERE id = ?').run(req.params.id);
  res.json({ mensagem: 'Veículo removido!' });
});

// Buscar histórico por cliente ou placa
// ESSA ROTA ESTAVA FALTANDO — sem ela a aba Histórico não funciona
app.get('/historico', verificarToken, (req, res) => {
  const { busca } = req.query;
  if (!busca) return res.json([]);
  const termo = `%${busca}%`;
  const resultados = db.prepare(
    `SELECT * FROM veiculos WHERE cliente LIKE ? OR placa LIKE ? ORDER BY entrada DESC`
  ).all(termo, termo);
  res.json(resultados);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});