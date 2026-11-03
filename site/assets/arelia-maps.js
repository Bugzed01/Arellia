/* Arélia Maps: self-hosted canvas cartography; no commercial geocoding or map tile API. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const host=$('maps-canvas-area');if(!host)return;
 const canvas=$('maps-canvas'),ctx=canvas.getContext('2d',{alpha:false});
 const results=$('maps-results'),detail=$('maps-detail'),markers=$('maps-markers');
 const state={data:null,images:{},style:'plan',layers:{roads:true,rail:true,water:true,places:true,labels:true,urban:true,canals:true,zones:true,transit:true,metro:true,metroRail:true},category:'all',query:'',selected:null,city:null,cityMode:false,metroMode:false,scale:1,baseScale:1,tx:0,ty:0,route:null,drag:null,raf:0,dpr:1};
 const terrain=new Image(),plan=new Image();terrain.src='../assets/arelia-terrain.webp';plan.src='../assets/arelia-plan.webp';state.images={terrain,plan};
 const coord=([x,y])=>[x*state.scale+state.tx,y*state.scale+state.ty];
 const num=(n)=>Math.round(n).toLocaleString('fr-FR');
 const toWorld=(px,py)=>[(px-state.tx)/state.scale,(py-state.ty)/state.scale];
 const getDim=()=>[host.clientWidth,host.clientHeight];
 const chosen=()=>[...(state.data?.places||[]),...(state.city?.places||[])].find(p=>p.id===state.selected);
 const wikiHref=p=>'../wiki/'+(p.wiki||'arelia')+'/';
 function resize(){const [w,h]=getDim();state.dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*state.dpr);canvas.height=Math.round(h*state.dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';draw();}
 function initial(reset=true){const [w,h]=getDim();const f=Math.min(w/1500,h/1400)*.94;if(reset||!state.baseScale){state.baseScale=f;state.scale=f;state.tx=(w-1500*f)/2;state.ty=(h-1400*f)/2;}draw();}
 function clamp(){const [w,h]=getDim();const margin=Math.min(w,h)*.25;state.tx=Math.min(w-margin,Math.max(margin-1500*state.scale,state.tx));state.ty=Math.min(h-margin,Math.max(margin-1400*state.scale,state.ty));}
 function zoom(factor,cx,cy){const [w,h]=getDim();cx=cx??w/2;cy=cy??h/2;const z=Math.max(state.baseScale*.80,Math.min(state.baseScale*42,state.scale*factor));const r=z/state.scale;state.tx=cx+(state.tx-cx)*r;state.ty=cy+(state.ty-cy)*r;state.scale=z;clamp();schedule();}
 function focus(x,y,level=7){const [w,h]=getDim();const z=Math.max(state.baseScale,Math.min(state.baseScale*42,state.baseScale*level));state.scale=z;state.tx=w/2-x*z;state.ty=h/2-y*z;clamp();schedule();}
 function schedule(){if(!state.raf)state.raf=requestAnimationFrame(()=>{state.raf=0;draw()});}
 function polyline(points,color,width,dash=null,halo=false){if(!points||!points.length)return;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=width/state.scale;ctx.lineCap='round';ctx.lineJoin='round';if(halo){ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=(width+2)/state.scale;ctx.stroke();}ctx.strokeStyle=color;ctx.lineWidth=width/state.scale;ctx.setLineDash(dash?dash.map(n=>n/state.scale):[]);ctx.stroke();ctx.setLineDash([])}
 function markerRoadNodes(){if(!state.data)return;const d=state.data;
  if(state.layers.water){d.rivers.forEach(r=>polyline(r.points,'#ffffffad',r.importance==='majeur'?8:4.5));d.rivers.forEach(r=>polyline(r.points,r.importance==='majeur'?'#3f96af':'#5aadc0',r.importance==='majeur'?5.5:3));polyline(d.lake,'#72b5bb',1.4)}
  if(state.layers.roads){d.roads.forEach(r=>polyline(r.points,'#ffffffca',5.5));d.roads.forEach(r=>polyline(r.points,'#d4a66c',2.45));}
  if(state.layers.rail){d.railways.forEach(r=>polyline(r.points,'#34505c',2.2,[6,4],true));}
  if(state.layers.water&&state.scale>=state.baseScale*4.5&&!state.city){d.capital.canals.forEach(r=>polyline(r.points,'#f4fbfa',8));d.capital.canals.forEach(r=>polyline(r.points,'#3e9eaf',5.2));}
  if(state.scale>=state.baseScale*5)drawCities();
  if(state.city && state.scale>=state.baseScale*3.1)drawMetropolis();
   if(state.city && state.scale>=state.baseScale*6)drawVesone();
 }
 function drawCities(){if(state.scale<1)return;const cityList=state.data.places.filter(p=>['capitale','metropole','ville'].includes(p.category));for(const city of cityList){if(city.id==='vesone')continue;let radius=city.category==='ville'?8:city.category==='capitale'?35:28;const x=city.x,y=city.y;ctx.fillStyle='rgba(241,235,216,.33)';ctx.beginPath();ctx.ellipse(x,y,radius,radius*.8,0,0,Math.PI*2);ctx.fill();const step=city.id==='vesone'?5.5:6;const angle=city.id==='vesone'?.21:-.13;ctx.save();ctx.translate(x,y);ctx.rotate(angle);for(let p=-radius;p<=radius;p+=step){const t=Math.sqrt(Math.max(0,radius*radius-p*p));polyline([[p,-t*.75],[p,t*.75]],'#f4ede2',1.1);polyline([[-t,p*.75],[t,p*.75]],'#f4ede2',1.1)}ctx.restore();}
 if(state.layers.water && !state.city){state.data.capital.canals.forEach(r=>polyline(r.points,'#f7f8f3',8.5));state.data.capital.canals.forEach(r=>polyline(r.points,'#3b98a8',5.2));}
 if(!state.city && state.scale>state.baseScale*17){ctx.font=(12/state.scale)+'px Arial';ctx.fillStyle='#284453';state.data.capital.districts.forEach(p=>ctx.fillText(p.name,p.x,p.y));state.data.capital.places.forEach(p=>{ctx.fillStyle='#a1844b';ctx.beginPath();ctx.arc(p.x,p.y,3/state.scale,0,Math.PI*2);ctx.fill()})}
 }
 // Urban detail is drawn in world coordinates, on top of the national raster.
 function drawMetropolis(){
    const metro=state.city?.metropolitan;if(!metro)return;
    const level=state.scale/state.baseScale,night=state.style==='night';
    const path=(pts,close=false)=>{if(!pts?.length)return;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);if(close)ctx.closePath()};
    const fill=(pts,color,stroke=null)=>{path(pts,true);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.2;ctx.stroke()}};
    const line=(pts,color,width,dash=[])=>{path(pts);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])};
    ctx.save();
    if(state.layers.metro){
      for(const green of metro.green_corridors)fill(green.polygon,night?'rgba(57,105,78,.52)':'rgba(110,149,112,.52)');
      for(const sat of metro.satellites)fill(sat.footprint,night?'#697472':'#d9d3bb',night?'#6f7777':'#bcad91');
      if(level>=9&&state.layers.urban)for(const block of metro.neighborhoods)fill(block.polygon,night?'#8e918d':block.color,night?'#697579':'#e2d9c9');
      for(const road of metro.roads){const main=road.kind==='rocade';line(road.points,night?'#465363':'#a99c8b',main?2.4:1.9);line(road.points,night?'#e1c8a7':'#fbf6e7',main?1.55:1.1,road.kind==='contournement'?[3,2]:[])}
    }
    if(state.layers.metroRail){
      for(const track of metro.regional_rail){line(track.points,night?'#283b46':'rgba(252,249,234,.95)',2);line(track.points,track.color,.92,[2.2,1.1])}
      if(level>=7)for(const sat of metro.satellites){ctx.beginPath();ctx.arc(sat.x,sat.y,1.3,0,Math.PI*2);ctx.fillStyle=night?'#d4dbe3':'white';ctx.fill();ctx.lineWidth=.44;ctx.strokeStyle='#536c82';ctx.stroke()}
    }
    ctx.restore();
  }
  function drawVesone(){
  const city=state.city,level=state.scale/state.baseScale;
  if(!city)return;
  const night=state.style==='night';
  const trace=(pts,close=false)=>{
    if(!pts||!pts.length)return;
    ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
    if(close)ctx.closePath();
  };
  const fill=(pts,color,stroke=null,width=.14)=>{if(!pts||pts.length<3)return;trace(pts,true);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}};
  const smooth=(pts,color,width)=>{
    if(!pts||pts.length<2)return;
    ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    if(pts.length===2)ctx.lineTo(pts[1][0],pts[1][1]);
    else{
      for(let i=1;i<pts.length-1;i++){
        const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;
        ctx.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);
      }
      ctx.lineTo(pts[pts.length-1][0],pts[pts.length-1][1]);
    }
    ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
  };
  ctx.save();trace(city.outline,true);ctx.clip();
  fill(city.outline,night?'#52616b':'#e6dfcf');
  if(state.layers.urban){
    if(level>=6)for(const block of city.blocks)fill(block.polygon,night?'#66686b':block.color,night?'#555d60':'#f6f2e7',.17);
    if(level>=11)for(const building of city.buildings)fill(building.polygon,night?'#a6a39d':building.roof,night?'#747976':'#b9ab99',.075);
    if(state.layers.zones&&level>=7){
      for(const zone of city.urban_zones||[])fill(zone.polygon,night?'rgba(55,78,87,.08)':zone.color+'1e');
      if(level>=13){
        ctx.save();ctx.setLineDash([1.35,.85]);ctx.strokeStyle=night?'rgba(214,219,209,.33)':'rgba(78,109,110,.32)';ctx.lineWidth=.15;
        for(const zone of city.urban_zones||[]){trace(zone.polygon,true);ctx.stroke();}
        ctx.restore();
      }
    }
  }
  for(const park of city.parks)fill(park.polygon,night?'#416554':'#91b79c',night?'#6b8472':'#b5cbaa',.18);
  for(const basin of city.harbour_basins||[])fill(basin.polygon,night?'#235f75':'#78adba',night?'#496c77':'#bad7db',.28);
  for(const square of city.squares||[])fill(square.polygon,night?'#9b8b74':'#e7ddca',night?'#c5b39d':'#cabb9e',.25);
  if(state.layers.urban){
    if(level>=13)for(const lane of city.lanes||[])smooth(lane.points,night?'#b8aba0':'#f9f5e9',.32);
    if(level>=9)for(const corridor of city.expressways||[]){
      smooth(corridor.points,night?'#586773':'#af9d85',3.3);
      smooth(corridor.points,night?'#c8c4b5':'#ead8b6',2.5);
    }
    for(const road of city.streets){
      const w=road.class==='avenue'?1.5:road.class==='boulevard'?1.2:.68;
      smooth(road.points,night?'#606d70':'#b5ab97',w+.35);
      smooth(road.points,night?'#dfdbce':'#faf7ed',w);
    }
    for(const site of city.landmarks||[])fill(site.polygon,night?'#c19a65':'#dbab74',night?'#d4b48c':'#ac835d',.23);
    if(level>=15){
      ctx.fillStyle=night?'#5d9073':'#4d8768';
      for(const [x,y] of city.trees||[]){ctx.beginPath();ctx.arc(x,y,.31,0,2*Math.PI);ctx.fill();}
    }
  }
  if(state.layers.canals&&state.layers.water){
    for(const bank of city.quays||[])smooth(bank.points,night?'#bfae9a':'#f8e6cd',.65);
    for(const canal of city.canals){
      smooth(canal.points,night?'#c9c3b7':'#f8efe0',canal.width+1.05);
      smooth(canal.points,night?'#26677d':'#408fa9',canal.width);
    }
    for(const bridge of city.bridges){
      ctx.save();ctx.translate(bridge.x,bridge.y);ctx.rotate(bridge.angle||0);
      const w=bridge.width||1.3,s=bridge.span||3;
      ctx.fillStyle=night?'#565f66':'#958779';ctx.fillRect(-s/2,-w*.7,s,w*1.4);
      ctx.fillStyle=night?'#cfbea5':'#f6e6cb';ctx.fillRect(-s/2,-w/2,s,w);
      ctx.restore();
    }
  }

  if(state.layers.transit&&level>=12){
    for(const line of city.transit_lines||[]){
      ctx.save();ctx.setLineDash(line.kind==='rail'?[1.2,.7]:[.7,.65]);
      smooth(line.points,night?'#243c4f':'rgba(255,255,250,.86)',line.kind==='rail'?1.6:1.3);
      smooth(line.points,line.color,line.kind==='rail'?.63:.50);
      ctx.restore();
    }
    if(level>=17)for(const station of city.stations||[]){
      ctx.beginPath();ctx.arc(station.x,station.y,.75,0,2*Math.PI);
      ctx.fillStyle=night?'#dce8de':'#fffaf2';ctx.fill();
      ctx.lineWidth=.23;ctx.strokeStyle='#31596a';ctx.stroke();
    }
  }
  ctx.restore();
  if(state.layers.zones&&state.layers.labels&&level>=9&&level<19){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(10/state.scale)+'px Arial';
    for(const zone of city.urban_zones||[]){
      const n=zone.polygon.length,x=zone.polygon.reduce((s,p)=>s+p[0],0)/n,y=zone.polygon.reduce((s,p)=>s+p[1],0)/n;
      ctx.strokeStyle='rgba(255,255,247,.95)';ctx.lineWidth=3/state.scale;ctx.strokeText(zone.name,x,y);
      ctx.fillStyle=night?'#e8e5d6':'#35515b';ctx.fillText(zone.name,x,y);
    }
    ctx.restore();
  }
  if(state.layers.labels&&level>=19){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(level>=30?12:10)/state.scale+'px Arial';
    for(const d of city.districts){
      ctx.strokeStyle='rgba(250,250,241,.95)';ctx.lineWidth=3/state.scale;ctx.strokeText(d.name,d.center[0],d.center[1]);
      ctx.fillStyle=night?'#e2e2da':'#3f5459';ctx.fillText(d.name,d.center[0],d.center[1]);
    }
    ctx.restore();
  }
 }
 
 function drawLabel(x,y,title,category='region'){const [sx,sy]=coord([x,y]);const [w,h]=getDim();if(sx<0||sy<0||sx>w||sy>h)return;ctx.save();ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.font=(category==='sea'?'italic 500 14px Georgia':'700 11px Arial');ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(242,245,240,.8)';ctx.strokeText(title,sx,sy);ctx.fillStyle=category==='sea'?'#b8e3e3':'#475c55';ctx.fillText(title,sx,sy);ctx.restore()}
 function drawRoute(){if(!state.route)return;const route=state.route;for(const e of route.edges){let a=state.data.places.find(p=>p.id===e[0]),b=state.data.places.find(p=>p.id===e[1]);if(!a||!b)continue;const mid=[(a.x+b.x)/2+(b.y-a.y)*.06,(a.y+b.y)/2+(a.x-b.x)*.06];const pts=[[a.x,a.y],mid,[b.x,b.y]];polyline(pts,'rgba(21,44,57,.65)',11);polyline(pts,'#f1a22e',6)} }
 function draw(){if(!state.data)return;const [w,h]=getDim();if(!w||!h)return;ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.fillStyle=state.style==='night'?'#0a283b':'#c0d5d9';ctx.fillRect(0,0,w,h);ctx.save();ctx.setTransform(state.dpr*state.scale,0,0,state.dpr*state.scale,state.tx*state.dpr,state.ty*state.dpr);
  const img=state.style==='plan'?plan:terrain;
  if(img.complete&&img.naturalWidth){if(state.style==='night')ctx.filter='brightness(.52) saturate(.65) hue-rotate(20deg)';ctx.drawImage(img,0,0,1500,1400);ctx.filter='none';}
  markerRoadNodes();drawRoute();ctx.restore();
  if(state.layers.labels && state.scale<state.baseScale*7){state.data.labels.forEach(p=>drawLabel(p.x,p.y,p.name,p.kind));}
  syncMarkers();scaleBar();}
 function scaleBar(){const el=$('maps-scale');const dist=90/state.scale*state.data.meta.kilometres_per_unit;const values=[1,2,5,10,20,50,100,200,500,1000];let best=values.reduce((a,b)=>Math.abs(b-dist)<Math.abs(a-dist)?b:a);el.style.width=Math.max(30,Math.min(200,best/state.data.meta.kilometres_per_unit*state.scale))+'px';el.textContent=best+' km';}
 function syncMarkers(){const [w,h]=getDim();const q=state.query.toLowerCase();for(const p of [...state.data.places,...(state.city?.places||[])]){const el=markers.querySelector('[data-id="'+p.id+'"]');if(!el)continue;const [sx,sy]=coord([p.x,p.y]);const isCity=['capitale','metropole','ville'].includes(p.category);let visible=state.layers.places&&sx>=-70&&sx<=w+70&&sy>=-40&&sy<=h+50;
  if(p.cityPOI){
    const level=state.scale/state.baseScale;
    const threshold=p.category==='ville-satellite'?4.2:p.category==='quartier'?12:p.category==='transport'?21:p.category==='monument'?23:26;
    visible=visible&&state.cityMode&&(level>=threshold||state.selected===p.id);
    if(p.category==='quartier'&&level>=24&&state.selected!==p.id)visible=false;
   }
  else if(state.cityMode)visible=false;
  if(state.category!=='all'&&state.category!==p.category)visible=false;
  if(q&&!normalize(p.name+' '+p.type).includes(normalize(q)))visible=false;
  if(!p.cityPOI&&!isCity&&state.scale<state.baseScale*3&&state.selected!==p.id)visible=false;
  el.dataset.hidden=String(!visible);el.classList.toggle('selected',state.selected===p.id);el.style.left=sx+'px';el.style.top=sy+'px';}}
 function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
 function resultIcon(p){if(p.category==='quartier')return '▦';if(p.category==='monument')return '✧';if(p.category==='pont')return '≋';if(p.category==='transport')return '↗';return ['capitale','metropole','ville'].includes(p.category)?'⌂':p.category==='hydro'?'≈':'◆'}
 function listItems(){const q=normalize(state.query);const filtered=(state.cityMode?state.city.places:state.data.places).filter(p=>(state.category==='all'||state.category===p.category)&&(!q||normalize(p.name+' '+p.type+' '+p.description).includes(q)));$('maps-count').textContent=filtered.length;results.replaceChildren();if(!filtered.length){const empty=document.createElement('div');empty.className='maps-no-results';empty.textContent='Aucun lieu trouvé.';results.append(empty);return;}
  for(const p of filtered){const btn=document.createElement('button');btn.type='button';btn.className='maps-result'+(state.selected===p.id?' selected':'');btn.innerHTML='<span class="maps-result-icon '+(p.category==='capitale'||p.category==='metropole'?'city':'')+'">'+resultIcon(p)+'</span><span><strong></strong><small></small></span>';btn.querySelector('strong').textContent=p.name;btn.querySelector('small').textContent=p.type;btn.addEventListener('click',()=>select(p,true));results.append(btn);}}
 function select(p,focusMap=false){state.selected=p.id;listItems();renderDetail(p);if(focusMap)focus(p.x,p.y,p.cityPOI?31:p.category==='capitale'?15:p.category==='ville'?10:8);else schedule();}
 function renderDetail(p){detail.classList.add('has-detail');detail.replaceChildren();const photo=document.createElement('div');photo.className='maps-detail-photo';photo.innerHTML='<img src="../assets/arelia-geographie.webp" alt="Paysage géographique d’Arélia">';detail.append(photo);
  const label=document.createElement('span');label.className='maps-detail-attr';label.textContent=p.type;const name=document.createElement('h2');name.textContent=p.name;const desc=document.createElement('p');desc.textContent=p.description;detail.append(label,name,desc);
  const fact=document.createElement('div');fact.className='maps-detail-fact';fact.textContent=p.population||'Lieu géographique de l’Empire d’Arélia';detail.append(fact);
  const status=document.createElement('div');status.className='maps-detail-fact';status.textContent=p.cityPOI?('Quartier : '+(p.district||'Vésone')+' · '+(p.status||'Plan provisoire')):('Position : '+num(p.x*state.data.meta.kilometres_per_unit)+' km E / '+num(p.y*state.data.meta.kilometres_per_unit)+' km S (repère fictif)');detail.append(status);
  const action=document.createElement('a');action.className='maps-detail-cta';action.href=wikiHref(p);action.textContent='Consulter la fiche du wiki ↗';detail.append(action);
  const closer=document.createElement('button');closer.type='button';closer.className='maps-detail-zoom';closer.textContent='Zoomer sur le lieu +';closer.addEventListener('click',()=>focus(p.x,p.y,p.cityPOI?33:16));detail.append(closer);
  const from=document.createElement('button');from.className='maps-detail-zoom';from.textContent='Choisir comme départ';from.addEventListener('click',()=>{$('maps-from').value=p.id;$('maps-to').focus()});if(['capitale','metropole','ville'].includes(p.category))detail.append(from);
 }
 function makeMarkers(){for(const p of [...state.data.places,...state.city.places]){const el=document.createElement('button');el.type='button';el.className='maps-marker '+(p.cityPOI?'local '+p.category+' ': '')+(p.category==='capitale'?'capitale':p.category==='nature'||p.category==='hydro'?'nature':p.category==='ville'?'city-minor':'');el.dataset.id=p.id;el.setAttribute('aria-label','Ouvrir '+p.name);el.innerHTML='<span class="maps-marker-label"></span><span class="dot"></span>';el.querySelector('.maps-marker-label').textContent=p.name;el.addEventListener('click',e=>{e.stopPropagation();select(p,false)});markers.append(el);}}
 function setupRoutes(){const cities=state.data.places.filter(p=>['capitale','metropole','ville'].includes(p.category));for(const p of cities){for(const id of ['maps-from','maps-to']){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;$(id).append(option)}}$('maps-from').value='occidian';$('maps-to').value='vesone';}
 function route(){const from=$('maps-from').value,to=$('maps-to').value;if(!from||!to||from===to){detail.textContent='Choisissez deux villes différentes.';detail.classList.add('has-detail');return;}const graph={};for(const p of state.data.places)graph[p.id]=[];for(const road of state.data.roads){for(let i=0;i<road.cities.length-1;i++){const a=state.data.places.find(p=>p.id===road.cities[i]),b=state.data.places.find(p=>p.id===road.cities[i+1]);if(!a||!b)continue;const km=Math.hypot(a.x-b.x,a.y-b.y)*state.data.meta.kilometres_per_unit*1.15;graph[a.id].push({to:b.id,km});graph[b.id].push({to:a.id,km})}}
 const dist=Object.fromEntries(Object.keys(graph).map(k=>[k,Infinity])),prev={},visited=new Set();dist[from]=0;while(true){let u=null;for(const k of Object.keys(dist)){if(!visited.has(k)&&(u===null||dist[k]<dist[u]))u=k}if(u===null||!isFinite(dist[u])||u===to)break;visited.add(u);for(const edge of graph[u]){const n=dist[u]+edge.km;if(n<dist[edge.to]){dist[edge.to]=n;prev[edge.to]=u}}}
 if(!isFinite(dist[to])){detail.innerHTML='<p>Itinéraire non disponible dans le réseau schématique.</p>';detail.classList.add('has-detail');return}
 const order=[to];let cur=to;while(cur!==from&&prev[cur]){cur=prev[cur];order.unshift(cur)}state.route={edges:order.slice(1).map((x,i)=>[order[i],x]),distance:Math.round(dist[to])};const source=state.data.places.find(p=>p.id===from),target=state.data.places.find(p=>p.id===to);detail.classList.add('has-detail');detail.replaceChildren();const title=document.createElement('h2');title.textContent='Itinéraire';detail.append(title);const intro=document.createElement('p');intro.textContent=source.name+' → '+target.name;detail.append(intro);const message=document.createElement('div');message.className='maps-route-message';message.textContent=num(state.route.distance)+' km · Distance approximative sur les corridors représentés';detail.append(message);const via=document.createElement('p');via.textContent='Via : '+order.map(id=>state.data.places.find(p=>p.id===id)?.name||id).join(' · ');detail.append(via);const info=document.createElement('p');info.textContent='Le tracé est schématique. Ni temps de trajet ni données de circulation ne sont simulés.';detail.append(info);const xs=order.map(id=>state.data.places.find(p=>p.id===id).x),ys=order.map(id=>state.data.places.find(p=>p.id===id).y);focus((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2,3);}
 function enterCity(){state.cityMode=true;state.metroMode=false;host.closest('.arelia-map-wrap').classList.remove('maps-metro-mode');state.category='all';state.query='';$('maps-search').value='';state.selected=null;state.route=null;
  host.closest('.arelia-map-wrap').classList.add('maps-city-mode');$('maps-visit-empire').hidden=false;
  $('maps-scope-caption').textContent='PLAN DE VÉSONE · TRACÉS PROVISOIRES';
  document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('is-active',b.dataset.cat==='all'));
  focus(1110,698,23);listItems();renderCityOverview();schedule();}
 function leaveCity(){state.cityMode=false;state.metroMode=false;host.closest('.arelia-map-wrap').classList.remove('maps-metro-mode');state.category='all';state.query='';$('maps-search').value='';state.selected=null;state.route=null;
  host.closest('.arelia-map-wrap').classList.remove('maps-city-mode');$('maps-visit-empire').hidden=true;
  $('maps-scope-caption').textContent='CARTE NATIONALE · NORD ↑';
  document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('is-active',b.dataset.cat==='all'));
  initial();listItems();renderCountryOverview();schedule();}
 function enterMetro(){
    enterCity();state.metroMode=true;host.closest('.arelia-map-wrap').classList.add('maps-metro-mode');
    $('maps-scope-caption').textContent='GRAND VÉSONE · SCHÉMA MÉTROPOLITAIN';
    const [w,h]=getDim(),z=Math.max(state.baseScale*2,Math.min(w*.86/300,h*.78/235,state.baseScale*13));
    state.scale=z;state.tx=w/2-1110*z;state.ty=h/2-698*z;clamp();listItems();renderMetroOverview();schedule();
  }
  function renderMetroOverview(){
    detail.classList.toggle('has-detail',window.innerWidth>700);detail.replaceChildren();
    const attr=document.createElement('span');attr.className='maps-detail-attr';attr.textContent='AGGLOMÉRATION IMPÉRIALE';
    const title=document.createElement('h2');title.textContent='Le Grand Vésone';
    const desc=document.createElement('p');desc.textContent='Capitale entourée de villes satellites, corridors verts et axes express. Les tracés restent provisoires.';
    const info=document.createElement('div');info.className='maps-route-message';const m=state.city.metropolitan;
    info.textContent=m.satellites.length+' pôles urbains · '+m.roads.length+' axes routiers · '+m.regional_rail.length+' lignes express';
    detail.append(attr,title,desc,info);
  }
  function renderCityOverview(){detail.classList.toggle('has-detail',window.innerWidth>700);detail.replaceChildren();
  const span=document.createElement('span');span.className='maps-detail-attr';span.textContent='CAPITALE IMPÉRIALE';detail.append(span);
  const h=document.createElement('h2');h.textContent='Vésone, cité des canaux';detail.append(h);
  const paragraph=document.createElement('p');paragraph.textContent='Explorez sept quartiers, leurs ponts et leurs monuments. Les rues et les localisations urbaines sont des propositions de conception.';detail.append(paragraph);
  const info=document.createElement('div');info.className='maps-route-message';info.textContent=`${state.city.urban_zones.length} secteurs · ${state.city.stations.length} stations · ${state.city.canals.length} canaux · ${state.city.bridges.length} ponts · ${state.city.places.length} lieux indexés`;detail.append(info);
  const link=document.createElement('a');link.className='maps-detail-cta';link.href='../wiki/vesone/';link.textContent='En savoir plus sur Vésone ↗';detail.append(link);
  const status=document.createElement('p');status.className='maps-urban-status';status.textContent='Carte fictive, non cadastrale. Navigation par déplacement, zoom et recherche.';detail.append(status);
 }
 function renderCountryOverview(){detail.classList.remove('has-detail');detail.innerHTML='<div class="maps-detail-idle"><span class="maps-overline">ATLAS IMPÉRIAL</span><h2>Explorer Arélia.</h2><p>Choisissez une ville sur le territoire, ou cliquez sur « Vésone » pour découvrir les rues et les canaux.</p></div>'}
 function setup(){const area=host;let start=null;area.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,select'))return;area.setPointerCapture(e.pointerId);start={x:e.clientX,y:e.clientY,tx:state.tx,ty:state.ty};area.classList.add('grabbing')});area.addEventListener('pointermove',e=>{if(!start)return;state.tx=start.tx+e.clientX-start.x;state.ty=start.ty+e.clientY-start.y;clamp();schedule()});const stop=()=>{start=null;area.classList.remove('grabbing')};area.addEventListener('pointerup',stop);area.addEventListener('pointercancel',stop);
  area.addEventListener('wheel',e=>{e.preventDefault();const rect=area.getBoundingClientRect();zoom(e.deltaY<0?1.23:.81,e.clientX-rect.left,e.clientY-rect.top)},{passive:false});area.addEventListener('dblclick',e=>{const r=area.getBoundingClientRect();zoom(1.7,e.clientX-r.left,e.clientY-r.top)});
  area.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.cityMode){leaveCity();return;}const delta=70;if(e.key==='ArrowLeft')state.tx+=delta;else if(e.key==='ArrowRight')state.tx-=delta;else if(e.key==='ArrowUp')state.ty+=delta;else if(e.key==='ArrowDown')state.ty-=delta;else if(e.key==='+'||e.key==='=')zoom(1.4);else if(e.key==='-')zoom(.7);else return;e.preventDefault();clamp();schedule()});
  $('maps-visit-vesone').onclick=enterCity;$('maps-visit-metro').onclick=enterMetro;$('maps-visit-empire').onclick=leaveCity;
  $('maps-zoom-in').onclick=()=>zoom(1.6);$('maps-zoom-out').onclick=()=>zoom(.625);$('maps-home').onclick=()=>state.metroMode?enterMetro():state.cityMode?focus(1110,698,23):initial();
  for(const b of document.querySelectorAll('[data-style]'))b.onclick=()=>{state.style=b.dataset.style;document.querySelectorAll('[data-style]').forEach(v=>v.classList.toggle('selected',v===b));schedule()};
  const lp=$('maps-layers');$('maps-layers-toggle').onclick=()=>{lp.hidden=!lp.hidden;$('maps-layers-toggle').setAttribute('aria-expanded',String(!lp.hidden))};document.addEventListener('pointerdown',e=>{if(!lp.hidden&&!lp.contains(e.target)&&!$('maps-layers-toggle').contains(e.target)){$('maps-layers-toggle').setAttribute('aria-expanded','false');lp.hidden=true}});
  for(const checkbox of document.querySelectorAll('[data-layer]'))checkbox.onchange=()=>{state.layers[checkbox.dataset.layer]=checkbox.checked;schedule()};
  $('maps-search').oninput=e=>{state.query=e.target.value;listItems();schedule()};for(const b of document.querySelectorAll('[data-cat]'))b.onclick=()=>{state.category=b.dataset.cat;document.querySelectorAll('[data-cat]').forEach(t=>t.classList.toggle('is-active',t===b));listItems();schedule()};
  $('maps-route').onclick=route;$('maps-route-clear').onclick=()=>{state.route=null;detail.classList.remove('has-detail');detail.innerHTML='<div class="maps-detail-idle"><span class="maps-overline">CARTE GÉOGRAPHIQUE</span><h2>Itinéraire effacé.</h2><p>Sélectionnez une destination ou un autre trajet.</p></div>';schedule()};
  window.addEventListener('resize',()=>{const [w,h]=getDim();const ox=(w/2-state.tx)/state.scale,oy=(h/2-state.ty)/state.scale;const prev=state.baseScale;state.baseScale=Math.min(w/1500,h/1400)*.94;state.scale*=state.baseScale/(prev||state.baseScale);state.tx=w/2-ox*state.scale;state.ty=h/2-oy*state.scale;clamp();resize()});
 }
 async function init(){try{const [r,cityResponse]=await Promise.all([fetch('../assets/arelia-map-data.json'),fetch('../assets/vesone-city.json'),new Promise(resolve=>{let count=0;const fn=()=>{count++;if(count===2)resolve()};for(const img of [terrain,plan]){if(img.complete&&img.naturalWidth)fn();else{img.addEventListener('load',fn,{once:true});img.addEventListener('error',fn,{once:true})}}})]);if(!r.ok)throw Error('Impossible de charger les données locales');state.data=await r.json();if(!cityResponse.ok)throw Error('Plan urbain de Vésone indisponible');state.city=await cityResponse.json();state.city.places.forEach(p=>p.cityPOI=true);makeMarkers();setupRoutes();setup();initial();resize();listItems();$('maps-loading').hidden=true;const view=new URLSearchParams(window.location.search).get('vue');if(view==='metropole')enterMetro();else if(view==='vesone')enterCity();}catch(err){$('maps-loading').innerHTML='<span>Erreur de chargement de la carte. Vérifiez les fichiers du site et rechargez la page.</span>';console.error(err)}}
 init();
})();
