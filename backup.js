const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_DESTINO = process.env.EMAIL_BACKUP;

const CAMINHO_BANCO = path.join(__dirname, 'garage365.db');

async function enviarBackup() {
  console.log('Iniciando backup do banco de dados...');

  if (!RESEND_API_KEY) {
    console.error('Erro: variável RESEND_API_KEY não configurada.');
    process.exit(1);
  }

  if (!EMAIL_DESTINO) {
    console.error('Erro: variável EMAIL_BACKUP não configurada.');
    process.exit(1);
  }

  if (!fs.existsSync(CAMINHO_BANCO)) {
    console.error('Erro: arquivo garage365.db não encontrado.');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);
  const conteudoBanco = fs.readFileSync(CAMINHO_BANCO);
  const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

  try {
    await resend.emails.send({
      from: 'Garage 365 Backup <onboarding@resend.dev>',
      to: EMAIL_DESTINO,
      subject: `Backup Garage 365 — ${dataHoje}`,
      html: `
        <p>Backup automático do sistema Garage 365.</p>
        <p>Data: ${dataHoje}</p>
        <p>Arquivo anexado: garage365.db</p>
        <p>Guarde este e-mail — ele contém todos os dados de clientes e veículos até esta data.</p>
      `,
      attachments: [
        {
          filename: `garage365-backup-${dataHoje}.db`,
          content: conteudoBanco.toString('base64')
        }
      ]
    });

    console.log('Backup enviado com sucesso para', EMAIL_DESTINO);
  } catch (erro) {
    console.error('Erro ao enviar backup:', erro);
    process.exit(1);
  }
}

enviarBackup();