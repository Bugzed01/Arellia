/* Tests du calcul de distance et des avertissements sur l'eau. */
const assert=require('node:assert/strict');
const measure=require('../../site/assets/arelia-measure.js');
const s=measure.summarize([[0,0],[3,4],[6,4]],2,(x,y)=>x+y,()=>true);
assert.equal(s.pointCount,3);
assert.equal(s.totalKm,16);
assert.equal(s.directKm,Math.round(Math.hypot(6,4)*2000)/1000);
assert.equal(s.minReliefIndex,0);
assert.equal(s.maxReliefIndex,10);
assert.equal(s.crossesWater,false);
assert.equal(measure.summarize([],1).totalKm,0);
assert.equal(measure.summarize([[3,4]],1).directKm,0);
assert.equal(measure.summarize([[0,0],[10,0]],1,null,p=>p[0]<5).crossesWater,true);
assert.throws(()=>measure.summarize([[NaN,1]],1),TypeError);
assert.throws(()=>measure.summarize([[0,0]],0),RangeError);
assert.throws(()=>measure.summarize(new Array(81).fill([0,0]),1),RangeError);
console.log('Calcul de distance et contrôles des unités XY : OK');
