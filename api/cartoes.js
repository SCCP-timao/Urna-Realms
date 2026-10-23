const { ELEITORES } = require("../lib/db");
// Só quem tem uma das duas senhas (CARTAO_SENHA_1 ou CARTAO_SENHA_2) acessa a lista.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const k = req.headers["x-admin-key"];
  const ok = !!k && (k === process.env.CARTAO_SENHA_1 || k === process.env.CARTAO_SENHA_2);
  if (!ok) return res.status(401).json({ erro: "senha" });
  const titulos = Object.entries(ELEITORES).map(([numero, nome]) => ({ numero, nome }));
  return res.status(200).json({ titulos });
};
