const { cmd } = require("../lib/db");
module.exports = async (req, res) => {
  const env = {
    REDIS_URL: !!process.env.REDIS_URL,
    KV_URL: !!process.env.KV_URL,
    REST: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    ADMIN_KEY: !!process.env.ADMIN_KEY,
    variaveis: Object.keys(process.env).filter((k) => /redis|kv_|upstash/i.test(k)),
  };
  try {
    env.ping = await cmd(["PING"]);
  } catch (e) {
    env.erro = String(e.message || e);
  }
  res.status(200).json(env);
};
