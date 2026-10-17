import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,render} from './usage.mjs';
const now=new Date('2026-10-17T09:00:00Z');
test('cache and reasoning are counted once, with UTC+8 calendar boundaries',()=>{
  const s=summarize({buckets:[{bucketStart:'2026-10-16T16:00:00Z',inputTokens:100,cachedInputTokens:800,outputTokens:40,reasoningOutputTokens:60,model:'known'},{bucketStart:'2026-09-17T15:30:00Z',inputTokens:999}],sessions:[]},{now,rates:{known:{input:2,cached:.2,output:8}}});
  assert.equal(s.totals.total,1000);assert.equal(s.totals.output,100);assert.equal(s.daily.at(-1).total,1000);assert.equal(s.heatmap[5][0],1000);assert.equal(s.estimatedCost,.00116);assert.equal(s.pricingCoverage,1);
});
test('unknown prices remain unpriced and private identifiers cannot be published',()=>{
  const s=summarize({buckets:[{bucketStart:now.toISOString(),inputTokens:10,project:'SECRET_PROJECT',hostname:'SECRET_MACHINE',model:'SECRET_MODEL'}],sessions:[{sessionHash:'SECRET_SESSION',firstMessageAt:now.toISOString(),lastMessageAt:now.toISOString(),project:'SECRET_PROJECT'}]},{now});
  assert.equal(s.estimatedCost,null);assert.equal(s.pricingCoverage,0);assert.equal(s.sessions,1);assert.ok(!JSON.stringify(s).includes('SECRET'));assert.ok(!render(s).includes('SECRET'));assert.ok(render(s).includes('Unpriced'));
});
