# 登录验证与邀请码配置

登录、注册使用 Cloudflare Turnstile，注册另需邀请码。当前邀请码为 `czgm527`，可用服务端变量 REGISTRATION_INVITE_CODE 修改。前端不会返回或预填邀请码。

## 1. 在 Cloudflare 创建组件

Cloudflare 控制台 → Turnstile → Add widget（添加组件）。填写名称并添加实际网站域名，选择 **Managed（托管）** 模式。创建后复制 Site Key 与 Secret Key。

本地验证请单独添加 localhost / 127.0.0.1；生产组件建议仅允许正式域名。无需将网站托管到 Cloudflare。

## 2. 本地填写位置

在项目 `work/resonance/.dev.vars` 的末尾已预留：

```dotenv
TURNSTILE_SITE_KEY=填写SiteKey
TURNSTILE_SECRET_KEY=填写SecretKey
REGISTRATION_INVITE_CODE=czgm527
```

保留原有 REDIS_URL 等设置。不要用示例文件覆盖整个 .dev.vars。修改后重启本地开发服务器。

Site Key 是公开组件标识；Secret Key 只允许留在服务端环境变量，不要放到网页或 NEXT_PUBLIC_ 变量里。

## 3. 云端填写位置

Cloudflare Workers 项目 → Settings → Variables and Secrets：添加以上同名变量。TURNSTILE_SECRET_KEY 和 REGISTRATION_INVITE_CODE 选择 Secret 类型，然后重新部署。

Vercel 项目 → Settings → Environment Variables；EdgeOne Pages 项目 → 设置 → 环境变量：填写同样三个名称并重新部署。使用对应平台的全栈部署包；旧部署压缩包不包含本次更新，需要重新生成。

## 4. 行为与验证

- 两个 Turnstile 密钥未填齐：登录和注册均暂停，界面提示联系管理员；不会绕过验证。已登录会话不受影响。
- 服务端向 Cloudflare Siteverify 校验 token，并核对 action（login/register）与当前域名。
- 验证码过期、重放、验证失败和服务异常均拒绝登录/注册。一次提交之后组件重新验证。
- 注册必须另行通过邀请码检查。原有密码哈希、登录限流、HttpOnly 会话和来源检查保留。
- 不存在保证“不可破解”的验证码；Managed Turnstile 结合限流提高自动化攻击成本。
- 当前只有集成和模拟测试通过；填入真实密钥后还需在已允许的域名完成真实验证。

官方说明：https://developers.cloudflare.com/turnstile/get-started/
服务端验证：https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
