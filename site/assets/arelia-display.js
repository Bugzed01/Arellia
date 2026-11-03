/* Arélia Maps 1.0 — helpers de rendu et d'interaction testables. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.AreliaDisplay=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fade=(z,a,b)=>clamp((z-a)/(b-a),0,1);
function scaleBar(scale,units,target=100){
if(!(scale>0&&units>0))return null;
const choices=[.05,.1,.2,.5,1,2,5,10,20,50,100,200,500,1000,2000],goal=target*units/scale;
const km=choices.reduce((a,b)=>Math.abs(Math.log(a/goal))<Math.abs(Math.log(b/goal))?a:b);
return {km,width:km/units*scale,label:km<1?Math.round(km*1000)+' m':km+' km'};
}
function pinchCamera(anchor,center,start,ratio,min,max){const scale=clamp(start*ratio,min,max);return {scale,tx:center[0]-anchor[0]*scale,ty:center[1]-anchor[1]*scale};}
function declutter(items){const hidden=new Set(),boxes=[];for(const p of items.slice().sort((a,b)=>b.priority-a.priority)){
if(!p.showsLabel)continue;const half=Math.max(22,Math.min(105,(p.name||'').length*3.6+11)),b=[p.x-half,p.y-39,p.x+half,p.y-17];
if(!p.selected&&boxes.some(a=>b[0]<a[2]&&b[2]>a[0]&&b[1]<a[3]&&b[3]>a[1])){hidden.add(p.id);continue;}boxes.push(b);
}return hidden;}
const band=z=>z<3.1?'empire':z<12?'agglomeration':z<24?'quartiers':'rues';
return {clamp,fade,scaleBar,pinchCamera,declutter,band};
});
