// Eleições e turnos: guarda no banco qual eleição está aberta, em que turno, quem concorre
// e até que horas se pode votar. Os votos de cada turno ficam em chaves separadas,
// então nada é apagado ao mudar de turno.
const { cmd } = require("./db");
const eleitores = require("./eleitores");

// Candidatos da primeira eleição (só usados na 1ª vez, para criar a eleição no banco).
const PADRAO = [
  { n: "14", nome: "Rodrigo Miyamura e Silva", partido: "Missão", foto: "" },
  { n: "50", nome: "Miguel Lucas Arruda", partido: "PCL", foto: "" },
  { n: "22", nome: "Enzo Perelhal Fidelis", partido: "PL", foto: "" },
  { n: "17", nome: "Lorenzo Bonfa", partido: "PSB", foto: "" },
];

const total = async () => Object.keys(await eleitores.todos()).length; // quem pode votar agora
const agora = () => new Date(Date.now()).toISOString();
const chaveEleicao = (id) => "eleicao:" + id;

// A eleição 1, turno 1 continua usando "titulos" e "votos" (os votos que já existem).
function chavesDe(id, turno) {
  if (+id === 1 && +turno === 1) return { titulos: "titulos", votos: "votos" };
  return { titulos: "titulos:" + id + ":" + turno, votos: "votos:" + id + ":" + turno };
}

// "aberta" (pode votar), "fechada" (passou do horário, o mesário ainda decide o próximo passo)
// ou "encerrada" (a eleição inteira acabou).
function statusTurno(el, turno) {
  if (el.encerrada) return "encerrada";
  if (turno.fecha && Date.now() >= Date.parse(turno.fecha)) return "fechada";
  return "aberta";
}

// Horário de Brasília, para as mensagens ao eleitor.
function fmtHora(iso) {
  const s = new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return s.replace(/,?\s+/, " às ");
}
function msgFechado(el, turno) {
  if (el.encerrada) return "A eleição foi encerrada.";
  return "A votação foi encerrada em " + fmtHora(turno.fecha) + ".";
}

// Lê um horário de fechamento vindo do painel. Devolve {ok, valor}: valor é ISO ou null (sem horário).
function lerFim(v) {
  if (v === undefined || v === null || v === "") return { ok: true, valor: null };
  const ms = Date.parse(v);
  if (typeof v !== "string" || isNaN(ms) || ms <= Date.now() || ms > Date.now() + 366 * 86400000) return { ok: false };
  return { ok: true, valor: new Date(ms).toISOString() };
}

async function ler(id) {
  const t = await cmd(["GET", chaveEleicao(id)]);
  return t ? JSON.parse(t) : null;
}
async function salvar(el) {
  await cmd(["SET", chaveEleicao(el.id), JSON.stringify(el)]);
}

async function contagem(chaves) {
  const flat = (await cmd(["HGETALL", chaves.votos])) || [];
  const votos = {};
  for (let i = 0; i < flat.length; i += 2) votos[flat[i]] = +flat[i + 1];
  const votaram = await cmd(["SCARD", chaves.titulos]);
  return { votos, votaram: +votaram || 0 };
}

// Eleição em andamento (cria a primeira se o banco ainda não tiver nenhuma).
async function atual() {
  let id = await cmd(["GET", "eleicao:atual"]);
  if (!id) {
    const el = {
      id: 1, nome: "Eleição presidencial", encerrada: false, criadaEm: agora(),
      turnos: [{ turno: 1, candidatos: PADRAO, abertoEm: agora(), fecha: null, fechadoEm: null }],
    };
    await cmd(["SET", chaveEleicao(1), JSON.stringify(el), "NX"]);
    await cmd(["SET", "eleicao:ultimo", "1", "NX"]);
    await cmd(["SET", "eleicao:atual", "1", "NX"]);
    id = await cmd(["GET", "eleicao:atual"]);
  }
  const el = await ler(id);
  if (!el) throw new Error("eleição não encontrada");
  const turno = el.turnos[el.turnos.length - 1];
  return { el, turno, chaves: chavesDe(el.id, turno.turno) };
}

// Fecha o turno em andamento guardando uma cópia da contagem final e de quantos faltaram.
async function fecharTurno(el) {
  const t = el.turnos[el.turnos.length - 1];
  if (t.fechadoEm) return;
  const fim = t.fecha && Date.parse(t.fecha) <= Date.now() ? t.fecha : agora();
  t.fecha = fim; t.fechadoEm = fim;
  const c = await contagem(chavesDe(el.id, t.turno));
  const tot = await total();
  t.resultado = { votos: c.votos, votaram: c.votaram, total: tot, ausentes: Math.max(0, tot - c.votaram) };
}

// Quem avança ao próximo turno: os 2 mais votados. Se houver empate que decide a vaga, avisa.
function proposta(candidatos, votos) {
  const lista = candidatos
    .map((c) => ({ n: c.n, nome: c.nome, partido: c.partido, v: votos[c.n] || 0 }))
    .sort((a, b) => b.v - a.v);
  const validos = lista.reduce((s, c) => s + c.v, 0);
  const fixos = [];
  let empate = null;
  if (validos > 0) {
    let i = 0;
    while (i < lista.length && fixos.length < 2) {
      let j = i;
      while (j < lista.length && lista[j].v === lista[i].v) j++;
      const grupo = lista.slice(i, j).map((c) => c.n);
      if (fixos.length + grupo.length <= 2) fixos.push(...grupo);
      else { empate = { vagas: 2 - fixos.length, candidatos: grupo }; break; }
      i = j;
    }
  }
  return { lista, validos, fixos, empate };
}

module.exports = { atual, ler, salvar, chavesDe, contagem, fecharTurno, proposta, statusTurno, msgFechado, fmtHora, lerFim, total, agora };
