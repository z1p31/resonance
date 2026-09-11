# 共鸣管理后台

## 入口与环境变量

管理路径为 `/gmin` + `ADMIN` 的完整值，例如 `ADMIN=music_owner` 对应 `/gminmusic_owner`。

```dotenv
ADMIN=music_owner
PASSWORD=请替换为至少16位随机密码
REDIS_URL=rediss://default:数据库密码@主机:6379
```

管理员名称必须是 3–32 位字母、数字、下划线或连字符，不允许包含 `admin`（不区分大小写）。缺少凭据、名称不合规或密码少于 16 位时，后台直接返回 404。环境变量为服务端变量，禁止加 `NEXT_PUBLIC_` 前缀。

本部署包未包含本机管理员凭据。请通过 Vercel 环境变量设置 ADMIN 和 PASSWORD。

- 本地 Cloudflare/Vinext：填写 `.dev.vars`。
- Cloudflare Workers：Settings → Variables and Secrets，`PASSWORD`、`REDIS_URL` 使用 Secret；`ADMIN` 可以是变量。也可用 `wrangler secret put PASSWORD`。
- Vercel：项目 Settings → Environment Variables，添加上述变量，再重新部署。
- EdgeOne Pages：项目环境变量中添加上述变量，使用本项目部署导出脚本生成的 Next.js 全栈包。
- 本项目 Next.js 导出包本地使用 `.env.local`；需要 Node.js 服务端或 Cloudflare Workers，不能静态托管。

后台独立 HttpOnly 会话有效期为 2 小时。修改 ADMIN 或 PASSWORD 会使所有旧后台会话失效。后台登录有频率限制，写入操作校验同源。管理员名称不会赋予同名普通用户管理员权限。

## 用户管理与数据

支持查看用户、按已加载用户名/昵称查询、状态筛选、编辑昵称、停用/启用和重置密码。Redis SCAN 分页，点击「加载更多用户」继续读取；统计卡显示已加载数量，不伪造全站统计。旧用户没有注册时间时显示「—」。

停用及重置密码会撤销该用户先前的登录会话。第三方用户在原平台管理密码。后台不开放删除账号功能，避免误删。

导出/导入范围是**已有用户的音乐记录**：歌单、收藏、播放历史和搜索历史。JSON 不包含密码、SSO 绑定、会话或站点密钥，不能用于完整账号迁移。导入按用户名覆盖已有账号的音乐记录，不自动创建账号；先校验全部数据，再原子写入。最多 1000 用户、5 MB。恢复前先导出当前记录。

## 公告与 Turnstile

系统设置中的公告按纯文本展示在音乐页顶部。可以随时关闭。

Turnstile 的 Site Key、Secret Key 在后台填写并保存到现有 Upstash 数据库。Secret Key 不返回浏览器，输入框留空表示保留；后台值优先于 `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` 环境变量。配置缺失时账号密码登录、注册保持阻止，避免意外取消验证。

允许域名在 [Cloudflare Turnstile 控制台](https://dash.cloudflare.com/?to=/:account/turnstile) 设置；Turnstile 本身没有本站 `/callback` 地址，服务端使用 Siteverify 验证。本站验证 token 的 action 和 hostname。更改 key 后重新打开登录框获取新配置。

## 第三方登录

每个平台独立配置 Client ID / Secret 和启用开关，未启用的不显示在登录框。首次 SSO 建立账号需要当前注册邀请码，已有 SSO 用户不需要再次填写。第三方身份按「平台 + 稳定用户 ID」隔离，不以同名或邮箱自动合并账号。

| 平台 | 回调路径 | 配置文档 |
| --- | --- | --- |
| GitHub | `/api/sso/github/callback` | [OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) |
| Google | `/api/sso/google/callback` | [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) |
| Linux DO | `/api/sso/linuxdo/callback` | [Linux DO Connect](https://wiki.linux.do/Community/LinuxDoConnect) |
| NodeSeek | 暂未启用 | 尚未获得可核实的官方 SSO 文档，配置面板保留待接入状态 |

把后台显示的**完整 HTTPS 回调地址**注册到相应开放平台。GitHub 仅申请 `read:user`，Google 申请 `openid profile`；不读取邮件或代码仓库。OAuth state 与当前浏览器绑定，10 分钟过期并单次使用，GitHub/Google 启用 PKCE。Secret 和访问令牌不会返回前端。关闭平台开关会拒绝新的授权和回调，但不会退出已经建立的本站账号会话。

第三方应用密钥需要在对应平台申请；未提供真实密钥之前，只能验证本地安全边界和授权流程结构，不能宣称真实平台登录成功。

生产部署建议额外配置 `SITE_URL=https://你的正式域名`，用于固定 OAuth 回调来源；配置后其他域名的授权请求会被拒绝。
