const { cmd, ELEITORES } = require("../lib/db");
const { ler } = require("../lib/token");
const { estado } = require("../lib/passkey");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  // "titulo" recebe a chave do PNG (número + assinatura), não só o número
  const titulo = ler((req.body || {}).titulo);
  if (!titulo) return res.status(400).json({ erro: "invalido" });
  try {
    const jaVotou = await cmd(["SISMEMBER", "titulos", titulo]);
    if (jaVotou === 1) return res.status(409).json({ erro: "jaVotou" });
    // biometria: "registrada" (tem passkey), "dispensada" (vota só com o PNG) ou "pendente" (ainda não registrou)
    const biometria = await estado(titulo);
    return res.status(200).json({ ok: true, nome: ELEITORES[titulo], numero: titulo, biometria });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
