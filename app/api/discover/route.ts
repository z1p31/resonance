import type {Feed,Mix,Song} from '../../music-types';
let cached:Feed|undefined;let cachedAt=0;let pending:Promise<Feed>|undefined;
const charts=[['3778678','green'],['19723756','rose'],['3779629','gold'],['2884035','blue']];
async function refresh():Promise<Feed>{
 const results=await Promise.allSettled(charts.map(async([id,tone]):Promise<Mix>=>{
 const r=await fetch('https://music.163.com/api/v3/playlist/detail?id='+id+'&n=200',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Chart unavailable');const j=await r.json() as any;
 const p=j.playlist;if(!p||!Array.isArray(p.tracks))throw Error('Invalid chart');
 const allowed=new Set((j.privileges||[]).filter((x:any)=>x.pl>0&&x.st>=0).map((x:any)=>x.id));
 const songs:Song[]=p.tracks.filter((s:any)=>allowed.has(s.id)&&s.dt>60000).map((s:any)=>({id:'wy_'+s.id,provider:'at38',title:s.name,artist:s.ar.map((a:any)=>a.name).join(' / '),album:s.al.name,cover:String(s.al.picUrl||'').replace(/^http:/,'https:'),durationMs:s.dt,duration:Math.floor(s.dt/60000)+':'+String(Math.floor(s.dt/1000)%60).padStart(2,'0')}));
 if(!songs.length)throw Error('Empty chart');return {id,title:p.name,description:songs.length+' 首热门歌曲 · 随心探索',songs,tone,updated:p.trackUpdateTime||p.updateTime||Date.now()};
 }));const mixes=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);if(!mixes.length)throw Error('Charts unavailable');return {mixes,updated:Math.max(...mixes.map(m=>m.updated))};
}
export async function GET(){try{if(!cached||Date.now()-cachedAt>300000){pending??=refresh().then(data=>{cached=data;cachedAt=Date.now();return data}).finally(()=>{pending=undefined});await pending}return Response.json(cached,{headers:{'Cache-Control':'no-store'}})}catch{return cached?Response.json({...cached,stale:true}):Response.json({error:'推荐暂时未能加载'},{status:503})}}