const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicializa as tabelas de forma assíncrona mas sem await no topo do arquivo
async function inicializarTabelas() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        telefone TEXT NOT NULL UNIQUE,
        observacao TEXT,
        criado_em TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours')
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        cliente TEXT NOT NULL,
        modelo TEXT NOT NULL,
        placa TEXT NOT NULL,
        servico TEXT NOT NULL,
        status TEXT DEFAULT 'fila',
        valor REAL,
        pagamento TEXT,
        telefone TEXT,
        entrada TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
        saida TIMESTAMP
      )
    `);

    console.log('Tabelas verificadas com sucesso.');
  } finally {
    client.release();
  }
}

// Chama a função sem await — ela roda em paralelo ao iniciar o servidor
// Erros são capturados e logados sem derrubar o processo
inicializarTabelas().catch(err => {
  console.error('Erro ao inicializar tabelas:', err.message);
});

module.exports = pool;