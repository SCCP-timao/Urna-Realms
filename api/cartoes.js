const Eleitores = require("../lib/eleitores");
const { gerar } = require("../lib/token");
// Só quem tem uma das duas senhas (CARTAO_SENHA_1 ou CARTAO_SENHA_2) acessa a lista.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const k = req.headers["x-admin-key"];
  const ok = !!k && (k === process.env.CARTAO_SENHA_1 || k === process.env.CARTAO_SENHA_2);
  if (!ok) return res.status(401).json({ erro: "senha" });
  try {
    const l = await Eleitores.lista();
    const titulos = l.ativos.map((e) => ({ numero: e.numero, nome: e.nome, token: gerar(e.numero) }));
    return res.status(200).json({ titulos });
  } catch (e) {
    return res.status(500).json({ erro: "servidor" });
  }
};
