// Quem pode votar = a lista fixa de lib/db.js + as pessoas criadas pelo painel − as removidas.
// Assim dá para criar e remover eleitores sem mexer em código.
const { cmd, ELEITORES } = require("./db");

const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

async function extras() {
  const flat = (await cmd(["HGETALL", "eleitores:extra"])) || [];
  const o = {};
  for (let i = 0; i < flat.length; i += 2) o[flat[i]] = flat[i + 1];
  return o;
}
async function removidosLista() {
  return ((await cmd(["SMEMBERS", "eleitores:removidos"])) || []).map(String);
}

// Quem pode votar agora: { numero: nome }
async function todos() {
  const ex = await extras(), rem = await removidosLista();
  const o = Object.assign({}, ELEITORES, ex);
  rem.forEach((n) => { delete o[n]; });
  return o;
}

// Para o painel: quem pode votar e quem foi removido (com nome, para poder restaurar).
async function lista() {
  const ex = await extras(), rem = await removidosLista();
  const all = Object.assign({}, ELEITORES, ex);
  const mk = (n) => ({ numero: n, nome: all[n] });
  return {
    ativos: Object.keys(all).filter((n) => !rem.includes(n)).map(mk).sort(porNome),
    removidos: rem.filter((n) => tem(all, n)).map(mk).sort(porNome),
  };
}

// Nome do eleitor se o número pode votar; senão null.
async function nomeDe(n) {
  if ((await cmd(["SISMEMBER", "eleitores:removidos", n])) === 1) return null;
  if (tem(ELEITORES, n)) return ELEITORES[n];
  const v = await cmd(["HGET", "eleitores:extra", n]);
  return v || null;
}

// Cria um eleitor novo com um número de 4 dígitos que nunca foi usado (nem por removidos).
async function criar(nomeBruto) {
  const nome = String(nomeBruto || "").replace(/[<>:"\/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  if (nome.length < 3 || nome.length > 60) return { erro: "nome" };
  const l = await lista();
  if (l.ativos.some((e) => norm(e.nome) === norm(nome))) return { erro: "nomeRepetido" };
  const usados = new Set(l.ativos.concat(l.removidos).map((e) => e.numero));
  let n = null;
  for (let i = 0; i < 500 && !n; i++) {
    const c = String(1000 + Math.floor(Math.random() * 9000));
    if (!usados.has(c)) n = c;
  }
  if (!n) return { erro: "servidor" };
  await cmd(["HSET", "eleitores:extra", n, nome]);
  return { numero: n, nome };
}

async function remover(n) {
  await cmd(["SADD", "eleitores:removidos", n]);
}
async function restaurar(n) {
  await cmd(["SREM", "eleitores:removidos", n]);
}

module.exports = { todos, lista, nomeDe, criar, remover, restaurar };
