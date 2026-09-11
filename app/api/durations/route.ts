const cache=new Map<string,{ms:number;until:number}>();
export async function GET(request:Request){
 const ids=[...new Set((new URL(request.url).searchParams.get('ids')||'').split(','))];if(ids.length>20||ids.some(id=>!/^(wy_\d{1,16}|qq_[a-zA-Z0-9]{1,30})$/.test(id)))return Response.json({durations:{}},{status:400});
 const durations:Record<string,number>={};const missing=ids.filter(id=>{const hit=cache.get(id);if(hit&&hit.until>Date.now()){durations[id]=hit.ms;return false}return true});
 const save=(id:string,ms:number)=>{if(!Number.isFinite(ms)||ms<=0)return;durations[id]=ms;if(cache.size>=2000)cache.delete(cache.keys().next().value!);cache.set(id,{ms,until:Date.now()+86400000})};
 const wy=missing.filter(id=>id.startsWith('wy_'));const qq=missing.filter(id=>id.startsWith('qq_'));
 await Promise.allSettled([ (async()=>{if(!wy.length)return;const r=await fetch('https://music.163.com/api/song/detail/?'+new URLSearchParams({ids:JSON.stringify(wy.map(id=>Number(id.slice(3))))}),{signal:AbortSignal.timeout(7000)});if(!r.ok)return;const j=await r.json() as any;for(const song of j.songs||[])if(wy.includes('wy_'+song.id))save('wy_'+song.id,Number(song.duration||song.dt))})(), ...Array.from({length:Math.min(4,qq.length)},async()=>{while(qq.length){const id=qq.shift()!;try{const r=await fetch('https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?'+new URLSearchParams({songmid:id.slice(3),tpl:'yqq_song_detail',format:'json'}),{signal:AbortSignal.timeout(7000)});if(!r.ok)continue;const j=await r.json() as any;const s=j.data?.find((s:any)=>s.mid===id.slice(3));if(s)save(id,Number(s.interval)*1000)}catch{}}})]);
 return Response.json({durations},{headers:{'Cache-Control':'private, max-age=300'}});
}
