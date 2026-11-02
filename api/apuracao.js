// Contagem pública. Quando o turno fecha, quem não votou sai da conta: "totalEfetivo" = quem votou.
const E = require("../lib/eleicao");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { el, turno, chaves } = await E.atual();
    const { votos, votaram } = await E.contagem(chaves);
    const total = await E.total(), status = E.statusTurno(el, turno), fechado = status !== "aberta";
    return res.status(200).json({
      votos, votaram, total, turno: turno.turno,
      eleicao: { id: el.id, nome: el.nome, encerrada: !!el.encerrada },
      candidatos: turno.candidatos, status, fecha: turno.fecha || null,
      ausentes: fechado ? Math.max(0, total - votaram) : null,
      totalEfetivo: fechado ? votaram : total,
      em: E.agora(),
    });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
