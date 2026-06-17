const Database = require('better-sqlite3');
const db = new Database('garage365.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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