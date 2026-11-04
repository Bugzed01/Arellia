/* Arélia Maps 1.6 — mesure sur un plan XY fictif, sans calcul d'itinéraire. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaMeasure=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const round=n=>Math.round(n*1000)/1000;
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 function summarize(points,kmPerUnit,heightAt,isLand){
  if(!Array.isArray(points)||points.length>80)throw new RangeError('Nombre de points invalide');
  if(!(Number.isFinite(kmPerUnit)&&kmPerUnit>0))throw new RangeError('Échelle absente');
  for(const p of points)if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))throw new TypeError('Coordonnée XY invalide');
  let total=0,water=false;
  const heights=[];
  if(typeof heightAt==='function')for(const p of points){
   const h=heightAt(p[0],p[1]);if(Number.isFinite(h))heights.push(h);
  }
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],len=distance(a,b);total+=len;
   if(typeof isLand==='function'){
    const count=Math.min(300,Math.max(1,Math.ceil(len/2)));
    for(let j=0;j<=count;j++){
     const t=j/count,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
     if(!isLand(p)){water=true;break;}
    }
   }
  }
  return {
   pointCount:points.length,
   totalKm:round(total*kmPerUnit),
   directKm:points.length>1?round(distance(points[0],points[points.length-1])*kmPerUnit):0,
   minReliefIndex:heights.length?Math.round(Math.min(...heights)):null,
   maxReliefIndex:heights.length?Math.round(Math.max(...heights)):null,
   crossesWater:water
  };
 }
 return {summarize};
});
