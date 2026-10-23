const { cmd, tituloValido, ELEITORES } = require("../lib/db");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  const { titulo } = req.body || {};
  if (!tituloValido(titulo)) return res.status(400).json({ erro: "invalido" });
  try {
    const jaVotou = await cmd(["SISMEMBER", "titulos", titulo]);
    if (jaVotou === 1) return res.status(409).json({ erro: "jaVotou" });
    return res.status(200).json({ ok: true, nome: ELEITORES[titulo] });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
