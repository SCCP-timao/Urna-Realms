const { cmd, tituloValido, CANDIDATOS } = require("../lib/db");

// Atômico: registra o título e soma o voto numa única operação.
// Se o título já está registrado, nada é gravado.
const LUA = `if redis.call('SADD', KEYS[1], ARGV[1]) == 1 then
  redis.call('HINCRBY', KEYS[2], ARGV[2], 1)
  return 1
end
return 0`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  const { titulo, voto } = req.body || {};
  if (!tituloValido(titulo)) return res.status(400).json({ erro: "invalido" });
  let chave;
  if (voto === "branco") chave = "branco";
  else if (typeof voto === "string" && /^\d{2}$/.test(voto)) chave = CANDIDATOS.includes(voto) ? voto : "nulo";
  else return res.status(400).json({ erro: "voto" });
  try {
    const r = await cmd(["EVAL", LUA, "2", "titulos", "votos", titulo, chave]);
    if (r !== 1) return res.status(409).json({ erro: "jaVotou" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
