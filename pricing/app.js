// RioHosting-Pricing · dashboard. Os dados vêm de dados.js, gerado pelo robô a cada rodada.
// ?final = mostra tudo já pronto, sem animação (para tirar a foto)
const FINAL = location.search.includes("final");
if (FINAL) { document.head.insertAdjacentHTML("beforeend", "<style>*{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}</style>"); window.setTimeout = f => f(); }
// Texto vindo do Airbnb é sempre tratado como texto (nunca como código da página)
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const linkAirbnb = u => /^https:\/\/www\.airbnb\.com(\.br)?\/rooms\/\d+$/.test(u) ? u : "#";
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function resumo(ap) {
  const livres = ap.noites.filter(n => n.p && n.m);
  const media = k => livres.length ? Math.round(livres.reduce((s, n) => s + n[k], 0) / livres.length) : null;
  const seu = media("p"), mercado = media("m"), diaria = media("dl");
  const reservadas = ap.noites.filter(n => n.s === "reservado").length;
  const cont = s => ap.noites.filter(n => n.s === s).length;
  return { ...ap, seu, mercado, diaria, pct: seu && mercado ? seu / mercado - 1 : null,
    ocup: ap.noites.length ? reservadas / ap.noites.length : 0, reservadas, acima: cont("ACIMA"), abaixo: cont("ABAIXO"), namedia: cont("NA MÉDIA"),
    curto: ap.nome.replace(/^#RioLifeStyle \| /, "").split(/ [|—] /)[0].slice(0, 30) };
}
// O período escolhido (botões no topo) vale para os números, os cartões e o gráfico
const HOJE = new Date();
let APTOS = [], KPI = {};
function calcular(periodo) {
  APTOS = DADOS.aptos.map(a => resumo({ ...a, noites: a.noites.filter(n => noPeriodo(n.d, periodo, HOJE)) }));
  const total = APTOS.reduce((s, a) => s + a.noites.length, 0);
  KPI = {
    aptos: APTOS.length,
    ocup: total ? Math.round(100 * APTOS.reduce((s, a) => s + a.reservadas, 0) / total) : null,  // sem noites: "—"
    acima: APTOS.filter(a => a.pct !== null && a.pct > 0.2).length,
    abaixo: APTOS.filter(a => a.pct !== null && a.pct < -0.2).length,
  };
}
const reais = v => v === null ? "—" : "R$ " + v.toLocaleString("pt-BR");
const pctTxt = v => v === null ? "lotado" : (v > 0 ? "+" : "") + Math.round(v * 100) + "%";
function dataCurta(iso) { const [a, m, d] = iso.split("-"); const dia = new Date(+a, m - 1, +d); return { dm: d + "/" + m, sem: DIAS[dia.getDay()] }; }

function contar(el, alvo, sufixo = "", ms = 1200) {
  if (alvo === null) { el.textContent = "—"; return; }
  if (FINAL) { el.textContent = alvo + sufixo; return; }
  const t0 = performance.now();
  (function passo(t) { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(alvo * e) + sufixo; if (k < 1) requestAnimationFrame(passo); })(t0);
}

// Gráfico de linhas: seu preço × média, desenhado da esquerda para a direita
function grafico(svg, ap, cores, aoClicar, escolhido) {
  const W = 760, H = 260, m = { l: 64, r: 16, t: 16, b: 34 };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg", el = (t, a) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
  const vals = ap.noites.flatMap(n => [n.p, n.m]).filter(Boolean);
  const max = Math.max(...vals, 100) * 1.1, n = Math.max(ap.noites.length, 2);
  const x = i => m.l + i * (W - m.l - m.r) / (n - 1), y = v => H - m.b - v / max * (H - m.t - m.b);
  const passo = (W - m.l - m.r) / (n - 1);
  ap.noites.forEach((nt, i) => { if (nt.s === "reservado") { const x0 = Math.max(m.l, x(i) - passo / 2), x1 = Math.min(W - m.r, x(i) + passo / 2);
    el("rect", { x: x0, y: m.t, width: x1 - x0, height: H - m.t - m.b, fill: cores.reservado }); } });
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: cores.grade, "stroke-width": 1 });
    el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: cores.eixo }).textContent = "R$ " + Math.round(v).toLocaleString("pt-BR"); }
  ap.noites.forEach((nt, i) => {
    if (i % Math.max(1, Math.ceil(n / 14)) === 0) { const d = dataCurta(nt.d); el("text", { x: x(i), y: H - 12, "text-anchor": "middle", "font-size": 10.5, fill: cores.eixo }).textContent = d.dm; }
  });
  const linha = (k, cor, larg) => {
    let d = "", pen = false;
    ap.noites.forEach((nt, i) => { if (nt[k]) { d += (pen ? "L" : "M") + x(i) + " " + y(nt[k]) + " "; pen = true; } else pen = false; });
    const p = el("path", { d, fill: "none", stroke: cor, "stroke-width": larg, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const L = p.getTotalLength ? p.getTotalLength() : 1000;
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect();
    if (FINAL) p.style.strokeDashoffset = 0; else { p.style.transition = "stroke-dashoffset 1.4s ease-out"; requestAnimationFrame(() => p.style.strokeDashoffset = 0); }
    ap.noites.forEach((nt, i) => { if (nt[k]) { const c = el("circle", { cx: x(i), cy: y(nt[k]), r: 3.5, fill: cor }); if (!FINAL) { c.style.opacity = 0; c.style.transition = `opacity .3s ${0.1 * i}s`; requestAnimationFrame(() => c.style.opacity = 1); } } });
  };
  if (escolhido !== undefined) el("line", { x1: x(escolhido), x2: x(escolhido), y1: m.t, y2: H - m.b, stroke: cores.seu, "stroke-width": 1.5, "stroke-dasharray": "4 4" });
  linha("m", cores.media, 2.5); linha("p", cores.seu, 3);
  if (aoClicar) ap.noites.forEach((nt, i) => {  // área clicável de cada dia
    const r = el("rect", { x: x(i) - passo / 2, y: m.t, width: passo, height: H - m.t, fill: "transparent", style: "cursor:pointer" });
    r.addEventListener("click", () => aoClicar(i));
  });
}
const reais2 = v => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- página ----
document.getElementById("quando").textContent = DADOS.atualizado;
const cor = s => ({ACIMA:"var(--acima)",ABAIXO:"var(--abaixo)","NA MÉDIA":"var(--media)",reservado:"var(--res)"})[s] || "#F3F8F7";
const cards = document.getElementById("cards");
function desenharPainel() {
  [["k1",KPI.aptos,""],["k2",KPI.ocup,"%"],["k3",KPI.acima,""],["k4",KPI.abaixo,""]].forEach(([id,v,s])=>contar(document.getElementById(id),v,s));
  cards.innerHTML = "";
  APTOS.slice().sort((a,b)=>(b.pct??-9)-(a.pct??-9)).forEach((a,i)=>{
    const c = document.createElement("div"); c.className="card"; c.style.animationDelay=(.08*i)+"s";
    const tom = a.pct===null?"var(--suave)":a.pct>.2?"var(--acima)":a.pct<-.2?"var(--abaixo)":"var(--verde)";
    const vazio = !a.noites.length ? "sem noites analisadas neste período" : "sem noites livres para comparar";
    c.innerHTML=`<h3>${esc(a.nome)}</h3><div class="precos"><div>Seu<b>${reais(a.seu)}</b></div><div style="text-align:right">Média<b>${reais(a.mercado)}</b></div></div>${a.diaria?`<div class="mini">Diária ${reais(a.diaria)} sem limpeza</div>`:""}
     <div class="barra"><i style="background:${tom}"></i></div><span class="tag" style="color:${tom}">${a.pct===null?vazio:pctTxt(a.pct)+" vs. mercado"}</span>
     <div class="faixa">${a.noites.map((n,j)=>`<i title="${n.d} · ${esc(n.s)}${n.pouco?" · poucos dados":""}" class="${n.pouco?"pouco":""}" style="background:${cor(n.s)};animation-delay:${.6+.08*i+.03*j}s"></i>`).join("")}</div>`;
    c.onclick=()=>escolher(a,c); cards.appendChild(c);
    setTimeout(()=>c.querySelector(".barra i").style.width=(a.pct===null?100:Math.min(100,50+a.pct*40))+"%",300+80*i);
  });
  if (cards.children.length) { const ord=APTOS.slice().sort((a,b)=>(b.pct??-9)-(a.pct??-9)); escolher(ord[0],cards.children[0]); }
  else cards.innerHTML="<p>Ainda não há noites analisadas. Rode o robô.</p>";
}
let atual=null;
function escolher(a,c){document.querySelectorAll(".card").forEach(x=>x.classList.remove("ativo"));c.classList.add("ativo");atual=a;
  document.getElementById("titulo").textContent="Dia a dia · "+a.nome;
  listaDoApto(a);
  if(!a.noites.length){document.getElementById("graf").innerHTML="";document.getElementById("detalhe").innerHTML='<p class="comp">Sem noites analisadas neste período. Escolha outro período no topo.</p>';return;}
  const livre=a.noites.findIndex(n=>n.p);verDia(livre<0?0:livre);}
const tirou = (a, id) => (DADOS.tirados?.[a.id] || []).includes(id);
const seloRes = r => r ? '<span class="selo pf">'+(r==="hospedes"?"cabe mais gente":"sem nota")+'</span>' : "";
const selos = an => (an.sh?'<span class="selo sh">Superhost</span>':'')+(an.pf?'<span class="selo pf">Preferido dos hóspedes</span>':'');
const notaTxt = an => an.nota?'★ '+an.nota.toLocaleString("pt-BR")+' <small style="color:var(--suave)">('+an.av+')</small>':'—';
// Bloco "Concorrentes deste apartamento": quem entrou na conta nas noites do período
function listaDoApto(a){
  const box=document.getElementById("listaApto"); if(!box) return;
  const lista=concorrentesDoApto(a.noites, DADOS.anuncios||{});
  box.querySelector("summary").textContent=`Concorrentes deste apartamento (${lista.length})`;
  box.querySelector("div").innerHTML=lista.length?`<table class="c"><tr><th>Concorrente</th><th>Nota</th><th class="n">Distância</th><th class="n">Apareceu em</th></tr>
    ${lista.map(c=>{const t=tirou(a,c.id);return `<tr class="${t?"tirado":""}"><td><a href="${linkAirbnb(c.url)}" target="_blank" rel="noopener">${esc(c.nome)}</a><br>${selos(c)}${t?'<span class="selo fora">você tirou</span>':''}</td><td>${notaTxt(c)}</td><td class="n">${c.dist} m</td><td class="n">${c.noites} noite${c.noites>1?"s":""}</td></tr>`}).join("")}</table>
    <div class="dica">Para tirar alguém da conta, marque "Não" na coluna "Usar?" da aba "Meus concorrentes" da planilha e clique em "Recalcular com minhas escolhas" no robô.</div>`
    :'<p class="comp">Ainda sem concorrentes neste período.</p>';
}
function verDia(i){const a=atual,n=a.noites[i],d=dataCurta(n.d);
  grafico(document.getElementById("graf"),a,{grade:"#E6ECEB",eixo:"#4F6662",reservado:"#F3F8F7",seu:"#149C8B",media:"#F2B33D"},verDia,i);
  const corS={ACIMA:["#FBE8E3","#A8432E"],ABAIXO:["#E3F4F1","#0B7266"],"NA MÉDIA":["#EEF3F2","#4F6662"]}[n.s]||["#eee","#888"];
  const box=document.getElementById("detalhe");
  if(!n.p||!n.m){box.innerHTML=`<div class="detalhe" style="display:block"><h3>${d.sem}, ${d.dm}<span class="chip" style="background:${corS[0]};color:${corS[1]}">${esc(n.s)}</span></h3><p class="comp">Sem comparação nesta noite.${n.p?` Seu preço: <b>${reais2(n.p)}</b> por noite com limpeza.`:""}</p></div>`;return;}
  const N=n.en||DADOS.noites,mediaTot=n.mx*N,pct=Math.round((n.p/n.m-1)*100);
  box.innerHTML=`<div class="detalhe"><div>
    <h3>${d.sem}, ${d.dm}<span class="chip" style="background:${corS[0]};color:${corS[1]}">${esc(n.s)}</span>${n.pouco?`<span class="chip pouco">poucos dados</span>`:""}</h3>
    <div class="dica">Estadia de ${N} noites a partir deste dia, ${DADOS.hospedes} hóspedes</div>
    <div class="conta"><div><span>${N} diárias de ${reais2(n.dlx)}</span><span>${reais2(n.diarias)}</span></div>
      <div><span>+ taxa de limpeza</span><span>${reais2(n.lp)}</span></div>
      <div class="tot"><span>Total pago pelo hóspede</span><span>${reais2(n.total)}</span></div>
      <small>= ${reais2(n.total/N)} por noite com limpeza</small></div>
    <div class="comp">Média dos ${n.n} concorrentes parecidos: <b>${reais2(n.mx)}</b> por noite (<b>${reais2(Math.round(mediaTot))}</b> na estadia, já com a limpeza deles).<br>Você está <b style="color:${corS[1]}">${pct>0?"+":""}${pct}%</b> em relação à média.${n.pouco?`<br><b>Poucos dados:</b> só ${n.n} concorrente${n.n>1?"s":""} na conta. Use esta cor com cuidado.`:""}${n.completo?"":`<br><small>Rodada antiga: a lista ao lado mostra só os 5 principais. A lista completa vem nas próximas rodadas.</small>`}
      ${n.md?`<div class="stats"><span>Média <b>${reais2(n.mx)}</b></span><span>Mediana <b>${reais2(n.md)}</b></span><span>Menor <b>${reais2(n.mn)}</b></span><span>Maior <b>${reais2(n.mxp)}</b></span><span><b>${n.n}</b> concorrentes na conta</span></div>`:""}</div></div>
    <div><table class="c"><tr><th>Concorrente</th><th>Nota</th><th class="n">Distância</th><th class="n">Por noite</th><th class="n">Total ${N} noites</th></tr>
    ${n.conc.slice().sort((x,y)=>x.noite-y.noite).map(c=>{const an=(DADOS.anuncios||{})[c.id]||{},t=tirou(a,c.id),na=n.completo&&c.res===null&&!c.fora&&!t;
      return `<tr class="${t?"tirado":""}"><td><a href="${linkAirbnb(an.url)}" target="_blank" rel="noopener">${esc(an.nome)}</a><br>${na?'<span class="selo media">na média</span>':''}${selos(an)}${seloRes(c.res)}${t?'<span class="selo fora">você tirou</span>':''}</td>
      <td>${notaTxt(an)}</td><td class="n">${c.dist} m</td><td class="n">${reais2(c.noite)}</td><td class="n">${reais2(Math.round(c.noite*N))}</td></tr>`}).join("")}
    </table><div class="dica">O Airbnb mostra só o total dos concorrentes: não dá para separar a limpeza deles.</div></div></div>`;}

// ---- filtro de período (lembra a escolha neste navegador) ----
(function () {
  const barra = document.getElementById("filtro");
  const opcoes = opcoesDePeriodo(DADOS.aptos.flatMap(a => a.noites.map(n => n.d)));
  let escolhido = "30";
  try { const salvo = localStorage.getItem("rh-periodo"); if (opcoes.some(o => o[0] === salvo)) escolhido = salvo; } catch (e) {}
  barra.insertAdjacentHTML("beforeend", opcoes.map(([v, t]) => `<button data-p="${v}">${t}</button>`).join(""));
  const aplicar = p => {
    escolhido = p; barra.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.p === p));
    try { localStorage.setItem("rh-periodo", p); } catch (e) {}
    calcular(p); desenharPainel();
  };
  barra.querySelectorAll("button").forEach(b => b.onclick = () => aplicar(b.dataset.p));
  aplicar(escolhido);
})();

// ---- calendário: um apartamento (lista) e um mês por vez, do mês atual até dezembro do ano que vem ----
(function () {
  const sec = document.getElementById("calendario"), selApto = document.getElementById("calApto");
  const selMes = document.getElementById("calMes"), grade = document.getElementById("calGrade");
  const ant = document.getElementById("mesAnt"), prox = document.getElementById("mesProx");
  const det = document.getElementById("detalhe"), painelDia = document.querySelector("main > .painel:not(#calendario)");
  const ordem = DADOS.aptos.map(resumo).sort((a, b) => (b.pct ?? -9) - (a.pct ?? -9));  // calendário: todas as noites
  const meses = mesesDoCalendario(new Date());
  const classe = { ACIMA: "st-acima", ABAIXO: "st-abaixo", "NA MÉDIA": "st-media", reservado: "st-reservado" };
  let doPainel = null;  // apartamento aberto no "Dia a dia" antes de abrir o calendário
  if (!ordem.length) { document.getElementById("abrirCal").hidden = true; return; }
  selApto.innerHTML = ordem.map((a, i) => `<option value="${i}">${esc(a.nome)}</option>`).join("");
  selMes.innerHTML = meses.map((m, i) => `<option value="${i}">${nomeDoMes(m)}</option>`).join("");

  function desenhar() {
    const ap = ordem[+selApto.value], mi = +selMes.value;
    ant.disabled = mi === 0; prox.disabled = mi === meses.length - 1;
    grade.innerHTML = SEMANA_CAL.map(s => `<div class="ds">${s}</div>`).join("") + gradeDoMes(meses[mi], ap.noites).map(c => {
      if (!c) return `<div class="dia vazio"></div>`;
      if (c.i === null) return `<div class="dia"><div class="n">${c.dia}</div></div>`;
      const n = ap.noites[c.i], st = classe[n.s] || "";
      const precos = n.p ? `<div class="l x"><span>Média</span><b>${reais(n.m)}</b></div><div class="l"><span>Seu</span><b><i class="rs">R$ </i>${n.p.toLocaleString("pt-BR")}</b></div><div class="l x"><span>Diária</span><b>${reais(n.dl)}</b></div>` : "";
      return `<div class="dia tem ${st}${n.pouco ? " pouco" : ""}" data-i="${c.i}"><div class="n">${c.dia}<em>${esc(n.s)}${n.pouco ? "*" : ""}</em></div>${precos}</div>`;
    }).join("");
    grade.querySelectorAll(".dia.tem").forEach(el => el.onclick = () => escolherDia(ap, el));
    const primeiro = grade.querySelector(".dia.tem:not(.st-reservado)") || grade.querySelector(".dia.tem");
    if (primeiro) escolherDia(ap, primeiro); else det.innerHTML = "";
  }
  function escolherDia(ap, el) {
    grade.querySelectorAll(".dia.ativo").forEach(x => x.classList.remove("ativo"));
    el.classList.add("ativo"); atual = ap; verDia(+el.dataset.i);
  }
  function abrir(sim) {
    [...document.querySelector("main").children].forEach(x => { if (x !== sec) x.hidden = sim; });
    sec.hidden = !sim; document.getElementById("abrirCal").hidden = sim;
    if (sim) { doPainel = atual; sec.appendChild(det); desenhar(); }
    else { painelDia.appendChild(det); atual = doPainel; if (atual) { const i = atual.noites.findIndex(n => n.p); verDia(i < 0 ? 0 : i); } }
    window.scrollTo(0, 0);
  }
  document.getElementById("abrirCal").onclick = () => abrir(true);
  document.getElementById("voltar").onclick = () => abrir(false);
  selApto.onchange = selMes.onchange = desenhar;
  ant.onclick = () => { selMes.value = Math.max(0, +selMes.value - 1); desenhar(); };
  prox.onclick = () => { selMes.value = Math.min(meses.length - 1, +selMes.value + 1); desenhar(); };
  if (location.search.includes("calendario")) {  // para tirar a foto: ?calendario&mes=1&apto=0
    const p = new URLSearchParams(location.search);
    selMes.value = p.get("mes") || 0; selApto.value = p.get("apto") || 0; abrir(true);
  }
})();
