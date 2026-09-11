'use client';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {AudioLines} from 'lucide-react';
type Line={time:number;end?:number;text:string};
export function LyricsPanel({lines,text,busy,time,onSeek}:{lines:Line[];text:string;busy:boolean;time:number;onSeek:(time:number)=>void}){
 const [fontSize,setFontSize]=useState(28);
 useEffect(()=>{try{const stored=localStorage.getItem('resonance-lyric-font-size');if(stored!==null&&Number.isFinite(Number(stored)))setFontSize(Math.min(48,Math.max(16,Number(stored))))}catch{}},[]);
 function changeSize(value:number){const size=Math.min(48,Math.max(16,value));setFontSize(size);try{localStorage.setItem('resonance-lyric-font-size',String(size))}catch{}}
 const panel=useRef<HTMLDivElement>(null);const previous=useRef(-1);
 let cursor=-1;for(let i=0;i<lines.length;i++){if(lines[i].time<=time)cursor=i;else break}
 const active=cursor>=0&&(lines[cursor].end===undefined||time<lines[cursor].end!)?cursor:-1;
 const target=Math.max(0,cursor);
 useLayoutEffect(()=>{const el=panel.current;if(!el||!lines.length||busy)return;
 const center=(smooth:boolean)=>{const buttons=el.querySelectorAll<HTMLButtonElement>('[data-lyric]');const row=buttons[target];if(!row)return;
 el.style.setProperty('--lyric-edge',el.clientHeight/2+'px');
 const box=row.getBoundingClientRect(),outer=el.getBoundingClientRect();const top=el.scrollTop+box.top-outer.top-el.clientTop+(box.height-el.clientHeight)/2;
 el.scrollTo({top,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
 };
 center(previous.current>=0&&Math.abs(target-previous.current)===1);previous.current=target;
 let dimensions='';const observer=new ResizeObserver(()=>{const next=el.clientWidth+':'+el.clientHeight+':'+[...el.querySelectorAll('[data-lyric]')].map(row=>row.getBoundingClientRect().height).join();if(dimensions&&next!==dimensions)center(false);dimensions=next});observer.observe(el);el.querySelectorAll('[data-lyric]').forEach(row=>observer.observe(row));
 return()=>observer.disconnect();
 },[target,lines,busy,fontSize]);
 return <div className="lyrics-region" style={{'--lyric-font-size':fontSize+'px'} as CSSProperties}><div ref={panel} className={`lyrics-panel ${lines.length&&!busy?'timed-lyrics':''}`} aria-label="歌词"><h3>歌词</h3>{lines.length>0&&!busy&&<div className="lyric-spacer" aria-hidden="true"/>}{busy?<p className="secondary">正在加载歌词…</p>:lines.length?lines.map((line,i)=><button data-lyric={i} key={i} aria-current={i===active?'true':undefined} className={i===active?'active-lyric':''} onClick={()=>onSeek(line.time)}>{line.text}</button>):text?<p className="plain-lyrics">{text}</p>:<div className="empty-state"><AudioLines/><p>这首歌暂未提供歌词，专心听一会儿。</p></div>}{lines.length>0&&!busy&&<div className="lyric-spacer" aria-hidden="true"/>}</div><div className="lyric-size-control" role="group" aria-label="歌词字号"><button aria-label="缩小歌词" disabled={fontSize<=16} onClick={()=>changeSize(fontSize-2)}>A−</button><input type="range" aria-label="歌词字号" min="16" max="48" step="1" value={fontSize} aria-valuetext={`${fontSize} 像素`} onChange={e=>changeSize(Number(e.target.value))}/><button aria-label="放大歌词" disabled={fontSize>=48} onClick={()=>changeSize(fontSize+2)}>A+</button><output>{fontSize}px</output></div></div>;
}
