const { cmd, admin } = require("../lib/db");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  if (!admin(req)) return res.status(401).json({ erro: "senha" });
  try {
    await cmd(["DEL", "titulos", "votos"]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
