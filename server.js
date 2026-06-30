const express = require('express');
const cors = require('cors');
const pool = require('./database');
const { verificarToken, gerarToken } = require('./auth');

const app = express();

// ─── Credenciais do dono ───────────────────────────────────────
// Nunca colocar valores reais aqui. Configure LOGIN_USUARIO e
// LOGIN_SENHA nas variáveis de ambiente da Render. Sem isso, o
// servidor não inicia.
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
app.get('/clientes/buscar', verificarToken, async (req, res) => {
  try {
    const { telefone } = req.query;
    if (!telefone) return res.json(null);

    const { rows: clientes } = await pool.query(
      'SELECT * FROM clientes WHERE telefone = $1', [telefone]
    );
    const cliente = clientes[0];
    if (!cliente) return res.json(null);

    const { rows: veiculos } = await pool.query(
      'SELECT * FROM veiculos WHERE cliente_id = $1 ORDER BY entrada DESC', [cliente.id]
    );

    const totalGasto = veiculos
      .filter(v => v.status === 'pronto')
      .reduce((soma, v) => soma + (Number(v.valor) || 0), 0);

    res.json({
      ...cliente,
      visitas: veiculos.length,
      totalGasto,
      ultimaVisita: veiculos[0] ? veiculos[0].entrada : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar cliente.' });
  }
});

// Listar todos os clientes (para a aba de clientes)
app.get('/clientes', verificarToken, async (req, res) => {
  try {
    const { rows: clientes } = await pool.query('SELECT * FROM clientes ORDER BY nome ASC');

    const comDados = await Promise.all(clientes.map(async c => {
      const { rows: veiculos } = await pool.query(
        'SELECT * FROM veiculos WHERE cliente_id = $1', [c.id]
      );
      const totalGasto = veiculos
        .filter(v => v.status === 'pronto')
        .reduce((soma, v) => soma + (Number(v.valor) || 0), 0);
      const ordenados = veiculos.sort((a, b) => new Date(b.entrada) - new Date(a.entrada));
      return {
        ...c,
        visitas: veiculos.length,
        totalGasto,
        ultimaVisita: ordenados[0] ? ordenados[0].entrada : null
      };
    }));

    res.json(comDados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar clientes.' });
  }
});

// Cadastrar cliente novo
app.post('/clientes', verificarToken, async (req, res) => {
  try {
    const { nome, telefone, observacao } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO clientes (nome, telefone, observacao) VALUES ($1, $2, $3) RETURNING id',
      [nome, telefone, observacao || null]
    );
    res.json({ id: rows[0].id, nome, telefone, observacao });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ erro: 'Telefone já cadastrado para outro cliente.' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar cliente.' });
  }
});

// Excluir cliente — mantém os veículos/histórico dele intactos,
// apenas desfaz o vínculo (cliente_id passa a null nos veículos antigos)
app.delete('/clientes/:id', verificarToken, async (req, res) => {
  try {
    await pool.query('UPDATE veiculos SET cliente_id = NULL WHERE cliente_id = $1', [req.params.id]);
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Cliente removido!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir cliente.' });
  }
});

// Atualizar observação do cliente
app.patch('/clientes/:id/observacao', verificarToken, async (req, res) => {
  try {
    const { observacao } = req.body;
    await pool.query(
      'UPDATE clientes SET observacao = $1 WHERE id = $2',
      [observacao || null, req.params.id]
    );
    res.json({ mensagem: 'Observação atualizada!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar observação.' });
  }
});

// Listar veículos (com filtro opcional por data)
app.get('/veiculos', verificarToken, async (req, res) => {
  try {
    const { data } = req.query;
    let result;
    if (data) {
      result = await pool.query(
        "SELECT * FROM veiculos WHERE entrada::date = $1 ORDER BY entrada DESC", [data]
      );
    } else {
      result = await pool.query('SELECT * FROM veiculos ORDER BY entrada DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar veículos.' });
  }
});

// Registrar entrada — também vincula/cria o cliente automaticamente
app.post('/veiculos', verificarToken, async (req, res) => {
  try {
    const { cliente, telefone, modelo, placa, servico, valor, pagamento } = req.body;

    const { rows: existentes } = await pool.query(
      'SELECT * FROM clientes WHERE telefone = $1', [telefone]
    );
    let clienteRow = existentes[0];

    if (!clienteRow && telefone) {
      const { rows: novo } = await pool.query(
        'INSERT INTO clientes (nome, telefone) VALUES ($1, $2) RETURNING id',
        [cliente, telefone]
      );
      clienteRow = { id: novo[0].id };
    }

    const { rows } = await pool.query(
      `INSERT INTO veiculos (cliente_id, cliente, telefone, modelo, placa, servico, valor, pagamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [clienteRow ? clienteRow.id : null, cliente, telefone, modelo, placa, servico, valor, pagamento]
    );

    res.json({ id: rows[0].id, mensagem: 'Veículo registrado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar veículo.' });
  }
});

// Atualizar status
app.patch('/veiculos/:id/status', verificarToken, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE veiculos SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ mensagem: 'Status atualizado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar status.' });
  }
});

// Registrar saída
app.patch('/veiculos/:id/saida', verificarToken, async (req, res) => {
  try {
    await pool.query(
      "UPDATE veiculos SET saida = NOW() - INTERVAL '3 hours', status = 'pronto' WHERE id = $1",
      [req.params.id]
    );
    const { rows } = await pool.query('SELECT * FROM veiculos WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar saída.' });
  }
});

// Editar veículo
app.put('/veiculos/:id', verificarToken, async (req, res) => {
  try {
    const { cliente, telefone, modelo, placa, servico, valor, pagamento } = req.body;
    await pool.query(
      `UPDATE veiculos SET cliente=$1, telefone=$2, modelo=$3, placa=$4, servico=$5, valor=$6, pagamento=$7 WHERE id=$8`,
      [cliente, telefone, modelo, placa, servico, valor, pagamento, req.params.id]
    );
    res.json({ mensagem: 'Veículo atualizado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao  editar veículo.' });
  }
});

// Deletar veículo
app.delete('/veiculos/:id', verificarToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM veiculos WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Veículo removido!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir veículo.' });
  }
});

// Buscar histórico por cliente ou placa
app.get('/historico', verificarToken, async (req, res) => {
  try {
    const { busca } = req.query;
    if (!busca) return res.json([]);
    const termo = `%${busca}%`;
    const { rows } = await pool.query(
      `SELECT * FROM veiculos WHERE cliente ILIKE $1 OR placa ILIKE $1 ORDER BY entrada DESC`,
      [termo]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});