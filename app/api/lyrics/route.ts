import {parseLyrics,type Lyrics} from './parse';
const empty:Lyrics={lines:[],text:''};const cache=new Map<string,{value:Lyrics;until:number}>();
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
async function json(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('Lyrics unavailable');return r.json() as Promise<any>}
async function native(id:string):Promise<Lyrics>{
 if(/^wy_\d{1,20}$/.test(id)){const j=await json('https://music.163.com/api/song/lyric?id='+id.slice(3)+'&lv=1');return parseLyrics(String(j.lrc?.lyric||''))}
 if(/^qq_[a-zA-Z0-9]{10,30}$/.test(id)){
 const data={req_0:{module:'music.musichallSong.PlayLyricInfo',method:'GetPlayLyricInfo',param:{songMID:id.slice(3)}}};
 const j=await json('https://u.y.qq.com/cgi-bin/musicu.fcg?data='+encodeURIComponent(JSON.stringify(data)));const d=j.req_0?.data;
 if(j.req_0?.code!==0||!d?.lyric||d.crypt||d.qrc)return empty;
 return parseLyrics(new TextDecoder().decode(Uint8Array.from(atob(d.lyric),c=>c.charCodeAt(0))));
 }return empty;
}
export async function GET(request:Request){
 const p=new URL(request.url).searchParams;let id=p.get('id')||'';if(/^\d{1,20}$/.test(id))id='wy_'+id;
 const title=(p.get('title')||'').trim(),artist=(p.get('artist')||'').trim(),album=(p.get('album')||'').trim();const duration=Number(p.get('duration')||0);
 if(id.length>100||title.length>200||artist.length>200||album.length>200||!Number.isFinite(duration)||duration<0||duration>86400||(!id&&(!title||!artist)))return Response.json(empty,{status:400});
 const key=JSON.stringify([id,title,artist,album,duration]);const hit=cache.get(key);if(hit&&hit.until>Date.now())return Response.json(hit.value);
 let result=await native(id).catch(()=>empty);
 if(!result.lines.length&&title&&artist){try{
 const j=await json('https://lrclib.net/api/search?'+new URLSearchParams({track_name:title,artist_name:artist}));
 const candidates=(Array.isArray(j)?j:[]).filter((x:any)=>normalize(x.trackName||'')===normalize(title)&&normalize(x.artistName||'')===normalize(artist)&&(!duration||!x.duration||Math.abs(x.duration-duration)<=Math.max(5,duration*.04)));
 candidates.sort((a:any,b:any)=>Number(normalize(b.albumName||'')===normalize(album))-Number(normalize(a.albumName||'')===normalize(album)));
 let plain=result;for(const c of candidates){const parsed=parseLyrics(String(c.syncedLyrics||c.plainLyrics||''));if(parsed.lines.length){result=parsed;break}if(!plain.text&&parsed.text)plain=parsed}if(!result.lines.length)result=plain;
 }catch{}}
 if(cache.size>=500)cache.delete(cache.keys().next().value!);cache.set(key,{value:result,until:Date.now()+(result.text?3600000:30000)});
 return Response.json(result,{headers:{'Cache-Control':result.text?'public, max-age=3600':'no-store'}});
}