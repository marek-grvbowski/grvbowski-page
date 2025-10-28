(() => {
  const $ = (id) => document.getElementById(id);
  const fmtMoney = (n) => n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0});

  const DEFAULT_CATALOG = [
    { id: "gpt-4.1", name: "OpenAI GPT-4.1", in: 0.0100, out: 0.0300, tier: "high" },
    { id: "gpt-4o", name: "OpenAI GPT-4o", in: 0.0050, out: 0.0150, tier: "high" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (indicative)", in: 0.0025, out: 0.0100, tier: "high" },
    { id: "gpt-4.1-mini", name: "OpenAI GPT-4.1 mini", in: 0.0015, out: 0.0060, tier: "mid" },
    { id: "claude-3.5-sonnet", name: "Anthropic Claude 3.5 Sonnet", in: 0.0030, out: 0.0150, tier: "mid" },
    { id: "mistral-large", name: "Mistral Large", in: 0.0020, out: 0.0060, tier: "mid" },
    { id: "cohere-command-r+", name: "Cohere Command R+ (indicative)", in: 0.0015, out: 0.0030, tier: "mid" },
    { id: "llama-3.1-70b", name: "Llama 3.1 70B (hosted)", in: 0.0010, out: 0.0020, tier: "mid" },
    { id: "llama-3.1-8b", name: "Llama 3.1 8B (hosted)", in: 0.0003, out: 0.00061, tier: "low" },
    { id: "claude-3.5-haiku", name: "Anthropic Claude 3.5 Haiku (indicative)", in: 0.0008, out: 0.0030, tier: "low" },
    { id: "gpt-j", name: "GPT-J (self-host est.)", in: 0.0002, out: 0.0002, tier: "low" },
  ];

  function loadCatalog(){
    try { const s = localStorage.getItem('frugal_catalog'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_CATALOG.slice();
  }
  function saveCatalog(cat){
    try { localStorage.setItem('frugal_catalog', JSON.stringify(cat)); } catch {}
  }

  let CATALOG = loadCatalog();

  // Tabs
  const tabs = [
    {btn:'tab-about', panel:'panel-about'},
    {btn:'tab-calc',  panel:'panel-calc'},
    {btn:'tab-co2',   panel:'panel-co2'},
    {btn:'tab-models',panel:'panel-models'},
  ];
  tabs.forEach(t => {
    $(t.btn).addEventListener('click', () => {
      tabs.forEach(x => {
        $(x.btn).classList.remove('bg-slate-800','text-white');
        $(x.btn).classList.add('bg-slate-900/60','text-slate-300');
        $(x.panel).classList.add('hidden');
      });
      $(t.btn).classList.add('bg-slate-800','text-white');
      $(t.btn).classList.remove('bg-slate-900/60','text-slate-300');
      $(t.panel).classList.remove('hidden');
    });
  });

  // Fill model selects
  const selSmall = $('sel-small'), selMid = $('sel-mid'), selTop = $('sel-top');
  function fillSelect(select, tier, defId){
    select.innerHTML = '';
    CATALOG.filter(m=>m.tier===tier).forEach(m=>{
      const o = document.createElement('option');
      o.value = m.id; o.textContent = m.name;
      select.appendChild(o);
    });
    if (defId) select.value = defId;
  }

  fillSelect(selSmall, 'low', 'llama-3.1-8b');
  fillSelect(selMid, 'mid', 'mistral-large');
  fillSelect(selTop, 'high', 'gpt-4.1');

  function priceOf(id, key){
    const m = CATALOG.find(x=>x.id===id);
    return m ? m[key] : 0;
  }
  function updatePriceLabels(){
    $('price-small').textContent = `in: $${priceOf(selSmall.value,'in')} / out: $${priceOf(selSmall.value,'out')} per 1k`;
    $('price-mid').textContent   = `in: $${priceOf(selMid.value,'in')} / out: $${priceOf(selMid.value,'out')} per 1k`;
    $('price-top').textContent   = `in: $${priceOf(selTop.value,'in')} / out: $${priceOf(selTop.value,'out')} per 1k`;
  }
  updatePriceLabels();
  selSmall.addEventListener('change', () => { updatePriceLabels(); recalc(); });
  selMid  .addEventListener('change', () => { updatePriceLabels(); recalc(); });
  selTop  .addEventListener('change', () => { updatePriceLabels(); recalc(); });

  // Inputs
  const inpMonthly = $('inp-monthly');
  const inpPrompt = $('inp-prompt');
  const inpCompletion = $('inp-completion');
  const rSmall = $('inp-route-small');
  const rMid = $('inp-route-mid');
  const rTop = $('inp-route-top');
  const routingWarn = $('routing-warn');

  [inpMonthly, inpPrompt, inpCompletion, rSmall, rMid, rTop].forEach(el => el.addEventListener('input', recalc));

  // Breakdown
  const btnBreak = $('btn-breakdown');
  const boxBreak = $('box-breakdown');
  btnBreak.addEventListener('click', () => {
    const vis = boxBreak.classList.contains('hidden');
    if (vis) { boxBreak.classList.remove('hidden'); btnBreak.textContent='Hide'; }
    else { boxBreak.classList.add('hidden'); btnBreak.textContent='Show'; }
  });

  // Charts
  let chartCost, chartStacked, chartPie;
  function initCharts(){
    const ctxCost = $('chart-cost');
    const ctxStack = $('chart-stacked');
    const ctxPie = $('chart-pie');

    chartCost = new Chart(ctxCost, {
      type: 'bar',
      data: { labels: ['Baseline (Top only)', 'Cascade'], datasets: [{ label: '$', data: [0,0], backgroundColor: ['#dc2626','#16a34a'] }] },
      options: { plugins: { legend: { labels: { color: '#f8fafc' } }, tooltip: { callbacks: { label: ctx => fmtMoney(ctx.parsed.y) } } },
                 scales: { x: { ticks: { color: '#f8fafc' } }, y: { ticks: { color: '#f8fafc', callback: v=>fmtMoney(v) } } } }
    });

    chartStacked = new Chart(ctxStack, {
      type: 'bar',
      data: { labels: ['Baseline', 'Cascade'], datasets: [
        { label: 'Small', data: [0,0], backgroundColor: '#16a34a', stack: 'a' },
        { label: 'Mid',   data: [0,0], backgroundColor: '#f59e0b', stack: 'a' },
        { label: 'Top',   data: [0,0], backgroundColor: '#3b82f6', stack: 'a' },
      ]},
      options: { plugins: { legend: { labels: { color: '#f8fafc' } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}` } } },
                 scales: { x: { stacked: true, ticks: { color: '#f8fafc' } }, y: { stacked: true, ticks: { color: '#f8fafc', callback: v=>fmtMoney(v) } } } }
    });

    chartPie = new Chart(ctxPie, {
      type: 'pie',
      data: { labels: ['Small','Mid','Top'], datasets: [{ data: [70,20,10], backgroundColor: ['#16a34a','#f59e0b','#3b82f6'] }] },
      options: { plugins: { legend: { labels: { color: '#f8fafc' } } } }
    });
  }

  function setPie(rSmall, rMid, rTop){
    const data = []; const labels = [];
    if (rSmall>0.0001){ labels.push('Small'); data.push(Math.round(rSmall*100)); }
    if (rMid>0.0001){ labels.push('Mid'); data.push(Math.round(rMid*100)); }
    if (rTop>0.0001){ labels.push('Top'); data.push(Math.round(rTop*100)); }
    chartPie.data.labels = labels;
    chartPie.data.datasets[0].data = data;
    chartPie.update();
  }

  function recalc(){
    const monthly = +inpMonthly.value || 0;
    const pTok = +inpPrompt.value || 0;
    const cTok = +inpCompletion.value || 0;
    const routeS = +rSmall.value || 0;
    const routeM = +rMid.value || 0;
    const routeT = +rTop.value || 0;
    const sum = routeS + routeM + routeT;
    routingWarn.textContent = `Routing sum: ${sum.toFixed(2)}` + (Math.abs(sum-1)>0.001 ? " (should equal 1.00)" : "");
    routingWarn.classList.toggle('text-red-300', Math.abs(sum-1)>0.001);
    routingWarn.classList.toggle('text-green-300', Math.abs(sum-1)<=0.001);

    const topIn = priceOf(selTop.value,'in'), topOut = priceOf(selTop.value,'out');
    const midIn = priceOf(selMid.value,'in'), midOut = priceOf(selMid.value,'out');
    const smallIn = priceOf(selSmall.value,'in'), smallOut = priceOf(selSmall.value,'out');

    const perQueryTop = (pTok/1000)*topIn + (cTok/1000)*topOut;
    const perQueryMid = (pTok/1000)*midIn + (cTok/1000)*midOut;
    const perQuerySmall= (pTok/1000)*smallIn + (cTok/1000)*smallOut;

    const baselineYear = monthly * perQueryTop * 12;
    const cascadePerQ = routeS*perQuerySmall + routeM*perQueryMid + routeT*perQueryTop;
    const cascadeYear = monthly * cascadePerQ * 12;

    $('val-baseline').textContent = fmtMoney(baselineYear);
    $('val-cascade').textContent  = fmtMoney(cascadeYear);
    const saved = Math.max(0, baselineYear - cascadeYear);
    $('val-saved').textContent = fmtMoney(saved);
    $('val-saved-pct').textContent = `= Baseline − Cascade ${ baselineYear>0 ? ((saved/baselineYear)*100).toFixed(1) : 0 }%`;

    // Breakdown box
    $('bk-ppq').textContent = `${pTok} + ${cTok} = ${pTok+cTok}`;
    $('bk-monthly-tokens').textContent = (monthly*(pTok+cTok)).toLocaleString();
    $('bk-prices').textContent = `Small: $${smallIn} in / $${smallOut} out, Mid: $${midIn} / $${midOut}, Top: $${topIn} / $${topOut}`;

    // Charts
    const cheaperFirst = cascadeYear <= baselineYear;
    chartCost.data.datasets[0].backgroundColor = [cheaperFirst ? '#dc2626' : '#16a34a', cheaperFirst ? '#16a34a' : '#dc2626'];
    chartCost.data.datasets[0].data = [baselineYear, cascadeYear];
    chartCost.update();

    const smallYear = monthly * routeS * perQuerySmall * 12;
    const midYear = monthly * routeM * perQueryMid * 12;
    const topYear = monthly * routeT * perQueryTop * 12;
    chartStacked.data.datasets[0].data = [0, smallYear];
    chartStacked.data.datasets[1].data = [0, midYear];
    chartStacked.data.datasets[2].data = [baselineYear, topYear];
    chartStacked.update();

    setPie(routeS, routeM, routeT);
  }

  // MODELS editor
  const grid = $('models-grid');
  function renderModels(){
    grid.innerHTML = '';
    ['low','mid','high'].forEach(tier => {
      const col = document.createElement('div');
      col.className = 'p-4 bg-slate-900/80 rounded-xl border border-slate-700';
      const title = document.createElement('div');
      title.className = 'text-sm uppercase tracking-wide text-slate-200 mb-3';
      title.textContent = tier==='low'?'Small / Low': tier==='mid'?'Mid':'Top / High';
      col.appendChild(title);

      const ul = document.createElement('ul');
      ul.className = 'space-y-3 text-sm';
      CATALOG.filter(m=>m.tier===tier).forEach(m => {
        const li = document.createElement('li');
        li.className = 'space-y-2';
        const name = document.createElement('div');
        name.className = 'text-slate-100 font-medium'; name.textContent = m.name;
        const grid2 = document.createElement('div'); grid2.className = 'grid grid-cols-2 gap-2';
        const d1 = document.createElement('div'); const d2 = document.createElement('div');
        const l1 = document.createElement('div'); l1.className='text-slate-200 text-xs mb-1'; l1.textContent='In $/1k';
        const l2 = document.createElement('div'); l2.className='text-slate-200 text-xs mb-1'; l2.textContent='Out $/1k';
        const i1 = document.createElement('input'); i1.type='number'; i1.step='0.0001'; i1.value = m.in;
        i1.className='w-full bg-slate-800 text-slate-100 border border-slate-600 rounded px-2 py-1';
        i1.addEventListener('input', () => { const v=parseFloat(i1.value); if(Number.isFinite(v)){ m.in=v; saveCatalog(CATALOG); updatePriceLabels(); recalc(); } });
        const i2 = document.createElement('input'); i2.type='number'; i2.step='0.0001'; i2.value = m.out;
        i2.className='w-full bg-slate-800 text-slate-100 border border-slate-600 rounded px-2 py-1';
        i2.addEventListener('input', () => { const v=parseFloat(i2.value); if(Number.isFinite(v)){ m.out=v; saveCatalog(CATALOG); updatePriceLabels(); recalc(); } });

        d1.appendChild(l1); d1.appendChild(i1);
        d2.appendChild(l2); d2.appendChild(i2);
        grid2.appendChild(d1); grid2.appendChild(d2);
        li.appendChild(name); li.appendChild(grid2);
        ul.appendChild(li);
      });
      col.appendChild(ul);
      grid.appendChild(col);
    });
  }

  $('btn-reset').addEventListener('click', ()=>{ CATALOG = DEFAULT_CATALOG.slice(); saveCatalog(CATALOG); renderModels(); updatePriceLabels(); recalc(); });
  $('btn-clear').addEventListener('click', ()=>{ try{ localStorage.removeItem('frugal_catalog'); }catch{}; location.reload(); });

  // CO2
  const co2Small=$('co2-small'), co2Mid=$('co2-mid'), co2Top=$('co2-top'), co2Grid=$('co2-grid');
  function recalcCO2(){
    const monthly = +inpMonthly.value || 0;
    const pTok = +inpPrompt.value || 0;
    const cTok = +inpCompletion.value || 0;
    const routeS = +rSmall.value || 0;
    const routeM = +rMid.value || 0;
    const routeT = +rTop.value || 0;
    const tokensPerQuery = pTok + cTok;
    const monthlyTokens = monthly * tokensPerQuery;

    const kSmall = +co2Small.value || 0;
    const kMid = +co2Mid.value || 0;
    const kTop = +co2Top.value || 0;
    const grid = +co2Grid.value || 0;

    const baselineMonthlyKwh = (monthlyTokens/1_000_000) * kTop;
    const cascadeMonthlyKwh = (monthlyTokens/1_000_000) * (routeS*kSmall + routeM*kMid + routeT*kTop);
    const baselineYearlyCO2 = baselineMonthlyKwh * grid * 12;
    const cascadeYearlyCO2 = cascadeMonthlyKwh * grid * 12;
    const saved = Math.max(0, baselineYearlyCO2 - cascadeYearlyCO2);

    $('co2-baseline').textContent = Math.round(baselineYearlyCO2).toLocaleString() + ' kg';
    $('co2-cascade').textContent = Math.round(cascadeYearlyCO2).toLocaleString() + ' kg';
    $('co2-saved').textContent = Math.round(saved).toLocaleString() + ' kg';
  }
  [co2Small,co2Mid,co2Top,co2Grid].forEach(el=>el.addEventListener('input', recalcCO2));

  // init
  renderModels();
  initCharts();
  recalc();
  recalcCO2();
})();