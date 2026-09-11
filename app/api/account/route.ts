import {serverDefaults} from '../../server-defaults';
export const runtime='nodejs';
export const dynamic='force-dynamic';
import {authConfig} from './auth-config';
import {verifyAuthChallenge,verifyInvite,AuthSecurityError} from './auth-security';
import {readExternal} from '../../playlist-import/sources';
import {validateTracks,exactTrack} from '../../playlist-import/model';
import {searchAt38} from '../music/at38';
import {cleanSearch,updateSearches} from '../../search-history';
import {createClient} from './redis';

import {scryptSync,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
const PREFIX='resonance:account:v1:', TTL=60*60*24*30;
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const cookie=(r:Request)=>r.headers.get('cookie')?.match(/(?:^|;\s*)resonance_session=([a-f0-9]{64})(?:;|$)/)?.[1];
function reply(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
class InputError extends Error{constructor(message:string,public status=400){super(message)}}
export async function GET(r:Request){return handle(r)}
export async function POST(r:Request){return handle(r)}
async function handle(r:Request){
 let client:ReturnType<typeof createClient>|undefined;
 try{
 if(r.method==='POST'&&r.headers.get('origin')!==new URL(r.url).origin)throw new InputError('请求来源不匹配',403);
 const url=process.env.REDIS_URL||serverDefaults.REDIS_URL;if(!url)throw Error('Missing database configuration');
 client=createClient({url,socket:{connectTimeout:8000,reconnectStrategy:false}});await client.connect();const db=client;
 const token=cookie(r),sessionKey=token?PREFIX+'session:'+hash(token):'';const uid=sessionKey?await db.get(sessionKey):null;
 const read=async(id:string)=>{const raw=await db.get(PREFIX+'library:'+id);return {raw,data:{searches:[],...(raw?JSON.parse(raw):{favorites:[],recent:[],playlists:[]})}}};
 const user=uid?JSON.parse(await db.get(PREFIX+'user:'+uid)||'null'):null;
 const revoked=uid?Number(await db.get(PREFIX+'revoke:'+uid)||0):0;const issued=sessionKey?Number(await db.get(sessionKey+':issued')||0):0;if(user&&(user.disabled||revoked&&issued<=revoked)){if(sessionKey)await db.del(sessionKey);if(r.method==='GET')return reply({user:null,library:null});throw new InputError('Account access revoked',401)}
 const safe=user?{id:uid,username:user.username,name:user.name}:null;
 if(r.method==='GET')return reply({user:safe,library:uid&&user?(await read(uid)).data:null});
 if(Number(r.headers.get('content-length')||0)>600000)throw new InputError('请求过大',413);
 const text=await r.text();if(text.length>600000)throw new InputError('请求过大',413);let body;try{body=JSON.parse(text)}catch{throw new InputError('请求格式无效')}if(!body||typeof body!=='object')throw new InputError('请求格式无效');const action=body.action;
 const setCookie=(value:string,age=TTL)=>`resonance_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(r.url).protocol==='https:'?'; Secure':''}`;
 if(action==='logout'){if(sessionKey)await db.del(sessionKey);return reply({user:null},200,{'Set-Cookie':setCookie('',0)})}
 if(action==='login'||action==='register'){
 const username=String(body.username||'').trim().toLowerCase(),password=String(body.password||'');
 if(!/^[a-z0-9_]{3,32}$/.test(username)||password.length<10||password.length>128)throw new InputError('账号须为 3–32 位字母、数字或下划线，密码须为 10–128 位');
 const ip=r.headers.get('cf-connecting-ip')||'local';const ipLimit=PREFIX+'ip-limit:'+hash(ip);const ipCount=await db.incr(ipLimit);if(ipCount===1)await db.expire(ipLimit,600);if(ipCount>100)throw new InputError('尝试过于频繁，请十分钟后重试',429);const throttle=PREFIX+'limit:'+hash(ip+username);const attempts=await db.incr(throttle);if(attempts===1)await db.expire(throttle,600);if(attempts>20)throw new InputError('尝试过于频繁，请十分钟后重试',429);
 const security=await authConfig();await verifyAuthChallenge(security,r,action,body.turnstileToken);if(action==='register')verifyInvite(security.inviteCode,body.inviteCode);
 const index=PREFIX+'username:'+username;let id=await db.get(index);let account=id?JSON.parse(await db.get(PREFIX+'user:'+id)||'null'):null;
 if(action==='register'){
 if(id)throw new InputError('这个账号已被使用',409);
 id=randomBytes(16).toString('hex');const salt=randomBytes(16).toString('hex');account={createdAt:Date.now(),username,name:String(body.name||username).trim().slice(0,40)||username,salt,password:scryptSync(password,salt,64).toString('hex')};
 const created=await db.eval("if redis.call('EXISTS',KEYS[1])==1 then return 0 end redis.call('SET',KEYS[1],ARGV[1]);redis.call('SET',KEYS[2],ARGV[2]);return 1",{keys:[index,PREFIX+'user:'+id],arguments:[id,JSON.stringify(account)]});if(!created)throw new InputError('这个账号已被使用',409);
 }else{const actual=scryptSync(password,account?.salt||'missing-account-salt',64);if(!account||account.disabled||!account.password||!timingSafeEqual(actual,Buffer.from(account.password,'hex')))throw new InputError('账号或密码不正确',401)}
 if(account.disabled)throw new InputError('Account disabled',403);await db.eval("local v=redis.call('GET',KEYS[1]);if not v then return 0 end local u=cjson.decode(v);u.lastLogin=tonumber(ARGV[1]);redis.call('SET',KEYS[1],cjson.encode(u));return 1",{keys:[PREFIX+'user:'+id],arguments:[String(Date.now())]});const next=randomBytes(32).toString('hex');await db.set(PREFIX+'session:'+hash(next),id!,{EX:TTL});await db.set(PREFIX+'session:'+hash(next)+':issued',String(Date.now()),{EX:TTL});if(sessionKey)await db.del(sessionKey);
 return reply({user:{id,username,name:account.name},library:(await read(id!)).data},200,{'Set-Cookie':setCookie(next)});
 }
 if(!uid||!user)throw new InputError('请先登录',401);
 if(action==='import-read')try{return reply(await readExternal(String(body.url||'').slice(0,2000)))}catch(e){throw new InputError((e as Error).message)};
 if(action==='import-match'){
 const tracks=validateTracks(body.tracks);if(tracks.length>3)throw new InputError('每批最多匹配 3 首');
 const items=await Promise.all(tracks.map(async t=>{let candidate;try{const found=await searchAt38((t.title+' '+t.artist).slice(0,100),1);candidate=found.items.find(x=>exactTrack(t,x))}catch{}return candidate?{...candidate,title:t.title,artist:t.artist,durationMs:t.durationMs||0,album:t.album||candidate.album,importStatus:'matched',keyword:(t.title+' '+t.artist).slice(0,100)}:{id:'missing_'+randomBytes(12).toString('hex'),provider:'at38',title:t.title,artist:t.artist,album:t.album||'',cover:'',duration:'',importStatus:'unmatched'}}));return reply({items});
 }
 const song=()=>{const s=body.song;if(!s||s.provider!=='at38'||typeof s.id!=='string'||!s.id||s.id.length>200||typeof s.title!=='string'||typeof s.artist!=='string')throw new InputError('歌曲信息无效');return {id:s.id,provider:'at38',title:s.title.slice(0,300),artist:s.artist.slice(0,300),album:String(s.album||'').slice(0,300),cover:/^https:\/\//.test(s.cover||'')?String(s.cover).slice(0,2000):'',duration:String(s.duration||'').slice(0,20),durationMs:Number(s.durationMs)||0,keyword:String(s.keyword||'').slice(0,100),...(s.importStatus==='unmatched'||s.importStatus==='matched'?{importStatus:s.importStatus}:{})}};
 for(let attempt=0;attempt<8;attempt++){
 const {raw,data}=await read(uid);const match=(s:any,t:any)=>s.id===t.id&&s.provider===t.provider;
 if(['search-save','search-remove','search-clear'].includes(action)){if(action!=='search-clear'&&!cleanSearch(body.query))throw new InputError('搜索词不能为空');data.searches=updateSearches(data.searches,action as 'search-save'|'search-remove'|'search-clear',body.query)}
 else if(action==='favorite'){const s=song();data.favorites=data.favorites.filter((t:any)=>!match(s,t));if(body.saved)data.favorites.unshift(s);data.favorites=data.favorites.slice(0,500)}
 else if(action==='history'){const s=song();data.recent=[{...s,playedAt:Date.now()},...data.recent.filter((t:any)=>!match(s,t))].slice(0,200)}
 else if(action==='import-save'){if(data.playlists.length>=100)throw new InputError('最多创建 100 个歌单');if(!Array.isArray(body.songs)||!body.songs.length||body.songs.length>500)throw new InputError('请导入 1–500 首歌曲');const songs=body.songs.map((s:any)=>{body.song=s;return song()});const name=String(body.name||'导入的歌单').trim().slice(0,60);data.playlists.push({id:randomBytes(12).toString('hex'),name:name||'导入的歌单',songs,source:String(body.source||'外部歌单').slice(0,40)})}
 else if(action==='create'){if(data.playlists.length>=100)throw new InputError('最多创建 100 个歌单');const name=String(body.name||'').trim().slice(0,60);if(!name)throw new InputError('请输入歌单名称');data.playlists.push({id:randomBytes(12).toString('hex'),name,songs:[]})}
 else if(['rename','delete','add','remove','remove-many'].includes(action)){const p=data.playlists.find((p:any)=>p.id===body.id);if(!p)throw new InputError('歌单不存在',404);if(action==='remove-many'){if(!Array.isArray(body.keys)||body.keys.length>500)throw new InputError('请选择最多 500 首歌曲');const keys=new Set(body.keys.filter((k:unknown)=>typeof k==='string'));p.songs=p.songs.filter((s:any)=>!keys.has(s.provider+':'+s.id))}if(action==='delete')data.playlists=data.playlists.filter((p:any)=>p.id!==body.id);if(action==='rename'){const name=String(body.name||'').trim().slice(0,60);if(!name)throw new InputError('请输入名称');p.name=name}if(action==='add'||action==='remove'){const s=song();p.songs=p.songs.filter((t:any)=>!match(s,t));if(action==='add')p.songs.unshift(s);p.songs=p.songs.slice(0,500)}}
 else throw new InputError('未知操作');
 const ok=await db.eval("if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2]);return 1",{keys:[PREFIX+'library:'+uid],arguments:[raw||'',JSON.stringify(data)]});if(ok)return reply({library:data});
 }throw new InputError('记录正在更新，请重试',409);
 }catch(e){console.error("Account service:",e instanceof Error?e.message.replace(/rediss?:\/\/\S+/g,"[redacted]"):"Unknown error");return reply({error:(e instanceof InputError||e instanceof AuthSecurityError)?e.message:'账号服务暂时无法连接，请稍后重试'},(e instanceof InputError||e instanceof AuthSecurityError)?e.status:503)}finally{if(client?.isOpen)client.destroy()}
}



