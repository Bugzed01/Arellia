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
const display=require('../../site/assets/arelia-display.js');
const world=require('../../site/assets/arelia-world.js');

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
 'maps-visit-vesone','maps-visit-metro','maps-zoom-in','maps-zoom-out','maps-home','maps-layers',
 'maps-layers-toggle','maps-altitude-readout','maps-route','maps-route-clear','maps-loading'
 ];
 for(const id of tags)els.set(id,new El(id==='maps-canvas'?'canvas':'div',id));
 const methods=['fillRect','save','restore','beginPath','moveTo','lineTo','closePath','clip','fill','stroke','setTransform',
  'setLineDash','arc','ellipse','translate','rotate','fillText','strokeText','quadraticCurveTo','drawImage','strokeRect','clearRect'];
 const core={};for(const m of methods)core[m]=()=>{if(m==='fillRect')frames++};
 const canvasCtx=new Proxy(core,{get(obj,k){if(k in obj)return obj[k];if(typeof k==='symbol')return undefined;return ()=>undefined},set(obj,k,v){obj[k]=v;return true}});
 els.get('maps-canvas').getContext=()=>canvasCtx;
 const cats=['all','capitale','metropole','nature','bourg','ville-satellite','quartier','monument','pont'];
 const styles=['plan','terrain','night'];
 const layers=['roads','rail','water','places','labels','metro','metroRail','urban','canals','zones','transit','relief','lowlands'];
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
 const fakeWindow={devicePixelRatio:1,innerWidth:1280,location:{search},AreliaRouting:routing,AreliaDisplay:display,AreliaWorld:world,addEventListener:()=>{}};
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
 assert.ok(ui.els.get('maps-markers').children.length>700,'Marqueurs manquants : '+query);
 assert.ok(ui.els.get('maps-count').textContent!==undefined,'Liste absente : '+query);
 if(query==='?vue=occidian'||query==='?vue=katoru'){
   const id=query.split('=')[1];
   assert.equal(ui.els.get('maps-other-cities').value,id);
   assert.ok(ui.wrap.classList.contains('maps-secondary-mode'),'Vue urbaine non ouverte : '+id);
 }
 if(query==='?vue=vesone')assert.ok(ui.wrap.classList.contains('maps-city-mode'));
 if(query==='?vue=metropole')assert.ok(ui.wrap.classList.contains('maps-metro-mode'));
 console.log('Vue testée : '+(query||'nationale')+', '+ui.els.get('maps-markers').children.length+' marqueurs.');
}
(async()=>{
 for(const q of ['','?vue=vesone','?vue=occidian','?vue=katoru','?vue=metropole'])await scenario(q);
 console.log('Contrôle navigateur simulé terminé sans erreur.');
})().catch(e=>{console.error(e);process.exitCode=1});
