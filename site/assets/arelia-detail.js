/* Arélia Maps 1.7 — détails continus des territoires de l'île.
   Référentiel fictif XY : tous les éléments sont procéduraux et NON canoniques.
   Aucune tuile, texture ou donnée de la carte de GTA V n'est utilisée. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./arelia-world.js'):root.AreliaWorld);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaDetail=api;
})(typeof window==='undefined'?globalThis:window,function(world){
 'use strict';
 const VERSION='1.7.0',TILE=24,MAX_CACHE=180,cache=new Map();
 const round=n=>Math.round(n*1000)/1000;
 const pt=(x,y)=>[round(x),round(y)];
 const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const rng=s=>()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 const seedFor=(i,j)=>((Math.imul(i+8192,1103515245)^Math.imul(j+8192,2246822519)^20261104)>>>0);
 const inTile=(p,ox,oy,pad=.28)=>p[0]>=ox+pad&&p[0]<=ox+TILE-pad&&p[1]>=oy+pad&&p[1]<=oy+TILE-pad;
 function lineOnLand(points,geo){
  if(!points?.length)return false;
  for(let i=0;i<points.length;i++){
   if(!world.isLand(points[i],geo))return false;
   if(i){
    const a=points[i-1],b=points[i],count=Math.max(1,Math.ceil(len(a,b)/.75));
    for(let j=1;j<count;j++){
     const t=j/count;
     if(!world.isLand([a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t],geo))return false;
    }
   }
  }
  return true;
 }
 function shape(x,y,rx,ry,angle,n=7,roughness=0){
  const pts=[];
  for(let k=0;k<n;k++){
   const theta=k*Math.PI*2/n+angle;
   const wrinkle=1+roughness*Math.sin(k*9.17+angle*3);
   pts.push(pt(x+Math.cos(theta)*rx*wrinkle,y+Math.sin(theta)*ry*wrinkle));
  }
  return pts;
 }
 const STYLES={
  foret:{ground:'#98b592',edge:'#7e9d7f',foliage:'#608866'},
  'foret-humide':{ground:'#8bac8c',edge:'#6f9c7a',foliage:'#4d886c'},
  coniferes:{ground:'#a6b89c',edge:'#779380',foliage:'#597968'},
  cultures:{ground:'#c9c79c',edge:'#aaa987',foliage:'#829872'},
  prairie:{ground:'#b9c99f',edge:'#9eb791',foliage:'#759b76'},
  steppe:{ground:'#d3c9a6',edge:'#b6ac8c',foliage:'#9a9c77'},
  desert:{ground:'#dbc79d',edge:'#ccad83',foliage:'#af9b77'},
  marais:{ground:'#a4bfb0',edge:'#80aa9e',foliage:'#518d81'},
  roche:{ground:'#b2b3a8',edge:'#969f9a',foliage:'#889184'},
  glacier:{ground:'#e0e8e7',edge:'#b7cdd0',foliage:'#9db9bc'}
 };
 function tile(geo,base,i,j){
  if(!base)return null;
  const id=i+','+j;
  if(cache.has(id)){
   const old=cache.get(id);cache.delete(id);cache.set(id,old);return old;
  }
  const rand=rng(seedFor(i,j)),ox=i*TILE,oy=j*TILE,kind=base.kind;
  const accepts=p=>inTile(p,ox,oy)&&world.isLand(p,geo);
  const acceptShape=poly=>poly.every(accepts);
  const style=STYLES[kind]||STYLES.prairie;
  const meadows=[],parcels=[],groves=[],paths=[],ponds=[],structures=[],orchards=[],scrub=[];
  const agricultural=['cultures','prairie','steppe'].includes(kind);
  const woodland=['foret','foret-humide','coniferes'].includes(kind);
  const wet=['marais','foret-humide'].includes(kind);
  const hostile=['glacier','roche'].includes(kind);
  // Grandes taches locales irrégulières : aucune tessellation carrée visible.
  const patchCount=hostile?8:woodland?18:22;
  for(let k=0;k<patchCount;k++){
   const x=ox+2+rand()*20,y=oy+2+rand()*20;
   const poly=shape(x,y,1.1+rand()*3.6,.6+rand()*2.8,rand()*6,9,.14);
   if(acceptShape(poly))meadows.push({polygon:poly,tone:rand()});
  }
  if(agricultural||kind==='desert'){
   const count=kind==='desert'?18:65;
   for(let k=0;k<count;k++){
    const x=ox+1.4+rand()*21.2,y=oy+1.4+rand()*21.2;
    const w=.45+rand()*1.95,h=.37+rand()*1.7,a=rand()*2.5-.7;
    const poly=shape(x,y,w,h,a,4);
    if(acceptShape(poly))parcels.push({polygon:poly,tone:rand(),furrows:rand()>.43,center:pt(x,y),angle:a,w,h});
   }
  }
  if(woodland||wet||kind==='prairie'){
   const n=woodland?68:wet?51:20;
   for(let k=0;k<n;k++){
    const x=ox+.7+rand()*22.6,y=oy+.7+rand()*22.6;
    const r=.13+rand()*(woodland?.55:.35);
    if(accepts([x,y]))groves.push({x:round(x),y:round(y),r:round(r),tone:rand()});
   }
  }
  if(wet){
   for(let k=0;k<18;k++){
    const x=ox+1+rand()*22,y=oy+1+rand()*22;
    const polygon=shape(x,y,.36+rand()*1.1,.18+rand()*.7,rand()*6,9,.13);
    if(acceptShape(polygon))ponds.push({polygon,kind:'mare'});
   }
  }
  // Chemins et pistes latéraux raccordés à la voirie de base de la tuile.
  if(!hostile){
   const trunk=base.tracks||[];
   for(const road of trunk)if(lineOnLand(road.points,geo))paths.push({kind:'piste',points:road.points});
   for(let k=0;k<15;k++){
    const road=trunk[k%Math.max(1,trunk.length)];
    if(!road?.points?.length)break;
    const p=road.points[1+(k%Math.max(1,road.points.length-2))]||road.points[0];
    const x=p[0]+(rand()-.5)*3,y=p[1]+(rand()-.5)*3;
    const end=pt(x+(rand()-.5)*13,y+(rand()-.5)*13);
    const mid=pt((x+end[0])/2+(rand()-.5)*2.8,(y+end[1])/2+(rand()-.5)*2.8);
    const pts=[pt(x,y),mid,end];
    if(pts.every(accepts)&&lineOnLand(pts,geo))paths.push({kind:k%5===0?'vicinale':'sentier',points:pts});
   }
  }
  // Fermes, bâtiments dispersés, petits hameaux sans toponymes canoniques.
  if(!hostile&&kind!=='marais'){
   const siteCount=agricultural?18:woodland?8:kind==='desert'?6:10;
   for(let k=0;k<siteCount;k++){
    const x=ox+2+rand()*20,y=oy+2+rand()*20,a=rand()*Math.PI;
    const isHamlet=k<2&&rand()>.35,group=isHamlet?6+Math.floor(rand()*9):1+Math.floor(rand()*3);
    const site=[];
    for(let j=0;j<group;j++){
     const sx=x+(rand()-.5)*(isHamlet?3:1.6),sy=y+(rand()-.5)*(isHamlet?3:1.6);
     const poly=shape(sx,sy,.11+rand()*.28,.13+rand()*.32,a,4);
     if(acceptShape(poly))site.push({polygon:poly,tone:rand()});
    }
    if(site.length)structures.push(...site);
   }
  }
  if(agricultural){
   for(let k=0;k<16;k++){
    const x=ox+2+rand()*20,y=oy+2+rand()*20,trees=[];
    for(let t=0;t<12;t++){
     const p=pt(x+(t%4)*.52,y+Math.floor(t/4)*.55);
     if(accepts(p))trees.push(p);
    }
    if(trees.length>=6)orchards.push({trees});
   }
  }
  if(['steppe','desert','roche','glacier'].includes(kind)){
   for(let k=0;k<70;k++){
    const x=ox+rand()*24,y=oy+rand()*24;
    if(accepts([x,y]))scrub.push({x:round(x),y:round(y),size:round(.13+rand()*.4),tone:rand()});
   }
  }
  const result={id,i,j,version:VERSION,kind,style,meadows,parcels,groves,paths,ponds,structures,orchards,scrub,
   status:'géographie locale procédurale non canonique'};
  cache.set(id,result);
  if(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  return result;
 }
 return {VERSION,TILE,tile,STYLES,lineOnLand};
});