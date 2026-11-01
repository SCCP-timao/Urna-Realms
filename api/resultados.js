const { admin } = require("../lib/db");
const E = require("../lib/eleicao");
module.exports = async (req, res) => {
  if (!admin(req)) return res.status(401).json({ erro: "senha" });
  try {
    const { el, turno, chaves } = await E.atual();
    const { votos, votaram } = await E.contagem(chaves);
    return res.status(200).json({ votos, votaram, turno: turno.turno, eleicao: el.nome });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
