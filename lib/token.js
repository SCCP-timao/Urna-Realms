// Chave pessoal de cada título: número + assinatura que só o servidor sabe gerar.
const crypto = require("crypto");
const Eleitores = require("./eleitores");

const segredo = () => process.env.TITULO_SEGREDO || process.env.ADMIN_KEY || "";
const assina = (n) => crypto.createHmac("sha256", segredo()).update("titulo:" + n).digest("hex").slice(0, 12);
const gerar = (n) => n + "-" + assina(n);

// Devolve {numero, nome} se a chave for autêntica e a pessoa ainda puder votar; senão, null.
async function lerEleitor(token) {
  if (typeof token !== "string" || !segredo()) return null;
  const m = /^(\d{4})-([0-9a-f]{12})$/.exec(token.trim());
  if (!m) return null;
  if (!crypto.timingSafeEqual(Buffer.from(m[2]), Buffer.from(assina(m[1])))) return null;
  const nome = await Eleitores.nomeDe(m[1]);
  return nome ? { numero: m[1], nome } : null;
}

// Só o número do título (ou null).
async function ler(token) {
  const e = await lerEleitor(token);
  return e ? e.numero : null;
}

module.exports = { gerar, ler, lerEleitor };
