/* Arélia Maps 1.9 — index spatial de la géographie fictive.
 * Un segment est recensé sur toutes les cellules couvertes par son emprise,
 * agrandie de son rayon de recherche. Les résultats restent déterministes.
 * Aucun service de tuiles, de géocodage ou de recherche externe. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaSpatial=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const SIZE=48,ROAD_RADIUS=40,RIVER_RADIUS=20,TOWN_RADIUS=80;
 const cell=(x,y)=>Math.floor(x/SIZE)+','+Math.floor(y/SIZE);
 function add(map,feature,minX,maxX,minY,maxY,pad){
  for(let i=Math.floor((minX-pad)/SIZE);i<=Math.floor((maxX+pad)/SIZE);i++)
   for(let j=Math.floor((minY-pad)/SIZE);j<=Math.floor((maxY+pad)/SIZE);j++){
    const key=i+','+j;if(!map.has(key))map.set(key,[]);
    map.get(key).push(feature);
   }
 }
 function addLines(map,lines,pad){
  let n=0;
  for(const road of lines)for(let k=1;k<(road.points||[]).length;k++){
   const a=road.points[k-1],b=road.points[k],feature={a,b,road};
   add(map,feature,Math.min(a[0],b[0]),Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[1],b[1]),pad);
   n++;
  }
  return n;
 }
 function createIndex(geo,context={}){
  if(!geo||!Array.isArray(geo.places))throw new TypeError('Référentiel géographique absent');
  const towns=new Map(),roads=new Map(),rivers=new Map();
  const settlements=context.settlements||[];
  for(const town of settlements)add(towns,town,town.x,town.x,town.y,town.y,TOWN_RADIUS);
  const countRoads=addLines(roads,[...(geo.roads||[]),...(context.arterials||[]),...(context.feeders||[])],ROAD_RADIUS);
  const countRivers=addLines(rivers,[...(geo.rivers||[]),...(context.streams||[])],RIVER_RADIUS);
  return {
   townsAt:(x,y)=>towns.get(cell(x,y))||[],
   roadsAt:(x,y)=>roads.get(cell(x,y))||[],
   riversAt:(x,y)=>rivers.get(cell(x,y))||[],
   count:{towns:settlements.length,roadSegments:countRoads,riverSegments:countRivers},
   size:SIZE
  };
 }
 return {SIZE,createIndex};
});
