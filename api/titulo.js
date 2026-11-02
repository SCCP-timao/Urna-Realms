const { cmd } = require("../lib/db");
const { lerEleitor } = require("../lib/token");
const E = require("../lib/eleicao");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  // "titulo" recebe a chave do PNG (número + assinatura), não só o número
  try {
    const eleitor = await lerEleitor((req.body || {}).titulo);
    if (!eleitor) return res.status(400).json({ erro: "invalido" });
    const { el, turno, chaves } = await E.atual();
    if (E.statusTurno(el, turno) !== "aberta") return res.status(403).json({ erro: "fechado", mensagem: E.msgFechado(el, turno) });
    const jaVotou = await cmd(["SISMEMBER", chaves.titulos, eleitor.numero]);
    if (jaVotou === 1) return res.status(409).json({ erro: "jaVotou" });
    return res.status(200).json({ ok: true, nome: eleitor.nome, numero: eleitor.numero, turno: turno.turno, fecha: turno.fecha || null });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
