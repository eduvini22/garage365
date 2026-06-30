const { Pool } = require('pg');

// A Render injeta DATABASE_URL automaticamente quando o banco
// PostgreSQL está conectado ao Web Service (ou configure manualmente
// com a Internal Database URL copiada do painel do banco).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inicializarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL UNIQUE,
      criado_em TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours')
    )
  `);

  await pool.query(`
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

  console.log('Tabelas verificadas/criadas com sucesso.');
}

inicializarTabelas().catch(err => {
  console.error('Erro ao inicializar tabelas:', err);
  process.exit(1);
});

module.exports = pool;

await pool.query(`
  CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL UNIQUE,
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours')
  )
`);