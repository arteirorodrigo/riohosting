// PROTÓTIPO — lê o texto tirado de PRINTS (WhatsApp, Airbnb, outras plataformas) e tenta achar
// os dados da ficha com regras soltas. Grátis, roda no aparelho. Acerta parte; a equipe confere.
// Funciona no navegador (window.lerPrint) e no Node (para testes).
(function () {
  // Lista fixa de imóveis da Rio Hosting. Se o print citar a rua/prédio, preenche certinho.
  // PREENCHER: { endereco: "Rua X, 183 - Copacabana", complemento: "Apto 502", procurar: ["djalma ulrich", "183"] }
  // "procurar" = palavras que, TODAS juntas no print, identificam o imóvel.
  const IMOVEIS = [];

  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MES_NOME = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const MES_EN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  function semAcento(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  function linhas(texto) {
    return texto.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  }

  // ---------- Telefone ----------
  function telefone(texto) {
    const cands = texto.match(/(?:\+\s?\d{1,3}[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\s?\d{4}[\s.-]?\d{4}/g) || [];
    for (const c of cands) {
      const dig = c.replace(/\D/g, "");
      if (dig.length >= 10 && dig.length <= 13) return c.replace(/\s+/g, " ").trim();
    }
    const intl = texto.match(/\+\d[\d\s().-]{8,16}\d/);
    return intl ? intl[0].replace(/\s+/g, " ").trim() : "";
  }

  // ---------- Datas ----------
  function mesIndice(txt) {
    const t = semAcento(txt).slice(0, 3);
    let i = MESES.indexOf(t);
    if (i < 0 && t in MES_EN) i = MES_EN[t];
    return i;
  }
  function anoPadrao(mes, dia) {
    const hoje = new Date();
    const d = new Date(hoje.getFullYear(), mes, dia);
    // Datas já passadas há mais de 2 meses provavelmente são do ano que vem.
    return d < new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1) ? hoje.getFullYear() + 1 : hoje.getFullYear();
  }
  function formatarDatas(a, b) {
    const noites = Math.round((b - a) / 86400000);
    if (noites <= 0 || noites > 120) return "";
    const suf = `(${noites} ${noites === 1 ? "noite" : "noites"})`;
    const [d1, m1, y1] = [a.getDate(), a.getMonth(), a.getFullYear()];
    const [d2, m2, y2] = [b.getDate(), b.getMonth(), b.getFullYear()];
    if (m1 === m2 && y1 === y2) return `${d1} - ${d2} ${MES_NOME[m2]} ${y2} ${suf}`;
    const ini = y1 === y2 ? `${d1} ${MES_NOME[m1]}` : `${d1} ${MES_NOME[m1]} ${y1}`;
    return `${ini} - ${d2} ${MES_NOME[m2]} ${y2} ${suf}`;
  }
  function datas(texto) {
    const t = semAcento(texto);
    // 1) "20 - 23 de nov" / "28 de nov - 2 de dez" / "12 a 15 de dezembro"
    let m = t.match(/(\d{1,2})(?:\s+de\s+([a-z]{3})[a-z]*\.?)?\s*(?:[–-]|a|ate)\s*(\d{1,2})\s+de\s+([a-z]{3})[a-z]*\.?(?:\s+de\s+(20\d{2}))?/);
    if (m && mesIndice(m[4]) >= 0) {
      const m2 = mesIndice(m[4]);
      const m1 = m[2] && mesIndice(m[2]) >= 0 ? mesIndice(m[2]) : m2;
      const y2 = m[5] ? Number(m[5]) : anoPadrao(m2, Number(m[3]));
      const y1 = m1 > m2 ? y2 - 1 : y2;
      const r = formatarDatas(new Date(y1, m1, Number(m[1])), new Date(y2, m2, Number(m[3])));
      if (r) return r;
    }
    // 2) datas dd/mm(/aaaa). Prefere as que estão perto de "entrada/check-in/chegada" e "saída/checkout".
    const re = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
    const todas = [];
    let x;
    while ((x = re.exec(t))) {
      const dia = Number(x[1]), mes = Number(x[2]) - 1;
      if (dia < 1 || dia > 31 || mes < 0 || mes > 11) continue;
      let ano = x[3] ? Number(x[3].length === 2 ? "20" + x[3] : x[3]) : anoPadrao(mes, dia);
      const antes = t.slice(Math.max(0, x.index - 40), x.index);
      todas.push({ data: new Date(ano, mes, dia), pos: x.index,
        entrada: /(entrada|check.?in|chegada|chego|chegamos)/.test(antes),
        saida: /(saida|check.?out|vou embora|vamos embora|partida|saio|saimos|ate|volta)\W*(dia\s*)?$/.test(antes) || /(saida|check.?out|saio|saimos)/.test(antes) });
    }
    const e = todas.find((d) => d.entrada), s = todas.find((d) => d.saida && (!e || d.pos > e.pos));
    if (e && s) { const r = formatarDatas(e.data, s.data); if (r) return r; }
    // senão: duas datas seguidas ligadas por "a", "-" ou "até"
    for (let i = 0; i + 1 < todas.length; i++) {
      const meio = t.slice(todas[i].pos, todas[i + 1].pos);
      if (meio.length < 20 && /(\s-\s|–|\sa\s|ate)/.test(meio)) {
        const r = formatarDatas(todas[i].data, todas[i + 1].data);
        if (r) return r;
      }
    }
    return "";
  }

  // ---------- Endereço ----------
  function enderecoPorLista(texto) {
    const t = semAcento(texto);
    for (const im of IMOVEIS) {
      if (im.procurar && im.procurar.length && im.procurar.every((p) => t.includes(semAcento(p)))) {
        return { endereco: im.endereco, complemento: im.complemento || "" };
      }
    }
    return null;
  }
  function endereco(ls) {
    const reRua = /\b(Rua|R\.|Av\.?|Avenida|Travessa|Tv\.|Estrada|Alameda|Pra[çc]a|Ladeira|Largo)\s+[^\n]*?\d+[^\n]*/i;
    for (const l of ls) {
      const m = l.match(reRua);
      if (!m) continue;
      let txt = m[0].split("·")[0].trim();
      let comp = "";
      const c = txt.match(/[,-]?\s*\b(?:apto|apt|ap|apartamento|unidade)\.?\s*(\d{1,4}[a-z]?)\b/i);
      if (c) { comp = "Apto " + c[1]; txt = txt.replace(c[0], "").replace(/\s*[,-]\s*$/, "").trim(); }
      return { endereco: txt, complemento: comp };
    }
    return { endereco: "", complemento: "" };
  }
  function complementoSolto(texto) {
    const c = texto.match(/\b(?:apto|apt|apartamento)\.?\s*(\d{1,4}[a-z]?)\b/i);
    return c ? "Apto " + c[1] : "";
  }

  // ---------- Nome ----------
  const PALAVRA_NOME = "[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçà]+";
  const NOME = `(${PALAVRA_NOME}(?:\\s+(?:de|da|do|dos|das|e)?\\s*${PALAVRA_NOME}){0,5})`;
  function nome(texto, ls) {
    const padroes = [
      new RegExp(`nome(?:\\s+completo)?\\s*[:\\-]\\s*${NOME}`, "i"),
      new RegExp(`meu nome [ée]\\s+${NOME}`, "i"),
      new RegExp(`my name is\\s+${NOME}`, "i"),
      new RegExp(`(?:aqui [ée]|sou)\\s+(?:o|a)\\s+${NOME}`, "i"),
      new RegExp(`h[óo]spede\\s*[:\\-]\\s*${NOME}`, "i"),
    ];
    for (const p of padroes) { const m = texto.match(p); if (m) return m[1].trim(); }
    // Topo do WhatsApp: o nome do contato fica na linha acima de "online" / "visto por último".
    for (let i = 1; i < ls.length && i < 8; i++) {
      if (/^(online|visto por [uú]ltimo|last seen|digitando)/i.test(ls[i])) {
        const cand = ls[i - 1].replace(/^[^\p{L}]+/u, "").replace(/[^\p{L}\s'.-]+$/u, "").trim();
        if (/\p{L}{2,}/u.test(cand) && !/\d{4}/.test(cand)) return cand;
      }
    }
    return "";
  }
  function acompanhantes(texto) {
    const m = texto.match(/acompanhantes?\s*[:\-]\s*([^\n]+)/i);
    if (!m) return "";
    return m[1].split(/\s*(?:,|;|\se\s|\/)\s*/).map((s) => s.trim()).filter((s) => /\p{L}{2,}/u.test(s)).join(", ");
  }

  // ---------- Origem ----------
  function origem(texto) {
    const m = texto.match(/(?:sou de|moro em|mora em|venho de|vindo de|somos de|i'?m from|from)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n.,!?]{1,40}(?:,\s*[^\n.!?]{2,30})?)/i);
    if (!m) return "";
    return m[1].replace(/\s+(e|and|mas|vou|vamos)\b.*$/i, "").trim();
  }

  function lerPrint(texto) {
    const ls = linhas(texto);
    // Print da tela de reserva do Airbnb: aproveita o leitor que já existe para o PDF.
    let base = {};
    const airbnb = typeof window !== "undefined" ? window.lerReservaAirbnb
      : (() => { try { return require("./leitor.js").lerReservaAirbnb; } catch (e) { return null; } })();
    if (airbnb && /Confirmada|Mora em/i.test(texto)) { try { base = airbnb(texto) || {}; } catch (e) { base = {}; } }

    const lista = enderecoPorLista(texto);
    const end = lista || endereco(ls);
    return {
      hospede: base.hospede || nome(texto, ls),
      acomp: acompanhantes(texto),
      endereco: base.endereco || end.endereco,
      complemento: base.complemento || end.complemento || complementoSolto(texto),
      datas: base.datas || datas(texto),
      telefone: base.telefone || telefone(texto),
      origem: base.origem || origem(texto),
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { lerPrint, linhas };
  if (typeof window !== "undefined") { window.lerPrint = lerPrint; window.linhasDoPrint = linhas; }
})();
