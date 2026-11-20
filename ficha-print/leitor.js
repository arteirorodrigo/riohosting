// Lê o texto da página "Informações da reserva" do Airbnb e devolve os campos da ficha.
// Versão de teste. Funciona no navegador (window.lerReservaAirbnb) e no Node (para testes).
(function () {
  const MESES = {
    jan: "Jan", fev: "Fev", mar: "Mar", abr: "Abr", mai: "Mai", jun: "Jun",
    jul: "Jul", ago: "Ago", set: "Set", out: "Out", nov: "Nov", dez: "Dez",
  };
  const ORDEM_MES = Object.keys(MESES);

  // Cidade -> UF (capitais e cidades que mais aparecem). Se não achar, fica só a cidade.
  const UF = {
    "são paulo": "SP", "campinas": "SP", "santos": "SP", "guarulhos": "SP", "ribeirão preto": "SP",
    "são josé dos campos": "SP", "sorocaba": "SP", "osasco": "SP", "santo andré": "SP", "são bernardo do campo": "SP",
    "rio de janeiro": "RJ", "niterói": "RJ", "petrópolis": "RJ", "nova iguaçu": "RJ", "duque de caxias": "RJ",
    "belo horizonte": "MG", "juiz de fora": "MG", "uberlândia": "MG", "contagem": "MG",
    "vitória": "ES", "vila velha": "ES", "curitiba": "PR", "londrina": "PR", "maringá": "PR",
    "foz do iguaçu": "PR", "cascavel": "PR", "florianópolis": "SC", "joinville": "SC", "blumenau": "SC",
    "porto alegre": "RS", "caxias do sul": "RS", "salvador": "BA", "recife": "PE", "fortaleza": "CE",
    "natal": "RN", "joão pessoa": "PB", "maceió": "AL", "aracaju": "SE", "teresina": "PI",
    "são luís": "MA", "belém": "PA", "manaus": "AM", "macapá": "AP", "boa vista": "RR",
    "porto velho": "RO", "rio branco": "AC", "palmas": "TO", "goiânia": "GO", "brasília": "DF",
    "cuiabá": "MT", "campo grande": "MS",
  };

  function linhas(texto) {
    return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  }

  function nomeHospede(ls) {
    for (let i = 0; i < ls.length; i++) {
      const m = ls[i].match(/^Confirmada\s*(.*)$/i);
      if (m) return (m[1] || ls[i + 1] || "").trim();
    }
    return "";
  }

  function endereco(ls) {
    // Ex.: "Rua Djalma Ulrich, 183 - Apto 502 · Rua Djalma Ulrich, 183 - Copacabana"
    const l = ls.find((x) => x.includes("·") && /\d/.test(x) && !/noite/i.test(x)) || "";
    const parte = l.split("·")[0].trim();
    const m = parte.match(/^(.*?)\s*[-–]\s*((?:Apto|Apt|Apartamento|Ap|Unidade|Sala|Casa|Cobertura)\.?\s*.*)$/i);
    if (m) return { endereco: m[1].trim(), complemento: m[2].replace(/^(Apartamento|Apto|Apt|Ap)\.?\s*/i, "Apto ").trim() };
    return { endereco: parte, complemento: "" };
  }

  function datas(texto) {
    // "20 – 23 de nov. (3 noites)"  ou  "28 de nov. – 2 de dez. (4 noites)"
    const m = texto.match(/(\d{1,2})(?:\s+de\s+([a-zç]{3})[a-zç]*\.?)?\s*[–-]\s*(\d{1,2})\s+de\s+([a-zç]{3})[a-zç]*\.?\s*\((\d+)\s+noites?\)/i);
    if (!m) return "";
    const [, d1, mes1raw, d2, mes2raw, noites] = m;
    const mes2 = mes2raw.toLowerCase();
    const mes1 = (mes1raw || mes2raw).toLowerCase();
    const posCheckout = texto.search(/Checkout/i);
    const trecho = posCheckout >= 0 ? texto.slice(posCheckout) : texto;
    const ano = ((trecho.match(/\b(20\d{2})\b/) || texto.match(/\b(20\d{2})\b/) || [])[1]) || String(new Date().getFullYear());
    const n = Number(noites);
    const sufixo = `(${n} ${n === 1 ? "noite" : "noites"})`;
    if (mes1 === mes2) return `${d1} - ${d2} ${MESES[mes2]} ${ano} ${sufixo}`;
    const anoIni = ORDEM_MES.indexOf(mes1) > ORDEM_MES.indexOf(mes2) ? String(Number(ano) - 1) : ano;
    const ini = anoIni === ano ? `${d1} ${MESES[mes1]}` : `${d1} ${MESES[mes1]} ${anoIni}`;
    return `${ini} - ${d2} ${MESES[mes2]} ${ano} ${sufixo}`;
  }

  function telefone(texto) {
    const m = texto.match(/Telefone:\s*(\+?[\d][\d\s().-]{6,}\d)/i);
    return m ? m[1].replace(/\s+/g, " ").trim() : "";
  }

  function origem(texto) {
    const m = texto.match(/Mora em\s+([^\n]+)/i);
    if (!m) return "";
    const partes = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const cidade = partes[0] || "";
    const pais = partes[partes.length - 1] || "";
    if (partes.length === 1) return cidade;
    if (/^brasil$|^brazil$/i.test(pais)) {
      const uf = UF[cidade.toLowerCase()];
      return uf ? `${cidade} / ${uf}` : cidade;
    }
    return `${cidade} / ${pais}`;
  }

  function lerReservaAirbnb(texto) {
    const ls = linhas(texto);
    const end = endereco(ls);
    return {
      hospede: nomeHospede(ls),
      endereco: end.endereco,
      complemento: end.complemento,
      datas: datas(texto),
      telefone: telefone(texto),
      origem: origem(texto),
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { lerReservaAirbnb };
  if (typeof window !== "undefined") window.lerReservaAirbnb = lerReservaAirbnb;
})();
