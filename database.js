const Database = require('better-sqlite3');
const db = new Database('garage365.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL UNIQUE,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER REFERENCES clientes(id),
    cliente TEXT NOT NULL,
    modelo TEXT NOT NULL,
    placa TEXT NOT NULL,
    servico TEXT NOT NULL,
    status TEXT DEFAULT 'fila',
    valor REAL,
    pagamento TEXT,
    telefone TEXT,
    entrada TEXT DEFAULT (datetime('now', 'localtime')),
    saida TEXT
  )
`);

module.exports = db;