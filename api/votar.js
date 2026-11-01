const { cmd } = require("../lib/db");
const { ler } = require("../lib/token");
const E = require("../lib/eleicao");

// Atômico: registra o título e soma o voto numa única operação.
// Se o título já está registrado neste turno, nada é gravado.
const LUA = `if redis.call('SADD', KEYS[1], ARGV[1]) == 1 then
  redis.call('HINCRBY', KEYS[2], ARGV[2], 1)
  return 1
end
return 0`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  const { titulo: chave, voto } = req.body || {};
  const titulo = ler(chave); // a chave do PNG, não só o número
  if (!titulo) return res.status(400).json({ erro: "invalido" });
  if (!(voto === "branco" || (typeof voto === "string" && /^\d{2}$/.test(voto)))) return res.status(400).json({ erro: "voto" });
  try {
    const { el, turno, chaves } = await E.atual();
    if (E.statusTurno(el, turno) !== "aberta") return res.status(403).json({ erro: "fechado", mensagem: E.msgFechado(el, turno) });
    const numeros = turno.candidatos.map((c) => c.n);
    const opcao = voto === "branco" ? "branco" : numeros.includes(voto) ? voto : "nulo";
    const r = await cmd(["EVAL", LUA, "2", chaves.titulos, chaves.votos, titulo, opcao]);
    if (r !== 1) return res.status(409).json({ erro: "jaVotou" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
    
