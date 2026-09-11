export type ExternalTrack={title:string;artist:string;album?:string;durationMs?:number};
export type ExternalPlaylist={name:string;tracks:ExternalTrack[];source:string;warning?:string};
export const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const artists=(s:string)=>s.normalize('NFKC').split(/\s*(?:、|,|，|;|；|\s&\s|\s\/\s)\s*/).map(normalize).filter(Boolean).sort().join('|');
export function exactTrack(a:ExternalTrack,b:ExternalTrack){return !!normalize(a.title)&&!!artists(a.artist)&&!['未知艺人','未知歌手','unknown'].includes(a.artist.toLowerCase())&&normalize(a.title)===normalize(b.title)&&artists(a.artist)===artists(b.artist)&&(!a.durationMs||!b.durationMs||Math.abs(a.durationMs-b.durationMs)<Math.max(10000,a.durationMs*.05))}
export function parseTrackFile(text:string):ExternalTrack[]{
 if(text.length>500000)throw Error('文件过大，请限制在 500KB 内');
 if(text.trim().startsWith('[')){const data=JSON.parse(text);if(!Array.isArray(data))throw Error('JSON 需要歌曲数组');return validateTracks(data)}
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;const delimiter=text.split('\n')[0].includes('\t')?'\t':',';
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(cell);cell=''}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('CSV 引号未闭合');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
 const header=rows.shift()?.map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase())||[];
 const ti=header.findIndex(x=>['title','track name','song name','name','歌曲','歌曲名称','歌名'].includes(x)),ai=header.findIndex(x=>['artist','artists','artist name(s)','artist name','歌手','艺人'].includes(x));
 if(ti<0||ai<0)throw Error('文件需包含 title（歌曲名称）和 artist（歌手）列');return validateTracks(rows.filter(r=>r.some(x=>x.trim())).map(r=>({title:r[ti],artist:r[ai]})))
}
export function validateTracks(list:any[]):ExternalTrack[]{if(!Array.isArray(list)||!list.length)throw Error('没有读取到歌曲');if(list.length>500)throw Error('单次最多导入 500 首，请拆分歌单');return list.map((s,i)=>{if(typeof s?.title!=='string'||!s.title.trim()||typeof s.artist!=='string'||!s.artist.trim())throw Error(`第 ${i+1} 首缺少歌曲名称或歌手`);return {title:s.title.trim().slice(0,300),artist:s.artist.trim().slice(0,300),album:typeof s.album==='string'?s.album.slice(0,300):'',durationMs:Number(s.durationMs)||0}})}
