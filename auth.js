const jwt = require('jsonwebtoken');

// Nunca colocar valores reais aqui. Configure JWT_SECRET nas
// variáveis de ambiente da Render. Sem isso, o servidor não inicia.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('Erro: configure JWT_SECRET nas variáveis de ambiente.');
  process.exit(1);
}

function gerarToken(usuario) {
  return jwt.sign({ usuario }, JWT_SECRET, { expiresIn: '7d' });
}

function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded.usuario;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

module.exports = { gerarToken, verificarToken };