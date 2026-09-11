export class AuthSecurityError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}
export type AuthConfig={siteKey:string;secretKey:string;inviteCode:string};
export async function verifyAuthChallenge(config:AuthConfig,request:Request,action:string,token:unknown){
 if(!config.siteKey||!config.secretKey)throw new AuthSecurityError('人机验证尚未配置，暂时无法登录或注册，请联系管理员。',503);
 if(typeof token!=='string'||!token||token.length>2048)throw new AuthSecurityError('请先完成人机验证。');
 let result:any;try{const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:config.secretKey,response:token}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Unavailable');result=await response.json()}catch{throw new AuthSecurityError('人机验证服务暂时不可用，请重新验证后再试。',503)}
 if(result?.success!==true||result.action!==action||String(result.hostname||'').toLowerCase()!==new URL(request.url).hostname.toLowerCase())throw new AuthSecurityError('人机验证失败或已过期，请重新验证。',403);
}
export function verifyInvite(expected:string,provided:unknown){if(typeof provided!=='string'||provided.trim()!==expected)throw new AuthSecurityError('邀请码不正确，请确认后重试。',403)}

