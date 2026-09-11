import type {Song,Quality} from './music-types';
export type Playback={qualities?:Quality[];error?:string;code?:string;ok:boolean;expectedDuration?:number};
const cache=new Map<string,{until:number;value:Promise<Playback>}>();
const failed=new Map<string,Set<string>>();
const cacheKey=(s:Song)=>JSON.stringify([s.id,s.title,s.artist]);
export function forgetPlayback(song:Song,url?:string){const key=cacheKey(song);cache.delete(key);if(url){if(failed.size>=40)failed.delete(failed.keys().next().value!);const urls=failed.get(key)||new Set<string>();urls.add(url);failed.set(key,urls)}else failed.delete(key)}
export function completeDuration(actual:number,expected:number){return Number.isFinite(actual)&&Number.isFinite(expected)&&expected>0&&actual>0&&Math.abs(actual-expected)<=Math.max(3,expected*.02)}
function checkAudio(url:string,expected:number,signal:AbortSignal):Promise<void>{return new Promise((resolve,reject)=>{
 const a=new Audio();a.preload='auto';let finished=false;
 const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',abort);a.oncanplay=null;a.onerror=null;a.pause();a.removeAttribute('src');a.load();error?reject(error):resolve()};
 const abort=()=>finish(new Error('Cancelled'));const timer=setTimeout(()=>finish(new Error('Audio timeout')),10000);signal.addEventListener('abort',abort,{once:true});
 a.onerror=()=>finish(new Error('Invalid audio'));a.oncanplay=()=>{const d=a.duration;if(!completeDuration(d,expected))finish(new Error('Incomplete or different recording'));else finish()};
 if(signal.aborted){abort();return}a.src=url;a.load();
 })}
export function resolvePlayback(song:Song):Promise<Playback>{
 const key=cacheKey(song),hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.value;
 if(cache.size>=40)cache.delete(cache.keys().next().value!);
 const controller=new AbortController();const known=(song.durationMs||0)/1000||(song.duration.includes(':')?song.duration.split(':').reduce((n,v)=>n*60+Number(v),0):0);
 // Fetch catalog duration independently of the audio URL: previews often report their own 45s duration.
 const durationPromise=/^(wy_\d+|qq_[a-zA-Z0-9]+)$/.test(song.id)?fetch('/api/durations?'+new URLSearchParams({ids:song.id}),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])}).then(r=>r.json()).then((j:any)=>Number(j.durations?.[song.id])/1000||known).catch(()=>known):Promise.resolve(known);
 const params={id:song.id,title:song.title,artist:song.artist,duration:String(known),q:(song.keyword||`${song.title} ${song.artist}`).slice(0,100)};
 const jobs=['at38','coco','gd','gequhai'].map(async(source,index)=>{
 await new Promise<void>((resolve,reject)=>{if(controller.signal.aborted){reject(Error('Cancelled'));return}const abort=()=>{clearTimeout(timer);reject(Error('Cancelled'))};const timer=setTimeout(()=>{controller.signal.removeEventListener('abort',abort);resolve()},index*900);controller.signal.addEventListener('abort',abort,{once:true})});
 const r=await fetch('/api/playback?'+new URLSearchParams({...params,source}),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(18000)])});const j=await r.json() as {qualities?:Quality[];expectedDuration?:number};if(!r.ok||!j.qualities?.length)throw Error('No audio');
 for(const quality of j.qualities){if(failed.get(key)?.has(quality.url))continue;try{const expected=await durationPromise||j.expectedDuration||known;await checkAudio(quality.url,expected,controller.signal);return {ok:true,qualities:[quality],expectedDuration:expected}}catch{if(controller.signal.aborted)throw Error('Cancelled')}}throw Error('No playable audio');
 });
 const value=Promise.any(jobs).then(result=>{controller.abort();return result}).catch(()=>{controller.abort();if(cache.get(key)?.value===value)cache.delete(key);return {ok:false,error:'未找到可验证的完整歌曲音频，请稍后重试。',code:'ALL_UNAVAILABLE'}});
 cache.set(key,{until:Date.now()+45000,value});return value;
}


