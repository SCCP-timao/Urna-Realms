// ► CONFIGURE AQUI O HORÁRIO DE FUNCIONAMENTO
// dias: 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, 4 = quinta, 5 = sexta, 6 = sábado
// Para a urna ficar sempre aberta, deixe a lista vazia: const JANELAS = [];
const JANELAS = [{ dias: [5], inicio: "00:00", fim: "23:59" }];
const FUSO = "America/Sao_Paulo";

const NOMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const min = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

function agora(data) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(data);
  const g = (t) => p.find((x) => x.type === t).value;
  return { dia: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")), m: +g("hour") * 60 + +g("minute") };
}

function aberta(data = new Date()) {
  if (!JANELAS.length) return true;
  const { dia, m } = agora(data);
  return JANELAS.some((j) => j.dias.includes(dia) && m >= min(j.inicio) && m <= min(j.fim));
}

function descricao() {
  return "Funcionamento: " + JANELAS.map((j) => j.dias.map((d) => NOMES[d]).join(", ") + ", " + j.inicio + " às " + j.fim).join(" | ");
}

module.exports = { aberta, descricao };
