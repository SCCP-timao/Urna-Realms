// Chave pessoal de cada título: número + assinatura que só o servidor sabe gerar.
const crypto = require("crypto");
const { ELEITORES } = require("./db");

const segredo = () => process.env.TITULO_SEGREDO || process.env.ADMIN_KEY || "";
const assina = (n) => crypto.createHmac("sha256", segredo()).update("titulo:" + n).digest("hex").slice(0, 12);
const gerar = (n) => n + "-" + assina(n);

// Devolve o número do título se a chave for autêntica; senão, null.
function ler(token) {
  if (typeof token !== "string" || !segredo()) return null;
  const m = /^(\d{4})-([0-9a-f]{12})$/.exec(token.trim());
  if (!m || !Object.prototype.hasOwnProperty.call(ELEITORES, m[1])) return null;
  return crypto.timingSafeEqual(Buffer.from(m[2]), Buffer.from(assina(m[1]))) ? m[1] : null;
}

module.exports = { gerar, ler };
