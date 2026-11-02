// Painel do mesário: ver o estado, definir o horário de fechamento, abrir o 2º turno,
// encerrar a eleição e criar uma nova.
const { cmd, admin } = require("../lib/db");
const E = require("../lib/eleicao");
const Eleitores = require("../lib/eleitores");
const { gerar } = require("../lib/token");

function limpaCandidatos(lista) {
  if (!Array.isArray(lista) || lista.length < 2 || lista.length > 9) return null;
  const vistos = {}, out = [];
  for (const c of lista) {
    const n = String((c && c.n) || "").trim();
    const nome = String((c && c.nome) || "").trim().slice(0, 60);
    const partido = String((c && c.partido) || "").trim().slice(0, 20);
    if (!/^\d{2}$/.test(n) || !nome || vistos[n]) return null;
    vistos[n] = 1;
    out.push({ n, nome, partido, foto: "" });
  }
  return out;
}

async function estado() {
  const { el, turno, chaves } = await E.atual();
  const { votos, votaram } = await E.contagem(chaves);
  const total = await E.total(), status = E.statusTurno(el, turno), fechado = status !== "aberta";
  return {
    eleicao: { id: el.id, nome: el.nome, encerrada: !!el.encerrada },
    turno: turno.turno, candidatos: turno.candidatos, votos, votaram, total,
    status, fecha: turno.fecha || null, agora: E.agora(),
    ausentes: fechado ? Math.max(0, total - votaram) : null,
    totalEfetivo: fechado ? votaram : total,
    proposta: E.proposta(turno.candidatos, votos),
    podeAbrirTurno2: !el.encerrada && turno.turno === 1 && turno.candidatos.length > 2,
  };
}

// Lista para o painel: quem pode votar (com a chave do PNG e se já votou neste turno) e quem foi removido.
async function listaEleitores() {
  const { el, chaves } = await E.atual();
  const l = await Eleitores.lista();
  const votou = new Set(el.encerrada ? [] : ((await cmd(["SMEMBERS", chaves.titulos])) || []).map(String));
  return {
    eleitores: l.ativos.map((e) => ({ numero: e.numero, nome: e.nome, token: gerar(e.numero), votou: votou.has(e.numero) })),
    removidos: l.removidos, total: l.ativos.length,
  };
}

async function encerraEleicao(el) {
  if (el.encerrada) return;
  await E.fecharTurno(el);
  el.encerrada = true; el.encerradaEm = E.agora();
  await E.salvar(el);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  if (!admin(req)) return res.status(401).json({ erro: "senha" });
  const b = req.body || {};
  try {
    const acao = b.acao || "estado";
    if (acao === "estado") return res.status(200).json(await estado());

    const { el, turno, chaves } = await E.atual();

    // ---- eleitores e carteirinhas ----
    if (acao === "eleitores") return res.status(200).json(await listaEleitores());

    if (acao === "criar-eleitor") {
      const r = await Eleitores.criar(b.nome);
      if (r.erro) return res.status(r.erro === "servidor" ? 500 : 400).json({ erro: r.erro });
      return res.status(200).json(Object.assign(await listaEleitores(), { criado: { numero: r.numero, nome: r.nome, token: gerar(r.numero) } }));
    }

    if (acao === "remover-eleitor") {
      const n = String(b.numero || "");
      const l = await Eleitores.lista();
      if (!l.ativos.some((e) => e.numero === n)) return res.status(400).json({ erro: "naoExiste" });
      // quem já votou neste turno não pode sair: o voto é secreto e não dá para apagá-lo
      if (!el.encerrada && (await cmd(["SISMEMBER", chaves.titulos, n])) === 1) return res.status(409).json({ erro: "jaVotou" });
      await Eleitores.remover(n);
      return res.status(200).json(await listaEleitores());
    }

    if (acao === "restaurar-eleitor") {
      const n = String(b.numero || "");
      const l = await Eleitores.lista();
      if (!l.removidos.some((e) => e.numero === n)) return res.status(400).json({ erro: "naoExiste" });
      await Eleitores.restaurar(n);
      return res.status(200).json(await listaEleitores());
    }

    // muda (ou tira) o horário em que o turno atual fecha. Pode prorrogar um turno que já fechou.
    if (acao === "horario") {
      if (el.encerrada) return res.status(400).json({ erro: "encerrada" });
      const f = E.lerFim(b.fecha);
      if (!f.ok) return res.status(400).json({ erro: "horario" });
      turno.fecha = f.valor;
      await E.salvar(el);
      return res.status(200).json(await estado());
    }

    // fecha a votação do turno agora, sem encerrar a eleição (dá para abrir o 2º turno em seguida)
    if (acao === "fechar-turno") {
      if (el.encerrada) return res.status(400).json({ erro: "encerrada" });
      if (E.statusTurno(el, turno) === "aberta") { turno.fecha = E.agora(); await E.salvar(el); }
      return res.status(200).json(await estado());
    }

    if (acao === "abrir-turno") {
      if (el.encerrada) return res.status(400).json({ erro: "encerrada" });
      if (turno.turno !== 1 || turno.candidatos.length <= 2) return res.status(400).json({ erro: "turno" });
      const f = E.lerFim(b.fecha);
      if (!f.ok) return res.status(400).json({ erro: "horario" });
      const lista = Array.isArray(b.finalistas) ? b.finalistas.map(String) : [];
      const unicos = lista.filter((n, i) => lista.indexOf(n) === i);
      const escolhidos = turno.candidatos.filter((c) => unicos.includes(c.n));
      if (unicos.length !== 2 || escolhidos.length !== 2) return res.status(400).json({ erro: "finalistas" });
      await E.fecharTurno(el);
      el.turnos.push({ turno: 2, candidatos: escolhidos, abertoEm: E.agora(), fecha: f.valor, fechadoEm: null });
      await E.salvar(el);
      return res.status(200).json(await estado());
    }

    if (acao === "encerrar") {
      await encerraEleicao(el);
      return res.status(200).json(await estado());
    }

    if (acao === "nova") {
      const nome = String(b.nome || "").trim().slice(0, 80);
      const cands = limpaCandidatos(b.candidatos);
      const f = E.lerFim(b.fecha);
      if (!nome || !cands) return res.status(400).json({ erro: "dados" });
      if (!f.ok) return res.status(400).json({ erro: "horario" });
      await encerraEleicao(el);
      const id = +(await cmd(["INCR", "eleicao:ultimo"]));
      await E.salvar({
        id, nome, encerrada: false, criadaEm: E.agora(),
        turnos: [{ turno: 1, candidatos: cands, abertoEm: E.agora(), fecha: f.valor, fechadoEm: null }],
      });
      await cmd(["SET", "eleicao:atual", String(id)]);
      return res.status(200).json(await estado());
    }

    return res.status(400).json({ erro: "acao" });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
