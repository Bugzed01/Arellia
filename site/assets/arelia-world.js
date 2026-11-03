/* Arélia Maps — couverture procédurale nationale.
   Référentiel XY fictif ; les éléments générés sont des propositions non canoniques.
   Ce module n'appelle aucun serveur et est reproductible avec un seed fixe. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaWorld=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const VERSION='1.2.0',SEED=20261103;
 const round=n=>Math.round(n*1000)/1000;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function rng(n){let seed=n>>>0;return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}}
 function hash(x,y,k=0){let a=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(k|0,2246822519))|0;a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967296}
 function inside(point,poly){
  let result=false;const [x,y]=point;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
 }
 const isLand=(p,geo)=>(inside(p,geo.coastline)||(geo.islands||[]).some(poly=>inside(p,poly)))&&!inside(p,geo.lake||[]);
 const point=(x,y)=>[round(x),round(y)];
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 function segmentDistance(p,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;
  const t=l?clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l,0,1):0;
  const q=point(a[0]+dx*t,a[1]+dy*t);
  return {distance:distance(p,q),point:q,t};
 }
 function gaussian(x,y,cx,cy,rx,ry){
  return Math.exp(-.5*(((x-cx)/rx)**2+((y-cy)/ry)**2));
 }
 function height(x,y){
  const mountains=
    69*gaussian(x,y,740,280,260,125)+46*gaussian(x,y,500,340,130,120)
    +38*gaussian(x,y,955,352,150,160)+18*gaussian(x,y,390,480,150,130)
    +17*gaussian(x,y,825,510,110,85);
  const coast=7*gaussian(x,y,315,745,90,75);
  const central=5*gaussian(x,y,750,760,200,125);
  const southern=23*gaussian(x,y,900,1140,160,105)+18*gaussian(x,y,790,1170,210,80);
  const noise=4.5*Math.sin(x/45+y/69)+3*Math.cos(x/67-y/55)+2.2*Math.sin(x/17+y/29);
  return clamp(round(14+mountains+coast+central+southern+noise),1,100);
 }
 function biome(x,y){
  const h=height(x,y),noise=hash(Math.floor(x/28),Math.floor(y/28),7);
  if(y<465&&h>76)return 'glacier';
  if(h>72)return 'roche';
  if(y>930&&x>635&&x<1160)return noise>.14?'desert':'steppe';
  if(x>1020&&y>560&&y<1050)return noise>.2?'foret-humide':'marais';
  if(y<590&&h>49)return 'coniferes';
  if(x<490&&y>560&&y<900)return noise>.45?'prairie':'cultures';
  if(y>930)return 'steppe';
  if(x>700&&y<570)return noise>.45?'foret':'coniferes';
  return noise>.62?'foret':noise>.31?'cultures':'prairie';
 }
 function irregular(cx,cy,rx,ry,n,seed,phase=0){
  const result=[];
  for(let i=0;i<n;i++){
   const t=2*Math.PI*i/n+phase;
   const f=1+.13*Math.sin(3*t+seed*.02)+.08*Math.cos(7*t+seed*.07)+.04*Math.sin(11*t+.4);
   result.push(point(cx+rx*f*Math.cos(t),cy+ry*f*Math.sin(t)));
  }
  return result;
 }
 function makePatches(geo){
  const rand=rng(SEED+79),regions=[],fields=[],forests=[],terrainLines=[];
  const colors={glacier:'#c9e1e8',roche:'#969c95',coniferes:'#719383',foret:'#83a987','foret-humide':'#447b6d',marais:'#81afa0',desert:'#d7b47d',steppe:'#bcad82',cultures:'#b5ba82',prairie:'#a5ba86'};
  // Îlots de végétation et de sols irréguliers : pas de quadrillage rectiligne.
  for(let i=0;i<1320;i++){
   const x=125+rand()*1300,y=115+rand()*1100;
   if(!isLand([x,y],geo))continue;
   const type=biome(x,y),rx=10+rand()*32,ry=6+rand()*21;
   regions.push({type,color:colors[type],polygon:irregular(x,y,rx,ry,13,i+12,rand()*3)});
  }
  // Champs visibles aux échelles territoriales et locales.
  for(let i=0;i<3600;i++){
   const x=125+rand()*1300,y=115+rand()*1100;
   if(!isLand([x,y],geo))continue;
   const type=biome(x,y);
   if(type!=='cultures'&&type!=='prairie'&&type!=='steppe')continue;
   const angle=rand()*1.5-.75,w=3+rand()*9,h=2+rand()*7;
   const poly=[[-w,-h],[w,-h],[w*.85,h],[-w*.9,h]];
   const rotated=poly.map(([xx,yy])=>point(x+xx*Math.cos(angle)-yy*Math.sin(angle),y+xx*Math.sin(angle)+yy*Math.cos(angle)));
   if(rotated.every(q=>isLand(q,geo)))fields.push({polygon:rotated,color:type==='cultures'?(rand()>.5?'#c6bf8d':'#aebc80'):type==='prairie'?'#a7bd8d':'#c8b58b'});
  }
  for(let i=0;i<5200;i++){
   const x=125+rand()*1300,y=115+rand()*1120;
   if(!isLand([x,y],geo))continue;
   const type=biome(x,y);
   if(type==='foret'||type==='coniferes'||type==='foret-humide')forests.push({x:round(x),y:round(y),size:round(.25+.52*rand()),type});
  }
  // Courbes orographiques indicatives sur toute l'île.
  const step=20,cols=69,rows=64,origin=[105,95],grid=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)grid.push(height(origin[0]+i*step,origin[1]+j*step));
  for(const level of [24,34,44,54,64,74,84]){
   const segments=[];
   for(let j=0;j<rows-1;j++)for(let i=0;i<cols-1;i++){
    const x=origin[0]+i*step,y=origin[1]+j*step;
    const a=grid[j*cols+i],b=grid[j*cols+i+1],c=grid[(j+1)*cols+i+1],d=grid[(j+1)*cols+i];
    const v=[a,b,c,d],pt=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]],hits=[];
    for(let k=0;k<4;k++){
      const kk=(k+1)%4;if((v[k]<level)!==(v[kk]<level)){
       const t=(level-v[k])/(v[kk]-v[k]);
       hits.push(point(pt[k][0]+t*(pt[kk][0]-pt[k][0]),pt[k][1]+t*(pt[kk][1]-pt[k][1])));
      }
    }
    if(hits.length===2)segments.push(hits);
    else if(hits.length===4)segments.push([hits[0],hits[1]],[hits[2],hits[3]]);
   }
   terrainLines.push({level,segments});
  }
  return {regions,fields,forests,terrainLines,grid:{origin,step,cols,rows,values:grid}};
 }
 function makeArterials(geo){
  const cities=geo.places.filter(p=>['capitale','metropole','ville'].includes(p.category));
  const result=[];
  for(const city of cities){
   const nearest=cities.filter(p=>p.id!==city.id).map(p=>({other:p,d:distance([city.x,city.y],[p.x,p.y])})).sort((a,b)=>a.d-b.d).slice(0,3);
   for(const {other,d} of nearest){
    if(d>430)continue;
    const id=[city.id,other.id].sort().join('-');
    if(result.some(r=>r.id===id))continue;
    const rand=rng((Math.round(city.x*3+city.y*11+other.x*7+other.y*5))>>>0);
    const a=[city.x,city.y],b=[other.x,other.y],pts=[];
    for(let i=0;i<=9;i++){
     const t=i/9,wiggle=Math.sin(Math.PI*t)*(rand()-.5)*Math.min(21,d*.095),ux=(b[0]-a[0])/d,uy=(b[1]-a[1])/d;
     pts.push(point(a[0]+(b[0]-a[0])*t-uy*wiggle,a[1]+(b[1]-a[1])*t+ux*wiggle));
    }
    if(pts.filter(p=>inside(p,geo.coastline)).length<7)continue;
    result.push({id,name:'Liaison '+city.name+'–'+other.name,kind:'regionale',points:pts,provisional:true});
   }
  }
  return result;
 }
 function closestOnRoad(pt,roads){
  let best=null;
  for(const road of roads)for(let j=1;j<road.points.length;j++){
   const projection=segmentDistance(pt,road.points[j-1],road.points[j]);
   if(!best||projection.distance<best.distance)best={...projection,roadId:road.id};
  }
  return best;
 }
 function makeSettlements(geo,arterials){
  const rand=rng(SEED+229),settlements=[],feeders=[],usedNames=new Set();
  const highways=geo.roads.concat(arterials);
  const anchors=geo.places.filter(p=>['capitale','metropole','ville'].includes(p.category));
  const roots=['Bel','Mont','Val','Riv','Or','Ser','Sol','Kar','Eli','Hal','Tor','Ner','Cé','Lys','Est','Ar','Nami','Ros','Ver','Cal','Tess'];
  const endings=['ac','enne','court','val','rive','mont','el','ière','ène','or','ois','elle','and','os','ens','erie','ent','onne','an'];
  for(let attempt=0;attempt<24000&&settlements.length<790;attempt++){
    const x=125+rand()*1300,y=145+rand()*1082,pt=point(x,y);
    if(!isLand(pt,geo))continue;
    const type=biome(x,y),h=height(x,y);
    if(h>79||type==='glacier')continue;
    if(anchors.some(p=>distance(pt,[p.x,p.y])<15))continue;
    if(settlements.some(t=>Math.abs(x-t.x)<8&&Math.abs(y-t.y)<8&&distance(pt,[t.x,t.y])<13))continue;
    const closest=closestOnRoad(pt,highways);
    if(!closest||closest.distance>190)continue;
    const idx=settlements.length,stem=roots[(idx*7+Math.floor(rand()*11))%roots.length]+endings[(idx*13+Math.floor(rand()*endings.length))%endings.length];
    let name=stem;
    if(usedNames.has(name)){
      const modifiers=['Haut','Bas','Grand','Petit','Vieux','Nouveau','Rive','Mont'];
      name=modifiers[idx%modifiers.length]+'-'+stem;
    }
    if(usedNames.has(name))name=name+'-'+String(idx+1).padStart(3,'0');
    usedNames.add(name);
    const large=idx%13===0,medium=idx%5===0,radius=large?11+rand()*4:medium?6+rand()*3:3+rand()*3;
    const pop=large?'centre local':medium?'bourg':'village';
    const item={id:'localite-'+String(idx+1).padStart(4,'0'),name,x:round(x),y:round(y),radius:round(radius),kind:pop,biome:type,seed:SEED+idx*917,category:'bourg',type:'Localité fictive proposée',wiki:'arelia',
     description:'Implantation cartographique provisoire — '+(large?'centre local':medium?'bourg':'village')+'.',status:'Proposition non canonique'};
    settlements.push(item);
    const path=[pt,point((x+closest.point[0])*.54+(rand()-.5)*8,(y+closest.point[1])*.54+(rand()-.5)*8),closest.point];
    feeders.push({id:'desserte-'+idx,kind:'desserte',settlement:item.id,road_id:closest.roadId,points:path});
  }
  return {settlements,feeders};
 }
 function makeStreams(geo){
  const rand=rng(SEED+301),streams=[];
  for(const river of geo.rivers){
   if(river.points.length<5)continue;
   for(let k=1;k<river.points.length-2;k++){
    if(k%2)continue;
    for(const side of [-1,1]){
      const dest=river.points[k],prev=river.points[k-1],next=river.points[k+1];
      const len=distance(prev,next),nx=(next[1]-prev[1])/len*side,ny=-(next[0]-prev[0])/len*side;
      const reach=18+rand()*37;
      const start=point(dest[0]+nx*reach+(rand()-.5)*13,dest[1]+ny*reach+(rand()-.5)*13);
      if(!isLand(start,geo))continue;
      const pts=[start,point(start[0]*.72+dest[0]*.28+(rand()-.5)*9,start[1]*.72+dest[1]*.28+(rand()-.5)*9),
                    point(start[0]*.38+dest[0]*.62+(rand()-.5)*6,start[1]*.38+dest[1]*.62+(rand()-.5)*6),point(...dest)];
      streams.push({id:'ruisseau-'+streams.length,name:'Affluent secondaire fictif',points:pts,join:river.id,kind:'affluent'});
    }
   }
  }
  return streams;
 }
 function buildCityPlan(item){
  const rand=rng(Math.round(item.x*31+item.y*83)+SEED),major=item.category==='metropole';
  const r=major?63:42,ry=major?50:32,cx=item.x,cy=item.y;
  const theme=item.id==='katoru'?'nordique':item.y>950?'aride':item.x>990?'forestier':'interieur';
  const xy=(x,y)=>point(cx+x,cy+y);
  const city={id:item.id,name:item.name,center:[cx,cy],theme,role:item.description,cityType:'plan secondaire',status:'provisoire',color:'#d9d1bd',parkColor:theme==='aride'?'#adba8b':'#95b19f',
    outline:irregular(cx,cy,r,ry,80,SEED+Math.round(cx+cy)),sea:[],water:[],parks:[],avenues:[],streets:[],buildings:[],places:[],disclaimer:'Plan construit par génération procédurale : rues et bâtiments fictifs non canoniques.'};
  if(item.id==='katoru')city.water.push({id:'katoru-fjord',name:'Canal littoral de Katoru (proposé)',width:4,points:[xy(-51,18),xy(-26,15),xy(-8,18),xy(22,13),xy(52,21)]});
  else city.water.push({id:item.id+'-ruisseau',name:'Cours d’eau local proposé',width:1.45,points:[xy(-r*.96,-10),xy(-r*.6,-5),xy(-r*.22,-7),xy(r*.3,2),xy(r*.96,11)]});
  for(let i=0;i<9;i++){
   const angle=2*Math.PI*i/9+.23;
   const pts=[];for(let t=0;t<=12;t++){const a=t/12,rr=r*(.12+a*.82),wobble=.06*Math.sin(a*5+i);pts.push(xy(Math.cos(angle+wobble)*rr,Math.sin(angle+wobble)*rr*.77));}
   city.avenues.push({id:item.id+'-rad-'+i,class:i%3===0?'avenue':'boulevard',points:pts});
  }
  for(let j=0;j<2;j++){
   const pts=[];for(let k=0;k<80;k++){const a=2*Math.PI*k/79,m=1+.075*Math.sin(a*5+j);pts.push(xy(Math.cos(a)*r*(.44+j*.28)*m,Math.sin(a)*ry*(.44+j*.28)*m));}
   city.avenues.push({id:item.id+'-loop-'+j,class:'boulevard',points:pts});
  }
  for(let i=0;i<90;i++){
   const angle=rand()*Math.PI*2,d=7+rand()*(r-8),x=d*Math.cos(angle),y=.73*d*Math.sin(angle),theta=rand()*Math.PI*2,pts=[];
   for(let k=-3;k<=3;k++){const t=k*2.2;pts.push(xy(x+t*Math.cos(theta)+Math.sin(k*.8+i),y+t*Math.sin(theta)+Math.sin(k*.55+i)*.6));}
   city.streets.push({id:item.id+'-road-'+i,class:'rue',points:pts});
  }
  for(let i=0;i<8;i++){
   const a=i*2.399+item.x/89,d=r*(.4+.22*rand()),x=Math.cos(a)*d,y=Math.sin(a)*d*.7;
   city.parks.push({id:item.id+'-parc-'+i,polygon:irregular(cx+x,cy+y,3.5+rand()*5,3+rand()*4,10,i+SEED)});
  }
  const minDistance=(pt,poly)=>Math.min(...poly.points.slice(1).map((p,i)=>segmentDistance(pt,poly.points[i],p).distance));
  let attempt=0;const target=major?420:270,centres=[];
  while(city.buildings.length<target&&attempt++<target*22){
   const a=rand()*Math.PI*2,d=Math.sqrt(rand())*r*.86,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d*.78;
   const pt=[x,y];
   if(city.water.some(w=>minDistance(pt,w)<w.width*.5+2))continue;
   if(city.avenues.some(w=>minDistance(pt,w)<1.65))continue;
   if(centres.some(p=>Math.abs(p[0]-x)<2.7&&Math.abs(p[1]-y)<2.9&&distance(p,pt)<3.5))continue;
   centres.push(pt);
   const w=.75+rand()*1.55,h=.65+rand()*1.5,angle=.35*rand()+a*.26;
   const roof=(theme==='aride'?['#d9c9a2','#c6b59b','#e6d5b4']:theme==='nordique'?['#c3ced1','#c1b8aa','#d0c5ba']:['#c4bca7','#d6c6ae','#b4c3b0'])[Math.floor(rand()*3)];
   const polygon=[[-w,-h],[w,-h],[w,h],[-w,h]].map(([xx,yy])=>point(x+xx*Math.cos(angle)-yy*Math.sin(angle),y+xx*Math.sin(angle)+yy*Math.cos(angle)));
   city.buildings.push({id:item.id+'-bld-'+city.buildings.length,polygon,roof});
  }
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5+.4,d=r*.44;
   city.places.push({id:item.id+'-secteur-'+i,name:['Cité Centrale','Faubourgs du Nord','Parcs de la Vallée','Hauts Quartiers','Quartier des Échanges'][i]+' (proposé)',type:'Quartier proposé',category:'quartier',x:round(cx+d*Math.cos(a)),y:round(cy+d*.73*Math.sin(a)),description:'Secteur urbain fictif à préciser.',cityId:item.id,wiki:item.wiki||'arelia',status:'Proposition non canonique'});
  }
  return city;
 }
 function makeWorld(geo){
  if(!geo?.coastline||geo.coastline.length<30)throw Error('Contour insulaire manquant');
  const land=makePatches(geo),arterials=makeArterials(geo),{settlements,feeders}=makeSettlements(geo,arterials),streams=makeStreams(geo);
  const newCities=geo.places.filter(p=>['ville','metropole'].includes(p.category)&&!['occidian','orientale','estrel'].includes(p.id));
  const cityPlans=Object.fromEntries(newCities.map(c=>[c.id,buildCityPlan(c)]));
  return {version:VERSION,seed:SEED,provisional:true,land,arterials,settlements,feeders,streams,cityPlans,
   meta:{scope:'Toute l’île, détails procéduraux indicatifs',status:'Proposition non canonique',warning:'Ne représente pas un cadastre, les altitudes ou la navigation réelle.'}};
 }
 // Cellules locales à la demande : chaque position intérieure de l'île conserve le
 // même détail à chaque visite et les chemins se raccordent sur les bords de cellule.
 const TILE=24,tileCache=new Map(),TILE_CACHE_LIMIT=140;
 function localTile(geo,i,j){
  const id=i+','+j;
  if(tileCache.has(id)){const cached=tileCache.get(id);tileCache.delete(id);tileCache.set(id,cached);return cached;}
  const ox=i*TILE,oy=j*TILE,center=[ox+TILE/2,oy+TILE/2];
  const corners=[[ox,oy],[ox+TILE,oy],[ox+TILE,oy+TILE],[ox,oy+TILE]];
  if(!isLand(center,geo)&&!corners.some(p=>isLand(p,geo)))return null;
  const rand=rng((Math.imul(i+8192,1371691)^Math.imul(j+8192,374761393)^SEED)>>>0);
  const kind=biome(center[0],center[1]), fields=[],trees=[],tracks=[],rocks=[],farms=[],contours=[];
  if(['cultures','prairie','steppe','desert'].includes(kind)){
    for(let k=0;k<26;k++){
      const x=ox+1+rand()*22,y=oy+1+rand()*22;
      if(!isLand([x,y],geo))continue;
      const angle=.2+(rand()-.5)*1.4,w=.8+rand()*2.4,h=.7+rand()*1.75;
      const polygon=[[-w,-h],[w,-h],[w*(.85+rand()*.2),h],[-w*.9,h]].map(([a,b])=>point(x+a*Math.cos(angle)-b*Math.sin(angle),y+a*Math.sin(angle)+b*Math.cos(angle)));
      fields.push({polygon,kind});
    }
  }
  if(['foret','foret-humide','coniferes','marais','prairie'].includes(kind)){
    const count=kind==='prairie'?38:kind==='marais'?58:100;
    for(let k=0;k<count;k++){
      const x=ox+rand()*TILE,y=oy+rand()*TILE;
      if(isLand([x,y],geo))trees.push({x:round(x),y:round(y),r:round(.09+rand()*.36)});
    }
  }
  if(['roche','glacier','desert','steppe'].includes(kind)){
    for(let k=0;k<48;k++){
      const x=ox+rand()*TILE,y=oy+rand()*TILE;
      if(!isLand([x,y],geo))continue;
      rocks.push({x:round(x),y:round(y),size:round(.25+rand()*1.5),orientation:rand()*Math.PI});
    }
  }
  if(kind!=='glacier'&&kind!=='roche'){
    // Hashing de la frontière partagée : les segments rejoignent la cellule adjacente.
    const lh=oy+TILE*hash(i,j,741),rh=oy+TILE*hash(i+1,j,741);
    const tx=ox+TILE*hash(i,j,973),bx=ox+TILE*hash(i,j+1,973);
    tracks.push({kind:'rural',points:[point(ox,lh),point(ox+TILE*.35,(lh+rh)*.5+(rand()-.5)*7),point(ox+TILE*.68,(lh+rh)*.5+(rand()-.5)*7),point(ox+TILE,rh)]});
    tracks.push({kind:'rural',points:[point(tx,oy),point((tx+bx)*.5+(rand()-.5)*6,oy+TILE*.4),point((tx+bx)*.5+(rand()-.5)*6,oy+TILE*.71),point(bx,oy+TILE)]});
    if(kind==='cultures'||kind==='prairie'){
      for(let k=0;k<4;k++){
        const x=ox+3+rand()*18,y=oy+3+rand()*18;
        if(!isLand([x,y],geo))continue;
        const ww=.25+rand()*.35,hh=.28+rand()*.45;
        farms.push({polygon:[[x-ww,y-hh],[x+ww,y-hh],[x+ww,y+hh],[x-ww,y+hh]].map(q=>point(...q))});
      }
    }
  }
  // Courbes topographiques fines. L'indice reste relatif, jamais en mètres.
  if(kind!=='desert'){
    const step=2.4,cols=11,rows=11,grid=[];
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)grid.push(height(ox+x*step,oy+y*step));
    const values=grid.filter(Number.isFinite),min=Math.min(...values),max=Math.max(...values);
    for(let z=Math.ceil(min/4)*4;z<=max;z+=4){
      const lines=[];
      for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){
        const v=[grid[y*cols+x],grid[y*cols+x+1],grid[(y+1)*cols+x+1],grid[(y+1)*cols+x]];
        const pts=[[ox+x*step,oy+y*step],[ox+(x+1)*step,oy+y*step],[ox+(x+1)*step,oy+(y+1)*step],[ox+x*step,oy+(y+1)*step]];
        const hits=[];
        for(let k=0;k<4;k++){
          const next=(k+1)%4;if((v[k]<z)!==(v[next]<z)){
            const t=(z-v[k])/(v[next]-v[k]);
            hits.push(point(pts[k][0]+t*(pts[next][0]-pts[k][0]),pts[k][1]+t*(pts[next][1]-pts[k][1])));
          }
        }
        if(hits.length===2)lines.push(hits);
        else if(hits.length===4)lines.push([hits[0],hits[1]],[hits[2],hits[3]]);
      }
      if(lines.length)contours.push({level:z,segments:lines});
    }
  }
  const obj={i,j,id,kind,origin:[ox,oy],fields,trees,tracks,rocks,farms,contours};
  tileCache.set(id,obj);
  if(tileCache.size>TILE_CACHE_LIMIT)tileCache.delete(tileCache.keys().next().value);
  return obj;
 }
 // Bâtiments complémentaires calculés seulement dans les secteurs urbains visibles.
 // Le filtrage évite les canaux, la voirie principale, les parcs et les empreintes
 // déjà établies ; rien n'est ajouté au canon de l'univers.
 const CITY_TILE=8,cityTileCache=new Map(),CITY_CACHE_LIMIT=180;
 const baseBuildingCenters=new WeakMap();
 function cityTile(city,i,j){
  const cityId=city.id||city.meta?.id||'vesone';
  const key=cityId+':'+i+','+j;
  if(cityTileCache.has(key)){const obj=cityTileCache.get(key);cityTileCache.delete(key);cityTileCache.set(key,obj);return obj;}
  const ox=i*CITY_TILE,oy=j*CITY_TILE,center=[ox+4,oy+4];
  const candidates=[[ox,oy],[ox+8,oy],[ox+8,oy+8],[ox,oy+8],center];
  if(!candidates.some(p=>inside(p,city.outline)))return null;
  const rand=rng((Math.imul(i+2048,1572869)^Math.imul(j+2048,991948530)^(cityId.length*29833)^SEED)>>>0);
  const water=[...(city.water||[]),...(city.canals||[])].filter(r=>r.points.some(p=>p[0]>=ox-15&&p[0]<=ox+23&&p[1]>=oy-15&&p[1]<=oy+23));
  const crossesCell=(route,margin=5)=>route.points.slice(1).some((p,k)=>{
    const q=route.points[k];
    return Math.max(p[0],q[0])>=ox-margin&&Math.min(p[0],q[0])<=ox+CITY_TILE+margin
      &&Math.max(p[1],q[1])>=oy-margin&&Math.min(p[1],q[1])<=oy+CITY_TILE+margin;
  });
  const roads=[...(city.avenues||[]),...(city.streets||[]),...(city.expressways||[])].filter(r=>crossesCell(r));

  const excluded=[...(city.parks||[]),...(city.harbourBasins||[]),...(city.portYards||[]),...(city.harbour_basins||[])];
  if(!baseBuildingCenters.has(city)){
   baseBuildingCenters.set(city,(city.buildings||[]).map(b=>b.center||[
       b.polygon.reduce((v,p)=>v+p[0],0)/b.polygon.length,
       b.polygon.reduce((v,p)=>v+p[1],0)/b.polygon.length
   ]));
  }
  const existing=baseBuildingCenters.get(city).filter(q=>q[0]>=ox-3&&q[0]<=ox+11&&q[1]>=oy-3&&q[1]<=oy+11),accepted=[],houses=[];
  const waterConflict=p=>water.some(r=>r.points.slice(1).some((q,k)=>segmentDistance(p,r.points[k],q).distance<(r.width||2)*.5+.6));
  function closestRoad(p){
   let best=null;
   for(const road of roads)for(let k=1;k<road.points.length;k++){
     const seg=segmentDistance(p,road.points[k-1],road.points[k]);
     if(!best||seg.distance<best.distance)best={distance:seg.distance,angle:Math.atan2(road.points[k][1]-road.points[k-1][1],road.points[k][0]-road.points[k-1][0])};
   }
   return best;
  }
  const maxCount=cityId==='vesone'?74:92;
  for(let attempt=0;attempt<380&&houses.length<maxCount;attempt++){
    const x=ox+.25+rand()*7.5,y=oy+.25+rand()*7.5,p=[x,y];
    if(!inside(p,city.outline))continue;
    if(excluded.some(k=>inside(p,k.polygon)))continue;
    if(waterConflict(p))continue;
    const roadway=closestRoad(p);
    if(roadway&&(roadway.distance<.58||roadway.distance>5.2))continue;
    if(existing.some(q=>Math.abs(q[0]-x)<1.2&&Math.abs(q[1]-y)<1.2&&distance(q,p)<1.4))continue;
    if(accepted.some(q=>Math.abs(q[0]-x)<.7&&Math.abs(q[1]-y)<.7&&distance(q,p)<.78))continue;
    const angle=roadway?roadway.angle:(rand()-.5)*1.3;
    const width=.13+rand()*.22,height=.14+rand()*.24;
    const poly=[[-width,-height],[width,-height],[width,height],[-width,height]].map(([u,v])=>point(x+u*Math.cos(angle)-v*Math.sin(angle),y+u*Math.sin(angle)+v*Math.cos(angle)));
    if(poly.some(q=>!inside(q,city.outline)||waterConflict(q)||excluded.some(k=>inside(q,k.polygon))))continue;
    accepted.push(p);
    const roofs=cityId==='vesone'?['#c6b4a0','#b7ad98','#d8c3a8']:city.theme==='baie'?['#e5c8ad','#d2b9a2','#e7d1b2']:city.theme==='nordique'?['#bac7c5','#c6bcb0','#aebbbb']:['#d3c4a9','#c3b8a4','#b4c2b9'];
    houses.push({polygon:poly,roof:roofs[Math.floor(rand()*roofs.length)]});
  }
  const result={cityId,i,j,buildings:houses,status:'procédural non canonique'};
  cityTileCache.set(key,result);
  if(cityTileCache.size>CITY_CACHE_LIMIT)cityTileCache.delete(cityTileCache.keys().next().value);
  return result;
 }
 const townCache=new Map();
 function townPlan(town){
  if(townCache.has(town.id))return townCache.get(town.id);
  const rand=rng(town.seed),cx=town.x,cy=town.y,r=town.radius,roads=[],houses=[];
  for(let k=0;k<5;k++){
   const theta=k*Math.PI/2.5+rand()*.15,pts=[];
   for(let j=0;j<6;j++){const f=j/5;pts.push(point(cx+(f-.16)*r*1.6*Math.cos(theta)+Math.sin(f*8+k)*.35,cy+(f-.16)*r*1.3*Math.sin(theta)+Math.cos(f*7+k)*.3));}
   roads.push({points:pts});
  }
  const count=town.kind==='centre local'?100:town.kind==='bourg'?60:28;
  for(let i=0;i<count;i++){
   const a=rand()*Math.PI*2,d=Math.sqrt(rand())*r*.85,x=cx+d*Math.cos(a),y=cy+d*.7*Math.sin(a);
   const w=.18+rand()*.38,h=.23+rand()*.4,theta=a*.35;
   const polygon=[[-w,-h],[w,-h],[w,h],[-w,h]].map(([u,v])=>point(x+u*Math.cos(theta)-v*Math.sin(theta),y+u*Math.sin(theta)+v*Math.cos(theta)));
   houses.push({polygon});
  }
  const plan={roads,houses};townCache.set(town.id,plan);return plan;
 }
 return {VERSION,SEED,inside,isLand,height,biome,makeWorld,townPlan,localTile,cityTile,segmentDistance};
});
