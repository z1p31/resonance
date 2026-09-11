import {playAt38} from '../music/at38';
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const clean=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
function same(title:string,artist:string,t:string,a:string){return norm(title)===norm(t)&&artist.split(/[/、;&,]/).map(norm).filter(Boolean).every(name=>a.split(/[/、;&,]/).map(norm).includes(name))}
async function json(url:string,signal:AbortSignal){const r=await fetch(url,{signal});if(!r.ok)throw Error('Unavailable');return r.json() as Promise<any>}
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,source=p.get('source')||'',id=p.get('id')||'',title=p.get('title')||'',artist=p.get('artist')||'';
 if(!['at38','coco','gd','gequhai'].includes(source)||!/^(wy|qq|kw|kg|mg)_[a-zA-Z0-9_-]{1,100}$/.test(id)||!title||!artist||title.length>300||artist.length>300)return Response.json({error:'歌曲信息无效'},{status:400});
 const signal=AbortSignal.any([request.signal,AbortSignal.timeout(16000)]);
 try{
 let url='',mime='',expectedDuration=Number(p.get('duration'))||0;
 if(source==='at38'){const j=await playAt38(id,(p.get('q')||title+' '+artist).slice(0,100));return Response.json({...j,expectedDuration},{headers:{'Cache-Control':'no-store'}})}
 if(source==='gequhai'){
 const search=await fetch('https://www.gequhai.com/s/'+encodeURIComponent(title),{signal});if(!search.ok)throw Error('Unavailable');const html=await search.text();let track='';
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){const a=row.match(/href=["']\/play\/(\d+)["'][^>]*>([\s\S]*?)<\/a>/i);const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>clean(x[1]));if(a&&same(title,artist,clean(a[2]),cells[2]||'')){track=a[1];break}}
 if(!track)throw Error('No matching version');const pageUrl='https://www.gequhai.com/play/'+track;const page=await fetch(pageUrl,{signal});const detail=await page.text();const field=(name:string)=>detail.match(new RegExp('window\\.'+name+"\\s*=\\s*'([^']*)'"))?.[1]||'';
 if(!same(title,artist,field('mp3_title'),field('mp3_author')))throw Error('Version mismatch');const token=field('play_id');if(!/^[a-f0-9]{32}$/.test(token))throw Error('Unavailable');
 const r=await fetch('https://www.gequhai.com/api/music',{method:'POST',signal,headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'Http','X-Custom-Header':'Key',Referer:pageUrl,Cookie:page.headers.get('set-cookie')?.split(';')[0]||''},body:new URLSearchParams({id:token,type:'0'})});const j=await r.json() as any;if(j.code!==200)throw Error('Unavailable');url=j.data?.url;mime='audio/mpeg';
 }else{
 let neteaseId=id.startsWith('wy_')?id.slice(3):'';
 if(!neteaseId){const j=await json('https://music-api.gdstudio.xyz/api.php?'+new URLSearchParams({types:'search',source:'netease',name:title+' '+artist,count:'20',pages:'1'}),signal);const match=Array.isArray(j)&&j.find((s:any)=>same(title,artist,s.name,(s.artist||[]).join('/')));if(!match)throw Error('No matching version');neteaseId=String(match.id)}
 // Resolve the exact platform ID; only use search when converting another platform's ID.
 const metadata=await json('https://music.163.com/api/song/detail/?'+new URLSearchParams({ids:JSON.stringify([Number(neteaseId)])}),signal).catch(()=>null);const track=metadata?.songs?.[0];if(track)expectedDuration=Number(track.duration||track.dt)/1000||expectedDuration;
 const j=await json(source==='coco'?'https://cocodownloader.markqq.com/api/url?'+new URLSearchParams({id:neteaseId,provider:'netease',extra:JSON.stringify({selectedLevel:'standard'})}):'https://music-api.gdstudio.xyz/api.php?'+new URLSearchParams({types:'url',source:'netease',id:neteaseId,br:'320'}),signal);
 if(j.freeTrialInfo||j.trialInfo||j.isPreview)throw Error('Preview only');url=j.url;mime=({mp3:'audio/mpeg',flac:'audio/flac',wav:'audio/wav',m4a:'audio/mp4'} as Record<string,string>)[j.type]||'';
 }
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||u.hostname.endsWith('.local')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':'))throw Error('Invalid audio URL');if(/(?:\/preview\/|preview=1)/i.test(url))throw Error('Preview only');
 if(!mime)mime=u.pathname.endsWith('.flac')?'audio/flac':u.pathname.endsWith('.m4a')?'audio/mp4':'audio/mpeg';
 return Response.json({qualities:[{id:'original',label:mime==='audio/flac'?'无损':'标准',detail:'',url,mime}],expectedDuration},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'此线路暂不可用'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
