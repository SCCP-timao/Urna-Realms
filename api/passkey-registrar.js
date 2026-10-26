// Registro da passkey de um título. Duas etapas, na mesma rota:
//   { titulo, etapa: "opcoes" }              -> devolve as opções e guarda o desafio (3 min, uso único)
//   { titulo, etapa: "verificar", resposta } -> confere a resposta do celular e grava a passkey
// O servidor guarda só a chave pública. Nada aqui toca em votos.
const { generateRegistrationOptions, verifyRegistrationResponse } = require("@simplewebauthn/server");
const { cmd } = require("../lib/db");
const { ler } = require("../lib/token");
const P = require("../lib/passkey");

// Só algoritmos comuns em celulares (ES256 e RS256).
const ALGS = [-7, -257];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  const { titulo: chave, etapa, resposta } = req.body || {};
  const titulo = ler(chave); // chave do PNG (número + assinatura)
  if (!titulo) return res.status(400).json({ erro: "invalido" });

  try {
    if ((await cmd(["SISMEMBER", "titulos", titulo])) === 1) return res.status(409).json({ erro: "jaVotou" });
    const est = await P.estado(titulo);
    if (est === "registrada") return res.status(409).json({ erro: "jaRegistrada" });
    if (est === "dispensada") return res.status(409).json({ erro: "dispensada" });
    const cfg = P.config();

    if (etapa === "opcoes") {
      const opcoes = await generateRegistrationOptions({
        rpName: cfg.rpName,
        rpID: cfg.rpID,
        userName: "Título " + titulo,
        userDisplayName: "Título " + titulo,
        userID: new Uint8Array(Buffer.from("titulo-" + titulo)),
        attestationType: "none",
        supportedAlgorithmIDs: ALGS,
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
        timeout: 120000,
      });
      await P.guardaDesafio("reg", titulo, opcoes.challenge);
      return res.status(200).json({ ok: true, opcoes });
    }

    if (etapa === "verificar") {
      if (!resposta || typeof resposta !== "object") return res.status(400).json({ erro: "falhou" });
      const desafio = await P.consomeDesafio("reg", titulo); // uso único
      if (!desafio) return res.status(400).json({ erro: "expirou" });
      let v;
      try {
        v = await verifyRegistrationResponse({
          response: resposta,
          expectedChallenge: desafio,
          expectedOrigin: cfg.origin,
          expectedRPID: cfg.rpID,
          requireUserVerification: true,
        });
      } catch (e) {
        return res.status(400).json({ erro: "falhou" });
      }
      if (!v.verified || !v.registrationInfo) return res.status(400).json({ erro: "falhou" });
      const c = v.registrationInfo.credential;
      const r = await P.gravaRegistro(titulo, {
        id: c.id,
        pub: Buffer.from(c.publicKey).toString("base64url"),
        cont: c.counter || 0,
        tr: c.transports || [],
      });
      if (r === 1) return res.status(200).json({ ok: true });
      if (r === -1) return res.status(409).json({ erro: "dispensada" });
      return res.status(409).json({ erro: "jaRegistrada" });
    }

    return res.status(400).json({ erro: "etapa" });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
