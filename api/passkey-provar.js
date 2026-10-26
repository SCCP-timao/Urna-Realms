// Prova da digital na urna. Duas etapas, na mesma rota:
//   { titulo, etapa: "opcoes" }              -> devolve o desafio (3 min, uso único)
//   { titulo, etapa: "verificar", resposta } -> confere a assinatura da passkey e devolve a "prova"
// A prova é um código aleatório (10 min, uso único) que o votar.js exige.
// Nada aqui guarda ou conhece o voto.
const { generateAuthenticationOptions, verifyAuthenticationResponse } = require("@simplewebauthn/server");
const { cmd } = require("../lib/db");
const { ler } = require("../lib/token");
const P = require("../lib/passkey");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  const { titulo: chave, etapa, resposta } = req.body || {};
  const titulo = ler(chave); // chave do PNG (número + assinatura)
  if (!titulo) return res.status(400).json({ erro: "invalido" });

  try {
    if ((await cmd(["SISMEMBER", "titulos", titulo])) === 1) return res.status(409).json({ erro: "jaVotou" });
    const est = await P.estado(titulo);
    if (est === "dispensada") return res.status(409).json({ erro: "dispensada" }); // não precisa de digital
    if (est !== "registrada") return res.status(403).json({ erro: "semRegistro" }); // precisa registrar antes
    const reg = await P.lerRegistro(titulo);
    if (!reg || !reg.id || !reg.pub) return res.status(403).json({ erro: "semRegistro" });
    const cfg = P.config();

    if (etapa === "opcoes") {
      const opcoes = await generateAuthenticationOptions({
        rpID: cfg.rpID,
        allowCredentials: [{ id: reg.id, transports: reg.tr && reg.tr.length ? reg.tr : undefined }],
        userVerification: "required",
        timeout: 120000,
      });
      await P.guardaDesafio("aut", titulo, opcoes.challenge);
      return res.status(200).json({ ok: true, opcoes });
    }

    if (etapa === "verificar") {
      if (!resposta || typeof resposta !== "object") return res.status(400).json({ erro: "falhou" });
      const desafio = await P.consomeDesafio("aut", titulo); // uso único
      if (!desafio) return res.status(400).json({ erro: "expirou" });
      let v;
      try {
        v = await verifyAuthenticationResponse({
          response: resposta,
          expectedChallenge: desafio,
          expectedOrigin: cfg.origin,
          expectedRPID: cfg.rpID,
          credential: {
            id: reg.id,
            publicKey: new Uint8Array(Buffer.from(reg.pub, "base64url")),
            counter: reg.cont || 0,
            transports: reg.tr && reg.tr.length ? reg.tr : undefined,
          },
          requireUserVerification: true,
        });
      } catch (e) {
        return res.status(400).json({ erro: "falhou" });
      }
      if (!v.verified) return res.status(400).json({ erro: "falhou" });
      await P.atualizaContador(titulo, v.authenticationInfo.newCounter);
      const prova = await P.criaProva(titulo);
      return res.status(200).json({ ok: true, prova });
    }

    return res.status(400).json({ erro: "etapa" });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
