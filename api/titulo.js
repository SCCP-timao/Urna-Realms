const { aberta, descricao } = require("../lib/horario");
const { cmd, tituloValido } = require("../lib/db");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  if (!aberta()) return res.status(403).json({ erro: "fechado", mensagem: descricao() });
  const { titulo } = req.body || {};
  if (!tituloValido(titulo)) return res.status(400).json({ erro: "invalido" });
  try {
    const jaVotou = await cmd(["SISMEMBER", "titulos", titulo]);
    if (jaVotou === 1) return res.status(409).json({ erro: "jaVotou" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
