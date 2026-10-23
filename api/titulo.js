const { cmd, ELEITORES } = require("../lib/db");
const { ler } = require("../lib/token");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  // "titulo" agora recebe a chave do PNG (número + assinatura), não só o número
  const titulo = ler((req.body || {}).titulo);
  if (!titulo) return res.status(400).json({ erro: "invalido" });
  try {
    const jaVotou = await cmd(["SISMEMBER", "titulos", titulo]);
    if (jaVotou === 1) return res.status(409).json({ erro: "jaVotou" });
    return res.status(200).json({ ok: true, nome: ELEITORES[titulo], numero: titulo });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
