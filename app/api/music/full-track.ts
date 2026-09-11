import {PlaybackError} from './playback-error';
export async function playFullTrack(id:string){
 const r=await fetch('https://music.163.com/api/song/enhance/player/url?'+new URLSearchParams({ids:JSON.stringify([Number(id)]),br:'320000'}),{signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new PlaybackError('UPSTREAM_HTTP','歌曲服务暂时无法响应，请稍后重试。');
 const j=await r.json() as any;const item=j.data?.find((x:any)=>String(x.id)===id);
 if(!item||item.code!==200||!item.url)throw new PlaybackError('AUDIO_UNAVAILABLE','这首歌当前未提供可播放音频，请换一首。',422);
 if(item.freeTrialInfo)throw new PlaybackError('PREVIEW_ONLY','这首歌当前只提供试听片段，暂不能播放。',422);
 if(!Number.isFinite(item.time)||item.time<=0)throw new PlaybackError('INVALID_AUDIO','音频信息不完整，请稍后重试。');
 const url=new URL(item.url);if(!['http:','https:'].includes(url.protocol)||!url.hostname.endsWith('.music.126.net'))throw new PlaybackError('INVALID_AUDIO','返回的音频地址无效。');url.protocol='https:';
 const format=String(item.type||'').toLowerCase();const mime=({mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',flac:'audio/flac',wav:'audio/wav',ogg:'audio/ogg'} as Record<string,string>)[format];
 return {qualities:[{id:'standard',label:format==='flac'||format==='wav'?'无损':'标准',detail:format.toUpperCase(),url:url.href,mime}]};
}