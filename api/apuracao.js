const { cmd } = require("../lib/db");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const flat = (await cmd(["HGETALL", "votos"])) || [];
    const votos = {};
    for (let i = 0; i < flat.length; i += 2) votos[flat[i]] = +flat[i + 1];
    const votaram = await cmd(["SCARD", "titulos"]);
    return res.status(200).json({ votos, votaram, em: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
