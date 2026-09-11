# 共鸣音乐 · Vercel 私有部署包

这是包含真实数据库配置的私有全栈源代码包。数据库连接已写入 app/server-defaults.ts，由 server-only 限制为服务端使用，不需要再配置 REDIS_URL。请勿上传到公开仓库。

## 部署

1. 解压，将本目录导入私有 Git 仓库，然后在 Vercel 创建项目；也可以在本目录执行 npx vercel。
2. 框架选择 Next.js，Node.js 22.x，安装 npm ci，构建 npm run build，输出使用默认 .next。
3. 后台按需填写环境变量 ADMIN 和 PASSWORD（至少 16 位随机密码）。ADMIN 为 3–32 位字母、数字、下划线或连字符，不得包含 admin（不区分大小写）。例如 ADMIN=music_owner，入口为 /gminmusic_owner。未填写时后台关闭，音乐网站仍可使用。
4. SSO 建议设置 SITE_URL=https://正式域名，在第三方平台登记新域名的回调地址；Turnstile 允许域名在 Cloudflare 控制台调整。

现有公告、SSO 开关及密钥、后台保存的 Turnstile 配置、用户音乐记录都继续从同一个 Upstash 数据库读取，无需导入。没有配置过的第三方密钥不会自动生成。管理员 ADMIN、PASSWORD 未写入此包。

## 本地

运行 npm ci 后 npm run dev，访问 http://localhost:3000。需要后台时将 ENVIRONMENT.example 复制为 .env.local，填写 ADMIN/PASSWORD。

这是源码部署包，不是静态网页压缩包；不要把 ZIP 作为静态站点上传。包中不含 node_modules、构建缓存或本机管理员密码。
