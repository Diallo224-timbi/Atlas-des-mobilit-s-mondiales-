/*
 * BORDERLESS — Atlas D3.js des mobilités
 * Visas: Passport Index Data, photographie de 2026
 * Routes: OpenFlights, dernière photographie 2014
 * Géopolitique: annotations datées, indépendantes des valeurs quantitatives.
 */
'use strict';

const DATA_URLS = {
  visas: [
    'data/passport-index-tidy-iso2.csv',
    'https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy-iso2.csv',
    'https://cdn.jsdelivr.net/gh/imorte/passport-index-data@main/passport-index-tidy-iso2.csv'
  ],
  airports: [
    'data/airports.dat',
    'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat',
    'https://cdn.jsdelivr.net/gh/jpatokal/openflights@master/data/airports.dat'
  ],
  routes: [
    'data/routes.dat',
    'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat',
    'https://cdn.jsdelivr.net/gh/jpatokal/openflights@master/data/routes.dat'
  ],
  geography: [
    'data/countries.geojson',
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
    'https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson'
  ],
  aliases: ['data/country-aliases.json'],
  events: ['data/events.json']
};

const COLORS = {
  free: '#45c9a7', arrival: '#70a9e9', eta: '#b39df1',
  evisa: '#e9b365', required: '#ee7a88', blocked: '#9d526c',
  own: '#dce9f6', unknown: '#34415a'
};
const LABELS = {
  free: 'Sans visa', arrival: "Visa à l’arrivée", eta: 'Autorisation ETA',
  evisa: 'Visa électronique (e-visa)', required: 'Visa préalable requis',
  blocked: 'Entrée interdite', own: 'Pays du passeport', unknown: 'Donnée absente'
};
const fmt = new Intl.NumberFormat('fr-FR');
const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
const state = { passport: 'FR', compare: 'DZ', visaFilter: 'all', showRoutes: true,
  showCompare: true, year: 2026, activeEvent: null, activeDestination: null };
const model = { visaByPassport: new Map(), passports: [], geo: null, geoByIso: new Map(),
  airportsById: new Map(), airportsByIata: new Map(), routesByPassport: new Map(),
  stats: new Map(), events: [], countryAliases: {}, routeRows: 0, mappedRouteRows: 0 };
let mapSvg = null;
let mapZoom = null;
let mapProjection = null;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function norm(value) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function countryLabel(code) {
  if (code === 'XK') return 'Kosovo';
  if (code === 'TW') return 'Taïwan';
  if (code === 'PS') return 'Palestine';
  if (!code) return 'Inconnu';
  try { return regionNames.of(code) || code; } catch { return code; }
}
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function visaType(raw) {
  const x = String(raw || '').trim().toLowerCase();
  if (x === '-1') return 'own';
  if (/^\d+$/.test(x) && Number(x) > 0) return 'free';
  if (x === 'visa free') return 'free';
  if (x === 'visa on arrival') return 'arrival';
  if (x === 'eta') return 'eta';
  if (x === 'e-visa') return 'evisa';
  if (x === 'no admission' || x === 'covid ban') return 'blocked';
  if (x === 'visa required') return 'required';
  return 'unknown';
}
function visaPhrase(item) {
  if (!item) return LABELS.unknown;
  const days = /^\d+$/.test(String(item.raw)) && Number(item.raw) > 0 ? ` (${item.raw} jours)` : '';
  return LABELS[item.type] + days;
}
function visaRecord(from, to) { return model.visaByPassport.get(from)?.get(to) || null; }
function accessible(type) { return ['free', 'arrival', 'eta'].includes(type); }
function isoForAirport(name) { return model.countryAliases[norm(name)] || null; }
function hideTooltip() { $('#tooltip').classList.add('hidden'); }
function showTooltip(event, title, lines, accent = '') {
  const tip = $('#tooltip');
  tip.innerHTML = `<strong>${escapeHtml(title)}</strong>${lines.map((s,i) => `<small class="${i===0 && accent ? 'tooltip-status':''}">${escapeHtml(s)}</small>`).join('')}`;
  tip.classList.remove('hidden');
  moveTooltip(event);
}
function moveTooltip(e) {
  const tip = $('#tooltip');
  const pad = 15;
  const width = tip.offsetWidth || 220, height = tip.offsetHeight || 70;
  const clientX = e?.clientX ?? 250, clientY = e?.clientY ?? 250;
  tip.style.left = `${Math.max(pad, Math.min(innerWidth - width - pad, clientX + 15))}px`;
  tip.style.top = `${Math.max(pad, Math.min(innerHeight - height - pad, clientY + 17))}px`;
}

async function fetchText(urls, label) {
  let error;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) { error = e; }
  }
  throw new Error(`${label} : ${error?.message || 'source inaccessible'}`);
}
async function loadData() {
  $('#loadingOverlay').classList.remove('hidden');
  $('#errorBanner').classList.add('hidden');
  if (typeof window.d3 === 'undefined') {
    throw new Error('La bibliothèque D3.js ne s’est pas chargée. Vérifiez votre connexion Internet.');
  }
  const names = Object.keys(DATA_URLS);
  const files = await Promise.all(names.map(n => fetchText(DATA_URLS[n], n)));
  const input = Object.fromEntries(names.map((n,i) => [n, files[i]]));
  model.countryAliases = JSON.parse(input.aliases);
  model.events = JSON.parse(input.events).map(e => ({ ...e, when: d3.utcParse('%Y-%m-%d')(e.date) })).sort((a,b) => a.when-b.when);
  model.geo = JSON.parse(input.geography);
  model.geoByIso.clear();
  for (const feature of model.geo.features) {
    const p = feature.properties || {};
    let code = p['ISO3166-1-Alpha-2'];
    if (!code || code === '-99') code = model.countryAliases[norm(p.name)];
    if (!code) continue;
    feature.iso2 = code;
    model.geoByIso.set(code,feature);
  }
  parseVisa(input.visas);
  parseFlights(input.airports, input.routes);
  calculateStats();
  initializeControls();
  drawMap();
  drawTimeline();
  updateAll();
  $('#dataStatus').textContent = 'Données chargées';
  $('.live-indicator').classList.add('ready');
  $('#loadingOverlay').classList.add('hidden');
}

function parseVisa(csvText) {
  model.visaByPassport.clear();
  const rows = d3.csvParse(csvText);
  if (!rows.columns.includes('Passport') || !rows.columns.includes('Destination') || !rows.columns.includes('Requirement')) {
    throw new Error('Format CSV de la matrice des visas incompatible avec les colonnes attendues.');
  }
  for (const row of rows) {
    if (!row.Passport || !row.Destination) continue;
    if (!model.visaByPassport.has(row.Passport)) model.visaByPassport.set(row.Passport,new Map());
    model.visaByPassport.get(row.Passport).set(row.Destination,{
      raw: String(row.Requirement).trim(), type: visaType(row.Requirement)
    });
  }
  model.passports = [...model.visaByPassport.keys()].sort((a,b) => countryLabel(a).localeCompare(countryLabel(b),'fr'));
}
function parseFlights(airportText, routeText) {
  model.airportsById.clear(); model.airportsByIata.clear(); model.routesByPassport.clear();
  const airportRows = d3.csvParseRows(airportText);
  for (const row of airportRows) {
    const [id, name, city, country, iata,,lat,lon] = row;
    const iso = isoForAirport(country);
    const latitude = Number(lat), longitude = Number(lon);
    if (!iso || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const item = { id, name, city, country, iso, iata, coord: [longitude,latitude] };
    model.airportsById.set(id,item);
    if (iata && iata !== '\\N') model.airportsByIata.set(iata,item);
  }
  const group = new Map();
  const routeRows = d3.csvParseRows(routeText);
  model.routeRows = routeRows.length;
  model.mappedRouteRows = 0;
  for (const r of routeRows) {
    const source = model.airportsById.get(r[3]) || model.airportsByIata.get(r[2]);
    const dest = model.airportsById.get(r[5]) || model.airportsByIata.get(r[4]);
    if (!source || !dest || source.iso === dest.iso || Number(r[7]) > 0) continue;
    model.mappedRouteRows++;
    const key = `${source.iso}|${dest.iso}`;
    if (!group.has(key)) group.set(key,{ from:source.iso,to:dest.iso,count:0, airportPairs:new Map() });
    const g=group.get(key);
    g.count++;
    const airportKey=`${source.id}|${dest.id}`;
    if (!g.airportPairs.has(airportKey)) g.airportPairs.set(airportKey,{source,dest,count:0});
    g.airportPairs.get(airportKey).count++;
  }
  for (const g of group.values()) {
    const primary=[...g.airportPairs.values()].sort((a,b)=>b.count-a.count)[0];
    g.source=primary.source;g.destination=primary.dest;g.uniqueAirportPairs=g.airportPairs.size;
    delete g.airportPairs;
    if (!model.routesByPassport.has(g.from)) model.routesByPassport.set(g.from,[]);
    model.routesByPassport.get(g.from).push(g);
  }
  for (const routes of model.routesByPassport.values()) routes.sort((a,b)=>b.count-a.count);
}
function calculateStats() {
  model.stats.clear();
  for (const code of model.passports) {
    const visas = model.visaByPassport.get(code);
    const routes = model.routesByPassport.get(code) || [];
    const allVisas = [...visas.values()];
    model.stats.set(code,{
      country:code,
      score: allVisas.filter(v => accessible(v.type)).length,
      required: allVisas.filter(v => v.type==='required').length,
      free: allVisas.filter(v => v.type==='free').length,
      visaCount: allVisas.filter(v => v.type!=='own' && v.type!=='unknown').length,
      connected: routes.length,
      routeEntries: d3.sum(routes,r=>r.count)
    });
  }
}

function initializeControls() {
  const options = model.passports.map(c=>`<option value="${c}">${escapeHtml(countryLabel(c))} (${c})</option>`).join('');
  $('#passportSelect').innerHTML = options;
  $('#compareSelect').innerHTML = options;
  if (!model.visaByPassport.has(state.passport)) state.passport=model.passports[0];
  if (!model.visaByPassport.has(state.compare)) state.compare=model.passports[1] || state.passport;
  $('#passportSelect').value=state.passport;
  $('#compareSelect').value=state.compare;
}
function bindControls() {
  $('#passportSelect').addEventListener('change',e=>{state.passport=e.target.value;updateAll();});
  $('#compareSelect').addEventListener('change',e=>{state.compare=e.target.value;updateAll();});
  $('#visaFilter').addEventListener('change',e=>{state.visaFilter=e.target.value;updateAll();});
  $('#showRoutes').addEventListener('change',e=>{state.showRoutes=e.target.checked;updateMap();});
  $('#showCompare').addEventListener('change',e=>{state.showCompare=e.target.checked;updateMap();drawScatter();});
  $('#yearSlider').addEventListener('input',e=>{state.year=+e.target.value;drawTimeline();updateMap();});
  $('#closeDrawer').addEventListener('click',closeDetail);
  $('#drawerScrim').addEventListener('click',closeDetail);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDetail();hideTooltip();}});
  $('#zoomIn').addEventListener('click',()=>mapSvg && mapSvg.transition().duration(220).call(mapZoom.scaleBy,1.5));
  $('#zoomOut').addEventListener('click',()=>mapSvg && mapSvg.transition().duration(220).call(mapZoom.scaleBy,1/1.5));
  $('#zoomReset').addEventListener('click',()=>mapSvg && mapSvg.transition().duration(300).call(mapZoom.transform,d3.zoomIdentity));
  $('#retryBtn').addEventListener('click',start);
  $('#exportBtn').addEventListener('click',exportSelectedCsv);
  document.addEventListener('mousemove',e=>{ if(!$('#tooltip').classList.contains('hidden')) moveTooltip(e); });
  $$('.nav-link').forEach(a=>a.addEventListener('click',()=>{
    $$('.nav-link').forEach(x=>x.classList.remove('active')); a.classList.add('active');
  }));
}
function updateAll() {
  hideTooltip();
  $('#passportSelect').value=state.passport;
  $('#compareSelect').value=state.compare;
  const s=model.stats.get(state.passport) || {score:0,required:0,connected:0,routeEntries:0};
  $('#mAccessible').textContent=fmt.format(s.score);
  $('#mAccessibleSub').textContent='Sans visa · arrivée · ETA (score calculé)';
  $('#mRequired').textContent=fmt.format(s.required);
  $('#mConnected').textContent=fmt.format(s.connected);
  $('#mRoutes').textContent=fmt.format(s.routeEntries);
  $('#mapSelectedCountry').textContent=`PASSEPORT : ${countryLabel(state.passport).toUpperCase()}`;
  updateMap();
  drawScatter();
  drawDestinations();
  drawHeatmap();
  if(!$('#detailDrawer').getAttribute('aria-hidden') || $('#detailDrawer').classList.contains('open')) {
    if(state.activeDestination) showDetail(state.activeDestination);
  }
}

function drawMap() {
  const svg=d3.select('#worldMap');
  svg.selectAll('*').remove();
  mapSvg=svg;
  svg.append('defs').append('clipPath').attr('id','mapClip').append('rect').attr('x',5).attr('y',5).attr('width',1090).attr('height',550);
  const graticule=d3.geoGraticule().step([30,30]);
  mapProjection=d3.geoNaturalEarth1().fitExtent([[28,27],[1070,532]],model.geo);
  const path=d3.geoPath(mapProjection);
  const scene=svg.append('g').attr('class','map-scene').attr('clip-path','url(#mapClip)');
  scene.append('path').attr('d',path(graticule())).attr('fill','none').attr('stroke','#2b4056').attr('stroke-width',.55).attr('opacity',.54);
  scene.append('g').attr('class','countries-layer').selectAll('path').data(model.geo.features.filter(f=>f.iso2)).join('path')
    .attr('class','country-shape').attr('data-iso',d=>d.iso2)
    .attr('d',path).attr('stroke','#19283c').attr('stroke-width',.9)
    .on('mousemove',(e,d)=>{
      const req=visaRecord(state.passport,d.iso2);
      const route=(model.routesByPassport.get(state.passport)||[]).find(r=>r.to===d.iso2);
      showTooltip(e,countryLabel(d.iso2),[visaPhrase(req),route? `${fmt.format(route.count)} lignes OpenFlights (2014)` : 'Aucune liaison sortante recensée (2014)'],true);
    }).on('mouseleave',hideTooltip).on('click',(e,d)=>{e.stopPropagation();showDetail(d.iso2);});
  scene.append('g').attr('class','routes-layer').attr('pointer-events','none');
  scene.append('g').attr('class','highlights-layer').attr('pointer-events','none');
  mapZoom=d3.zoom().scaleExtent([1,6]).on('zoom',e=>scene.attr('transform',e.transform));
  svg.call(mapZoom).on('dblclick.zoom',null);
  svg.on('click',()=>{state.activeEvent=null;drawTimeline();updateMap();});
}
function makeArc(from,to) {
  const interp=d3.geoInterpolate(from,to);
  const coords=d3.range(0,1.001,.08).map(t=>interp(t));
  return d3.geoPath(mapProjection)({type:'LineString',coordinates:coords});
}
function updateMap() {
  if(!mapSvg) return;
  const visamap=model.visaByPassport.get(state.passport)||new Map();
  d3.select('#worldMap .countries-layer').selectAll('path')
    .attr('fill',d=>{
      const v=visamap.get(d.iso2),type=v?.type||'unknown';
      return COLORS[type]||COLORS.unknown;
    })
    .attr('opacity',d=>{
      const type=visamap.get(d.iso2)?.type||'unknown';
      return state.visaFilter==='all'||type===state.visaFilter||d.iso2===state.passport ? .91 : .16;
    })
    .attr('stroke',d=>d.iso2===state.passport?'#effff7':d.iso2===state.compare&&state.showCompare?'#86a9ff':'#19283c')
    .attr('stroke-width',d=>d.iso2===state.passport?2.2:d.iso2===state.compare&&state.showCompare?1.9:.8);
  const routes=state.showRoutes?(model.routesByPassport.get(state.passport)||[])
    .filter(r=>state.visaFilter==='all'||visaRecord(state.passport,r.to)?.type===state.visaFilter)
    .slice(0,85):[];
  d3.select('#worldMap .routes-layer').selectAll('path').data(routes,d=>d.from+'-'+d.to).join(
    enter=>enter.append('path').attr('fill','none').attr('stroke','#dcf9ef').attr('stroke-width',1.15).attr('stroke-opacity',.44).attr('d',d=>makeArc(d.source.coord,d.destination.coord)),
    update=>update.attr('d',d=>makeArc(d.source.coord,d.destination.coord)),
    exit=>exit.remove());
  const active=model.events.find(e=>e.id===state.activeEvent&&e.when?.getUTCFullYear()<=state.year);
  const highlightCodes=active?active.countries:[];
  d3.select('#worldMap .highlights-layer').selectAll('path').data(highlightCodes.map(c=>model.geoByIso.get(c)).filter(Boolean),d=>d.iso2).join('path')
    .attr('d',d3.geoPath(mapProjection)).attr('fill','none').attr('stroke','#f7cd7d').attr('stroke-width',2.8)
    .attr('stroke-dasharray','6 3').attr('vector-effect','non-scaling-stroke');
}

function pearson(data) {
  if(data.length<3) return NaN;
  const ax=d3.mean(data,d=>d.score),ay=d3.mean(data,d=>d.connected);
  let num=0,dx=0,dy=0;
  for(const d of data){const x=d.score-ax,y=d.connected-ay;num+=x*y;dx+=x*x;dy+=y*y;}
  return dx&&dy?num/Math.sqrt(dx*dy):NaN;
}
function drawScatter() {
  const host=d3.select('#scatterChart');host.selectAll('*').remove();
  const W=580,H=285,m={top:21,right:20,bottom:52,left:60};
  const data=[...model.stats.values()].filter(d=>d.visaCount>150&&d.connected>0);
  const corr=pearson(data);
  $('#correlationValue').innerHTML=`r = ${Number.isFinite(corr)?corr.toFixed(2):'—'}<small>corrélation Pearson</small>`;
  const svg=host.append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img').attr('aria-label','Corrélation entre mobilité visa et connectivité aérienne historique');
  if(!data.length){svg.append('text').attr('x',W/2).attr('y',H/2).attr('fill','#7e90a9').text('Pas de données communes');return;}
  const x=d3.scaleLinear().domain([0,d3.max(data,d=>d.score)+8]).nice().range([m.left,W-m.right]);
  const y=d3.scaleLinear().domain([0,d3.max(data,d=>d.connected)+8]).nice().range([H-m.bottom,m.top]);
  svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W-m.left-m.right)).tickFormat(''));
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.bottom})`).call(d3.axisBottom(x).ticks(6));
  svg.append('g').attr('class','axis').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5));
  svg.append('text').attr('x',W/2).attr('y',H-9).attr('text-anchor','middle').attr('fill','#92a7bb').attr('font-size',10).text('Destinations accessibles sans visa préalable (score 2026)');
  svg.append('text').attr('transform',`translate(14,${H/2}) rotate(-90)`).attr('text-anchor','middle').attr('fill','#92a7bb').attr('font-size',10).text('Pays reliés par routes sortantes (2014)');
  svg.append('g').selectAll('circle').data(data.sort((a,b)=>(a.country===state.passport?1:0)-(b.country===state.passport?1:0))).join('circle')
    .attr('class','scatter-dot').attr('cx',d=>x(d.score)).attr('cy',d=>y(d.connected))
    .attr('r',d=>d.country===state.passport?6.3:d.country===state.compare&&state.showCompare?5.6:3.1)
    .attr('fill',d=>d.country===state.passport?COLORS.free:d.country===state.compare&&state.showCompare?COLORS.eta:'#6387ad')
    .attr('opacity',d=>d.country===state.passport||d.country===state.compare?.98:.49)
    .attr('stroke',d=>d.country===state.passport?'#f1fff7':'none').attr('stroke-width',1.8)
    .on('mousemove',(e,d)=>showTooltip(e,countryLabel(d.country),[`Mobilité : ${d.score} destinations`,`Pays reliés : ${d.connected} (2014)`],true))
    .on('mouseleave',hideTooltip).on('click',(_,d)=>{state.passport=d.country;updateAll();});
  const selected=model.stats.get(state.passport);
  if(selected&&selected.connected>0){svg.append('text').attr('x',x(selected.score)+10).attr('y',y(selected.connected)-10).attr('fill','#e7f9f0').attr('font-size',11).attr('font-weight',700).text(state.passport);}
}
function drawDestinations() {
  const host=$('#topDestinations');host.innerHTML='';
  const filtered=(model.routesByPassport.get(state.passport)||[])
    .filter(r=>state.visaFilter==='all'||visaRecord(state.passport,r.to)?.type===state.visaFilter).slice(0,7);
  if(!filtered.length){host.innerHTML='<p class="dest-no-data">Aucune connexion internationale trouvée pour ce filtre dans OpenFlights 2014.</p>';return;}
  const max=filtered[0].count;
  filtered.forEach((route,i)=>{
    const el=document.createElement('div');el.className='dest-row';el.tabIndex=0;
    el.innerHTML=`<span class="dest-index">${String(i+1).padStart(2,'0')}</span><div class="dest-name">${escapeHtml(countryLabel(route.to))}<small>${escapeHtml(visaPhrase(visaRecord(state.passport,route.to)))}</small></div><span class="dest-val">${fmt.format(route.count)}</span><span class="dest-bar"><i style="width:${(route.count/max*100).toFixed(1)}%"></i></span>`;
    el.addEventListener('click',()=>showDetail(route.to));el.addEventListener('keydown',e=>{if(e.key==='Enter')showDetail(route.to);});host.appendChild(el);
  });
}
function drawMatrixLegend() {
  const host=$('#matrixLegend');if(!host)return;
  const order=['free','arrival','eta','evisa','required','blocked','own','unknown'];
  const items=order.map(k=>`<span class="legend-item"><i style="background:${COLORS[k]}"></i>${escapeHtml(LABELS[k])}</span>`).join('');
  host.innerHTML=`<span class="legend-title">LÉGENDE</span>${items}<span class="legend-sep"></span><span class="legend-item"><b style="color:${COLORS.free}">FR</b> passeport sélectionné</span><span class="legend-item"><b style="color:${COLORS.eta}">DZ</b> passeport comparé</span>`;
}
function drawHeatmap() {
  const host=d3.select('#heatmapChart');host.selectAll('*').remove();
  const featured=['FR','DZ','DE','GB','US','JP','CN','IN','MA','RU','BR','TR','ZA','AE','KR','EG'];
  const passports=[...new Set([state.passport,state.compare,...featured])].filter(c=>model.visaByPassport.has(c)).slice(0,15);
  const dests=['FR','GB','US','CA','DE','ES','IT','TR','AE','CN','JP','IN','AU','RU','DZ','MA','BR','KR','ZA'];
  const W=1040,H=passports.length*31+88,m={top:47,left:111,right:14,bottom:22};
  const svg=host.append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img').attr('aria-label','Matrice de visas 2026 par passeport et destination');
  drawMatrixLegend();
  svg.append('text').attr('x',m.left).attr('y',11).attr('fill','#6f839c').attr('font-size',9.5).attr('font-weight',800).attr('letter-spacing',1.4).text('DESTINATION →');
  svg.append('text').attr('x',m.left-13).attr('y',32).attr('text-anchor','end').attr('fill','#6f839c').attr('font-size',9.5).attr('font-weight',800).attr('letter-spacing',1.4).text('PASSEPORT ↓');
  const x=d3.scaleBand().domain(dests).range([m.left,W-m.right]).paddingInner(.075);
  const y=d3.scaleBand().domain(passports).range([m.top,H-m.bottom]).paddingInner(.1);
  svg.selectAll('.x-label').data(dests).join('text').attr('x',d=>x(d)+x.bandwidth()/2).attr('y',32).attr('text-anchor','middle').attr('fill','#98acc4').attr('font-size',11).attr('font-weight',700).text(d=>d);
  svg.selectAll('.y-label').data(passports).join('text').attr('x',m.left-13).attr('y',d=>y(d)+y.bandwidth()/2+4).attr('text-anchor','end')
    .attr('fill',d=>d===state.passport?COLORS.free:d===state.compare?COLORS.eta:'#91a5be').attr('font-size',11).attr('font-weight',d=>d===state.passport?800:500)
    .text(d=>d+' · '+countryLabel(d).slice(0,10));
  const cellData=passports.flatMap(from=>dests.map(to=>({from,to,item:visaRecord(from,to)})));
  svg.selectAll('.heat-cell').data(cellData).join('rect').attr('class','heat-cell')
    .attr('x',d=>x(d.to)).attr('y',d=>y(d.from)).attr('width',x.bandwidth()).attr('height',y.bandwidth()).attr('rx',4)
    .attr('fill',d=>COLORS[d.item?.type||'unknown'])
    .on('mousemove',(e,d)=>showTooltip(e,`${countryLabel(d.from)} → ${countryLabel(d.to)}`,[visaPhrase(d.item)],true))
    .on('mouseleave',hideTooltip).on('click',(_,d)=>{state.passport=d.from;updateAll();showDetail(d.to);});
}
function drawTimeline() {
  $('#yearLabel').textContent=state.year;
  const events=model.events.filter(e=>e.when?.getUTCFullYear()<=state.year);
  const W=1100,H=94,svg=d3.select('#timelineChart').html('').append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img').attr('aria-label','Frise des événements géopolitiques de 2020 à 2026');
  const x=d3.scaleUtc().domain([new Date(Date.UTC(2020,0,1)),new Date(Date.UTC(2026,11,31))]).range([33,W-33]);
  svg.append('line').attr('x1',33).attr('x2',W-33).attr('y1',45).attr('y2',45).attr('stroke','#476079').attr('stroke-width',2);
  const years=d3.range(2020,2027);
  svg.selectAll('.timeline-tick').data(years).join('g').attr('transform',d=>`translate(${x(new Date(Date.UTC(d,0,1)))},45)`).each(function(d){
    const g=d3.select(this);g.append('line').attr('y1',-5).attr('y2',5).attr('stroke','#637793');
    g.append('text').attr('y',23).attr('text-anchor','middle').attr('font-size',11).attr('fill',d<=state.year?'#a9b8cc':'#51647b').text(d);
  });
  svg.selectAll('.event-dot').data(events).join('circle').attr('cx',d=>x(d.when)).attr('cy',(d,i)=>i%2?43:39)
    .attr('r',d=>d.id===state.activeEvent?9:6).attr('fill',d=>d.id===state.activeEvent?'#e9b365':'#45c9a7')
    .attr('stroke','#112132').attr('stroke-width',2).style('cursor','pointer')
    .on('mousemove',(e,d)=>showTooltip(e,d.title,[d.date,d.category]))
    .on('mouseleave',hideTooltip).on('click',(_,d)=>selectEvent(d.id));
  const list=$('#eventList');list.innerHTML='';
  for(const event of [...events].reverse()){
    const div=document.createElement('div');div.className='event-card'+(state.activeEvent===event.id?' active':'');div.tabIndex=0;div.setAttribute('role','button');
    div.innerHTML=`<div class="event-date">${event.date.slice(0,7)}</div><div><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p><a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;color:#8fd4c5;font-size:10px">Source : ${escapeHtml(event.sourceName)} ↗</a></div>`;
    div.addEventListener('click',e=>{if(e.target.closest('a'))return;selectEvent(event.id);});
    div.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.target.closest('a'))selectEvent(event.id);});
    list.appendChild(div);
  }
  if(!events.length)list.innerHTML='<div class="dest-no-data">Aucun événement pour la période choisie.</div>';
}
function selectEvent(id) {
  state.activeEvent=state.activeEvent===id?null:id;
  drawTimeline();updateMap();
  if(state.activeEvent){document.querySelector('#atlas').scrollIntoView({behavior:'smooth',block:'start'});}
}
function showDetail(code) {
  state.activeDestination=code;
  $('#detailName').textContent=`${countryLabel(code)} (${code})`;
  const visa=visaRecord(state.passport,code);
  const outbound=(model.routesByPassport.get(state.passport)||[]).find(x=>x.to===code);
  const inbound=(model.routesByPassport.get(code)||[]).find(x=>x.to===state.passport);
  const sources=[];
  if(outbound)sources.push(`${fmt.format(outbound.count)} enregistrement(s) de routes sortantes`);
  if(inbound)sources.push(`${fmt.format(inbound.count)} enregistrement(s) en sens inverse`);
  const html=`<div class="detail-box"><small>ACCÈS DEPUIS ${escapeHtml(countryLabel(state.passport).toUpperCase())} · VISA 2026</small><strong style="color:${COLORS[visa?.type||'unknown']}">${escapeHtml(visaPhrase(visa))}</strong><p>Catégorie issue de la matrice Passport Index Data, à vérifier officiellement avant tout voyage.</p></div>
    <div class="detail-box"><small>CONNECTIVITÉ AÉRIENNE · 2014</small><strong>${outbound?fmt.format(outbound.count):'0'} entrée(s)</strong><p>${sources.length?sources.map(escapeHtml).join(' · '):'Pas de liaison internationale directe recensée dans cette base historique.'}</p>${outbound?`<p>Exemple de paire d’aéroports : ${escapeHtml(outbound.source.name)} → ${escapeHtml(outbound.destination.name)}</p><p>${fmt.format(outbound.uniqueAirportPairs)} paire(s) d’aéroports distinctes.</p>`:''}</div>
    <p class="detail-meta">Les routes ne sont pas des vols planifiés aujourd'hui. Une entrée OpenFlights ne représente pas le nombre de voyageurs, ni la fréquence de la liaison.</p>`;
  $('#detailContent').innerHTML=html;
  $('#detailDrawer').classList.add('open');$('#detailDrawer').setAttribute('aria-hidden','false');
  $('#drawerScrim').classList.remove('hidden');hideTooltip();
}
function closeDetail(){ $('#detailDrawer').classList.remove('open');$('#detailDrawer').setAttribute('aria-hidden','true');$('#drawerScrim').classList.add('hidden'); }
function exportSelectedCsv(){
  const map=model.visaByPassport.get(state.passport);
  if(!map)return;
  const byTo=new Map((model.routesByPassport.get(state.passport)||[]).map(d=>[d.to,d]));
  const rows=[...map].filter(([to])=>to!==state.passport).map(([to,visa])=>({
    passeport:state.passport,destination:to,pays_destination:countryLabel(to),
    exigence_brute:visa.raw,categorie:visa.type,accessible_sans_visa_prealable:accessible(visa.type)?'oui':'non',
    lignes_routes_2014:byTo.get(to)?.count||0
  }));
  const csv=d3.csvFormat(rows);const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`borderless_${state.passport}_visas2026_routes2014.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function start() {
  try { await loadData(); }
  catch (e) {
    console.error(e);
    $('#loadingOverlay').classList.add('hidden');
    $('#errorBanner').classList.remove('hidden');
    $('#errorMessage').textContent=String(e.message||e);
    $('#dataStatus').textContent='Données indisponibles';
  }
}
bindControls();start();
