type Track={id:number;name:string;artists:{name:string}[];album:{name:string;picUrl?:string}};
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const artists=(s:string)=>s.split(/\s*[/、;&]\s*/).map(normalize).filter(Boolean);
const cache=new Map<string,{url:string;until:number}>();
const pending=new Map<string,Promise<string>>();
function matches(t:Track,title:string,artist:string){const names=(t.artists||[]).map(a=>normalize(a.name));return normalize(t.name)===normalize(title)&&artists(artist).every(a=>names.includes(a))}
function imageUrl(value?:string){try{const u=new URL(value||'');if(!/^p\d+\.music\.126\.net$/.test(u.hostname)||!['http:','https:'].includes(u.protocol))return '';u.protocol='https:';return u.href}catch{return ''}}
async function json(path:string){const r=await fetch('https://music.163.com'+path,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Artwork unavailable');return r.json() as Promise<any>}
async function detail(id:string){const j=await json('/api/song/detail/?'+new URLSearchParams({id,ids:JSON.stringify([Number(id)])}));return j.songs?.[0] as Track|undefined}
async function qqArtwork(id:string,title:string,artist:string){
 const r=await fetch('https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?'+new URLSearchParams({songmid:id,tpl:'yqq_song_detail',format:'json'}),{signal:AbortSignal.timeout(8000)});
 if(!r.ok)return '';const j=await r.json() as any;
 const song=j.data?.find((t:any)=>t.mid===id);if(!song)return '';
 const track:Track={id:song.id,name:song.name,artists:song.singer||[],album:song.album};
 if(!matches(track,title,artist)||!/^[a-zA-Z0-9]{10,30}$/.test(song.album?.mid||''))return '';
 return 'https://y.gtimg.cn/music/photo_new/T002R500x500M000'+song.album.mid+'.jpg';
}
async function resolve(id:string,title:string,artist:string,album:string){
 if(/^qq_[a-zA-Z0-9]{10,30}$/.test(id)){const url=await qqArtwork(id.slice(3),title,artist).catch(()=>'');if(url)return url}
 if(/^wy_\d{1,16}$/.test(id)){const t=await detail(id.slice(3));if(t&&matches(t,title,artist)){const url=imageUrl(t.album?.picUrl);if(url)return url}}
 const j=await json('/api/search/get/web?'+new URLSearchParams({s:title+' '+artist,type:'1',limit:'20'}));
 const candidates:Track[]=(j.result?.songs||[]).filter((t:Track)=>matches(t,title,artist));
 candidates.sort((a,b)=>Number(normalize(b.album?.name||'')===normalize(album))-Number(normalize(a.album?.name||'')===normalize(album)));
 for(const candidate of candidates.slice(0,2)){const t=await detail(String(candidate.id));if(t&&matches(t,title,artist)){const url=imageUrl(t.album?.picUrl);if(url)return url}}
 return '';
}
export async function GET(request:Request){
 const p=new URL(request.url).searchParams;const title=(p.get('title')||'').trim(),artist=(p.get('artist')||'').trim(),album=(p.get('album')||'').trim(),id=p.get('id')||'';
 if(!normalize(title)||!normalize(artist)||title.length>200||artist.length>200||album.length>200||id.length>100)return Response.json({url:''},{status:400});
 if(['未知艺人','未知歌手','unknown','unknownartist'].includes(normalize(artist)))return Response.json({url:''});
 const key=JSON.stringify([id,normalize(title),normalize(artist),normalize(album)]);const hit=cache.get(key);if(hit&&hit.until>Date.now())return Response.json({url:hit.url});
 try{let job=pending.get(key);if(!job){job=resolve(id,title,artist,album);pending.set(key,job)}const url=await job;if(cache.size>=1000)cache.delete(cache.keys().next().value!);cache.set(key,{url,until:Date.now()+(url?86400000:600000)});return Response.json({url},{headers:{'Cache-Control':url?'public, max-age=86400':'public, max-age=600'}})}catch{return Response.json({url:''},{status:502})}finally{pending.delete(key)}
}