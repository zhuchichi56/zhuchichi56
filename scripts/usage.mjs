import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZONE = 'Asia/Shanghai';
const num = n => Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
const dateKey = d => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const compact = n => n >= 1e9 ? `${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n);

export function summarize(data, { now = new Date(), rates = {} } = {}) {
  const today = dateKey(now);
  const midnight = Date.parse(`${today}T00:00:00+08:00`);
  const start = midnight - 29 * 86400000;
  const daily = Array.from({length:30}, (_,i) => ({date:dateKey(new Date(start+i*86400000)),input:0,output:0,cached:0,reasoning:0,total:0}));
  const byDay = new Map(daily.map(d=>[d.date,d]));
  const heatmap = Array.from({length:7},()=>Array(24).fill(0));
  const totals = {input:0,output:0,cached:0,reasoning:0,total:0};
  let estimatedCost=0, pricedTokens=0;
  for (const b of data.buckets || []) {
    const timestamp = new Date(b.bucketStart);
    if (!(timestamp.getTime()>=start && timestamp<=now)) continue;
    const day = byDay.get(dateKey(timestamp));
    if (!day) continue;
    // Upstream separates reasoning from visible output and cache reads from input.
    const input = num(b.inputTokens)+num(b.cacheCreation5mTokens)+num(b.cacheCreation1hTokens);
    const reasoning = num(b.reasoningOutputTokens);
    const output = num(b.outputTokens)+reasoning;
    const cached = num(b.cachedInputTokens);
    const values={input,output,cached,reasoning,total:input+output+cached};
    for (const key of Object.keys(totals)) {totals[key]+=values[key];day[key]+=values[key];}
    const local = new Date(timestamp.getTime()+8*3600000);
    heatmap[(local.getUTCDay()+6)%7][local.getUTCHours()]+=values.total;
    const rate = rates[b.model];
    if (rate && ['input','cached','output'].every(k=>Number.isFinite(rate[k])&&rate[k]>=0)) {
      estimatedCost+=(input*rate.input+cached*rate.cached+output*rate.output)/1e6;
      pricedTokens+=values.total;
    }
  }
  const sessions = new Set((data.sessions||[]).filter(s=>Date.parse(s.lastMessageAt)>=start && Date.parse(s.firstMessageAt)<=now.getTime()).map(s=>s.sessionHash)).size;
  // Deliberately exclude model/project/device/session identifiers from the public artifact.
  return {schemaVersion:1,tool:'Codex',timezone:ZONE,updatedAt:now.toISOString(),period:{from:daily[0].date,to:today,days:30},totals,sessions,activeDays:daily.filter(d=>d.total>0).length,cacheHitRate:totals.input+totals.cached ? totals.cached/(totals.input+totals.cached):0,estimatedCost:pricedTokens?estimatedCost:null,pricingCoverage:totals.total?pricedTokens/totals.total:0,daily,heatmap};
}

export function render(s) {
  const text=(x,y,value,size=14,color='#a1a1aa',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${esc(value)}</text>`;
  const rect=(x,y,w,h,fill,rx=12,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="704" viewBox="0 0 1200 704" role="img" aria-labelledby="title desc"><title id="title">He Zhu · Codex usage</title><desc id="desc">Last 30 calendar days. ${esc(compact(s.totals.total))} tokens, ${s.sessions} sessions. Cost is an API-equivalent estimate when pricing is available.</desc><g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif">`;
  svg+=rect(0,0,1200,704,'#09090b',20)+text(28,40,'AI USAGE',21,'#fafafa','font-weight="700"')+text(28,65,'He Zhu  /  Codex  /  Last 30 days',13)+rect(1024,25,148,32,'#18181b',16,'#27272a')+text(1098,46,'LOCAL AGGREGATION',10,'#a7f3d0','text-anchor="middle"');
  const cards=[['Total tokens',compact(s.totals.total),'#fafafa'],['Input · uncached',compact(s.totals.input),'#fafafa'],['Output · incl. reasoning',compact(s.totals.output),'#fafafa'],['Cached input',compact(s.totals.cached),'#a1a1aa'],['Sessions',s.sessions.toLocaleString('en-US'),'#60a5fa'],['API-equivalent estimate',s.estimatedCost===null?'Unpriced':`$${s.estimatedCost.toFixed(2)}`,'#4ade80'],['Cache hit rate',`${(s.cacheHitRate*100).toFixed(1)}%`,'#fafafa'],['Reasoning tokens',compact(s.totals.reasoning),'#fafafa'],['Active days',`${s.activeDays} / 30`,'#60a5fa'],['Pricing coverage',`${(s.pricingCoverage*100).toFixed(0)}%`,'#a1a1aa']];
  cards.forEach(([label,value,color],i)=>{const x=28+(i%5)*232,y=88+Math.floor(i/5)*107;svg+=rect(x,y,216,92,'#111113',12,'#27272a')+text(x+16,y+27,label,12)+text(x+16,y+65,value,27,color,'font-weight="600"');});
  svg+=rect(28,314,560,320,'#0d0d0f',14,'#27272a')+rect(604,314,568,320,'#0d0d0f',14,'#27272a')+text(48,345,'Daily token usage',15,'#fafafa')+text(624,345,'Token activity · UTC+8',15,'#fafafa');
  [['Output','#e4e4e7'],['Input','#71717a'],['Cache','#3f3f46']].forEach(([label,color],i)=>{svg+=rect(300+i*83,335,8,8,color,4)+text(313+i*83,343,label,11);});
  const max=Math.max(1,...s.daily.map(d=>d.total));
  svg+=text(48,382,compact(max),10,'#71717a')+text(48,598,'0',10,'#71717a');
  s.daily.forEach((d,i)=>{const x=80+i*16.2;let y=595;for(const [key,color] of [['cached','#3f3f46'],['input','#71717a'],['output','#e4e4e7']]){const h=d[key]/max*200;y-=h;if(h>0) svg+=rect(x,y,10,h,color,2);}if([0,7,14,21,29].includes(i))svg+=text(x+5,618,d.date.slice(5).replace('-','/'),10,'#71717a','text-anchor="middle"');});
  const hmax=Math.max(1,...s.heatmap.flat());
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((d,row)=>{svg+=text(624,390+row*25,d,11,'#71717a');s.heatmap[row].forEach((v,col)=>{const colors=['#18181b','#3f3f46','#71717a','#a1a1aa','#e4e4e7'];const level=v?Math.max(1,Math.ceil(Math.sqrt(v/hmax)*4)):0;svg+=rect(660+col*20.5,376+row*25,16,18,colors[level],3);});});
  [0,3,6,9,12,15,18,21].forEach(h=>{svg+=text(668+h*20.5,574,String(h).padStart(2,'0'),10,'#71717a','text-anchor="middle"');});
  svg+=text(48,661,'Self-reported local usage · API estimate ≠ subscription payments · No prompt or project data',11,'#71717a');
  const updated = new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s.updatedAt));
  svg+=text(1172,686,`${s.period.from} — ${s.period.to}  ·  Updated ${updated} UTC+8`,10,'#52525b','text-anchor="end"');
  return svg+'</g></svg>\n';
}

export async function generate({destination=path.join(ROOT,'.local','preview')}={}) {
  const {parse}=await import('../node_modules/@vibe-cafe/vibe-usage/src/parsers/codex.js');
  const data=await parse();
  if(data.skipped || data.indexing) throw new Error('Codex indexing is incomplete; retain the previous public card and rerun.');
  if(!data.buckets?.length) throw new Error('No local Codex usage was found; retain the previous card.');
  let rates={};
  try{rates=JSON.parse(await fs.readFile(path.join(ROOT,'usage-rates.json'),'utf8')).models;}catch(e){if(e.code!=='ENOENT')throw e;}
  const summary=summarize(data,{rates});
  if(!summary.totals.total)throw new Error('No usage in the last 30 days; retain the previous card.');
  await fs.mkdir(destination,{recursive:true});
  await fs.writeFile(path.join(destination,'ai-usage.svg'),render(summary));
  await fs.writeFile(path.join(destination,'ai-usage.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(`Generated aggregate usage card in ${destination}`);
  return summary;
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await generate();
