const { Pool } = require('pg');
const { Resend } = require('resend');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function enviarBackup() {
  console.log('Iniciando backup do banco de dados...');

  if (!process.env.RESEND_API_KEY) {
    console.error('Erro: RESEND_API_KEY não configurada.');
    process.exit(1);
  }

  if (!process.env.EMAIL_BACKUP) {
    console.error('Erro: EMAIL_BACKUP não configurada.');
    process.exit(1);
  }

  try {
    const { rows: clientes } = await pool.query(
      'SELECT * FROM clientes ORDER BY id ASC'
    );
    const { rows: veiculos } = await pool.query(
      'SELECT * FROM veiculos ORDER BY id ASC'
    );

    const dados = {
      geradoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      totalClientes: clientes.length,
      totalVeiculos: veiculos.length,
      clientes,
      veiculos
    };

    const conteudo = JSON.stringify(dados, null, 2);
    const dataHoje = new Date()
      .toLocaleDateString('pt-BR')
      .replace(/\//g, '-');

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Garage 365 Backup <onboarding@resend.dev>',
      to: process.env.EMAIL_BACKUP,
      subject: `Backup Garage 365 — ${dataHoje}`,
      html: `
        <h2>Backup automático — Garage 365</h2>
        <p><strong>Data:</strong> ${dataHoje}</p>
        <p><strong>Clientes cadastrados:</strong> ${clientes.length}</p>
        <p><strong>Atendimentos registrados:</strong> ${veiculos.length}</p>
        <p>O arquivo JSON com todos os dados está anexado a este e-mail.</p>
        <p style="color:#888; font-size:12px;">Este backup é gerado automaticamente todo dia às 3h da manhã.</p>
      `,
      attachments: [
        {
          filename: `garage365-backup-${dataHoje}.json`,
          content: Buffer.from(conteudo).toString('base64')
        }
      ]
    });

    console.log(`Backup enviado com sucesso! ${clientes.length} clientes, ${veiculos.length} veículos.`);
  } catch (err) {
    console.error('Erro ao gerar backup:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

enviarBackup();