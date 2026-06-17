const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Listar veículos (com filtro opcional por data)
app.get('/veiculos', (req, res) => {
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

// Registrar entrada
app.post('/veiculos', (req, res) => {
  const { cliente, telefone, modelo, placa, servico, valor, pagamento } = req.body;
  const result = db.prepare(
    'INSERT INTO veiculos (cliente, telefone, modelo, placa, servico, valor, pagamento) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(cliente, telefone, modelo, placa, servico, valor, pagamento);
  res.json({ id: result.lastInsertRowid, mensagem: 'Veículo registrado!' });
});

// Atualizar status
app.patch('/veiculos/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE veiculos SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ mensagem: 'Status atualizado!' });
});

// Registrar saída
app.patch('/veiculos/:id/saida', (req, res) => {
  db.prepare(
    "UPDATE veiculos SET saida = datetime('now','localtime'), status = 'pronto' WHERE id = ?"
  ).run(req.params.id);
  const veiculo = db.prepare('SELECT * FROM veiculos WHERE id = ?').get(req.params.id);
  res.json(veiculo);
});

// Editar veículo
app.put('/veiculos/:id', (req, res) => {
  const { cliente, telefone, modelo, placa, servico, valor, pagamento } = req.body;
  db.prepare(
    'UPDATE veiculos SET cliente=?, telefone=?, modelo=?, placa=?, servico=?, valor=?, pagamento=? WHERE id=?'
  ).run(cliente, telefone, modelo, placa, servico, valor, pagamento, req.params.id);
  res.json({ mensagem: 'Veículo atualizado!' });
});

// Deletar veículo
app.delete('/veiculos/:id', (req, res) => {
  db.prepare('DELETE FROM veiculos WHERE id = ?').run(req.params.id);
  res.json({ mensagem: 'Veículo removido!' });
});


// Buscar histórico por cliente ou placa
app.get('/historico', (req, res) => {
  const { busca } = req.query;
  if (!busca) {
    return res.json([]);
  }
  const termo = `%${busca}%`;
  const resultados = db.prepare(
    `SELECT * FROM veiculos 
     WHERE cliente LIKE ? OR placa LIKE ? 
     ORDER BY entrada DESC`
  ).all(termo, termo);
  res.json(resultados);
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});