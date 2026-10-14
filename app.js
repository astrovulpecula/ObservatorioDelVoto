'use strict';
(() => {
  const dataset = window.PULSO_DATA;
  if (!dataset || !Array.isArray(dataset.polls)) {
    document.getElementById('main').innerHTML = '<p class="no-js">No se pudo cargar el archivo de encuestas. Comprueba que existe <code>data/polls.js</code>.</p>';
    return;
  }
  const allPolls = [...dataset.polls].sort((a,b) => b.published.localeCompare(a.published) || b.fieldworkEnd.localeCompare(a.fieldworkEnd) || a.id.localeCompare(b.id));
  const parties = [
    {key:'PP',label:'PP',color:'#1767b2'},
    {key:'PSOE',label:'PSOE',color:'#e0454d'},
    {key:'VOX',label:'Vox',color:'#5c9739'},
    {key:'SUMAR',label:'Sumar',color:'#d64d9b'}
  ];
  const OTHER = {key:'OTROS',label:'Resto',color:'#d8ddd9'};
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1});
  const pct = n => fmt(n) + ' %';
  const fmtDate = iso => iso ? new Date(iso+'T12:00:00Z').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).replace(/\./g,'') : 'No indicado';
  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attr = escapeHTML;
  const mean = nums => nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
  const categories = {organismo:'Organismo público',prensa:'Prensa',tv_radio:'Radio / TV',digital:'Medio digital',informe:'Informe'};
  const state = {mode:'latest',scope:'all',lines:new Set(parties.map(p=>p.key))};

  function latestPerHouse(polls) {
    const map = new Map();
    for (const p of [...polls].sort((a,b)=> b.published.localeCompare(a.published) || b.fieldworkEnd.localeCompare(a.fieldworkEnd))) {
      if (!map.has(p.pollster)) map.set(p.pollster,p);
    }
    return [...map.values()];
  }
  const scoped = arr => state.scope==='private' ? arr.filter(p=>p.category!=='organismo') : arr;
  const inAverage = () => {const arr=scoped(allPolls);return state.mode==='latest' ? latestPerHouse(arr) : arr;};
  const avgVotes = polls => {
    const out={}; for (const party of parties) out[party.key]=mean(polls.map(p=>p.vote[party.key]).filter(Number.isFinite));
    out.OTROS = Math.max(0,100-parties.reduce((sum,p)=>sum+out[p.key],0));
    return out;
  };
  const seatPubs = polls => polls.filter(p => parties.every(k=>Number.isFinite(p.seats?.[k.key])));
  function avgSeats(polls){
    const seatPolls=seatPubs(polls); if(!seatPolls.length)return null;
    const result={}; parties.forEach(p=>{result[p.key]=mean(seatPolls.map(row=>row.seats[p.key]));});
    result.OTROS=Math.max(0,350-parties.reduce((sum,p)=>sum+result[p.key],0));
    return {result,seatPolls};
  }
  function renderStats(active){
    $('navCount').textContent=allPolls.length;
    $('statPolls').textContent=allPolls.length;
    $('statHouses').textContent=new Set(allPolls.map(p=>p.pollster)).size;
    $('statInAverage').textContent=active.length;
    $('statMode').textContent=state.mode==='latest' ? 'Última de cada instituto' : 'Todas con peso igual';
    $('averageSubtitle').textContent = active.length+' mediciones · '+(state.mode==='latest'?'una por instituto':'todas las publicadas')+(state.scope==='private'?' · sin CIS':'');
  }
  function polar(cx,cy,r,a){let theta=a*Math.PI/180;return [cx+r*Math.cos(theta),cy+r*Math.sin(theta)];}
  function arc(cx,cy,r,start,end){let [x1,y1]=polar(cx,cy,r,start),[x2,y2]=polar(cx,cy,r,end); return `M${x1.toFixed(3)} ${y1.toFixed(3)} A${r} ${r} 0 ${end-start>180?1:0} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;}
  function drawGauge(votes){
    const groups=[...parties,OTHER].map(p=>({...p,value:votes[p.key]}));
    const sorted=[...parties].sort((a,b)=>votes[b.key]-votes[a.key]);
    let a=180;
    let arcs=groups.map(p=>{ const length=Math.max(0,180*(p.value/100)); const start=a,end=a+length;a=end;
      return length<.1?'':`<path d="${arc(285,289,206,start+.22,end-.22)}" fill="none" stroke="${p.color}" stroke-width="50" stroke-linecap="butt"><title>${p.label}: ${pct(p.value)}</title></path>`;
    }).join('');
    const top=sorted[0];
    $('gauge').innerHTML=`<svg viewBox="0 0 570 315" role="img" aria-label="Media de intención de voto: ${groups.map(g=>`${g.label} ${pct(g.value)}`).join(', ')}"><path d="${arc(285,289,206,180,360)}" stroke="#ecf0ed" stroke-width="50" fill="none"/>${arcs}<text x="285" y="225" class="gauge-caption" text-anchor="middle">MAYOR PORCENTAJE MEDIO</text><text x="285" y="275" class="big-number" text-anchor="middle">${pct(votes[top.key])}</text><text x="285" y="297" fill="${top.color}" font-size="13" font-weight="780" text-anchor="middle">${top.label.toUpperCase()}</text></svg>`;
    $('gaugeLegend').innerHTML=groups.map(p=>`<div class="legend-item"><i class="legend-swatch" style="background:${p.color}"></i>${p.label} <b>${pct(p.value)}</b></div>`).join('');
    $('voteBars').innerHTML=[...parties].sort((a,b)=>votes[b.key]-votes[a.key]).map(p=>`<div class="vote-bar"><div class="vote-bar-head"><span class="party-name"><i class="party-dot" style="background:${p.color}"></i>${p.label}</span><span class="party-value">${fmt(votes[p.key])}<small> %</small></span></div><div class="bar-track"><div class="bar-fill" style="background:${p.color};width:${votes[p.key]}%"></div></div></div>`).join('');
  }
  function rangeFor(polls,key){
    const min=Math.min(...polls.map(p=>p.seatIntervals?.[key]?.[0] ?? p.seats[key]));
    const max=Math.max(...polls.map(p=>p.seatIntervals?.[key]?.[1] ?? p.seats[key]));
    return {min,max};
  }
  function drawSeats(polls){
    const results=avgSeats(polls);
    if(!results){$('seatComposition').innerHTML='<p>Sin proyecciones de escaños comparables.</p>'; $('seatSummary').innerHTML='';$('seatRanges').innerHTML='';return;}
    const {result:r,seatPolls}=results;
    // Largest remainder assignment avoids accidentally allocating more than 350 after rounding.
    const labels=[...parties,OTHER];const raw=labels.map(p=>({...p,value:r[p.key],whole:Math.floor(r[p.key]),fraction:r[p.key]-Math.floor(r[p.key])}));
    let diff=350-raw.reduce((s,p)=>s+p.whole,0);
    [...raw].sort((a,b)=>b.fraction-a.fraction).slice(0,diff).forEach(p=>p.whole++);
    $('seatComposition').innerHTML=raw.map(p=>`<div class="seat-slice ${p.key==='OTROS'?'s-other':''}" title="${p.label}: ${p.whole} escaños ilustrativos" style="background:${p.color};width:${(p.whole/350*100).toFixed(3)}%">${p.whole>=24?p.whole:''}</div>`).join('');
    $('seatSummary').innerHTML=raw.map(p=>`<div class="seat-mini"><span><i class="party-dot" style="width:7px;height:7px;background:${p.color}"></i>${p.label}</span><strong>${p.whole}</strong></div>`).join('');
    const a=parties.map(p=>({...p,...rangeFor(seatPolls,p.key),avg:r[p.key]}));
    // All four parties share a common 0..180 seat axis.
    $('seatRanges').innerHTML=a.map(p=>`<div class="range-row"><div class="range-label" style="color:${p.color}">${p.label}</div><div class="range-track"><div class="range-band" style="background:${p.color};left:${p.min/180*100}%;width:${(p.max-p.min)/180*100}%"></div><div class="range-dot" style="color:${p.color};background:${p.color};left:${p.avg/180*100}%" title="Media ${fmt(p.avg)} escaños"></div></div><div class="range-value"><strong>${Math.round(p.avg)}</strong> <span>(${Math.floor(p.min)}–${Math.ceil(p.max)})</span></div></div>`).join('')+`<p class="chart-footnote">${seatPolls.length} sondeos con proyección parlamentaria disponible en la selección actual. Rangos publicados; la cifra destacada es su promedio redondeado.</p>`;
  }
  const xyDate = iso => Math.round((new Date(iso+'T12:00:00Z')-new Date('2026-09-01T12:00:00Z'))/86400000);
  function drawTimeline(){
    const allowed=scoped(allPolls);
    const dates=[...new Set(allowed.map(p=>p.published))].sort();
    if (!dates.length){$('timeline').innerHTML='';return;}
    const records=dates.map(day=>{const available=latestPerHouse(allowed.filter(p=>p.published<=day));return {date:day,size:available.length,values:avgVotes(available)};});
    const W=1050,H=300,l=41,r=14,t=11,b=34;
    const x=day=>l+(xyDate(day)/43)*(W-l-r), y=v=>t+(40-v)/40*(H-t-b);
    let lines='';for(let v of [0,10,20,30,40])lines+=`<line class="grid-line" x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l-11}" y="${y(v)+4}" text-anchor="end">${v}%</text>`;
    for(let [day,label] of [['2026-09-01','01 SEP'],['2026-09-15','15 SEP'],['2026-10-01','01 OCT'],['2026-10-14','14 OCT']]){
       lines+=`<text x="${x(day)}" y="${H-7}" text-anchor="${day==='2026-09-01'?'start':day==='2026-10-14'?'end':'middle'}">${label}</text>`;
    }
    const rendered=parties.filter(p=>state.lines.has(p.key)).map(p=>{
      const coords=records.map(rec=>[x(rec.date),y(rec.values[p.key])]);
      const path=coords.map(([xx,yy],i)=>`${i===0?'M':'L'}${xx.toFixed(2)} ${yy.toFixed(2)}`).join(' ');
      const circles=records.map((rec,i)=>`<circle cx="${coords[i][0]}" cy="${coords[i][1]}" r="3.4" fill="${p.color}" stroke="#fff" stroke-width="1"><title>${fmtDate(rec.date)} · ${p.label}: ${pct(rec.values[p.key])} · ${rec.size} institutos</title></circle>`).join('');
      return `<path class="series-line" stroke="${p.color}" d="${path}"/>${circles}`;
    }).join('');
    $('timeline').innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolución de estimaciones medias publicadas por fecha">${lines}${rendered}</svg>`;
  }
  function renderOverview(){const active=inAverage();renderStats(active);drawGauge(avgVotes(active));drawSeats(active);drawTimeline();}

  function modal(p){
    $('dialogContent').innerHTML=`<h2 id="modalTitle">${escapeHTML(p.pollster)}</h2><p class="modal-lead">Publicado por ${escapeHTML(p.publisher)} · ${escapeHTML(categories[p.category]||'Medio')}</p>
    <div class="modal-meta"><div><span>FECHA DE PUBLICACIÓN</span><strong>${fmtDate(p.published)}</strong></div><div><span>TRABAJO DE CAMPO</span><strong>${fmtDate(p.fieldworkStart)} — ${fmtDate(p.fieldworkEnd)}</strong></div><div><span>TAMAÑO DE MUESTRA</span><strong>${p.sample?Number(p.sample).toLocaleString('es-ES'):'No disponible'}</strong></div><div><span>ÁMBITO</span><strong>España · nacional</strong></div></div>
    <div class="modal-rows">${parties.map(k=>`<div class="modal-vote"><span class="party-name"><i class="party-dot" style="background:${k.color}"></i>${k.label}</span><strong>${pct(p.vote[k.key])}${p.seats?.[k.key]!=null?` <small style="color:#85918d;font-size:10px;font-weight:500">· ${fmt(p.seats[k.key])} esc.</small>`:''}</strong></div>`).join('')}</div>
    ${p.note?`<p class="chart-footnote">${escapeHTML(p.note)}</p>`:''}
    <div class="modal-footer"><small>${p.sourceType==='recopilacion'?'Enlace a catálogo o recopilación cuando no hay URL de noticia directa.':p.sourceType==='cobertura'?'Cobertura informativa de la encuesta; no es una ficha primaria.':'Enlace a la publicación de referencia.'}</small><a class="button button-dark" target="_blank" rel="noopener noreferrer" href="${attr(p.sourceUrl)}">Abrir fuente ↗</a></div>`;
    const dialog=$('pollDialog');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }
  function renderArchive(){
    const q=($('archiveSearch').value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const month=$('archiveMonth').value,cat=$('archiveType').value;
    const results=allPolls.filter(p=>(month==='all'||p.published.startsWith(month))&&(cat==='all'||p.category===cat)&&(!q||`${p.pollster} ${p.publisher}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)));
    $('archiveCount').textContent=results.length+' '+(results.length===1?'encuesta':'encuestas');
    $('archiveBody').innerHTML=results.length ? results.map(p=>`<tr>
      <td>${fmtDate(p.published)}</td><td><div class="medium-name">${escapeHTML(p.publisher)} ${p.category==='organismo'?'<span class="org-chip">PÚBLICO</span>':''}</div><div class="pollster-name">${escapeHTML(p.pollster)}</div></td>
      ${parties.map(k=>`<td>${fmt(p.vote[k.key])} %</td>`).join('')}
      <td><button class="small-details" data-detail="${attr(p.id)}">Ficha ↗</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty-message">No hay sondeos que coincidan con esos filtros.</td></tr>';
    $('archiveBody').querySelectorAll('[data-detail]').forEach(el=>el.addEventListener('click',()=>{const poll=allPolls.find(p=>p.id===el.dataset.detail);if(poll)modal(poll);}));
  }
  function initCompare(){
    const options=allPolls.map(p=>`<option value="${attr(p.id)}">${fmtDate(p.published)} · ${escapeHTML(p.publisher)} (${escapeHTML(p.pollster)})</option>`).join('');
    $('compareA').innerHTML=options;$('compareB').innerHTML=options;
    $('compareA').value='cis-1014'; $('compareB').value='40db-1009';
  }
  function renderCompare(){
    const a=allPolls.find(p=>p.id===$('compareA').value)||allPolls[0];
    const b=allPolls.find(p=>p.id===$('compareB').value)||allPolls[1];
    if(!a||!b)return;
    $('compareMetaA').textContent=`${a.pollster} · campo ${fmtDate(a.fieldworkStart)} al ${fmtDate(a.fieldworkEnd)}`;
    $('compareMetaB').textContent=`${b.pollster} · campo ${fmtDate(b.fieldworkStart)} al ${fmtDate(b.fieldworkEnd)}`;
    $('compareRows').innerHTML=parties.map(p=>{
      const av=a.vote[p.key],bv=b.vote[p.key],delta=av-bv;
      return `<div class="compare-row"><div class="party-name"><i class="party-dot" style="background:${p.color}"></i>${p.label}</div><div class="compare-bars"><div class="compare-track"><div class="compare-fill" style="width:${av}%;background:${p.color}"></div></div><div class="compare-track"><div class="compare-fill b" style="width:${bv}%;background:${p.color}"></div></div><div style="font-size:10px;color:#85918d;display:flex;justify-content:space-between"><span>A · ${pct(av)}</span><span>B · ${pct(bv)}</span></div></div><div class="compare-diff" style="color:${Math.abs(delta)<.05?'#687878':p.color}">${delta>0?'+':''}${fmt(delta)}<small>puntos</small></div></div>`;
    }).join('');
    $('comparisonSources').innerHTML=[a,b].map((p,i)=>`<div class="comparison-source"><span>SONDEO ${i?'B':'A'}</span><h3>${escapeHTML(p.publisher)}</h3><p>${escapeHTML(p.pollster)} · ${fmtDate(p.published)} · ${p.sample?Number(p.sample).toLocaleString('es-ES')+' entrevistas':'muestra no disponible'}</p><a href="${attr(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Consultar publicación ↗</a></div>`).join('');
  }
  function csvDownload(){
    const headers=['ID','Fecha publicación','Instituto','Medio','Tipo','Inicio trabajo campo','Fin trabajo campo','Muestra','PP %','PSOE %','Vox %','Sumar %','PP esc.','PSOE esc.','Vox esc.','Sumar esc.','URL de referencia'];
    const records=allPolls.map(p=>[p.id,p.published,p.pollster,p.publisher,categories[p.category],p.fieldworkStart,p.fieldworkEnd,p.sample??'',...parties.map(k=>p.vote[k.key]),...parties.map(k=>p.seats?.[k.key]??''),p.sourceUrl]);
    // CSV is Excel-friendly for Spanish locale (semicolon delimiter and decimal commas).
    const cell=val=>'"'+String(val??'').replace(/"/g,'""')+'"';
    const str='\ufeff'+[headers,...records].map(row=>row.map(v=>cell(typeof v==='number'?String(v).replace('.',','):v)).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([str],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='29N_encuestas_2026-10-14.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  function navigate(){
    let view=(location.hash||'#panorama').slice(1); if(!['panorama','comparador','archivo','metodologia'].includes(view))view='panorama';
    document.querySelectorAll('.page').forEach(el=>{el.classList.toggle('page-active',el.id===view);el.hidden=el.id!==view;});
    document.querySelectorAll('[data-nav]').forEach(a=>{const yes=a.dataset.nav===view;a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.querySelector('.topnav').classList.remove('menu-open');$('menuButton').setAttribute('aria-expanded','false');
    window.scrollTo({top:0,behavior:'instant'});
  }
  function boot(){
    document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
      state.mode=button.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach(b=>{const yes=b.dataset.mode===state.mode;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});renderOverview();
    }));
    $('institutionFilter').addEventListener('change',ev=>{state.scope=ev.target.value;renderOverview();});
    document.querySelectorAll('[data-party]').forEach(b=>b.addEventListener('click',()=>{if(state.lines.has(b.dataset.party)){state.lines.delete(b.dataset.party);b.classList.remove('active');b.setAttribute('aria-pressed','false');}else{state.lines.add(b.dataset.party);b.classList.add('active');b.setAttribute('aria-pressed','true');}drawTimeline();}));
    $('archiveSearch').addEventListener('input',renderArchive);$('archiveMonth').addEventListener('change',renderArchive);$('archiveType').addEventListener('change',renderArchive);$('exportCSV').addEventListener('click',csvDownload);
    initCompare();$('compareA').addEventListener('change',renderCompare);$('compareB').addEventListener('change',renderCompare);
    $('swapCompare').addEventListener('click',()=>{const first=$('compareA').value;$('compareA').value=$('compareB').value;$('compareB').value=first;renderCompare();});
    $('closeDialog').addEventListener('click',()=>$('pollDialog').close());$('pollDialog').addEventListener('click',e=>{if(e.target===$('pollDialog'))$('pollDialog').close();});
    $('menuButton').addEventListener('click',()=>{const nav=document.querySelector('.topnav');nav.classList.toggle('menu-open');$('menuButton').setAttribute('aria-expanded',String(nav.classList.contains('menu-open')));});
    window.addEventListener('hashchange',navigate);
    renderOverview();renderArchive();renderCompare();navigate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
