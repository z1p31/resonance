'use client';
import {useEffect,useState} from 'react';
import {Music2} from 'lucide-react';
import type {Song} from './music-types';
const cache=new Map<string,{until:number;promise:Promise<string>}>();
let running=0;const waiting:(()=>void)[]=[];
async function requestCover(params:string){if(running>=4)await new Promise<void>(resolve=>waiting.push(resolve));running++;try{const r=await fetch('/api/artwork?'+params,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Artwork unavailable');return String(((await r.json()) as {url?:string}).url||'')}finally{running--;waiting.shift()?.()}}
function lookup(params:string){const hit=cache.get(params);if(hit&&hit.until>Date.now())return hit.promise;if(cache.size>=500)cache.delete(cache.keys().next().value!);const entry={until:Date.now()+86400000,promise:Promise.resolve('')};entry.promise=requestCover(params).then(url=>{if(!url)entry.until=Date.now()+600000;return url}).catch(()=>{entry.until=Date.now()+30000;return ''});cache.set(params,entry);return entry.promise}
export function Artwork({song,large=false}:{song?:Song;large?:boolean}){
 const [failed,setFailed]=useState<string[]>([]),[matched,setMatched]=useState<{key:string;url:string}|null>(null);
 const params=song?new URLSearchParams({v:'2',id:song.id,title:song.title,artist:song.artist,album:song.album||''}).toString():'';
 const original=song?.cover&&!song.cover.includes('at38.cn')?song.cover:'';
 const replacement=matched?.key===params?matched.url:'';
 const url=original&&!failed.includes(original)?original:replacement&&!failed.includes(replacement)?replacement:'';
 useEffect(()=>{if(!params||(original&&!failed.includes(original)))return;let active=true;lookup(params).then(url=>{if(active)setMatched({key:params,url})});return()=>{active=false}},[params,original,failed]);
 return <div className={`song-art ${large?'large-art':''}`}>{url?<img key={url} src={url} alt="" loading={large?'eager':'lazy'} decoding="async" onError={()=>setFailed(list=>list.includes(url)?list:[...list,url])}/>:<><span className="art-sun"/><Music2 aria-hidden="true"/></>}</div>;
}