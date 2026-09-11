import {serverDefaults} from '../../server-defaults';
﻿const env={};
import {createClient} from '../account/redis';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export const PREFIX='resonance:account:v1:';
export const SETTINGS=PREFIX+'site-settings';
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export const variables=()=>({...serverDefaults,...process.env,...env} as unknown as Record<string,string>);
export type DB=ReturnType<typeof createClient>;
export class ApiError extends Error{constructor(message:string,public status=400){super(message)}}
export const result=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export function adminIdentity(){const e=variables(),name=(e.ADMIN||'').trim();if(!/^[a-zA-Z0-9_-]{3,32}$/.test(name)||/admin/i.test(name)||!e.PASSWORD||e.PASSWORD.length<16)return null;return {name,path:'gmin'+name,password:e.PASSWORD,version:digest(name+'\0'+e.PASSWORD)}}
export async function database(){const url=variables().REDIS_URL;if(!url)throw new ApiError('数据库尚未配置',503);const db=createClient({url});await db.connect();return db}
export function origin(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)throw new ApiError('请求来源不匹配',403)}
export async function body(r:Request,limit=200000){if(Number(r.headers.get('content-length')||0)>limit)throw new ApiError('请求过大',413);const reader=r.body?.getReader();if(!reader)throw new ApiError('请求为空');let size=0;const chunks:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ApiError('请求过大',413)}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new ApiError('数据格式无效')}}
export const secureCookie=(r:Request,name:string,value:string,ttl:number)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${new URL(r.url).protocol==='https:'?'; Secure':''}`;
export function readCookie(r:Request,name:string){return r.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||''}
export async function requireAdmin(r:Request,db:DB){const admin=adminIdentity();if(!admin||r.headers.get('x-admin-path')!==admin.path)throw new ApiError('页面不存在',404);const token=readCookie(r,'resonance_admin');if(!/^[a-f0-9]{64}$/.test(token)||await db.get(PREFIX+'admin-session:'+digest(token))!==admin.version)throw new ApiError('请登录管理后台',401);return admin}
export async function limit(db:DB,r:Request,label:string,max=10){const ip=r.headers.get('cf-connecting-ip')||r.headers.get('x-forwarded-for')?.split(',')[0]||'local';const key=PREFIX+'security-limit:'+digest(ip+label);const n=await db.incr(key);if(n===1)await db.expire(key,600);if(n>max)throw new ApiError('操作过于频繁，请十分钟后重试',429)}
export const same=(a:string,b:string)=>timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
export const nonce=()=>randomBytes(32).toString('hex');
export type Provider={enabled:boolean;clientId:string;clientSecret:string;issuer?:string};
export type SiteSettings={announcement:{enabled:boolean;text:string};turnstile:{siteKey:string;secretKey:string};sso:Record<string,Provider>};
export async function settings(db:DB):Promise<SiteSettings>{const v=JSON.parse(await db.get(SETTINGS)||'{}');return {announcement:{enabled:false,text:'',...v.announcement},turnstile:{siteKey:'',secretKey:'',...v.turnstile},sso:v.sso||{}}}
export function publicSettings(s:SiteSettings){return {announcement:s.announcement,turnstile:{siteKey:s.turnstile.siteKey,secretConfigured:!!s.turnstile.secretKey},sso:Object.fromEntries(['nodeseek','linuxdo','github','google'].map(id=>[id,{enabled:!!s.sso[id]?.enabled,clientId:s.sso[id]?.clientId||'',secretConfigured:!!s.sso[id]?.clientSecret,issuer:s.sso[id]?.issuer||''}]))}}
export async function audit(db:DB,action:string){await db.eval("redis.call('LPUSH',KEYS[1],ARGV[1]);redis.call('LTRIM',KEYS[1],0,99);return 1",{keys:[PREFIX+'admin-audit'],arguments:[JSON.stringify({action,time:Date.now()})]})}
export async function userKeys(db:DB,cursor='0'){return await db.eval("return redis.call('SCAN',ARGV[1],'MATCH',ARGV[2],'COUNT',100)",{keys:[],arguments:[cursor,PREFIX+'user:*']}) as [string,string[]]}

