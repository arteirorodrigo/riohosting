// RioHosting-Pricing · lógica do calendário (sem tela): quais meses mostrar e como montar a grade.
const MESES_CAL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro"];
const SEMANA_CAL = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

// "aaaa-mm" do mês de hoje até dezembro do ano que vem
function mesesDoCalendario(hoje) {
  const meses = [], ultimo = hoje.getFullYear() + 1;
  for (let a = hoje.getFullYear(), m = hoje.getMonth() + 1; a <= ultimo; ) {
    meses.push(a + "-" + String(m).padStart(2, "0"));
    if (++m > 12) { m = 1; a++; }
  }
  return meses;
}

// null = casa vazia antes do dia 1 (a semana começa na segunda); depois {dia, i} com o índice da noite
function gradeDoMes(mes, noites) {
  const [a, m] = mes.split("-").map(Number);
  const porDia = {};
  noites.forEach((n, i) => { porDia[n.d] = i; });
  const casas = Array((new Date(a, m - 1, 1).getDay() + 6) % 7).fill(null);
  const total = new Date(a, m, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const i = porDia[mes + "-" + String(d).padStart(2, "0")];
    casas.push({ dia: d, i: i === undefined ? null : i });
  }
  return casas;
}

function nomeDoMes(mes) {
  const [a, m] = mes.split("-");
  return MESES_CAL[Number(m) - 1] + " " + a;
}

if (typeof module !== "undefined") module.exports = { mesesDoCalendario, gradeDoMes, nomeDoMes, SEMANA_CAL };
