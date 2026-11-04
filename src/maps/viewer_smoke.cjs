/* Arélia Maps : exercice d'intégration sans navigateur ni téléchargement externe.
   Simule les méthodes DOM / Canvas nécessaires à l'initialisation du portail. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {setTimeout:setTimeoutReal}=require('node:timers/promises');
const root=path.resolve(__dirname,'../..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const geo=load('site/assets/arelia-map-data.json');
const vesone=load('site/assets/vesone-city.json');
const others=load('site/assets/arelia-other-cities.json');
const js=fs.readFileSync(path.join(root,'site/assets/arelia-maps.js'),'utf8');
const routing=require('../../site/assets/arelia-routing.js');
const nationalRouting=require('../../site/assets/arelia-national-routing.js');
const urbanRouting=require('../../site/assets/arelia-urban-routing.js');
const roadGaps=require('../../site/assets/arelia-road-gaps.js');
const roadDetail=require('../../site/assets/arelia-road-detail.js');
const urbanScene=require('../../site/assets/arelia-urban-scene.js');
const display=require('../../site/assets/arelia-display.js');
const world=require('../../site/assets/arelia-world.js');
const spatial=require('../../site/assets/arelia-spatial.js');
const cartographicDetail=require('../../site/assets/arelia-detail.js');
const audit=require('../../site/assets/arelia-geo-audit.js');
const measure=require('../../site/assets/arelia-measure.js');

function fakeDOM(search){
 let frames=0;const els=new Map();
 class ClassList {
   constructor(){this.set=new Set()}
   add(...names){names.forEach(n=>this.set.add(n))}
   remove(...names){names.forEach(n=>this.set.delete(n))}
   contains(name){return this.set.has(name)}
   toggle(name,force){if(force===undefined? !this.set.has(name):force)this.add(name);else this.remove(name);return this.set.has(name)}
 }
 const wrap={classList:new ClassList()};
 class El {
   constructor(tag='div',id=''){
     this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.dataset={};this.style={};this.classList=new ClassList();
     this.hidden=false;this.checked=true;this.value='';this.textContent='';this.clientWidth=940;this.clientHeight=650;
     this.attrs={};this.handlers={};this._html='';this._label=null;this.parentNode=null;
   }
   append(...items){for(const item of items){this.children.push(item);if(item&&typeof item==='object')item.parentNode=this}}
   prepend(...items){this.children.unshift(...items)}
   replaceChildren(...items){this.children=[];this.append(...items)}
   set innerHTML(v){this._html=String(v);if(v.includes('maps-marker-label'))this._label=new El('span')}
   get innerHTML(){return this._html}
   querySelector(selector){
     if(selector==='.maps-marker-label')return this._label;
     if(selector==='strong'||selector==='small'){
       if(!this._query)this._query=new Map();
       if(!this._query.has(selector))this._query.set(selector,new El(selector));
       return this._query.get(selector);
     }
     if(selector==='.maps-detail-dismiss')return this.children.find(c=>c?.className==='maps-detail-dismiss')||null;
     const m=selector.match(/^\[data-id="([^"]+)"\]$/);
     if(m)return this.children.find(c=>c?.dataset?.id===m[1])||null;
     return null;
   }
   querySelectorAll(){return []}
   addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)}
   setAttribute(k,v){this.attrs[k]=String(v)}
   getAttribute(k){return this.attrs[k]}
   closest(sel){if(sel==='.arelia-map-wrap')return wrap;return null}
   getBoundingClientRect(){return {left:0,top:0,right:this.clientWidth,bottom:this.clientHeight,width:this.clientWidth,height:this.clientHeight}}
   focus(){}
   setPointerCapture(){}
   hasPointerCapture(){return false}
   releasePointerCapture(){}
   remove(){}
 }
 const tags=[
 'maps-canvas-area','maps-canvas','maps-results','maps-detail','maps-markers','maps-metro-from','maps-metro-to',
 'maps-metro-trace','maps-metro-clear','maps-metro-mode','maps-scale','maps-zoom-band','maps-count','maps-from',
 'maps-to','maps-other-cities','maps-metro-routing','maps-search','maps-visit-empire','maps-scope-caption',
 'maps-visit-vesone','maps-visit-metro','maps-audit-open','maps-measure-toggle','maps-measure-panel','maps-measure-value','maps-measure-hint','maps-measure-relief','maps-measure-undo','maps-measure-clear','maps-measure-close','maps-zoom-in','maps-zoom-out','maps-home','maps-layers',
 'maps-layers-toggle','maps-altitude-readout','maps-route','maps-route-clear','maps-loading'
 ];
 for(const id of tags)els.set(id,new El(id==='maps-canvas'?'canvas':'div',id));
 const methods=['fillRect','save','restore','beginPath','moveTo','lineTo','closePath','clip','fill','stroke','setTransform',
  'setLineDash','arc','ellipse','translate','rotate','fillText','strokeText','quadraticCurveTo','drawImage','strokeRect','clearRect'];
 const core={};for(const m of methods)core[m]=()=>{if(m==='fillRect')frames++};
 const canvasCtx=new Proxy(core,{get(obj,k){if(k in obj)return obj[k];if(typeof k==='symbol')return undefined;return ()=>undefined},set(obj,k,v){obj[k]=v;return true}});
 els.get('maps-canvas').getContext=()=>canvasCtx;
 const cats=['all','capitale','metropole','nature','bourg','ville-satellite','quartier','monument','pont'];
 const styles=['game','plan','terrain','night'];
 const layers=['proposed','gaps','junctions','details','shading','roads','rail','water','places','labels','metro','metroRail','urban','canals','zones','transit','relief','lowlands'];
 const controls={
  '[data-cat]':cats.map(cat=>{const e=new El('button');e.dataset.cat=cat;return e}),
  '[data-style]':styles.map(style=>{const e=new El('button');e.dataset.style=style;return e}),
  '[data-layer]':layers.map(layer=>{const e=new El('input');e.dataset.layer=layer;return e})
 };
 const document={
  getElementById:id=>els.get(id)||null,
  createElement:tag=>new El(tag),
  querySelectorAll:selector=>controls[selector]||[],
  addEventListener:()=>{}
 };
 class FakeImage{constructor(){this.complete=true;this.naturalWidth=1500;this.naturalHeight=1400;this.src=''}addEventListener(){}}
 class FakeObserver{constructor(){}observe(){}disconnect(){}}
 const errors=[];
 const fakeWindow={devicePixelRatio:1,innerWidth:1280,location:{search},AreliaRouting:routing,AreliaDisplay:display,AreliaWorld:world,AreliaSpatial:spatial,AreliaDetail:cartographicDetail,AreliaNationalRouting:nationalRouting,AreliaUrbanRouting:urbanRouting,AreliaRoadGaps:roadGaps,AreliaRoadDetail:roadDetail,AreliaUrbanScene:urbanScene,AreliaGeoAudit:audit,AreliaMeasure:measure,addEventListener:()=>{}};
 const sandbox={
  document,window:fakeWindow,Image:FakeImage,MutationObserver:FakeObserver,ResizeObserver:FakeObserver,
  fetch:async url=>({ok:true,json:async()=>structuredClone(url.includes('vesone-city')?vesone:url.includes('arelia-other-cities')?others:geo)}),
  requestAnimationFrame:cb=>setImmediate(cb),
  cancelAnimationFrame:()=>{},URLSearchParams,Promise,Set,Map,Math,Number,Date,Object,String,Array,Boolean,
  console:{error:(...args)=>errors.push(args.map(String).join(' ')),log:()=>{}},setTimeout,clearTimeout
 };
 return {sandbox,els,errors,wrap,get frames(){return frames}};
}
async function scenario(query){
 const ui=fakeDOM(query);vm.runInNewContext(js,ui.sandbox,{filename:'arelia-maps.js',timeout:30000});
 await setTimeoutReal(500);
 assert.deepEqual(ui.errors,[],'Erreur JS au démarrage : '+query+'\n'+ui.errors.join('\n'));
 assert.equal(ui.els.get('maps-loading').hidden,true,'Carte non chargée : '+query);
 assert.ok(ui.frames>0,'Canvas non dessiné : '+query);
 assert.ok(ui.els.get('maps-markers').children.length>850,'Couverture nationale et sites naturels manquants : '+query);
 assert.ok(ui.els.get('maps-count').textContent!==undefined,'Liste absente : '+query);
 if(query==='?vue=occidian'||query==='?vue=katoru'){
   const id=query.split('=')[1];
   assert.equal(ui.els.get('maps-other-cities').value,id);
   assert.ok(ui.wrap.classList.contains('maps-secondary-mode'),'Vue urbaine non ouverte : '+id);
   assert.ok(ui.els.get('maps-zoom-band').textContent.includes('zoom ×18'),'Les détails urbains ne sont pas visibles dès l’ouverture : '+id);
   const diagnostic=ui.els.get('maps-detail').children.find(x=>x?.textContent==='Diagnostiquer le réseau routier');
   assert.ok(diagnostic&&typeof diagnostic.onclick==='function','Diagnostic routier manquant : '+id);
   diagnostic.onclick();
   const panel=ui.els.get('maps-detail').children.find(x=>x?.className==='maps-network-status');
   assert.ok(panel?.textContent.includes('composantes'),'Diagnostic routier incomplet : '+id);
   const gapList=ui.els.get('maps-detail').children.find(x=>x?.className==='maps-road-gaps-list');
   if(id==='occidian'){
    assert.equal(gapList?.children.length,3,'Occidian doit exposer ses trois ruptures');
    assert.equal(typeof gapList.children[0].onclick,'function','Centrage des ruptures absent');
    gapList.children[0].onclick();
    await setTimeoutReal(30);
    assert.ok(gapList.children[0].classList.contains('selected'),'Rupture non sélectionnée');
    assert.deepEqual(ui.errors,[],'Erreur après navigation vers une rupture');
   }else{
    assert.ok(!gapList,'Une ville sans rupture ne doit pas afficher de faux fragments');
   }
 }
 if(query==='?vue=vesone')assert.ok(ui.wrap.classList.contains('maps-city-mode'));
 if(query==='?vue=metropole')assert.ok(ui.wrap.classList.contains('maps-metro-mode'));
 if(!query){
   assert.equal(typeof ui.els.get('maps-audit-open').onclick,'function');
   const b=ui.els.get('maps-measure-toggle');assert.equal(typeof b.onclick,'function');
   b.onclick();assert.equal(ui.els.get('maps-measure-panel').hidden,false);
   const area=ui.els.get('maps-canvas-area');
   const pointer=(type,x,y)=>area.handlers[type].forEach(fn=>fn({type,clientX:x,clientY:y,pointerId:1,pointerType:'mouse',target:{closest:()=>false},preventDefault:()=>{}}));
   pointer('pointerdown',300,240);pointer('pointerup',300,240);
   pointer('pointerdown',360,270);pointer('pointerup',360,270);
   assert.ok(ui.els.get('maps-measure-value').textContent.includes('km'),'Mesure absente');
   ui.els.get('maps-measure-undo').onclick();
   ui.els.get('maps-measure-clear').onclick();
   assert.equal(ui.els.get('maps-measure-value').textContent,'0 km');
   ui.els.get('maps-measure-close').onclick();assert.equal(ui.els.get('maps-measure-panel').hidden,true);
   ui.els.get('maps-audit-open').onclick();
   const report=ui.els.get('maps-detail').children.map(x=>x?.textContent||'').join(' ');
   assert.ok(report.includes('Franchissements à qualifier'),'Rapport d’audit non affiché');
   const anomalyPanel=ui.els.get('maps-detail').children.find(x=>x?.className==='maps-audit-list');
   assert.ok(anomalyPanel?.children?.length>3,'Liste des anomalies non navigable');
   assert.equal(typeof anomalyPanel.children[1].onclick,'function');
   const pageControl=anomalyPanel.children.at(-1);
   const next=pageControl.children.find(x=>x.className==='maps-audit-next');
   assert.ok(next&&!next.disabled,'Les ouvrages doivent être paginés');
   const firstText=anomalyPanel.children[1].textContent;
   next.onclick();
   assert.notEqual(anomalyPanel.children[1].textContent,firstText,'Navigation des ouvrages inactive');
   const previous=anomalyPanel.children.at(-1).children.find(x=>x.className==='maps-audit-previous');
   previous.onclick();
   assert.equal(anomalyPanel.children[1].textContent,firstText,'Retour à la page initiale impossible');
   anomalyPanel.children[1].onclick();
   await setTimeoutReal(20);
   assert.deepEqual(ui.errors,[],'Erreur au survol des anomalies');
   ui.els.get('maps-route').onclick();
   await setTimeoutReal(100);
   assert.deepEqual(ui.errors,[],'Erreur de parcours national : '+ui.errors.join(' ; '));
   const text=ui.els.get('maps-detail').children.map(x=>x?.textContent||'').join(' ');
   assert.ok(text.includes('itinéraire')||text.includes('Itinéraire'),'Fiche itinéraire non visible');
   assert.ok(text.includes('km'),'Distance du parcours absente');
   ui.els.get('maps-from').value='localite-0001';ui.els.get('maps-to').value='vesone';
   ui.els.get('maps-route').onclick();
   await setTimeoutReal(100);
   assert.deepEqual(ui.errors,[],'Erreur itinéraire rural : '+ui.errors.join(' ; '));
   const rural=ui.els.get('maps-detail').children.map(x=>x?.textContent||'').join(' ');
   assert.ok(rural.includes('km'),'Trajet rural non affiché');
   // Métropole -> quartier d'une autre ville : vrai routage multi-échelles.
   ui.els.get('maps-from').value='v-palais';ui.els.get('maps-to').value='katoru-secteur-0';
   ui.els.get('maps-route').onclick();
   assert.deepEqual(ui.errors,[],'Erreur itinéraire interurbain précis : '+ui.errors.join(' ; '));
   const urban=ui.els.get('maps-detail').children.map(x=>x?.textContent||'').join(' ');
   assert.ok(urban.includes('km')&&urban.includes('Palais'),'Trajet palais vers quartier absent');
   ui.els.get('maps-from').value='sat-belrives';ui.els.get('maps-to').value='v-forum';
   ui.els.get('maps-route').onclick();
   assert.deepEqual(ui.errors,[],'Erreur de trajet métropolitain précis : '+ui.errors.join(' ; '));
   const metro=ui.els.get('maps-detail').children.map(x=>x?.textContent||'').join(' ');
   assert.ok(metro.includes('km'),'Trajet satellite vers centre absent');
   const groups=ui.els.get('maps-from').children;
   assert.ok(groups.length>=3&&groups[2].children.length>=100,'Quartiers non sélectionnables');
 }
 console.log('Vue testée : '+(query||'nationale')+', '+ui.els.get('maps-markers').children.length+' marqueurs.');
}
(async()=>{
 for(const q of ['','?vue=vesone','?vue=occidian','?vue=katoru','?vue=metropole'])await scenario(q);
 console.log('Contrôle navigateur simulé terminé sans erreur.');
})().catch(e=>{console.error(e);process.exitCode=1});
