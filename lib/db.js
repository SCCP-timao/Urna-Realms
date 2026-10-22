// Conexão com o banco: funciona com Upstash (REST) ou Redis comum (REDIS_URL).
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;

// Redis comum: abre uma conexão nova a cada comando e fecha no fim.
// Evita conexões "velhas" que a Vercel mantém paradas e que acabam caindo.
async function viaRedis(args) {
  const { createClient } = require("redis");
  const c = createClient({ url: REDIS_URL, socket: { connectTimeout: 5000, reconnectStrategy: false } });
  c.on("error", () => {});
  await c.connect();
  try {
    return await c.sendCommand(args.map(String));
  } finally {
    try { await c.quit(); } catch (e) { try { c.disconnect(); } catch (e2) {} }
  }
}

async function cmd(args) {
  if (REST_URL && REST_TOKEN) {
    const r = await fetch(REST_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + REST_TOKEN },
      body: JSON.stringify(args),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }
  if (!REDIS_URL) throw new Error("Banco de dados não configurado");
  try {
    return await viaRedis(args);
  } catch (e) {
    return await viaRedis(args); // uma segunda tentativa
  }
}

const tituloValido = (t) => typeof t === "string" && /^\d{3}$/.test(t) && +t >= 0 && +t <= 27;
const CANDIDATOS = ["14", "50", "22"];

function admin(req) {
  const k = process.env.ADMIN_KEY;
  return !!k && req.headers["x-admin-key"] === k;
}

module.exports = { cmd, tituloValido, CANDIDATOS, admin };
