export type LyricLine={time:number;end?:number;text:string};
export type Lyrics={lines:LyricLine[];text:string};
export function parseLyrics(raw:string):Lyrics{
 const source=raw.replace(/^\uFEFF/,'').replace(/\r/g,'').trim();const lines:LyricLine[]=[];
 const clean=(s:string)=>s.replace(/<[^>]+>/g,'').trim();
 const seconds=(h:string,m:string,s:string,ms:string)=>Number(h)*3600+Number(m)*60+Number(s)+Number(ms.padEnd(3,'0'))/1000;
 if(/\d{2}:\d{2}:\d{2}[,.]\d+\s*-->/.test(source)){
 for(const block of source.split(/\n\s*\n/)){const match=block.match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})[^\n]*\n([\s\S]*)/);if(!match)continue;const text=clean(match[9]);const time=seconds(...match.slice(1,5) as [string,string,string,string]);const end=seconds(...match.slice(5,9) as [string,string,string,string]);if(text&&end>time)lines.push({time,end,text})}
 }else{
 const offset=Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0)/1000;
 for(const row of source.split('\n')){const stamps=[...row.matchAll(/\[(\d+):(\d{2}(?:\.\d+)?)\]/g)];const text=clean(row.replace(/\[[^\]]*\]/g,''));if(!text)continue;for(const stamp of stamps)lines.push({time:Math.max(0,Number(stamp[1])*60+Number(stamp[2])+offset),text})}
 }
 lines.sort((a,b)=>a.time-b.time);
 return {lines,text:lines.length?lines.map(l=>l.text).join('\n'):source.split('\n').filter(s=>!/^\[(?:ti|ar|al|by|offset|length|re|ve):/i.test(s)).map(clean).join('\n').trim()};
}