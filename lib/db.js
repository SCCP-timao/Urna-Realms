// Conexão com o Upstash Redis (REST). Sem dependências.
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function cmd(args) {
  if (!URL || !TOKEN) throw new Error("Banco de dados não configurado");
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const tituloValido = (t) => typeof t === "string" && /^\d{3}$/.test(t) && +t >= 0 && +t <= 27;
const CANDIDATOS = ["14", "50", "22"];

function admin(req) {
  const k = process.env.ADMIN_KEY;
  return !!k && req.headers["x-admin-key"] === k;
}

module.exports = { cmd, tituloValido, CANDIDATOS, admin };
