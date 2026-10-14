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
  const coalitionSelectedKeys = new Set();
  let currentCoalitionSeats = null;

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
    if(!results){$('seatComposition').innerHTML='<p>Sin proyecciones de escaños comparables.</p>'; $('seatSummary').innerHTML='';$('seatRanges').innerHTML='';renderCoalition(null);return;}
    const {result:r,seatPolls}=results;
    // Largest remainder assignment avoids accidentally allocating more than 350 after rounding.
    const labels=[...parties,OTHER];const raw=labels.map(p=>({...p,value:r[p.key],whole:Math.floor(r[p.key]),fraction:r[p.key]-Math.floor(r[p.key])}));
    let diff=350-raw.reduce((s,p)=>s+p.whole,0);
    [...raw].sort((a,b)=>b.fraction-a.fraction).slice(0,diff).forEach(p=>p.whole++);
    $('seatComposition').innerHTML=raw.map(p=>`<div class="seat-slice ${p.key==='OTROS'?'s-other':''}" title="${p.label}: ${p.whole} escaños ilustrativos" style="background:${p.color};width:${(p.whole/350*100).toFixed(3)}%">${p.whole>=24?p.whole:''}</div>`).join('');
    $('seatSummary').innerHTML=raw.map(p=>`<div class="seat-mini"><span><i class="party-dot" style="width:7px;height:7px;background:${p.color}"></i>${p.label}</span><strong>${p.whole}</strong></div>`).join('');
    renderCoalition(raw);
    const a=parties.map(p=>({...p,...rangeFor(seatPolls,p.key),avg:r[p.key]}));
    // All four parties share a common 0..180 seat axis.
    $('seatRanges').innerHTML=a.map(p=>`<div class="range-row"><div class="range-label" style="color:${p.color}">${p.label}</div><div class="range-track"><div class="range-band" style="background:${p.color};left:${p.min/180*100}%;width:${(p.max-p.min)/180*100}%"></div><div class="range-dot" style="color:${p.color};background:${p.color};left:${p.avg/180*100}%" title="Media ${fmt(p.avg)} escaños"></div></div><div class="range-value"><strong>${Math.round(p.avg)}</strong> <span>(${Math.floor(p.min)}–${Math.ceil(p.max)})</span></div></div>`).join('')+`<p class="chart-footnote">${seatPolls.length} sondeos con proyección parlamentaria disponible en la selección actual. Rangos publicados; la cifra destacada es su promedio redondeado.</p>`;
  }
  function renderCoalition(seats){
    currentCoalitionSeats = seats;
    const choices=$('coalitionChoices'), tags=$('coalitionSelected'), meter=$('coalitionMeterSegments'), output=$('coalitionResult');
    if(!seats){
      choices.innerHTML='<p class="coalition-empty">Sin proyecciones de escaños disponibles.</p>';
      tags.innerHTML='<p class="coalition-placeholder">No hay escaños comparables para esta selección.</p>';
      meter.innerHTML='';output.textContent='';$('coalitionClear').disabled=true;return;
    }
    const seatByKey=Object.fromEntries(seats.map(p=>[p.key,p.whole]));
    choices.innerHTML=parties.map(p=>`<button type="button" class="coalition-choice ${coalitionSelectedKeys.has(p.key)?'is-selected':''}" draggable="true" data-coalition-add="${p.key}" aria-pressed="${coalitionSelectedKeys.has(p.key)}" title="Arrastrar o pulsar para ${coalitionSelectedKeys.has(p.key)?'quitar':'añadir'} ${p.label}"><span class="coalition-party"><i class="party-dot" style="background:${p.color}"></i>${p.label}</span><strong>${seatByKey[p.key]} <small>esc.</small></strong><span class="choice-symbol">${coalitionSelectedKeys.has(p.key)?'✓':'+'}</span></button>`).join('');
    const selected=parties.filter(p=>coalitionSelectedKeys.has(p.key));
    const total=selected.reduce((n,p)=>n+seatByKey[p.key],0);
    tags.innerHTML=selected.length?selected.map(p=>`<button type="button" class="coalition-tag" data-coalition-remove="${p.key}" title="Quitar ${p.label}" aria-label="Quitar ${p.label} de la combinación"><i class="party-dot" style="background:${p.color}"></i>${p.label} · ${seatByKey[p.key]} <span aria-hidden="true">×</span></button>`).join(''):'<p class="coalition-placeholder">Arrastra aquí los partidos o selecciónalos a la izquierda.</p>';
    meter.innerHTML=selected.map(p=>`<div class="coalition-meter-piece" style="background:${p.color};width:${(seatByKey[p.key]/350*100).toFixed(4)}%" title="${p.label}: ${seatByKey[p.key]} escaños"></div>`).join('');
    const diff=176-total;
    const status=total>=176?(total===176?'Alcanza exactamente la mayoría absoluta':`Supera la mayoría absoluta por ${-diff} escaños`):`Faltan ${diff} escaños para la mayoría absoluta`;
    output.innerHTML=`<div><strong>${total}<span> / 350</span></strong><small>${selected.length} ${selected.length===1?'partido seleccionado':'partidos seleccionados'}</small></div><p class="${total>=176?'coalition-success':''}">${escapeHTML(status)}</p>`;
    $('coalitionClear').disabled=!selected.length;
    $('coalitionDrop').classList.toggle('is-filled',selected.length>0);
  }
  function initCoalition(){
    $('coalitionChoices').addEventListener('click',e=>{
      const btn=e.target.closest('[data-coalition-add]');if(!btn||!currentCoalitionSeats)return;
      const key=btn.dataset.coalitionAdd;
      if(coalitionSelectedKeys.has(key))coalitionSelectedKeys.delete(key);else coalitionSelectedKeys.add(key);
      renderCoalition(currentCoalitionSeats);
    });
    $('coalitionSelected').addEventListener('click',e=>{
      const btn=e.target.closest('[data-coalition-remove]');if(!btn)return;
      coalitionSelectedKeys.delete(btn.dataset.coalitionRemove);renderCoalition(currentCoalitionSeats);
    });
    $('coalitionChoices').addEventListener('dragstart',e=>{
      const btn=e.target.closest('[data-coalition-add]');if(!btn||!currentCoalitionSeats){e.preventDefault();return;}
      e.dataTransfer.setData('text/plain',btn.dataset.coalitionAdd);
      e.dataTransfer.effectAllowed='copy';
    });
    const drop=$('coalitionDrop');
    drop.addEventListener('dragover',e=>{if(!currentCoalitionSeats)return;e.preventDefault();e.dataTransfer.dropEffect='copy';drop.classList.add('drag-over');});
    drop.addEventListener('dragleave',e=>{if(!drop.contains(e.relatedTarget))drop.classList.remove('drag-over');});
    drop.addEventListener('drop',e=>{
      e.preventDefault();drop.classList.remove('drag-over');
      const key=e.dataTransfer.getData('text/plain');
      if(currentCoalitionSeats&&parties.some(p=>p.key===key)){coalitionSelectedKeys.add(key);renderCoalition(currentCoalitionSeats);}
    });
    $('coalitionClear').addEventListener('click',()=>{coalitionSelectedKeys.clear();renderCoalition(currentCoalitionSeats);});
  }

  const xyDate = iso => Math.round((new Date(iso+'T12:00:00Z')-new Date('2026-09-01T12:00:00Z'))/86400000);
  function drawTimeline(){
    const allowed=scoped(allPolls);
    const dates=[...new Set(allowed.map(p=>p.published))].sort();
    if (!dates.length){$('timeline').innerHTML='';return;}
    const records=dates.map(day=>{const available=latestPerHouse(allowed.filter(p=>p.published<=day));return {date:day,size:available.length,values:avgVotes(available)};});
    const W=1050,H=300,l=41,r=14,t=11,b=34;
    const endDate=dates[dates.length-1];
    const spanDays=Math.max(1,xyDate(endDate));
    const x=day=>l+(xyDate(day)/spanDays)*(W-l-r), y=v=>t+(40-v)/40*(H-t-b);
    let lines='';for(let v of [0,10,20,30,40])lines+=`<line class="grid-line" x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l-11}" y="${y(v)+4}" text-anchor="end">${v}%</text>`;
    const monthStarts=['2026-09-01','2026-10-01','2026-11-01'].filter(d=>d<=endDate);
    const ticks=[monthStarts[0]];
    if(endDate<='2026-10-15'&&endDate>='2026-09-15')ticks.push('2026-09-15');
    ticks.push(...monthStarts.slice(1));
    if(!ticks.includes(endDate))ticks.push(endDate);
    const tickFormat=day=>new Date(day+'T12:00:00Z').toLocaleDateString('es-ES',{day:'2-digit',month:'short',timeZone:'UTC'}).replace(/\./g,'').toUpperCase();
    for(const [i,day] of ticks.entries()){
       if(i>0&&i<ticks.length-1&&xyDate(ticks[i+1])-xyDate(day)<8)continue;
       lines+=`<text x="${x(day)}" y="${H-7}" text-anchor="${i===0?'start':i===ticks.length-1?'end':'middle'}">${tickFormat(day)}</text>`;
    }
    const rendered=parties.filter(p=>state.lines.has(p.key)).map(p=>{
      const coords=records.map(rec=>[x(rec.date),y(rec.values[p.key])]);
      const path=coords.map(([xx,yy],i)=>`${i===0?'M':'L'}${xx.toFixed(2)} ${yy.toFixed(2)}`).join(' ');
      const circles=records.map((rec,i)=>`<circle cx="${coords[i][0]}" cy="${coords[i][1]}" r="3.4" fill="${p.color}" stroke="#fff" stroke-width="1"><title>${fmtDate(rec.date)} · ${p.label}: ${pct(rec.values[p.key])} · ${rec.size} institutos</title></circle>`).join('');
      return `<path class="series-line" stroke="${p.color}" d="${path}"/>${circles}`;
    }).join('');
    $('timeline').innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolución de estimaciones medias publicadas por fecha">${lines}${rendered}</svg>`;
  }
  function renderUpdates(){
    const byInsertion=[...allPolls].sort((a,b)=>(b.addedAt||b.published).localeCompare(a.addedAt||a.published) || b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
    const recent=byInsertion.slice(0,6);
    $('latestCut').textContent=`CORTE · ${fmtDate(dataset.metadata.lastUpdated).toUpperCase()}`;
    $('latestUpdates').innerHTML=recent.length?recent.map(p=>`<article class="update-entry">
      <div class="update-entry-date"><time datetime="${attr(p.published)}">${fmtDate(p.published)}</time><span>PUBLICACIÓN</span></div>
      <div class="update-entry-main"><strong>${escapeHTML(p.publisher)}</strong><small>${escapeHTML(p.pollster)}${p.addedAt?' · Incorporada '+fmtDate(p.addedAt):''}</small></div>
      <button class="update-detail" type="button" data-latest-detail="${attr(p.id)}" aria-label="Ver ficha de ${attr(p.pollster)} publicada el ${fmtDate(p.published)}">Ver sondeo ↗</button>
    </article>`).join(''):'<p class="coalition-empty">Aún no hay sondeos registrados.</p>';
    $('latestUpdates').querySelectorAll('[data-latest-detail]').forEach(el=>el.addEventListener('click',()=>{const p=allPolls.find(row=>row.id===el.dataset.latestDetail);if(p)modal(p);}));
  }
  function renderMeta(){
    const cut=dataset.metadata.lastUpdated||allPolls[0]?.published;
    if(!cut)return;
    $('dataCutDate').textContent=fmtDate(cut).toUpperCase();
    $('footerDataCut').textContent=cut.split('-').reverse().join('.');
    $('methodDataCut').textContent=fmtDate(cut);
    // Build month filters from data so new months appear automatically.
    const archiveMonth=$('archiveMonth');
    const label=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'});
    [...new Set(allPolls.map(p=>p.published.slice(0,7)))].sort().reverse().forEach(month=>{
      const option=document.createElement('option');option.value=month;option.textContent=label.format(new Date(month+'-01T12:00:00Z')).replace(/^./,c=>c.toUpperCase());archiveMonth.appendChild(option);
    });
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
  function archiveLeaders(poll) {
    const available = parties.filter(p=>Number.isFinite(poll.vote?.[p.key]));
    if (!available.length) return [];
    const maximum = Math.max(...available.map(p=>poll.vote[p.key]));
    return available.filter(p=>Math.abs(poll.vote[p.key]-maximum)<0.000001).map(p=>p.key);
  }
  function renderArchiveLeaders(results) {
    const counts=Object.fromEntries(parties.map(p=>[p.key,0]));
    let tiedOrUnknown=0;
    for (const poll of results) {
      const leaders=archiveLeaders(poll);
      if (leaders.length===1) counts[leaders[0]]++;
      else tiedOrUnknown++;
    }
    $('archiveLeaderContext').textContent = results.length+' '+(results.length===1?'sondeo visible':'sondeos visibles');
    const cards=parties.map(p=>{
      const ratio=results.length ? counts[p.key]/results.length*100 : 0;
      return `<div class="archive-leader-card" style="--leader-color:${p.color}"><div class="archive-leader-main"><span class="archive-leader-party"><i class="party-dot" style="background:${p.color}"></i>${p.label}</span><strong class="archive-leader-count">${counts[p.key]}</strong></div><div class="archive-leader-track" aria-hidden="true"><span style="width:${ratio.toFixed(2)}%"></span></div><small>${counts[p.key]} de ${results.length} encuestas</small></div>`;
    });
    if (tiedOrUnknown) cards.push(`<div class="archive-leader-card archive-leader-tie"><div class="archive-leader-main"><span class="archive-leader-party">Empate / sin datos</span><strong class="archive-leader-count">${tiedOrUnknown}</strong></div><small>Sin liderazgo único</small></div>`);
    $('archiveLeaderSummary').innerHTML=cards.join('');
  }
  function renderArchive(){
    const q=($('archiveSearch').value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const month=$('archiveMonth').value,cat=$('archiveType').value;
    const results=allPolls.filter(p=>(month==='all'||p.published.startsWith(month))&&(cat==='all'||p.category===cat)&&(!q||`${p.pollster} ${p.publisher}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)));
    renderArchiveLeaders(results);
    $('archiveCount').textContent=results.length+' '+(results.length===1?'encuesta':'encuestas');
    $('archiveBody').innerHTML=results.length ? results.map(p=>`<tr>
      <td>${fmtDate(p.published)}</td><td><div class="medium-name">${escapeHTML(p.publisher)} ${p.category==='organismo'?'<span class="org-chip">PÚBLICO</span>':''}</div><div class="pollster-name">${escapeHTML(p.pollster)}</div></td>
      ${parties.map(k=>{const isTop=archiveLeaders(p).includes(k.key);return `<td class="${isTop?'archive-vote-top':''}"${isTop?` style="--leader-color:${k.color}"`:''}><div class="archive-vote-reading"><span>${fmt(p.vote[k.key])} %</span>${isTop?'<span class="archive-lead-chip" title="Mayor porcentaje de los cuatro partidos desglosados">Mayor %</span>':''}</div></td>`;}).join('')}
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
    const a=document.createElement('a');a.href=url;a.download='29N_encuestas_'+dataset.metadata.lastUpdated+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
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
    initCoalition();renderMeta();renderUpdates();
    initCompare();$('compareA').addEventListener('change',renderCompare);$('compareB').addEventListener('change',renderCompare);
    $('swapCompare').addEventListener('click',()=>{const first=$('compareA').value;$('compareA').value=$('compareB').value;$('compareB').value=first;renderCompare();});
    $('closeDialog').addEventListener('click',()=>$('pollDialog').close());$('pollDialog').addEventListener('click',e=>{if(e.target===$('pollDialog'))$('pollDialog').close();});
    $('menuButton').addEventListener('click',()=>{const nav=document.querySelector('.topnav');nav.classList.toggle('menu-open');$('menuButton').setAttribute('aria-expanded',String(nav.classList.contains('menu-open')));});
    window.addEventListener('hashchange',navigate);
    renderOverview();renderArchive();renderCompare();navigate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
