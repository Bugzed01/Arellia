/* Arélia Maps: self-hosted canvas cartography; no commercial geocoding or map tile API. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const host=$('maps-canvas-area');if(!host)return;
 const canvas=$('maps-canvas'),ctx=canvas.getContext('2d',{alpha:false});
 const results=$('maps-results'),detail=$('maps-detail'),markers=$('maps-markers');
 const carto=window.AreliaDisplay;if(!carto)throw Error('Règles de rendu indisponibles');
 const worldAPI=window.AreliaWorld;if(!worldAPI)throw Error('Moteur territorial indisponible');
 const urbanAPI=window.AreliaUrbanRouting;if(!urbanAPI)throw Error('Routage urbain indisponible');
 const detailAPI=window.AreliaDetail;if(!detailAPI)throw Error('Détails géographiques indisponibles');
 const auditAPI=window.AreliaGeoAudit;if(!auditAPI)throw Error('Outil de diagnostic indisponible');
 const measureAPI=window.AreliaMeasure;if(!measureAPI)throw Error('Outil de mesure indisponible');
 const state={urbanRouter:null,markerNodes:new Map(),data:null,images:{},style:'game',layers:{proposed:false,details:true,shading:true,roads:true,rail:true,water:true,places:true,labels:true,urban:true,canals:true,zones:true,transit:true,metro:true,metroRail:true,relief:false,lowlands:false,infrastructure:false},category:'all',query:'',selected:null,city:null,secondaryData:null,secondaryCity:null,world:null,audit:null,measure:{active:false,points:[]},cityMode:false,metroMode:false,scale:1,baseScale:1,tx:0,ty:0,route:null,nationalGraph:null,metroRoute:null,roadGraph:null,railGraph:null,drag:null,raf:0,dpr:1};
 const terrain=new Image(),plan=new Image();terrain.src='../assets/arelia-terrain.webp';plan.src='../assets/arelia-plan.webp';state.images={terrain,plan};
 const coord=([x,y])=>[x*state.scale+state.tx,y*state.scale+state.ty];
 const num=(n)=>Math.round(n).toLocaleString('fr-FR');
 const toWorld=(px,py)=>[(px-state.tx)/state.scale,(py-state.ty)/state.scale];
 const getDim=()=>[host.clientWidth,host.clientHeight];
 const nearViewport=(center)=>{const [x,y]=coord(center),[w,h]=getDim();return x>-180&&x<w+180&&y>-180&&y<h+180;};
 const chosen=()=>[...(state.data?.places||[]),...(state.city?.places||[])].find(p=>p.id===state.selected);
 const wikiHref=p=>'../wiki/'+(p.wiki||'arelia')+'/';
 function resize(){const [w,h]=getDim();state.dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*state.dpr);canvas.height=Math.round(h*state.dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';draw();}
 function initial(reset=true){const [w,h]=getDim();const f=Math.min(w/1500,h/1400)*.94;if(reset||!state.baseScale){state.baseScale=f;state.scale=f;state.tx=(w-1500*f)/2;state.ty=(h-1400*f)/2;}draw();}
 function clamp(){const [w,h]=getDim();const margin=Math.min(w,h)*.25;state.tx=Math.min(w-margin,Math.max(margin-1500*state.scale,state.tx));state.ty=Math.min(h-margin,Math.max(margin-1400*state.scale,state.ty));}
 function zoom(factor,cx,cy){const [w,h]=getDim();cx=cx??w/2;cy=cy??h/2;const z=Math.max(state.baseScale*.80,Math.min(state.baseScale*128,state.scale*factor));const r=z/state.scale;state.tx=cx+(state.tx-cx)*r;state.ty=cy+(state.ty-cy)*r;state.scale=z;clamp();schedule();}
 function focus(x,y,level=7){const [w,h]=getDim();const z=Math.max(state.baseScale,Math.min(state.baseScale*128,state.baseScale*level));state.scale=z;state.tx=w/2-x*z;state.ty=h/2-y*z;clamp();schedule();}
 function schedule(){if(!state.raf)state.raf=requestAnimationFrame(()=>{state.raf=0;draw()});}
 function polyline(points,color,width,dash=null,halo=false){if(!points||!points.length)return;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=width/state.scale;ctx.lineCap='round';ctx.lineJoin='round';if(halo){ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=(width+2)/state.scale;ctx.stroke();}ctx.strokeStyle=color;ctx.lineWidth=width/state.scale;ctx.setLineDash(dash?dash.map(n=>n/state.scale):[]);ctx.stroke();ctx.setLineDash([])}

 // Le lac est une découpe dans le continent ; les îlots sont ajoutés comme terres.
 function clipLand(){
   const rings=[state.data.coastline,...(state.data.islands||[]),state.data.lake].filter(p=>p?.length>=3);
   ctx.beginPath();
   for(const ring of rings){
     ctx.moveTo(ring[0][0],ring[0][1]);
     for(const p of ring.slice(1))ctx.lineTo(p[0],p[1]);
     ctx.closePath();
   }
   ctx.clip('evenodd');
 }
 // Couverture nationale : milieux et réseaux, rendus sur toute l'île selon l'échelle.
 function drawNationalLand(){
   const world=state.world;if(!world)return;
   const level=state.scale/state.baseScale;
   if(level<(state.style==='game'?1.4:2.7))return;
   const night=state.style==='night',[w,h]=getDim();
   const tl=toWorld(0,0),br=toWorld(w,h);
   const minX=tl[0],maxX=br[0],minY=tl[1],maxY=br[1];
   const on=(x,y,margin=15)=>x>=minX-margin&&x<=maxX+margin&&y>=minY-margin&&y<=maxY+margin;
   const polygon=pts=>{
     if(!pts?.length)return;
     ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
     for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);
     ctx.closePath();
   };
   ctx.save();ctx.globalAlpha*=carto.fade(level,state.style==='game'?1.4:2.7,state.style==='game'?4.4:7);
   clipLand();
   for(const patch of world.land.regions){
     if(!patch.polygon.some(pt=>on(pt[0],pt[1],75)))continue;
     polygon(patch.polygon);
     ctx.fillStyle=night?'rgba(68,98,95,.45)':patch.color;
     ctx.globalAlpha=night?.24:state.style==='game'?.39:.24;ctx.fill();
   }
   if(level>=(state.style==='game'?6:8)){
     ctx.globalAlpha=night?.35:state.style==='game'?.55:.48;
     for(const field of world.land.fields){
       if(!field.polygon.some(pt=>on(pt[0],pt[1],25)))continue;
       polygon(field.polygon);ctx.fillStyle=night?'#748477':field.color;ctx.fill();
       if(level>18){ctx.strokeStyle=night?'#62746e':'#d9d2ae';ctx.lineWidth=.11;ctx.stroke();}
     }
   }
   if(state.style==='terrain'||state.style==='game'||state.layers.relief){
     ctx.globalAlpha=night?.48:.43;
     ctx.lineWidth=1.1/state.scale;ctx.strokeStyle=night?'#b8afa1':'#7c7862';
     for(const group of world.land.terrainLines){
       ctx.beginPath();let has=false;
       for(const [a,b] of group.segments){
         if(!on((a[0]+b[0])*.5,(a[1]+b[1])*.5,20))continue;
         ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);has=true;
       }
       if(has)ctx.stroke();
     }
   }
   if(level>=12){
     ctx.globalAlpha=carto.fade(level,12,20)*(night?.44:.60);
     for(const dot of world.land.forests){
       if(!on(dot.x,dot.y,3))continue;
       ctx.beginPath();ctx.ellipse(dot.x,dot.y,dot.size,dot.size*.79,.35,0,Math.PI*2);
       ctx.fillStyle=night?'#3d6759':dot.type==='foret-humide'?'#327960':'#56876b';ctx.fill();
     }
   }
   ctx.restore();
 }

 // Texture d'ombrage à grande échelle : relief visible sans attendre un zoom extrême.
 // Échantillonnage 360 × 336 et cache unique, pour ne pas ralentir le déplacement.
 let nationalHillshade=null;
 function getNationalHillshade(){
  if(nationalHillshade!==null)return nationalHillshade||null;
  const tex=document.createElement('canvas');
  if(typeof tex.getContext!=='function'){nationalHillshade=false;return null;}
  const tw=360,th=336;tex.width=tw;tex.height=th;
  const painter=tex.getContext('2d');
  if(!painter||typeof painter.createImageData!=='function'||typeof painter.putImageData!=='function'){nationalHillshade=false;return null;}
  const image=painter.createImageData(tw,th);
  const pixels=image.data;if(!pixels){nationalHillshade=false;return null;}
  const dx=1500/tw,dy=1400/th;
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
   const wx=(x+.5)*dx,wy=(y+.5)*dy;
   const dX=worldAPI.height(wx-2,wy)-worldAPI.height(wx+2,wy);
   const dY=worldAPI.height(wx,wy-2)-worldAPI.height(wx,wy+2);
   const lighting=dX*.73+dY*.47;
   const p=(y*tw+x)*4,shadow=lighting<0;
   pixels[p]=shadow?41:248;
   pixels[p+1]=shadow?62:247;
   pixels[p+2]=shadow?60:228;
   pixels[p+3]=Math.min(126,Math.round(9+Math.abs(lighting)*40));
  }
  painter.putImageData(image,0,0);
  nationalHillshade=tex;return nationalHillshade;
 }
 function drawNationalHillshade(){
  if(!state.layers.shading||(state.style!=='game'&&state.style!=='terrain'))return;
  const source=getNationalHillshade();if(!source)return;
  ctx.save();clipLand();ctx.globalAlpha=.88;
  ctx.drawImage(source,0,0,1500,1400);
  ctx.restore();
 }

 // Ombres topographiques calculées sur le terrain fictif, sans téléchargements.
 // Le raster est créé seulement pour les tuiles visibles, puis mis en cache.
 const shadeCache=new Map(),SHADE_LIMIT=110,SHADE_SIZE=48;
 function shadedTile(i,j){
  const key=i+','+j;
  if(shadeCache.has(key)){const old=shadeCache.get(key);shadeCache.delete(key);shadeCache.set(key,old);return old;}
  const tile=document.createElement('canvas');
  if(typeof tile.getContext!=='function')return null; // Simulateur DOM sans Canvas auxiliaire
  tile.width=tile.height=SHADE_SIZE;
  const painter=tile.getContext('2d');
  if(!painter||typeof painter.createImageData!=='function'||typeof painter.putImageData!=='function')return null;
  const pixels=painter.createImageData(SHADE_SIZE,SHADE_SIZE);
  if(!pixels?.data)return null;
  const out=pixels.data,step=24/SHADE_SIZE,ox=i*24,oy=j*24;
  for(let y=0;y<SHADE_SIZE;y++)for(let x=0;x<SHADE_SIZE;x++){
   const wx=ox+(x+.5)*step,wy=oy+(y+.5)*step;
   const west=worldAPI.height(wx-1,wy),east=worldAPI.height(wx+1,wy);
   const north=worldAPI.height(wx,wy-1),south=worldAPI.height(wx,wy+1);
   const illumination=(west-east)*.70+(north-south)*.42;
   const shadow=illumination<0;
   const a=Math.min(120,Math.round(Math.abs(illumination)*95+14));
   const p=(y*SHADE_SIZE+x)*4;
   out[p]=shadow?29:252;out[p+1]=shadow?48:251;out[p+2]=shadow?46:229;out[p+3]=a;
  }
  painter.putImageData(pixels,0,0);
  shadeCache.set(key,tile);
  if(shadeCache.size>SHADE_LIMIT)shadeCache.delete(shadeCache.keys().next().value);
  return tile;
 }

 // Géographie de proximité inspirée de la lisibilité d'une carte de jeu,
 // sans reprendre les tracés ou les textures de GTA V.
 function drawDetailTile(tile,level,night){
  if(!tile)return;
  const style=tile.style;
  const poly=pts=>{
   if(pts.length<3)return;
   ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
   for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);
   ctx.closePath();
  };
  const stroke=(pts,color,width)=>{
   if(pts.length<2)return;
   ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
   for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);
   ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  };
  const alpha=ctx.globalAlpha;
  if(level>=24&&state.layers.details&&tile.hedges)for(const hedge of tile.hedges){
   ctx.globalAlpha=alpha*(night?.58:.72);
   stroke(hedge.points,night?'#657769':hedge.kind==='muret'?'#ada286':'#6c9971',hedge.kind==='muret'?.09:.15);
  }
  for(const m of tile.meadows){
   ctx.globalAlpha=alpha*(night?.17:.23);poly(m.polygon);
   ctx.fillStyle=night?'#73927e':m.tone>.48?style.ground:style.edge;ctx.fill();
  }
  for(const vegetation of tile.riparian||[]){
   ctx.globalAlpha=alpha*(night?.27:.36);poly(vegetation.polygon);
   ctx.fillStyle=night?'#4b716f':'#74a798';ctx.fill();
  }
  if(level>=15){
   for(const field of tile.parcels){
    ctx.globalAlpha=alpha*(night?.30:.42);
    poly(field.polygon);ctx.fillStyle=night?'#8a8c76':field.tone>.5?'#d7cda0':'#adb78a';ctx.fill();
    if(field.furrows&&level>=34){
     ctx.globalAlpha=alpha*.25;ctx.strokeStyle=night?'#b9ae88':'#dfd3ac';
     ctx.lineWidth=.055;ctx.stroke();
    }
   }
  }
  if(level>=16&&state.layers.roads)for(const road of tile.paths){
   const primary=road.kind==='piste';
   ctx.globalAlpha=alpha*(night?.82:.95);
   stroke(road.points,night?'#586c6e':'#928e7d',primary?.28:.16);
   stroke(road.points,night?'#a1a99b':primary?'#fff6df':'#e8e0c6',primary?.18:.105);
  }
  if(level>=21){
   for(const pool of tile.ponds){
    ctx.globalAlpha=alpha*.8;poly(pool.polygon);
    ctx.fillStyle=night?'#23566a':'#86b7bb';ctx.fill();
    ctx.strokeStyle=night?'#3b7888':'#b7d1c9';ctx.lineWidth=.1;ctx.stroke();
   }
   for(const tree of tile.groves){
    ctx.globalAlpha=alpha*(night?.75:.82);
    ctx.beginPath();ctx.arc(tree.x,tree.y,tree.r,0,2*Math.PI);
    ctx.fillStyle=night?'#386350':tree.tone>.5?style.foliage:style.edge;ctx.fill();
   }
   for(const stone of tile.scrub){
    ctx.globalAlpha=alpha*.55;
    ctx.beginPath();ctx.ellipse(stone.x,stone.y,stone.size*.55,stone.size*.24,0,0,2*Math.PI);
    ctx.fillStyle=night?'#899085':'#a8a08a';ctx.fill();
   }
  }
  if(level>=28){
   for(const orchard of tile.orchards)for(const tree of orchard.trees){
    ctx.globalAlpha=alpha*.78;ctx.beginPath();ctx.arc(tree[0],tree[1],.14,0,2*Math.PI);
    ctx.fillStyle=night?'#486e55':'#7e9d68';ctx.fill();
   }
  }
  if(level>=19){
   for(const ridge of tile.cliffs||[]){
    ctx.globalAlpha=alpha*(night?.33:.36);
    stroke(ridge.points,night?'#b0b6a6':'#756c60',ridge.tone>.6?.19:.12);
   }
  }
  if(level>=32&&state.layers.urban){
   for(const house of tile.structures){
    ctx.globalAlpha=alpha*.95;poly(house.polygon);
    ctx.fillStyle=night?'#b7b1a0':house.tone>.5?'#d7bc9e':'#c5b69a';ctx.fill();
    ctx.lineWidth=.04;ctx.strokeStyle=night?'#7a827e':'#ad9a84';ctx.stroke();
   }
  }
  ctx.globalAlpha=alpha;
 }

 // Tuiles dessinées à la demande : la carte ne devient pas vide au zoom rural.
 function drawWorldTiles(){
   if(!state.world)return;
   const level=state.scale/state.baseScale;
   if(level<12||!state.layers.details)return;
   const [w,h]=getDim(),tl=toWorld(0,0),br=toWorld(w,h);
   const tileSize=24;
   const i0=Math.max(0,Math.floor(tl[0]/tileSize)-1),i1=Math.min(62,Math.ceil(br[0]/tileSize)+1);
   const j0=Math.max(0,Math.floor(tl[1]/tileSize)-1),j1=Math.min(59,Math.ceil(br[1]/tileSize)+1);
   const night=state.style==='night';
   const patch=poly=>{
     if(!poly?.length)return;
     ctx.beginPath();ctx.moveTo(poly[0][0],poly[0][1]);
     for(let n=1;n<poly.length;n++)ctx.lineTo(poly[n][0],poly[n][1]);
     ctx.closePath();
   };
   const line=(pts,color,width,dash=[])=>{
     ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
     for(let n=1;n<pts.length;n++)ctx.lineTo(pts[n][0],pts[n][1]);
     ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
     ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
   };
   ctx.save();ctx.globalAlpha*=carto.fade(level,12,22);
   clipLand();
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
     const tile=worldAPI.localTile(state.data,i,j);
     if(!tile)continue;
     const palette=tile.kind;
     if(state.layers.shading&&(state.style==='game'||state.style==='terrain'||state.layers.relief)){
       const shade=shadedTile(i,j);
       if(shade){ctx.globalAlpha=.90;ctx.drawImage(shade,i*24,j*24,24,24);}
     }
     if(level>=12&&['cultures','prairie','steppe','desert'].includes(palette)){
       for(const f of tile.fields){
         patch(f.polygon);
         ctx.fillStyle=palette==='desert'?(night?'#7a6d5c':'#dec498'):palette==='cultures'?(night?'#6f7b68':'#c3bd91'):palette==='prairie'?(night?'#678071':'#a8be91'):(night?'#867b66':'#d4c39b');
         ctx.globalAlpha=night?.32:.42;ctx.fill();
         if(level>=35){ctx.strokeStyle=night?'#a9a28c':'#d4c5a3';ctx.lineWidth=.06;ctx.stroke();}
       }
     }
     ctx.globalAlpha=night?.59:.73;
     if(level>=19){
       for(const tree of tile.trees){
         ctx.beginPath();ctx.arc(tree.x,tree.y,tree.r,0,2*Math.PI);
         ctx.fillStyle=night?'#356357':palette==='foret-humide'?'#287a63':'#4d8060';ctx.fill();
       }
       for(const rock of tile.rocks){
         const sx=rock.size*.53,sy=rock.size*.22,ang=rock.orientation;
         const a=[rock.x-sx*Math.cos(ang),rock.y-sx*Math.sin(ang)];
         const b=[rock.x+sx*Math.cos(ang),rock.y+sx*Math.sin(ang)];
         line([a,b],night?'#a1a19e':palette==='desert'?'#c2a479':'#918d83',.1);
       }
     }
     if(level>=15&&state.layers.roads){
       for(const track of tile.tracks)line(track.points,night?'#afab98':'#f9f3df',Math.min(.2,1.8/state.scale),palette==='desert'?[.22,.12]:[]);
     }
     if(level>=27&&state.layers.urban){
       for(const farm of tile.farms){patch(farm.polygon);ctx.fillStyle=night?'#c2b9a8':'#b5a690';ctx.fill();}
     }
     if((state.style==='terrain'||state.style==='game'||state.layers.relief)&&level>=23){
       ctx.globalAlpha=night?.34:.50;
       for(const levelLine of tile.contours)for(const seg of levelLine.segments)line(seg,night?'#c9c0ae':'#9b8c71',Math.min(.13,1/state.scale));
     }
     drawDetailTile(detailAPI.tile(state.data,tile,i,j,state.world),level,night);
   }
   ctx.restore();
 }

 function drawNationalNetworks(){
   const world=state.world;if(!world)return;
   const level=state.scale/state.baseScale;
   if(level<3.2)return;
   const [w,h]=getDim(),tl=toWorld(0,0),br=toWorld(w,h);
   const visible=pts=>pts.some(p=>p[0]>=tl[0]-40&&p[0]<=br[0]+40&&p[1]>=tl[1]-40&&p[1]<=br[1]+40);
   const polylineWorld=(pts,color,pixels,dash=[])=>{
     if(pts.length<2)return;
     ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
     for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
     ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.lineWidth=pixels/state.scale;
     ctx.setLineDash(dash.map(x=>x/state.scale));ctx.stroke();ctx.setLineDash([]);
   };
   ctx.save();
   clipLand();
   if(state.layers.water&&level>=5){
     for(const creek of world.streams){
       if(!visible(creek.points))continue;
       polylineWorld(creek.points,state.style==='night'?'#4d8698':'#a9d7d9',2.4);
       polylineWorld(creek.points,state.style==='night'?'#2a718a':'#468ea5',1.2);
     }
   }
   if(state.layers.roads){
     for(const road of world.arterials){
       if(!visible(road.points))continue;
       polylineWorld(road.points,state.style==='night'?'#273e4c':'#f3efe3',3);
       polylineWorld(road.points,state.style==='night'?'#c1ae92':'#b99b7a',1.8);
     }
     if(level>=6.5)for(const road of world.feeders){
       if(!visible(road.points))continue;
       polylineWorld(road.points,state.style==='night'?'#b2ab96':'#fdfaf0',1.45);
     }
   }
   ctx.restore();
 }

 function drawInfrastructureAudit(){
   const report=state.audit,level=state.scale/state.baseScale;
   if(!report||!state.layers.infrastructure||level<3.8)return;
   const [w,h]=getDim(),tl=toWorld(0,0),br=toWorld(w,h);
   ctx.save();
   const draw=(p,color,shape)=>{
     const [x,y]=p.point;
     if(x<tl[0]-10||x>br[0]+10||y<tl[1]-10||y>br[1]+10)return;
     const r=3.6/state.scale;
     ctx.beginPath();
     if(shape==='cross'){ctx.moveTo(x-r,y-r);ctx.lineTo(x+r,y+r);ctx.moveTo(x+r,y-r);ctx.lineTo(x-r,y+r);}
     else ctx.arc(x,y,r,0,Math.PI*2);
     ctx.lineWidth=3.3/state.scale;ctx.strokeStyle='#fff8e8';ctx.stroke();
     ctx.lineWidth=1.7/state.scale;ctx.strokeStyle=color;ctx.stroke();
   };
   for(const p of report.bridges)draw(p,p.mode==='rail'?'#376f99':'#c48136','circle');
   for(const p of report.lakeConflicts)draw(p,'#bb3f47','cross');
   for(const p of report.coastalConflicts)draw(p,'#995b4c','cross');
   ctx.restore();
 }
 function renderInfrastructureReport(){
   const data=state.audit;if(!data)return;
   state.layers.infrastructure=true;
   for(const c of document.querySelectorAll('[data-layer]'))if(c.dataset.layer==='infrastructure')c.checked=true;
   const tally=data.count;
   detail.classList.add('has-detail');detail.replaceChildren();
   const lead=document.createElement('span');lead.className='maps-detail-attr';lead.textContent='AUDIT DES TRACÉS · NON CANONIQUE';
   const title=document.createElement('h2');title.textContent='Franchissements à qualifier';
   const one=document.createElement('div');one.className='maps-route-message';
   one.textContent=tally.roadCrossings+' passages routiers et '+tally.railwayCrossings+' ferroviaires au croisement de cours d’eau.';
   const two=document.createElement('p');two.textContent=tally.lakeConflicts+' portions sur le lac Orélys et '+tally.coastalConflicts+' portions hors terre à vérifier.';
   const correction=state.world?.landCorrections;
   const repaired=document.createElement('p');repaired.className='maps-route-audit';
   repaired.textContent=correction
    ?'Détours terrestres validés : '+correction.arterials+' liaison(s) régionales, '+correction.feeders+' desserte(s) rurales, '+correction.unresolved.length+' cas non résolu(s).'
    :'Détours terrestres en cours de calcul.';
   const three=document.createElement('p');
   three.textContent=state.nationalGraph
    ?state.nationalGraph.count.unqualifiedCrossings+' croisements routiers sans raccordement explicite.'
    :'Les croisements de routes sans sommet de raccordement sont désormais considérés comme non reliés.';
   const legend=document.createElement('p');
   legend.textContent='Cercles orange ou bleus : ponts potentiels. Croix rouges : conflits de tracé. Les symboles ne prouvent pas l’existence d’ouvrages.';
   const anomalies=[
      ...data.lakeConflicts.map(x=>({...x,label:'Lac Orélys'})),
      ...data.coastalConflicts.map(x=>({...x,label:'Hors terre'})),
      ...data.bridges.map(x=>({...x,label:x.mode==='rail'?'Croisement ferroviaire · eau':'Croisement routier · eau'}))
   ];
   const list=document.createElement('div');list.className='maps-audit-list';
   const subtitle=document.createElement('p');subtitle.textContent='Éléments à qualifier, 16 par page :';
   let page=0;const pageSize=16;
   const renderPage=()=>{
     list.replaceChildren(subtitle);
     for(const issue of anomalies.slice(page*pageSize,(page+1)*pageSize)){
       const button=document.createElement('button');button.type='button';button.className='maps-audit-item';
       button.textContent=issue.label+' · '+issue.lineId+' · XY '+Math.round(issue.point[0])+', '+Math.round(issue.point[1]);
       button.onclick=()=>{state.layers.infrastructure=true;focus(issue.point[0],issue.point[1],15);detail.classList.add('has-detail')};
       list.append(button);
     }
     const bar=document.createElement('div');bar.className='maps-audit-pagination';
     const prev=document.createElement('button');prev.type='button';prev.className='maps-audit-previous';
     prev.textContent='← Précédent';prev.disabled=page===0;prev.onclick=()=>{if(page>0){page--;renderPage()}};
     const total=document.createElement('span');
     total.textContent=anomalies.length?'Page '+(page+1)+' / '+Math.ceil(anomalies.length/pageSize)+' · '+anomalies.length+' points':'Aucun point à qualifier';
     const next=document.createElement('button');next.type='button';next.className='maps-audit-next';
     next.textContent='Suivant →';next.disabled=(page+1)*pageSize>=anomalies.length;
     next.onclick=()=>{if(!next.disabled){page++;renderPage()}};
     bar.append(prev,total,next);list.append(bar);
   };
   renderPage();
   detail.append(lead,title,one,two,repaired,three,legend,list);schedule();
 }

 function drawNationalSettlements(){
   const world=state.world,level=state.scale/state.baseScale;
   if(!world||level<10)return;
   const [w,h]=getDim(),tl=toWorld(0,0),br=toWorld(w,h);
   const show=town=>town.x+town.radius>=tl[0]-5&&town.x-town.radius<=br[0]+5&&town.y+town.radius>=tl[1]-5&&town.y-town.radius<=br[1]+5;
   ctx.save();clipLand();ctx.globalAlpha*=carto.fade(level,10,18);
   for(const town of world.settlements){
     if(!show(town))continue;
     const plan=worldAPI.townPlan(town,state.data);
     ctx.beginPath();ctx.ellipse(town.x,town.y,town.radius,town.radius*.77,0,0,Math.PI*2);
     ctx.fillStyle=state.style==='night'?'rgba(111,114,109,.66)':'rgba(214,204,181,.61)';ctx.fill();
     if(state.layers.urban){
       for(const street of plan.roads){
         ctx.beginPath();ctx.moveTo(street.points[0][0],street.points[0][1]);
         for(const pt of street.points.slice(1))ctx.lineTo(pt[0],pt[1]);
         ctx.strokeStyle=state.style==='night'?'#d9d2bb':'#fff9ed';ctx.lineWidth=Math.min(street.kind==='principale'?.64:.46,(street.kind==='principale'?3.8:2.8)/state.scale);ctx.stroke();
       }
       if(level>=21)for(const house of plan.houses){
         ctx.beginPath();ctx.moveTo(house.polygon[0][0],house.polygon[0][1]);
         for(const pt of house.polygon.slice(1))ctx.lineTo(pt[0],pt[1]);
         ctx.closePath();ctx.fillStyle=state.style==='night'?'#b8b4a4':'#b6aa96';ctx.fill();
       }
     }
   }
   ctx.restore();
 }

 function drawAtlasCoast(){
  if(state.style!=='game')return;
  const level=state.scale/state.baseScale,color='#76a6ab',pale='#e0e3cb';
  const rings=[state.data.coastline,...(state.data.islands||[])];
  if(level>=5){
   // Bande sableuse du côté de la terre, avec clipping du littoral et des îlots.
   ctx.save();clipLand();
   for(const ring of rings){
    ctx.beginPath();ctx.moveTo(ring[0][0],ring[0][1]);
    for(const p of ring.slice(1))ctx.lineTo(p[0],p[1]);
    ctx.closePath();ctx.strokeStyle='#ead9af';ctx.lineWidth=2.9;ctx.globalAlpha=.68;ctx.stroke();
   }
   ctx.restore();
  }
  const outline=ring=>{if(ring.length>2)polyline([...ring,ring[0]],pale,5.2);if(ring.length>2)polyline([...ring,ring[0]],color,2.1)};
  for(const ring of rings)outline(ring);
  if(state.data.lake?.length>2)outline(state.data.lake);
 }
 function drawNationalValleys(){
  const world=state.world,level=state.scale/state.baseScale;
  if(!world||!state.layers.water||level<3)return;
  const night=state.style==='night';
  const rivers=[...state.data.rivers,...world.streams];
  const [w,h]=getDim(),tl=toWorld(0,0),br=toWorld(w,h);
  ctx.save();clipLand();
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const river of rivers){
   const pts=river.points;
   if(!pts?.some(p=>p[0]>=tl[0]-30&&p[0]<=br[0]+30&&p[1]>=tl[1]-30&&p[1]<=br[1]+30))continue;
   ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
   for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);
   ctx.strokeStyle=night?'rgba(60,111,104,.42)':'rgba(90,151,111,.29)';
   ctx.lineWidth=(river.importance==='majeur'?17:8)/state.scale;
   ctx.stroke();
  }
  ctx.restore();
 }
 function markerRoadNodes(){if(!state.data)return;const d=state.data;
  drawNationalLand();
  drawWorldTiles();
  drawAtlasCoast();
  drawNationalValleys();
  if(state.layers.water){d.rivers.forEach(r=>polyline(r.points,'#ffffffad',r.importance==='majeur'?8:4.5));d.rivers.forEach(r=>polyline(r.points,r.importance==='majeur'?'#3f96af':'#5aadc0',r.importance==='majeur'?5.5:3));polyline(d.lake,'#72b5bb',1.4)}
  if(state.layers.roads){
   d.roads.forEach(r=>polyline(r.points,state.style==='night'?'#233e4b':'#fffaf0',state.style==='game'?7:5.5));
   d.roads.forEach(r=>polyline(r.points,state.style==='night'?'#b9a47b':state.style==='game'?'#daaa73':'#d4a66c',state.style==='game'?3.2:2.45));
  }
  if(state.layers.rail){d.railways.forEach(r=>polyline(r.points,'#34505c',2.2,[6,4],true));}
  if(state.layers.water&&state.scale>=state.baseScale*4.5&&!state.city){d.capital.canals.forEach(r=>polyline(r.points,'#f4fbfa',8));d.capital.canals.forEach(r=>polyline(r.points,'#3e9eaf',5.2));}
  drawNationalNetworks();
  drawInfrastructureAudit();
  if(state.scale>=state.baseScale*5)drawCities();
  drawNationalSettlements();
  if(!state.secondaryCity && state.city && state.scale>=state.baseScale*3.1 && nearViewport([1110,698]))drawMetropolis();
   if(!state.secondaryCity && state.city && state.scale>=state.baseScale*5.6 && nearViewport([1110,698]))drawVesone();
  if(state.scale>=state.baseScale*4.2)for(const city of state.secondaryCity?[state.secondaryCity]:[...Object.values(state.secondaryData?.cities||{}),...Object.values(state.world?.cityPlans||{})]){if(nearViewport(city.center))drawSecondaryCity(city);}
 }
 function drawCities(){if(state.scale<1)return;const level=state.scale/state.baseScale,cityList=state.data.places.filter(p=>['capitale','metropole','ville'].includes(p.category));for(const city of cityList){if(city.id==='vesone'||(level>=6&&(state.secondaryData?.cities?.[city.id]||state.world?.cityPlans?.[city.id])))continue;let radius=city.category==='ville'?8:city.category==='capitale'?35:28;const x=city.x,y=city.y;ctx.fillStyle='rgba(241,235,216,.33)';ctx.beginPath();ctx.ellipse(x,y,radius,radius*.8,0,0,Math.PI*2);ctx.fill();const step=city.id==='vesone'?5.5:6;const angle=city.id==='vesone'?.21:-.13;ctx.save();ctx.translate(x,y);ctx.rotate(angle);for(let p=-radius;p<=radius;p+=step){const t=Math.sqrt(Math.max(0,radius*radius-p*p));polyline([[p,-t*.75],[p,t*.75]],'#f4ede2',1.1);polyline([[-t,p*.75],[t,p*.75]],'#f4ede2',1.1)}ctx.restore();}
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
    const terrainData=metro.terrain;
    if(terrainData && (state.style==='terrain'||state.layers.relief)){
      const grid=terrainData.grid,origin=grid.origin,step=grid.step,cols=grid.cols,rows=grid.rows;
      for(let j=0;j<rows-1;j++)for(let i=0;i<cols-1;i++){
        const idx=j*cols+i;
        const e=(grid.values[idx]+grid.values[idx+1]+grid.values[idx+cols]+grid.values[idx+cols+1])*.25;
        let color;
        if(night)color=e<25?'rgba(44,86,80,.55)':e<45?'rgba(73,86,79,.55)':e<62?'rgba(111,104,87,.54)':'rgba(133,120,99,.55)';
        else color=e<20?'rgba(119,172,142,.60)':e<32?'rgba(172,194,151,.58)':e<44?'rgba(200,194,145,.58)':e<56?'rgba(199,172,135,.56)':e<70?'rgba(173,151,122,.58)':'rgba(158,140,120,.58)';
        ctx.fillStyle=color;ctx.fillRect(origin[0]+i*step,origin[1]+j*step,step+.025,step+.025);
      }
      ctx.save();ctx.lineWidth=level>=14?.18:.27;ctx.strokeStyle=night?'rgba(231,215,188,.36)':'rgba(108,90,67,.38)';
      for(const contour of terrainData.contours||[]){
        ctx.beginPath();
        for(const [a,b] of contour.segments){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
        ctx.stroke();
      }
      ctx.restore();
    }
    if(terrainData && state.layers.lowlands){
      for(const land of terrainData.lowlands||[])fill(land.polygon,night?'rgba(80,144,151,.30)':'rgba(90,173,178,.28)');
    }
    if(state.layers.metro){
      for(const green of metro.green_corridors)fill(green.polygon,night?'rgba(57,105,78,.52)':'rgba(110,149,112,.52)');
      for(const sat of metro.satellites)fill(sat.footprint,night?'#697472':'#d9d3bb',night?'#6f7777':'#bcad91');
      if(level>=9&&state.layers.urban)for(const block of metro.neighborhoods)fill(block.polygon,night?'#8e918d':block.color,night?'#697579':'#e2d9c9');
      if(level>=8)for(const parcel of metro.fabric_parcels||[])fill(parcel.polygon,night?'#959c99':parcel.color,night?'#657277':'#c2b69f');
      for(const greenSpace of metro.landuse_patches||[])fill(greenSpace.polygon,greenSpace.kind==='logistique'?(night?'#6d7778':'#c3c8c3'):(night?'#416557':'#a2c1a3'));
      if(level>=6)for(const street of metro.local_streets||[]){line(street.points,night?'#49555c':'#b0aaa0',street.class==='avenue'?1.25:.75);line(street.points,night?'#e4dfd0':'#fcf8ed',street.class==='avenue'?.87:.48)}

      // Riverbeds precede roads; mapped crossings receive their own bridge decks.
      if(terrainData && state.layers.water){
        for(const waterway of terrainData.waterways){
          line(waterway.points,night?'#a4bbb4':'#efe6d5',waterway.width+.9);
          line(waterway.points,night?'#226278':'#4a9bb0',waterway.width);
        }
      }
      for(const road of metro.roads){const main=road.kind==='rocade';line(road.points,night?'#465363':'#a99c8b',main?2.4:1.9);line(road.points,night?'#e1c8a7':'#fbf6e7',main?1.55:1.1,road.kind==='contournement'?[3,2]:[])}
    }
    if(state.layers.metroRail){
      for(const track of metro.regional_rail){line(track.points,night?'#283b46':'rgba(252,249,234,.95)',2);line(track.points,track.color,.92,[2.2,1.1])}
      if(level>=7)for(const station of metro.rail_stations||[]){ctx.beginPath();ctx.arc(station.x,station.y,station.kind==='interchange'?1.7:1.35,0,Math.PI*2);ctx.fillStyle=night?'#e4e6e7':'white';ctx.fill();ctx.lineWidth=.56;ctx.strokeStyle=station.kind==='interchange'?'#9f714d':'#536c82';ctx.stroke()}
    }
    if(terrainData && state.layers.water && state.layers.metro){
      for(const bridge of terrainData.crossings){
        ctx.save();ctx.translate(bridge.x,bridge.y);ctx.rotate(bridge.angle);
        ctx.fillStyle=night?'#56575d':'#9b8c76';ctx.fillRect(-bridge.span*.5,-bridge.width*.68,bridge.span,bridge.width*1.36);
        ctx.fillStyle=night?'#d3ccba':'#f3e6c7';ctx.fillRect(-bridge.span*.5,-bridge.width*.5,bridge.span,bridge.width);
        ctx.restore();
      }
    }
    ctx.restore();
  }


 // Tissu bâti complémentaire au très fort zoom ; seules les cellules urbaines
 // effectivement visibles sont demandées au générateur cartographique.
 function drawCityMicro(city,paint,night){
   const level=state.scale/state.baseScale;
   if(!state.layers.urban||level<28)return;
   const [w,h]=getDim(),tl=toWorld(0,0),br=toWorld(w,h),step=8;
   const west=Math.min(...city.outline.map(p=>p[0])),east=Math.max(...city.outline.map(p=>p[0]));
   const north=Math.min(...city.outline.map(p=>p[1])),south=Math.max(...city.outline.map(p=>p[1]));
   const i0=Math.max(Math.floor(west/step)-1,Math.floor(tl[0]/step)-1);
   const i1=Math.min(Math.ceil(east/step)+1,Math.ceil(br[0]/step)+1);
   const j0=Math.max(Math.floor(north/step)-1,Math.floor(tl[1]/step)-1);
   const j1=Math.min(Math.ceil(south/step)+1,Math.ceil(br[1]/step)+1);
   ctx.save();ctx.globalAlpha*=carto.fade(level,28,47);
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
     const tile=worldAPI.cityTile(city,i,j);
     if(!tile)continue;
     for(const building of tile.buildings)paint(building.polygon,night?'#aeb2ae':building.roof,night?'#6d7877':'#a7a095',.05);
   }
   ctx.restore();
 }

 function drawSecondaryCity(city){
  const level=state.scale/state.baseScale,night=state.style==='night';
  if(!city)return;
  const paint=(pts,color,edge=null)=>{
    if(!pts?.length)return;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
    if(edge){ctx.strokeStyle=edge;ctx.lineWidth=.13;ctx.stroke();}
  };
  const stroke=(pts,color,width)=>{
    if(!pts?.length)return;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  };
  ctx.save();ctx.globalAlpha*=carto.fade(level,4.2,7.6);
  paint(city.outline,night?'#565e59':city.theme==='baie'?'#e8d8be':city.theme==='estuaire'?'#e1d6c4':'#e4dfc8');
  ctx.beginPath();ctx.moveTo(city.outline[0][0],city.outline[0][1]);
  for(let i=1;i<city.outline.length;i++)ctx.lineTo(city.outline[i][0],city.outline[i][1]);ctx.closePath();ctx.clip();
  if(city.sea?.length)paint(city.sea,night?'#25576c':'#86b5c8');
  for(const yard of city.portYards||[])paint(yard.polygon,night?'#53666d':'#bbb7a7',night?'#657578':'#a09b8f');
  for(const basin of city.harbourBasins||[])paint(basin.polygon,night?'#205974':'#79b3c7',night?'#387189':'#c4dce4');
  for(const park of city.parks)paint(park.polygon,night?'#426b58':city.parkColor,night?'#51695a':'#a5b99d');
  if(state.layers.urban){
   if(level>=12){
     ctx.save();ctx.globalAlpha*=carto.fade(level,12,17);
     for(const b of city.buildings)paint(b.polygon,night?'#9d9e95':b.roof,night?'#707676':'#aa9f90');
     for(const warehouse of city.warehouses||[])paint(warehouse.polygon,night?'#a0a9a7':warehouse.roof,night?'#77878a':'#a2a8a1');
     ctx.restore();
     if(level>=40)drawCityMicro(city,paint,night);
   }
   for(const road of city.avenues){stroke(road.points,night?'#7b7674':'#b9aa90',road.class==='avenue'?2.0:1.35);stroke(road.points,night?'#e5ded0':'#fdf8e9',road.class==='avenue'?1.47:.95);}
   for(const road of city.portRoads||[]){stroke(road.points,night?'#786d69':'#a99c88',2.05);stroke(road.points,night?'#e2ddcc':'#f5eddb',1.25);}
   if(state.layers.transit)for(const rail of city.portRail||[]){
      stroke(rail.points,night?'#253f48':'#fffaf1',1.5);
      ctx.save();ctx.setLineDash([1,.7]);stroke(rail.points,night?'#92bfc7':'#426e78',.68);ctx.restore();
   }
   if(level>=10){ctx.save();ctx.globalAlpha*=carto.fade(level,10,14);
     for(const road of city.streets)stroke(road.points,night?'#d7d2c4':'#faf7ed',.57);
     ctx.restore();
   }
  }
  if(state.layers.water){
   for(const water of city.water){stroke(water.points,night?'#e2d5c1':'#faf3e4',water.width+.9);stroke(water.points,night?'#2a6177':'#5d9cb0',water.width);}
    for(const quay of city.quays||[])stroke(quay.points,night?'#d3c8ac':'#f2e2c9',.65);
    for(const bridge of city.bridges||[]){
       ctx.save();ctx.translate(bridge.x,bridge.y);ctx.rotate(bridge.angle);
       ctx.fillStyle=night?'#545d63':'#a18d79';ctx.fillRect(-bridge.span/2,-bridge.width*.68,bridge.span,bridge.width*1.36);
       ctx.fillStyle=night?'#d6c9b4':'#f4e6ce';ctx.fillRect(-bridge.span/2,-bridge.width*.48,bridge.span,bridge.width*.96);
       ctx.restore();
    }
  }
  ctx.restore();
  if(state.layers.labels&&level>=9&&level<22){
    for(const p of city.places.filter(x=>x.category==='quartier'))drawLabel(p.x,p.y,p.name,'region');
  }
 }

  function drawVesone(){
  const city=state.city,level=state.scale/state.baseScale;
  if(!city)return;
  const night=state.style==='night';
  ctx.save();ctx.globalAlpha*=carto.fade(level,5.6,8.3);
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
    if(level>=12){
     ctx.save();ctx.globalAlpha*=carto.fade(level,12,17);
     for(const building of city.buildings)fill(building.polygon,night?'#a6a39d':building.roof,night?'#747976':'#b9ab99',.075);
     ctx.restore();
     if(level>=40)drawCityMicro(city,fill,night);
    }
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
    if(level>=11){
       ctx.save();ctx.globalAlpha*=carto.fade(level,11,15);
       for(const lane of city.lanes||[])smooth(lane.points,night?'#b8aba0':'#f9f5e9',.32);
       ctx.restore();
     }
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
  ctx.restore();
 }
 
 function drawLabel(x,y,title,category='region'){const [sx,sy]=coord([x,y]);const [w,h]=getDim();if(sx<0||sy<0||sx>w||sy>h)return;ctx.save();ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.font=(category==='sea'?'italic 500 14px Georgia':'700 11px Arial');ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(242,245,240,.8)';ctx.strokeText(title,sx,sy);ctx.fillStyle=category==='sea'?'#b8e3e3':'#475c55';ctx.fillText(title,sx,sy);ctx.restore()}

 function drawMetroRoute(){
  const route=state.metroRoute;if(!route||!route.points||route.points.length<2)return;
  polyline(route.points,'rgba(22,44,52,.85)',11);
  polyline(route.points,route.mode==='rail'?'#3fe0c2':'#f9b345',6);
  const source=route.points[0],target=route.points[route.points.length-1];
  for(const point of [source,target]){ctx.beginPath();ctx.arc(point[0],point[1],6/state.scale,0,Math.PI*2);ctx.fillStyle=route.mode==='rail'?'#168b7d':'#c57c24';ctx.fill();ctx.lineWidth=3/state.scale;ctx.strokeStyle='white';ctx.stroke();}
 }
 function setupMetroRouting(){
  const metro=state.city.metropolitan,from=$('maps-metro-from'),to=$('maps-metro-to');
  for(const [id,name] of [['vesone','Vésone (accès urbain)'],...metro.satellites.map(s=>[s.id,s.name])]){
   for(const select of [from,to]){const opt=document.createElement('option');opt.value=id;opt.textContent=name;select.append(opt)}
  }
  from.value='belrives';to.value='port-breon';
  const engine=window.AreliaRouting;
  if(!engine)throw Error('Moteur d’itinéraires indisponible');
  state.roadGraph=engine.buildRoadGraph(metro.roads);
  state.railGraph=engine.buildRailGraph(metro.regional_rail);
  $('maps-metro-trace').onclick=traceMetroRoute;
  $('maps-metro-clear').onclick=()=>{state.metroRoute=null;renderMetroOverview();schedule()};
 }
 function traceMetroRoute(){
  const from=$('maps-metro-from').value,to=$('maps-metro-to').value,mode=$('maps-metro-mode').value;
  if(!from||!to||from===to){detail.classList.add('has-detail');detail.textContent='Sélectionnez deux pôles différents.';return}
  const engine=window.AreliaRouting,graph=mode==='rail'?state.railGraph:state.roadGraph;
  const answer=mode==='rail'?engine.shortestRail(graph,from,to):engine.shortestRoad(graph,from,to);
  if(!answer){detail.classList.add('has-detail');detail.textContent='Aucun parcours sur le réseau représenté.';state.metroRoute=null;schedule();return}
  state.metroRoute=answer;
  const titles=Object.fromEntries([['vesone','Vésone'],...state.city.metropolitan.satellites.map(s=>[s.id,s.name])]);
  detail.classList.add('has-detail');detail.replaceChildren();
  const over=document.createElement('span');over.className='maps-detail-attr';over.textContent=mode==='rail'?'RÉSEAU EXPRESS FICTIF':'AXES ROUTIERS FICTIFS';
  const h=document.createElement('h2');h.textContent=titles[from]+' → '+titles[to];
  const dist=document.createElement('div');dist.className='maps-route-message';
  const km=answer.units*state.data.meta.kilometres_per_unit;
  dist.textContent=Math.round(km)+' km environ · distance géométrique sur les tracés';
  const via=document.createElement('p');via.textContent=(mode==='rail'?'Lignes : ':'Axes : ')+answer.roads.join(' · ');
  const note=document.createElement('p');note.textContent=mode==='rail'
   ?'Les correspondances et les lignes sont fictives ; aucune durée ou fréquence n’est simulée.'
   :'Le trajet suit les intersections des axes métropolitains représentés. Il ne couvre pas les rues locales, la circulation ni les sens interdits. À Vésone, le tracé rejoint un accès à la ville, pas une adresse précise.';
  detail.append(over,h,dist,via,note);
  const xs=answer.points.map(p=>p[0]),ys=answer.points.map(p=>p[1]);
  const [w,hh]=getDim(),width=Math.max(12,Math.max(...xs)-Math.min(...xs)),height=Math.max(12,Math.max(...ys)-Math.min(...ys));
  const z=Math.max(state.baseScale*2,Math.min(state.baseScale*35,w*.77/width,hh*.76/height));
  state.scale=z;state.tx=w/2-(Math.min(...xs)+Math.max(...xs))/2*z;
  state.ty=hh/2-(Math.min(...ys)+Math.max(...ys))/2*z;clamp();schedule();
 }

 function drawMeasure(){
  const pts=state.measure.points;if(!pts.length)return;
  ctx.save();
  if(pts.length>=2){polyline(pts,'rgba(255,255,255,.95)',7);polyline(pts,'#0e8089',3.7)}
  for(let i=0;i<pts.length;i++){
   const p=pts[i],r=5.6/state.scale;ctx.beginPath();ctx.arc(p[0],p[1],r,0,2*Math.PI);
   ctx.fillStyle=i===0?'#e4ac54':'#0e8089';ctx.fill();
   ctx.lineWidth=2.1/state.scale;ctx.strokeStyle='#fff';ctx.stroke();
  }
  ctx.restore();
 }
 function updateMeasurePanel(){
  const panel=$('maps-measure-panel'),toggle=$('maps-measure-toggle');
  panel.hidden=!state.measure.active;
  toggle.setAttribute('aria-pressed',String(state.measure.active));
  toggle.classList.toggle('selected',state.measure.active);
  host.classList.toggle('measuring',state.measure.active);
  if(!state.data)return;
  const s=measureAPI.summarize(state.measure.points,state.data.meta.kilometres_per_unit,
   (x,y)=>worldAPI.height(x,y),p=>worldAPI.isLand(p,state.data));
  $('maps-measure-value').textContent=s.totalKm.toLocaleString('fr-FR',{maximumFractionDigits:2})+' km';
  $('maps-measure-hint').textContent=s.pointCount<2
   ?'Cliquez sur la carte pour poser des points. Glissez pour déplacer.'
   :s.pointCount+' points · distance à vol d’oiseau entre points'+(s.crossesWater?' · traverse une zone d’eau':'')+'.';
  $('maps-measure-relief').textContent=s.pointCount
   ?'Indices de relief aux points : '+s.minReliefIndex+'–'+s.maxReliefIndex+'/100 (non métriques).':'Aucun point placé.';
  $('maps-measure-undo').disabled=!s.pointCount;
  $('maps-measure-clear').disabled=!s.pointCount;
 }
 function setMeasureActive(active){state.measure.active=Boolean(active);updateMeasurePanel();schedule();}
 function addMeasurePoint(p){
  if(!state.measure.active||state.measure.points.length>=80)return;
  if(p.some(n=>!Number.isFinite(n))||p[0]<0||p[0]>1500||p[1]<0||p[1]>1400)return;
  state.measure.points.push(p.map(n=>Math.round(n*1000)/1000));updateMeasurePanel();schedule();
 }

 function drawRoute(){
    if(!state.route?.points?.length)return;
    const pieces=state.route.sections?.length?state.route.sections:[state.route];
    for(const section of pieces){
      if(!section.points?.length)continue;
      polyline(section.points,'rgba(21,44,57,.72)',11);
      polyline(section.points,'#f1a22e',6);
    }
    // Les derniers mètres hors du graphe sont dessinés en pointillés :
    // ils ne sont pas comptabilisés comme une route qualifiée.
    for(const link of state.route.access||[]){
      polyline([link.from,link.to],'#fffdf4',5,[5,3]);
      polyline([link.from,link.to],'#ce6c45',2.8,[5,3]);
    }
    for(const point of [pieces[0].points[0],pieces.at(-1).points.at(-1)]){
      ctx.beginPath();ctx.arc(point[0],point[1],5/state.scale,0,2*Math.PI);
      ctx.fillStyle='#f3ae3e';ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=2/state.scale;ctx.stroke();
    }
  }
 function drawProposedConnectors(){
   const cityId=state.secondaryCity?.id||(state.cityMode?'vesone':null);
   if(!state.layers.proposed||!state.layers.roads||!cityId||!state.urbanRouter)return;
   const level=state.scale/state.baseScale;if(level<15)return;
   const graph=state.urbanRouter.localCity(cityId);
   if(!graph)return;
   const [w,h]=getDim(),tl=toWorld(0,0),br=toWorld(w,h);
   ctx.save();ctx.globalAlpha=.7;
   for(const item of graph.connectors){
      if(!item.points.some(p=>p[0]>=tl[0]-5&&p[0]<=br[0]+5&&p[1]>=tl[1]-5&&p[1]<=br[1]+5))continue;
      polyline(item.points,state.style==='night'?'#b5aa91':'#b37650',2.1,[4,3]);
   }
   ctx.restore();
 }
 function draw(){if(!state.data)return;const [w,h]=getDim();if(!w||!h)return;ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.fillStyle=state.style==='night'?'#0a283b':'#c0d5d9';ctx.fillRect(0,0,w,h);ctx.save();ctx.setTransform(state.dpr*state.scale,0,0,state.dpr*state.scale,state.tx*state.dpr,state.ty*state.dpr);
  const img=state.style==='night'||state.style==='terrain'?terrain:plan;
  if(img.complete&&img.naturalWidth){if(state.style==='night')ctx.filter='brightness(.52) saturate(.65) hue-rotate(20deg)';else if(state.style==='game')ctx.filter='brightness(1.06) saturate(.86) contrast(.97)';ctx.drawImage(img,0,0,1500,1400);ctx.filter='none';}
  drawNationalHillshade();markerRoadNodes();drawProposedConnectors();drawRoute();drawMetroRoute();drawMeasure();ctx.restore();
  if(state.layers.labels && state.scale<state.baseScale*7){state.data.labels.forEach(p=>drawLabel(p.x,p.y,p.name,p.kind));}
  drawVillageLabels();drawRoadShields();syncMarkers();scaleBar();}
 function scaleBar(){
  const b=carto.scaleBar(state.scale,state.data.meta.kilometres_per_unit);
  if(!b)return;
  const el=$('maps-scale');el.style.width=b.width+'px';el.textContent=b.label;
  const level=state.scale/state.baseScale;
  $('maps-zoom-band').textContent=({empire:'Empire',agglomeration:'Agglomération',quartiers:'Quartiers',rues:'Rues'})[carto.band(level)]+' · zoom ×'+Math.round(level*10)/10;
}
 // Numérotation des cinq grands axes, avec étiquettes à l'échelle régionale.
 function drawRoadShields(){
  const level=state.scale/state.baseScale;
  if(!state.layers.roads||!state.layers.labels||state.cityMode||level<3||level>24)return;
  const [w,h]=getDim(),occupied=[];
  ctx.save();ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
  ctx.font='800 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const road of state.data.roads){
   const segments=[],pts=road.points;let total=0;
   for(let i=1;i<pts.length;i++){
    const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    segments.push(d);total+=d;
   }
   let remaining=total*.49,anchor=null;
   for(let i=0;i<segments.length;i++){
    if(remaining<=segments[i]){
     const t=segments[i]?remaining/segments[i]:0;
     anchor=[pts[i][0]*(1-t)+pts[i+1][0]*t,pts[i][1]*(1-t)+pts[i+1][1]*t];break;
    }
    remaining-=segments[i];
   }
   if(!anchor)continue;
   const [x,y]=coord(anchor);
   if(x<20||x>w-20||y<80||y>h-30||occupied.some(p=>Math.hypot(p[0]-x,p[1]-y)<42))continue;
   occupied.push([x,y]);
   ctx.fillStyle=state.style==='night'?'#233b47':'#fff7e8';
   ctx.strokeStyle=state.style==='night'?'#c4b298':'#92785d';
   ctx.lineWidth=1.3;ctx.fillRect(x-17,y-12,34,24);ctx.strokeRect(x-17,y-12,34,24);
   ctx.fillStyle=state.style==='night'?'#f8ead4':'#755942';ctx.fillText(road.id,x,y+1);
  }
  ctx.restore();
 }
 function drawVillageLabels(){
  const level=state.scale/state.baseScale;
  if(!state.world||!state.layers.labels||!state.layers.places||state.cityMode||level<11||level>58)return;
  const [w,h]=getDim(),taken=[];
  ctx.save();ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
  ctx.font=level>=25?'700 11px Arial':'600 10px Arial';
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const town of state.world.settlements){
   const [x,y]=coord([town.x,town.y]);
   if(x<60||x>w-60||y<34||y>h-28)continue;
   const labelY=y+15,span=Math.min(115,Math.max(42,town.name.length*6.1+12));
   const b=[x-span/2,labelY-8,x+span/2,labelY+8];
   if(taken.some(t=>b[0]<t[2]&&b[2]>t[0]&&b[1]<t[3]&&b[3]>t[1]))continue;
   taken.push(b);
   ctx.lineWidth=3;ctx.strokeStyle='rgba(255,252,239,.94)';ctx.strokeText(town.name,x,labelY);
   ctx.fillStyle=state.style==='night'?'#dae7dc':'#394d48';ctx.fillText(town.name,x,labelY);
  }
  ctx.restore();
 }
 function syncMarkers(){
  const [w,h]=getDim(),q=normalize(state.query),visibleItems=[];
  for(const p of [...state.data.places,...(state.city?.places||[]),...Object.values(state.secondaryData?.cities||{}).flatMap(city=>city.places),...Object.values(state.world?.cityPlans||{}).flatMap(city=>city.places)]){
    const el=state.markerNodes.get(p.id);if(!el)continue;
    const [sx,sy]=coord([p.x,p.y]);
    const major=['capitale','metropole','ville'].includes(p.category);
    const selected=state.selected===p.id;
    let visible=state.layers.places&&sx>=-70&&sx<=w+70&&sy>=-40&&sy<=h+50;
    if(p.cityPOI){
      if(state.secondaryCity ? p.cityId!==state.secondaryCity.id : Boolean(p.cityId))visible=false;
      const level=state.scale/state.baseScale;
      const threshold=p.category==='gare-metropolitaine'?8:p.category==='ville-satellite'?4.2:p.category==='quartier'?12:p.category==='transport'?21:p.category==='monument'?23:26;
      visible=visible&&state.cityMode&&(level>=threshold||selected);
      if(p.category==='quartier'&&level>=24&&!selected)visible=false;
    }else if(state.cityMode)visible=false;
    if(state.category!=='all'&&state.category!==p.category)visible=false;
    if(q&&!normalize(p.name+' '+p.type).includes(q))visible=false;
    if(p.category==='bourg'){
      const level=state.scale/state.baseScale;
      visible=visible&&(selected||Boolean(q)||level>=(p.kind==='centre local'?11:p.kind==='bourg'?15:19));
    }
    if(!p.cityPOI&&!major&&state.scale<state.baseScale*3&&!selected)visible=false;
    el.dataset.hidden=String(!visible);el.classList.toggle('selected',selected);
    el.style.left=sx+'px';el.style.top=sy+'px';el.classList.remove('collision-hidden');
    if(visible){
      const showsLabel=selected||['ville-satellite','capitale','metropole','quartier'].includes(p.category)||(p.category==='bourg'&&p.kind==='centre local'&&state.scale>state.baseScale*16);
      const priority=selected?100:p.category==='capitale'?75:p.category==='ville-satellite'?70:p.category==='metropole'?65:p.category==='quartier'?35:p.category==='bourg'?15:10;
      visibleItems.push({id:p.id,x:sx,y:sy,name:p.name,showsLabel,priority,selected});
    }
  }
  for(const id of carto.declutter(visibleItems))state.markerNodes.get(id)?.classList.add('collision-hidden');
}
 function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
 function resultIcon(p){if(p.kind==='massif')return '▲';if(p.kind==='panorama')return '◎';if(p.kind==='dunes')return '≈';if(p.kind==='clairiere')return '♣';if(p.kind==='vallon')return '⌁';if(p.category==='quartier')return '▦';if(p.category==='monument')return '✧';if(p.category==='pont')return '≋';if(p.category==='transport')return '↗';return ['capitale','metropole','ville'].includes(p.category)?'⌂':p.category==='hydro'?'≈':'◆'}
 function listItems(){const q=normalize(state.query);const filtered=(state.cityMode?(state.secondaryCity?state.secondaryCity.places:state.city.places):state.data.places).filter(p=>(p.category!=='bourg'||state.category==='bourg'||Boolean(q))&&(state.category==='all'||state.category===p.category)&&(!q||normalize(p.name+' '+p.type+' '+p.description).includes(q)));$('maps-count').textContent=filtered.length;results.replaceChildren();if(!filtered.length){const empty=document.createElement('div');empty.className='maps-no-results';empty.textContent='Aucun lieu trouvé.';results.append(empty);return;}
  for(const p of filtered){const btn=document.createElement('button');btn.type='button';btn.className='maps-result'+(state.selected===p.id?' selected':'');btn.innerHTML='<span class="maps-result-icon '+(p.category==='capitale'||p.category==='metropole'?'city':'')+'">'+resultIcon(p)+'</span><span><strong></strong><small></small></span>';btn.querySelector('strong').textContent=p.name;btn.querySelector('small').textContent=p.type;btn.addEventListener('click',()=>select(p,true));results.append(btn);}}
 function select(p,focusMap=false){state.selected=p.id;listItems();renderDetail(p);if(focusMap)focus(p.x,p.y,p.category==='ville-satellite'?11:p.category==='gare-metropolitaine'?14:p.cityPOI?31:p.category==='capitale'?15:p.category==='ville'?10:8);else schedule();}
 function renderDetail(p){detail.classList.add('has-detail');detail.replaceChildren();const photo=document.createElement('div');photo.className='maps-detail-photo';photo.innerHTML='<img src="../assets/arelia-geographie.webp" alt="Paysage géographique d’Arélia">';detail.append(photo);
  const label=document.createElement('span');label.className='maps-detail-attr';label.textContent=p.type;const name=document.createElement('h2');name.textContent=p.name;const desc=document.createElement('p');desc.textContent=p.description;detail.append(label,name,desc);
  const fact=document.createElement('div');fact.className='maps-detail-fact';fact.textContent=p.population||'Lieu géographique de l’Empire d’Arélia';detail.append(fact);
  const status=document.createElement('div');status.className='maps-detail-fact';status.textContent=p.cityPOI?('Quartier : '+(p.district||'Vésone')+' · '+(p.status||'Plan provisoire')):('Position : '+num(p.x*state.data.meta.kilometres_per_unit)+' km E / '+num(p.y*state.data.meta.kilometres_per_unit)+' km S (repère fictif)');detail.append(status);
  const action=document.createElement('a');action.className='maps-detail-cta';action.href=wikiHref(p);action.textContent='Consulter la fiche du wiki ↗';detail.append(action);
  const closer=document.createElement('button');closer.type='button';closer.className='maps-detail-zoom';closer.textContent='Zoomer sur le lieu +';closer.addEventListener('click',()=>focus(p.x,p.y,p.cityPOI?33:16));detail.append(closer);
  if(state.secondaryData?.cities?.[p.id]||state.world?.cityPlans?.[p.id]){
    const explore=document.createElement('button');explore.type='button';
    explore.className='maps-detail-zoom';explore.textContent='Explorer le plan de '+p.name;
    explore.onclick=()=>enterOtherCity(p.id);detail.append(explore);
  }
  if(['capitale','metropole','ville','bourg'].includes(p.category)||p.cityId){
    const from=document.createElement('button');from.className='maps-detail-zoom';from.textContent='Choisir comme départ';from.onclick=()=>{$('maps-from').value=p.id;$('maps-to').focus()};detail.append(from);
    const to=document.createElement('button');to.className='maps-detail-zoom';to.textContent='Choisir comme arrivée';to.onclick=()=>{$('maps-to').value=p.id;$('maps-route').focus()};detail.append(to);
  }
 }
 function makeMarkers(){for(const p of [...state.data.places,...state.city.places,...Object.values(state.secondaryData.cities).flatMap(city=>city.places),...Object.values(state.world?.cityPlans||{}).flatMap(city=>city.places)]){const el=document.createElement('button');el.type='button';el.className='maps-marker '+(p.cityPOI?'local '+p.category+' ': '')+(p.category==='capitale'?'capitale':p.category==='nature'||p.category==='hydro'?'nature':p.category==='ville'?'city-minor':'');el.dataset.id=p.id;el.setAttribute('aria-label','Ouvrir '+p.name);el.innerHTML='<span class="maps-marker-label"></span><span class="dot"></span>';el.querySelector('.maps-marker-label').textContent=p.name;el.addEventListener('click',e=>{e.stopPropagation();select(p,false)});markers.append(el);state.markerNodes.set(p.id,el);}}
 function setupRoutes(){
    const cities=state.data.places.filter(p=>['capitale','metropole','ville'].includes(p.category))
       .sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    const villages=state.world.settlements.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    const neighbourhoods=[
      ...state.city.places,
      ...Object.values(state.secondaryData.cities).flatMap(city=>city.places),
      ...Object.values(state.world.cityPlans).flatMap(city=>city.places)
    ].filter(p=>p.cityId).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    for(const id of ['maps-from','maps-to']){
      const select=$(id),centres=document.createElement('optgroup'),localites=document.createElement('optgroup'),
        neighbourhood=document.createElement('optgroup');
      centres.label='Grandes villes';localites.label='Localités proposées';neighbourhood.label='Quartiers, gares et monuments';
      for(const p of cities){
        const option=document.createElement('option');option.value=p.id;option.textContent=p.name;centres.append(option);
      }
      for(const p of villages){
        const option=document.createElement('option');option.value=p.id;option.textContent=p.name;localites.append(option);
      }
      for(const p of neighbourhoods){
        const option=document.createElement('option');option.value=p.id;
        const c=state.data.places.find(city=>city.id===p.cityId);
        option.textContent=(c?.name||p.cityId)+' · '+p.name;neighbourhood.append(option);
      }
      select.append(centres,localites,neighbourhood);
    }
    $('maps-from').value='occidian';$('maps-to').value='vesone';
  }
  function ensureUrbanRouter(){
    if(state.urbanRouter)return state.urbanRouter;
    const engine=window.AreliaNationalRouting;
    if(!engine)throw Error('Moteur interurbain indisponible');
    if(!state.nationalGraph)state.nationalGraph=engine.build(state.data,state.world);
    const v=state.city,metro=v.metropolitan||{},urbanVesone={
      ...v,id:'vesone',center:v.meta.center,outline:null,
      avenues:[...(v.avenues||[]),...(metro.roads||[])],
      streets:[...(v.streets||[]),...(metro.local_streets||[])],
      water:[...(v.water||[]),...(metro.terrain?.waterways||[])]
    };
    const cityMap={...state.secondaryData.cities,...state.world.cityPlans,vesone:urbanVesone};
    state.urbanRouter=urbanAPI.createService(state.data,state.world,cityMap,state.nationalGraph);
    return state.urbanRouter;
  }
  function route(){
    const from=$('maps-from').value,to=$('maps-to').value;
    if(!from||!to||from===to){
      detail.classList.add('has-detail');detail.textContent='Choisissez deux lieux différents.';return;
    }
    try{
      const router=ensureUrbanRouter();
      const places=new Map([
        ...state.data.places,
        ...state.city.places,
        ...Object.values(state.secondaryData.cities).flatMap(city=>city.places),
        ...Object.values(state.world.cityPlans).flatMap(city=>city.places)
      ].map(p=>[p.id,p]));
      const answer=router.route(places.get(from),places.get(to));
      state.metroRoute=null;
      if(!answer){state.route=null;detail.classList.add('has-detail');detail.textContent='Aucun trajet n’a été trouvé sur les axes connectés de l’atlas.';schedule();return;}
      state.route=answer;
      detail.classList.add('has-detail');detail.replaceChildren();
      const title=document.createElement('h2');title.textContent='Itinéraire routier fictif';
      const intro=document.createElement('p');intro.textContent=(places.get(from)?.name||from)+' → '+(places.get(to)?.name||to);
      const distance=document.createElement('div');distance.className='maps-route-message';
      distance.textContent=num(answer.units*state.data.meta.kilometres_per_unit)+' km environ · distance calculée sur les voies représentées';
      const info=document.createElement('p');info.textContent='Réseau représenté : '+answer.roads.length+' voies et '+answer.segments+' segments. Les croisements sans sommet explicite ne deviennent pas des carrefours.';
      const segments=answer.sections?.length?answer.sections:[answer];
      const audits=segments.map(p=>auditAPI.onRoute(p.points,state.audit));
      const issues={
       bridges:audits.flatMap(v=>v.bridges),
       lakeConflicts:audits.flatMap(v=>v.lakeConflicts),
       coastalConflicts:audits.flatMap(v=>v.coastalConflicts)
      };
      const inspection=document.createElement('p');inspection.className='maps-route-audit';
      inspection.textContent=issues.bridges.length+' franchissement(s) fluvial(aux) à qualifier'
       +(issues.lakeConflicts.length?' · '+issues.lakeConflicts.length+' passage(s) sur le lac':'')
       +(issues.coastalConflicts.length?' · '+issues.coastalConflicts.length+' passage(s) hors terre':'');
      const accessDistance=(answer.access||[]).reduce((s,p)=>s+p.distance,0);
      const access=document.createElement('p');access.className='maps-route-audit';
      access.textContent=(answer.access||[]).length+' accès hors voirie qualifiée · '+num(accessDistance*state.data.meta.kilometres_per_unit)+' km indiqués en pointillés (non inclus dans le kilométrage routier).';
      const caution=document.createElement('p');
      caution.textContent='Raccordements urbains et liaisons proposés, sans garantie de circulation ni de franchissement. Les tronçons interrompus ne sont pas reliés par des routes imaginaires. Ne pas utiliser pour une navigation réelle.';
      detail.append(title,intro,distance,info,inspection,access,caution);
      const xs=answer.points.map(p=>p[0]),ys=answer.points.map(p=>p[1]),w=getDim()[0],h=getDim()[1];
      const width=Math.max(12,Math.max(...xs)-Math.min(...xs));
      const height=Math.max(12,Math.max(...ys)-Math.min(...ys));
      const scale=Math.max(state.baseScale*1.2,Math.min(state.baseScale*100,w*.75/width,h*.72/height));
      state.scale=scale;
      state.tx=w/2-(Math.min(...xs)+Math.max(...xs))*.5*scale;
      state.ty=h/2-(Math.min(...ys)+Math.max(...ys))*.5*scale;
      clamp();schedule();
    }catch(error){
      state.route=null;
      detail.classList.add('has-detail');
      detail.textContent='Échec du calcul de l’itinéraire. Le réseau doit être vérifié.';
      console.error(error);schedule();
    }
  }

 function enterCity(){state.secondaryCity=null;host.closest('.arelia-map-wrap').classList.remove('maps-secondary-mode');$('maps-other-cities').value='';state.metroRoute=null;$('maps-metro-routing').hidden=true;state.cityMode=true;state.metroMode=false;host.closest('.arelia-map-wrap').classList.remove('maps-metro-mode');state.category='all';state.query='';$('maps-search').value='';state.selected=null;state.route=null;
  host.closest('.arelia-map-wrap').classList.add('maps-city-mode');$('maps-visit-empire').hidden=false;
  $('maps-scope-caption').textContent='PLAN DE VÉSONE · TRACÉS PROVISOIRES';
  document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('is-active',b.dataset.cat==='all'));
  focus(1110,698,23);listItems();renderCityOverview();schedule();}
 function leaveCity(){state.secondaryCity=null;host.closest('.arelia-map-wrap').classList.remove('maps-secondary-mode');$('maps-other-cities').value='';state.metroRoute=null;$('maps-metro-routing').hidden=true;state.cityMode=false;state.metroMode=false;host.closest('.arelia-map-wrap').classList.remove('maps-metro-mode');state.category='all';state.query='';$('maps-search').value='';state.selected=null;state.route=null;
  host.closest('.arelia-map-wrap').classList.remove('maps-city-mode');$('maps-visit-empire').hidden=true;
  $('maps-scope-caption').textContent='CARTE NATIONALE · NORD ↑';
  document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('is-active',b.dataset.cat==='all'));
  initial();listItems();renderCountryOverview();schedule();}
 function enterMetro(){
    enterCity();state.metroMode=true;$('maps-metro-routing').hidden=false;host.closest('.arelia-map-wrap').classList.add('maps-metro-mode');
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
  function enterOtherCity(id){
  const city=state.secondaryData?.cities?.[id]||state.world?.cityPlans?.[id];if(!city)return;
  state.cityMode=true;state.metroMode=false;state.secondaryCity=city;
  state.metroRoute=null;state.route=null;state.selected=null;state.category='all';state.query='';
  $('maps-search').value='';$('maps-other-cities').value=id;
  $('maps-metro-routing').hidden=true;
  const wrap=host.closest('.arelia-map-wrap');
  wrap.classList.add('maps-city-mode','maps-secondary-mode');wrap.classList.remove('maps-metro-mode');
  $('maps-visit-empire').hidden=false;
  $('maps-scope-caption').textContent='PLAN DE '+city.name.toUpperCase()+' · TRACÉS PROVISOIRES';
  document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('is-active',b.dataset.cat==='all'));
  focus(city.center[0],city.center[1],13);
  listItems();renderOtherOverview();schedule();
 }
 function renderOtherOverview(){
  const city=state.secondaryCity;detail.classList.toggle('has-detail',window.innerWidth>700);
  detail.replaceChildren();
  const t=document.createElement('span');t.className='maps-detail-attr';t.textContent='PLAN URBAIN PROVISOIRE';
  const h=document.createElement('h2');h.textContent=city.name;
  const d=document.createElement('p');d.textContent=city.role+'. Un premier tissu urbain vectoriel fictif, avec ses voies, îlots et points d’intérêt.';
  const stat=document.createElement('div');stat.className='maps-route-message';
  stat.textContent=city.buildings.length+' bâtiments schématiques · '+(city.streets.length+city.avenues.length)+' voies · '+city.places.length+' lieux';
  const link=document.createElement('a');link.className='maps-detail-cta';link.href='../wiki/'+city.id+'/';link.textContent='Voir la notice encyclopédique ↗';
  detail.append(t,h,d,stat,link);
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
 function setup(){
  const area=host,pointers=new Map();let gesture=null;
  const local=e=>{const r=area.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
  function calibrate(){
    const ps=[...pointers.values()];
    if(ps.length===1){gesture={kind:'pan',start:ps[0],tx:state.tx,ty:state.ty,dragged:false};return}
    if(ps.length>=2){
      const a=ps[0],b=ps[1],center=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      gesture={kind:'pinch',distance:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1])),scale:state.scale,anchor:toWorld(center[0],center[1])};
      return;
    }
    gesture=null;
  }
  area.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,input,select,a'))return;
    if(e.pointerType==='touch')e.preventDefault();
    area.setPointerCapture(e.pointerId);pointers.set(e.pointerId,local(e));
    calibrate();area.classList.add('grabbing');
  });
  area.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,local(e));
    if(!gesture)return;
    const ps=[...pointers.values()];
    if(ps.length>=2&&gesture.kind==='pinch'){
      const a=ps[0],b=ps[1],center=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      const distance=Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1]));
      const camera=carto.pinchCamera(gesture.anchor,center,gesture.scale,distance/gesture.distance,state.baseScale*.8,state.baseScale*42);
      state.scale=camera.scale;state.tx=camera.tx;state.ty=camera.ty;clamp();schedule();
    }else if(ps.length===1&&gesture.kind==='pan'){
      if(Math.hypot(ps[0][0]-gesture.start[0],ps[0][1]-gesture.start[1])>5)gesture.dragged=true;
      if(!gesture.dragged)return;
      state.tx=gesture.tx+ps[0][0]-gesture.start[0];
      state.ty=gesture.ty+ps[0][1]-gesture.start[1];clamp();schedule();
    }
  });
  const release=e=>{
    if(!pointers.has(e.pointerId))return;
    if(e.type==='pointerup'&&pointers.size===1&&gesture?.kind==='pan'&&!gesture.dragged&&state.measure.active){const p=local(e);addMeasurePoint(toWorld(p[0],p[1]));}
    pointers.delete(e.pointerId);
    if(area.hasPointerCapture(e.pointerId))area.releasePointerCapture(e.pointerId);
    calibrate();if(!pointers.size)area.classList.remove('grabbing');
  };
  area.addEventListener('pointerup',release);area.addEventListener('pointercancel',release);
  area.addEventListener('lostpointercapture',e=>{
    if(pointers.delete(e.pointerId)){calibrate();if(!pointers.size)area.classList.remove('grabbing')}
  });

  area.addEventListener('wheel',e=>{e.preventDefault();const rect=area.getBoundingClientRect();zoom(e.deltaY<0?1.23:.81,e.clientX-rect.left,e.clientY-rect.top)},{passive:false});area.addEventListener('dblclick',e=>{if(state.measure.active){e.preventDefault();return;}const r=area.getBoundingClientRect();zoom(1.7,e.clientX-r.left,e.clientY-r.top)});
  area.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.measure.active){setMeasureActive(false);return;}if(e.key==='Escape'&&state.cityMode){leaveCity();return;}const delta=70;if(e.key==='ArrowLeft')state.tx+=delta;else if(e.key==='ArrowRight')state.tx-=delta;else if(e.key==='ArrowUp')state.ty+=delta;else if(e.key==='ArrowDown')state.ty-=delta;else if(e.key==='+'||e.key==='=')zoom(1.4);else if(e.key==='-')zoom(.7);else return;e.preventDefault();clamp();schedule()});
  $('maps-visit-vesone').onclick=enterCity;$('maps-visit-metro').onclick=enterMetro;$('maps-visit-empire').onclick=leaveCity;
  $('maps-audit-open').onclick=renderInfrastructureReport;
  $('maps-measure-toggle').onclick=()=>setMeasureActive(!state.measure.active);
  $('maps-measure-undo').onclick=()=>{state.measure.points.pop();updateMeasurePanel();schedule()};
  $('maps-measure-clear').onclick=()=>{state.measure.points=[];updateMeasurePanel();schedule()};
  $('maps-measure-close').onclick=()=>setMeasureActive(false);
  $('maps-other-cities').onchange=e=>{if(e.target.value)enterOtherCity(e.target.value);else leaveCity()};
  $('maps-zoom-in').onclick=()=>zoom(1.6);$('maps-zoom-out').onclick=()=>zoom(.625);$('maps-home').onclick=()=>state.secondaryCity?enterOtherCity(state.secondaryCity.id):state.metroMode?enterMetro():state.cityMode?focus(1110,698,23):initial();
  for(const b of document.querySelectorAll('[data-style]'))b.onclick=()=>{state.style=b.dataset.style;document.querySelectorAll('[data-style]').forEach(v=>v.classList.toggle('selected',v===b));schedule()};
  const lp=$('maps-layers');$('maps-layers-toggle').onclick=()=>{lp.hidden=!lp.hidden;$('maps-layers-toggle').setAttribute('aria-expanded',String(!lp.hidden))};document.addEventListener('pointerdown',e=>{if(!lp.hidden&&!lp.contains(e.target)&&!$('maps-layers-toggle').contains(e.target)){$('maps-layers-toggle').setAttribute('aria-expanded','false');lp.hidden=true}});
  for(const checkbox of document.querySelectorAll('[data-layer]'))checkbox.onchange=()=>{state.layers[checkbox.dataset.layer]=checkbox.checked;schedule()};
  const addDismiss=()=>{
    if(!detail.classList.contains('has-detail')||detail.querySelector('.maps-detail-dismiss'))return;
    const close=document.createElement('button');close.type='button';
    close.className='maps-detail-dismiss';close.setAttribute('aria-label','Fermer les détails');
    close.textContent='×';
    close.onclick=()=>{detail.classList.remove('has-detail');area.focus({preventScroll:true})};
    detail.prepend(close);
  };
  const detailObserver=new MutationObserver(addDismiss);
  detailObserver.observe(detail,{attributes:true,attributeFilter:['class'],childList:true});
    const elevationReadout=$('maps-altitude-readout');
  area.addEventListener('pointermove',e=>{
    const terrain=state.city?.metropolitan?.terrain;
    if(!state.data){elevationReadout.hidden=true;return;}
    const rect=area.getBoundingClientRect(),pt=toWorld(e.clientX-rect.left,e.clientY-rect.top);
    if(!worldAPI.isLand(pt,state.data)){elevationReadout.hidden=true;return;}
    if(!state.cityMode||!terrain){
      const index=Math.round(worldAPI.height(pt[0],pt[1]));
      const biome=worldAPI.biome(pt[0],pt[1]).replace(/-/g,' ');
      elevationReadout.textContent='XY '+Math.round(pt[0])+', '+Math.round(pt[1])+' · '+biome+' · relief '+index+'/100 (indicatif)';
      elevationReadout.hidden=false;return;
    }
    if(!(state.layers.relief||state.style==='terrain')){elevationReadout.hidden=true;return;}
    const g=terrain.grid;
    const x=(pt[0]-g.origin[0])/g.step,y=(pt[1]-g.origin[1])/g.step;
    if(x<0||y<0||x>=g.cols-1||y>=g.rows-1){elevationReadout.hidden=true;return;}
    const i=Math.floor(x),j=Math.floor(y),tx=x-i,ty=y-j,at=(ii,jj)=>g.values[jj*g.cols+ii];
    const value=at(i,j)*(1-tx)*(1-ty)+at(i+1,j)*tx*(1-ty)+at(i,j+1)*(1-tx)*ty+at(i+1,j+1)*tx*ty;
    elevationReadout.textContent='Relief fictif · indice '+Math.round(value)+'/100 (non métrique)';
    elevationReadout.hidden=false;
  });
  area.addEventListener('pointerleave',()=>{elevationReadout.hidden=true});
  $('maps-search').oninput=e=>{state.query=e.target.value;listItems();schedule()};for(const b of document.querySelectorAll('[data-cat]'))b.onclick=()=>{state.category=b.dataset.cat;document.querySelectorAll('[data-cat]').forEach(t=>t.classList.toggle('is-active',t===b));listItems();schedule()};
  $('maps-route').onclick=route;$('maps-route-clear').onclick=()=>{state.route=null;detail.classList.remove('has-detail');detail.innerHTML='<div class="maps-detail-idle"><span class="maps-overline">CARTE GÉOGRAPHIQUE</span><h2>Itinéraire effacé.</h2><p>Sélectionnez une destination ou un autre trajet.</p></div>';schedule()};
  window.addEventListener('resize',()=>{const [w,h]=getDim();const ox=(w/2-state.tx)/state.scale,oy=(h/2-state.ty)/state.scale;const prev=state.baseScale;state.baseScale=Math.min(w/1500,h/1400)*.94;state.scale*=state.baseScale/(prev||state.baseScale);state.tx=w/2-ox*state.scale;state.ty=h/2-oy*state.scale;clamp();resize()});
 }
 async function init(){try{const [r,cityResponse,secondaryResponse]=await Promise.all([fetch('../assets/arelia-map-data.json'),fetch('../assets/vesone-city.json'),fetch('../assets/arelia-other-cities.json'),new Promise(resolve=>{let count=0;const fn=()=>{count++;if(count===2)resolve()};for(const img of [terrain,plan]){if(img.complete&&img.naturalWidth)fn();else{img.addEventListener('load',fn,{once:true});img.addEventListener('error',fn,{once:true})}}})]);if(!r.ok)throw Error('Impossible de charger les données locales');state.data=await r.json();if(!cityResponse.ok)throw Error('Plan urbain de Vésone indisponible');state.city=await cityResponse.json();if(!secondaryResponse.ok)throw Error('Plans des autres villes indisponibles');state.secondaryData=await secondaryResponse.json();state.world=worldAPI.makeWorld(state.data);state.audit=auditAPI.analyze(state.data,state.world);state.data.places.push(...state.world.settlements,...state.world.landmarks);state.city.places.forEach(p=>{p.cityPOI=true;p.cityId='vesone'});Object.values(state.world.cityPlans).forEach(city=>city.places.forEach(p=>{p.cityPOI=true;p.cityId=city.id}));Object.values(state.secondaryData.cities).forEach(city=>city.places.forEach(p=>{p.cityPOI=true;p.cityId=city.id}));makeMarkers();setupRoutes();setupMetroRouting();setup();updateMeasurePanel();initial();resize();listItems();$('maps-loading').hidden=true;const view=new URLSearchParams(window.location.search).get('vue');if(view==='metropole')enterMetro();else if(view==='vesone')enterCity();else if(state.secondaryData.cities[view]||state.world?.cityPlans?.[view])enterOtherCity(view);}catch(err){$('maps-loading').innerHTML='<span>Erreur de chargement de la carte. Vérifiez les fichiers du site et rechargez la page.</span>';console.error(err)}}
 init();
})();
