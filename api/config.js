// Dados públicos da eleição em andamento: nome, turno, quem concorre e até que horas se vota.
const E = require("../lib/eleicao");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { el, turno } = await E.atual();
    return res.status(200).json({
      eleicao: { id: el.id, nome: el.nome, encerrada: !!el.encerrada },
      turno: turno.turno, candidatos: turno.candidatos, total: E.total(),
      fecha: turno.fecha || null, status: E.statusTurno(el, turno),
    });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
