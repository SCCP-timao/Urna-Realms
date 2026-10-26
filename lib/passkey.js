// Passkey (WebAuthn): configuração e funções de apoio no Redis.
// O servidor guarda só a CHAVE PÚBLICA da passkey. Nunca digital nem rosto.
// Nada aqui guarda em quem o eleitor votou.
const crypto = require("crypto");
const { cmd } = require("./db");

// ► Endereço do site. A passkey fica presa a ele: se mudar, todo mundo registra de novo.
// Para mudar sem editar o código, use as variáveis WEBAUTHN_RP_ID e WEBAUTHN_ORIGIN na Vercel.
const RP_ID = process.env.WEBAUTHN_RP_ID || "urna-realms-one.vercel.app";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "https://" + RP_ID;
const RP_NAME = "Urna eletrônica (simulação)";

const DESAFIO_SEG = 180; // desafio do WebAuthn: 3 min, uso único
const PROVA_SEG = 600;   // prova de voto: 10 min, uso único

// Chaves no Redis:
//   pk:<título>           registro da passkey (JSON: id, chave pública, contador). Permanente.
//   dispensados           conjunto de títulos dispensados da biometria. Permanente.
//   desafio:<tipo>:<tít>  desafio atual ("reg" ou "aut"). Expira em 3 min.
//   prova:<título>        prova de que passou na digital. Expira em 10 min.
const kPk = (t) => "pk:" + t;
const kDesafio = (tipo, t) => "desafio:" + tipo + ":" + t;
const kProva = (t) => "prova:" + t;

const config = () => ({ rpID: RP_ID, origin: ORIGIN, rpName: RP_NAME });

// "registrada" | "dispensada" | "pendente"
async function estado(titulo) {
  if ((await cmd(["EXISTS", kPk(titulo)])) === 1) return "registrada";
  if ((await cmd(["SISMEMBER", "dispensados", titulo])) === 1) return "dispensada";
  return "pendente";
}

async function lerRegistro(titulo) {
  const j = await cmd(["GET", kPk(titulo)]);
  if (!j) return null;
  try { return JSON.parse(j); } catch (e) { return null; }
}

// Desafios
async function guardaDesafio(tipo, titulo, desafio) {
  await cmd(["SET", kDesafio(tipo, titulo), desafio, "EX", DESAFIO_SEG]);
}
const LUA_PEGA_E_APAGA = `local v = redis.call('GET', KEYS[1])
if v then redis.call('DEL', KEYS[1]) end
return v`;
// Devolve o desafio e já apaga (uso único). Se expirou ou já foi usado: null.
async function consomeDesafio(tipo, titulo) {
  const v = await cmd(["EVAL", LUA_PEGA_E_APAGA, "1", kDesafio(tipo, titulo)]);
  return v || null;
}

// Registro atômico. 1 = gravado, 0 = já tem passkey, -1 = título dispensado.
const LUA_REGISTRA = `if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
if redis.call('SISMEMBER', KEYS[2], ARGV[2]) == 1 then return -1 end
redis.call('SET', KEYS[1], ARGV[1])
return 1`;
async function gravaRegistro(titulo, registro) {
  return await cmd(["EVAL", LUA_REGISTRA, "2", kPk(titulo), "dispensados", JSON.stringify(registro), titulo]);
}

// Atualiza só o contador da passkey (e só se o registro ainda existir).
async function atualizaContador(titulo, cont) {
  const r = await lerRegistro(titulo);
  if (!r) return;
  r.cont = cont;
  await cmd(["SET", kPk(titulo), JSON.stringify(r), "XX"]);
}

// Prova de voto: código aleatório. O votar.js confere e apaga junto com o voto.
async function criaProva(titulo) {
  const p = crypto.randomBytes(24).toString("hex");
  await cmd(["SET", kProva(titulo), p, "EX", PROVA_SEG]);
  return p;
}

// Mesário: apaga o registro (troca de celular) e qualquer desafio/prova pendente.
// Devolve true se havia registro.
async function apagaRegistro(titulo) {
  const n = await cmd(["DEL", kPk(titulo)]);
  await cmd(["DEL", kProva(titulo), kDesafio("reg", titulo), kDesafio("aut", titulo)]);
  return n === 1;
}

// Mesário: dispensa da biometria. 1 = dispensado, 0 = não pode (já tem passkey).
const LUA_DISPENSA = `if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('SADD', KEYS[2], ARGV[1])
return 1`;
async function dispensar(titulo) {
  return await cmd(["EVAL", LUA_DISPENSA, "2", kPk(titulo), "dispensados", titulo]);
}
async function desfazDispensa(titulo) {
  return (await cmd(["SREM", "dispensados", titulo])) === 1;
}

// Mesário: situação de todos os títulos.
async function resumo(eleitores) {
  const reg = [], disp = [], pend = [];
  const dsp = (await cmd(["SMEMBERS", "dispensados"])) || [];
  for (const t of Object.keys(eleitores)) {
    const e = (await cmd(["EXISTS", kPk(t)])) === 1 ? "registrada" : dsp.includes(t) ? "dispensada" : "pendente";
    const item = { numero: t, nome: eleitores[t] };
    (e === "registrada" ? reg : e === "dispensada" ? disp : pend).push(item);
  }
  return { registrados: reg, dispensados: disp, pendentes: pend };
}

module.exports = {
  config, estado, lerRegistro, guardaDesafio, consomeDesafio, gravaRegistro,
  atualizaContador, criaProva, apagaRegistro, dispensar, desfazDispensa, resumo,
};
