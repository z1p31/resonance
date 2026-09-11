import {PlaybackError} from './playback-error';
const origin = 'https://www.at38.cn/';
const decode = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&(?:amp|quot|apos|lt|gt|#39|#\d+|#x[\da-f]+);/gi, e => {
  const named: Record<string, string> = {'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'"};
  if (named[e]) return named[e];
  const n = e.startsWith('&#x') ? parseInt(e.slice(3),16) : parseInt(e.slice(2),10);
  return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : e;
}).trim();

async function loadSearch(keyword: string) {
  const r = await fetch(origin + '?' + new URLSearchParams({keyword}), {signal:AbortSignal.timeout(20000), redirect:'manual'});
  if (!r.ok) throw Error('51 音乐暂时不可用');
  // The upstream keeps streaming its large message board after the song list.
  // Stop at the footer: all search cards precede it, and comments are irrelevant.
  const reader = r.body?.getReader();
  if (!reader) throw Error('音乐源未返回内容');
  const decoder = new TextDecoder();
  let html = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) { html += decoder.decode(); break; }
      html += decoder.decode(chunk.value, {stream:true});
      if (html.length > 2000000 || /<footer\b|id=["']msgBtn["']/i.test(html)) break;
    }
  } finally { await reader.cancel().catch(() => {}); }
  if (html.length > 2000000) throw Error('音源响应过大');
  return {html, cookie:r.headers.get('set-cookie')?.split(';')[0] || ''};
}

export async function searchAt38(keyword: string, page: number) {
  const {html}=await loadSearch(keyword);
  const cards = html.split(/<div\s+class=["']music-card["']/i).slice(1);
  const items = cards.flatMap(card => {
    const id = card.match(/data-id=["']([a-zA-Z0-9_-]+)["']/)?.[1];
    const type = card.match(/data-type=["']([a-z]+)["']/)?.[1];
    const title = card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1];
    const info = decode(card.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
    if (!id || !type || !['wy','qq','kw','kg','mg'].includes(type) || !title) return [];
    return [{id:type+'_'+id,provider:'at38',title:decode(title),artist:info.match(/歌手[：:]\s*(.*?)\s*\|/)?.[1] || '未知艺人',album:info.match(/专辑[：:]\s*(.*?)\s*\|/)?.[1] || '单曲',cover:origin+'?'+new URLSearchParams({action:'getpic',id,type}),duration:''}];
  });
  if (!cards.length && !/没有|未找到|无结果|搜索结果/.test(html)) throw Error('51 音乐未返回可识别的搜索结果');
  return {items:items.slice((page-1)*20,page*20),hasMore:items.length>page*20};
}

export async function playAt38(key: string, keyword: string) {
  const match = /^(wy|qq|kw|kg|mg)_([a-zA-Z0-9_-]{1,100})$/.exec(key);
  if (!match || !keyword.trim() || keyword.length > 100) throw Error('请重新搜索后播放');
  const {html,cookie}=await loadSearch(keyword);
  const expected=new RegExp('data-id=["\x27]'+match[2]+'["\x27]\\s+data-type=["\x27]'+match[1]+'["\x27]');
  if (!expected.test(html) || !cookie) throw Error('搜索结果已变化，请重新搜索');
  const r=await fetch(origin+'?'+new URLSearchParams({action:'play',id:match[2],type:match[1]}),{headers:{Cookie:cookie,Referer:origin+'?'+new URLSearchParams({keyword})},redirect:'manual',signal:AbortSignal.timeout(20000)});
  const location=r.headers.get('location');
  await r.body?.cancel();
  if(r.status===404||r.status===410)throw new PlaybackError('AUDIO_NOT_FOUND','这首歌的音频文件已失效，暂时无法播放。',422);
  if(r.status===401||r.status===403)throw new PlaybackError('AUDIO_ACCESS_DENIED','这首歌的音频访问被拒绝，暂时无法播放。',422);
  if (![301,302,303,307,308].includes(r.status) || !location) throw new PlaybackError('NO_AUDIO_LINK','这首歌未返回有效音频，请稍后重试。');
  const url=new URL(location);
  if (url.protocol!=='https:' || url.username || url.password || url.port || url.hostname==='localhost' || url.hostname.endsWith('.local') || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) throw Error('音频链接无效');
  const ext=url.pathname.split('.').pop()?.toLowerCase() || '';
  const mime:Record<string,string>={mp3:'audio/mpeg',m4a:'audio/mp4',flac:'audio/flac',wav:'audio/wav',ogg:'audio/ogg'};
  return {qualities:[{id:'original',label:ext==='flac'||ext==='wav'?'无损':'原始音质',detail:'51 音乐'+(mime[ext]?' · '+ext.toUpperCase():''),url:url.href,mime:mime[ext]}]};
}