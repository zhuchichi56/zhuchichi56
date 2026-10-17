import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,generate} from './usage.mjs';

// Publication is explicit: preview mode never pushes local usage.
if(!process.argv.includes('--publish'))throw new Error('Review npm run usage:preview first. Publish with npm run usage:publish -- --publish.');
const gitEnv={...process.env};
// macOS apps use the system proxy; command-line Git needs it explicitly.
if(process.platform==='darwin'&&!gitEnv.https_proxy&&!gitEnv.HTTPS_PROXY){
  const proxy=execFileSync('/usr/sbin/scutil',['--proxy'],{encoding:'utf8',timeout:5000});
  const host=proxy.match(/HTTPSProxy\s*:\s*(\S+)/)?.[1];
  const port=proxy.match(/HTTPSPort\s*:\s*(\d+)/)?.[1];
  if(/HTTPSEnable\s*:\s*1/.test(proxy)&&host&&port)gitEnv.https_proxy=`http://${host}:${port}`;
}
const git=(...args)=>execFileSync('git',['-c','http.version=HTTP/1.1','-c','http.lowSpeedLimit=1','-c','http.lowSpeedTime=30',...args],{cwd:ROOT,encoding:'utf8',timeout:45000,env:gitEnv}).trim();
const status=git('status','--porcelain');
if(status)throw new Error('Commit existing changes before publishing usage.');
if(git('branch','--show-current')!=='main')throw new Error('Usage publishing requires the main branch.');
git('pull','--ff-only','origin','main');
const destination=path.join(ROOT,'.local','publish');
await generate({destination});
await fs.mkdir(path.join(ROOT,'assets'),{recursive:true});
for(const file of ['ai-usage.svg','ai-usage.json'])await fs.copyFile(path.join(destination,file),path.join(ROOT,'assets',file));
git('add','--','assets/ai-usage.svg','assets/ai-usage.json');
if(git('diff','--cached','--name-only'))git('commit','-m','Update aggregate Codex usage card');
// Retry an earlier unpushed card even when this invocation has no new changes.
git('push','origin','HEAD:main');
console.log('Published aggregate usage card.');
