// RioHosting-Pricing · lógica do filtro de período e da lista de concorrentes (sem tela).
const MESES_PER = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro",
  "Outubro", "Novembro", "Dezembro"];

// Botões do filtro: 7/14/30 dias, um por mês que tem noites, e "Tudo"
function opcoesDePeriodo(datas) {
  const meses = [...new Set(datas.map(d => d.slice(0, 7)))].sort();
  return [["7", "Próximos 7 dias"], ["14", "Próximos 14 dias"], ["30", "Próximos 30 dias"],
    ...meses.map(m => [m, MESES_PER[Number(m.slice(5, 7)) - 1] + " " + m.slice(0, 4)]), ["tudo", "Tudo"]];
}

const isoLocal = dt => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" +
  String(dt.getDate()).padStart(2, "0");

// "7" = de hoje até hoje+6; "aaaa-mm" = o mês; "tudo" = tudo
function noPeriodo(d, periodo, hoje) {
  if (periodo === "tudo") return true;
  if (/^\d+$/.test(periodo)) {
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + Number(periodo) - 1);
    return d >= isoLocal(hoje) && d <= isoLocal(fim);
  }
  return d.startsWith(periodo + "-");
}

// Concorrentes que entram na conta do apartamento nas noites dadas (sem os de reserva), por distância
function concorrentesDoApto(noites, anuncios) {
  const juntos = {};
  noites.forEach(n => new Set((n.conc || []).filter(c => c.res === null).map(c => c.id)).forEach(id => {
    const c = n.conc.find(x => x.id === id);
    juntos[id] = juntos[id] || { id, ...(anuncios[id] || {}), dist: c.dist, noites: 0 };
    juntos[id].noites++;
  }));
  return Object.values(juntos).sort((a, b) => a.dist - b.dist || (a.id < b.id ? -1 : 1));
}

if (typeof module !== "undefined") module.exports = { opcoesDePeriodo, noPeriodo, concorrentesDoApto };
