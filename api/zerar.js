// Apaga só os votos do turno em andamento (para limpar testes). Outras eleições e turnos não são tocados.
const { cmd, admin } = require("../lib/db");
const { atual } = require("../lib/eleicao");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  if (!admin(req)) return res.status(401).json({ erro: "senha" });
  try {
    const { el, chaves } = await atual();
    if (el.encerrada) return res.status(409).json({ erro: "encerrada" });
    await cmd(["DEL", chaves.titulos, chaves.votos]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
