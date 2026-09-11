'use client';
import {useEffect,useRef} from 'react';
import {Artwork} from './artwork';
import type {Song} from './music-types';
export function RecordArtwork({song,enabled,playing,speed}:{song:Song;enabled:boolean;playing:boolean;speed:number}){
 const disc=useRef<HTMLDivElement>(null),animation=useRef<Animation|null>(null);
 useEffect(()=>{if(!enabled||!disc.current)return;const a=disc.current.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:24000,iterations:Infinity});a.pause();animation.current=a;return()=>{a.cancel();animation.current=null}},[enabled]);
 useEffect(()=>{const a=animation.current;if(!a)return;a.updatePlaybackRate(speed);if(playing)a.play();else a.pause()},[enabled,playing,speed]);
 return <div className={`album-display ${enabled?'record-enabled':''}`}><div className="record-surface" ref={disc}><Artwork song={song} large/>{enabled&&<span className="record-spindle" aria-hidden="true"/>}</div></div>;
}
