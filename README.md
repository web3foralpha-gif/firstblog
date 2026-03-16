# 个人博客 · 生产化版本

技术栈：**Next.js 15 + Prisma + PostgreSQL + Markdown Content + Tailwind CSS + Stripe + NextAuth.js**

推荐运行环境：**Node 20 LTS**

---

## 一、本地开发启动

### 0. 切换 Node 版本

```bash
nvm use
```

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少填写：

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/blog?schema=public"
NEXTAUTH_SECRET="随机字符串，运行 openssl rand -base64 32 生成"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_PASSWORD="你的管理员密码"
ADMIN_EMAIL="你的管理员邮箱"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="我的小站"
```

Stripe 和邮件配置可先留空，基础功能照常运行。

### 3. 准备本地 PostgreSQL

推荐直接用 Docker：

```bash
docker run --name blog-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=blog \
  -p 5432:5432 \
  -d postgres:16
```

### 4. 初始化数据库

```bash
npm run db:deploy      # 应用仓库中的正式迁移
npm run db:generate    # 生成 Prisma Client
npm run db:seed        # 写入示例文章（可选）
```

开发中如果你修改了 `schema.prisma`，再运行：

```bash
npm run db:migrate
```

### 5. 编写博客文章

前台博客文章现在统一存放在：

```bash
content/posts/*.md
```

支持 Frontmatter：

```md
---
title: 我的新文章
description: SEO 描述
publishedAt: 2026-03-16
tags:
  - nextjs
  - markdown
mood: 🌻
---
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000/blog` 查看博客  
访问 `http://localhost:3000/admin` 进入后台（用 .env 中的邮箱和密码登录）

---

## GitHub 上传建议

这个项目已经包含：

- `.gitignore`：忽略 `node_modules`、`.next`、`.env`、本地 SQLite 数据库等不应入库的文件
- `prisma/dev.db` 仅可作为旧版 SQLite 数据迁移源，不再作为正式运行数据库
- `.gitattributes`：统一换行符，避免 Windows / macOS 混乱
- `.nvmrc`：固定 Node 20 LTS
- `.editorconfig`：统一基础编辑器格式

首次上传建议流程：

```bash
git init -b main
git add .
git commit -m "chore: prepare initial blog baseline"
git remote add origin https://github.com/<your-account>/<your-repo>.git
git push -u origin main
```

---

## 二、配置 Stripe 支付（可选）

### 1. 注册 Stripe 账号
前往 [stripe.com](https://stripe.com) 注册，进入测试模式。

### 2. 获取 API 密钥
Dashboard → Developers → API keys

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. 配置 Webhook（本地测试）

```bash
# 安装 Stripe CLI
brew install stripe/stripe-cli/stripe   # macOS
# 或前往 https://stripe.com/docs/stripe-cli 下载

# 登录
stripe login

# 监听并转发到本地
stripe listen --forward-to localhost:3000/api/payments/webhook
```

复制输出的 `whsec_...` 到 `.env`：
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. 测试支付
使用测试卡号：`4242 4242 4242 4242`，有效期任意未来日期，CVV 任意 3 位。

---

## 三、配置邮件发送（可选）

### Gmail 配置（推荐）

1. 开启 Gmail 两步验证
2. 生成应用专用密码：Google 账号 → 安全 → 应用密码
3. 填入 `.env`：

```
EMAIL_FROM="youremail@gmail.com"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="youremail@gmail.com"
EMAIL_PASS="xxxx xxxx xxxx xxxx"   # 应用专用密码（16位）
```

---

## 四、部署到 Vercel

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "初始提交"
git remote add origin https://github.com/你的用户名/blog.git
git push -u origin main
```

### 2. 在 Vercel 导入项目

1. 登录 [vercel.com](https://vercel.com)
2. New Project → 选择你的仓库 → Import
3. 在 Environment Variables 中填入所有 `.env` 变量
4. 将 `DATABASE_URL` 填为 PostgreSQL 连接字符串（见下方）
5. 构建命令保持默认即可，项目已内置 `prisma generate && next build`

### 3. 连接 PostgreSQL

**选项 A：Vercel Marketplace 数据库（推荐）**
1. Vercel 项目 → Storage / Marketplace → 选择 Prisma Postgres、Neon 或 Supabase
2. 将集成自动注入的 Postgres 连接串同步到 `DATABASE_URL`

**选项 B：Supabase / Neon（免费套餐更慷慨）**
1. 注册 [neon.tech](https://neon.tech) 或 [supabase.com](https://supabase.com)
2. 创建项目，复制 Connection String

仓库已经默认使用 PostgreSQL，无需再改 `schema.prisma`。

### 4. 运行生产数据库迁移

```bash
# 安装 Vercel CLI
npm i -g vercel

# 拉取生产环境变量
vercel env pull .env.production.local

# 运行迁移
DATABASE_URL="你的生产PostgreSQL连接字符串" npx prisma migrate deploy
```

### 5. 迁移旧版本地 SQLite 数据（如果你以前用过 `prisma/dev.db`）

如果你的历史文章和留言还在本地 SQLite 文件里，可以在连上新的 PostgreSQL 后执行：

```bash
DATABASE_URL="你的PostgreSQL连接字符串" npm run db:import:sqlite
```

默认会读取 `prisma/dev.db`，并把文章、留言、评论、设置、向日葵数据导入到 PostgreSQL。

### 6. 配置 Stripe Webhook（生产）

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL 填：`https://你的域名.vercel.app/api/payments/webhook`
3. 选择事件：`checkout.session.completed`、`checkout.session.expired`
4. 复制 Signing secret 到 Vercel 环境变量 `STRIPE_WEBHOOK_SECRET`

---

## 五、项目结构

```
content/
├── posts/                           # Markdown 博客文章
src/
├── app/
│   ├── page.tsx                    # 根路由，跳转到 /blog
│   ├── blog/
│   │   ├── page.tsx                # Markdown 博客列表
│   │   └── [slug]/page.tsx         # Markdown 博客详情
│   ├── about/page.tsx              # 关于我
│   ├── article/[slug]/page.tsx     # 旧文章兼容入口
│   ├── payment/success/page.tsx    # 支付成功
│   ├── robots.ts                   # robots.txt
│   ├── sitemap.ts                  # sitemap.xml
│   ├── rss.xml/route.ts            # RSS
│   ├── admin/
│   │   ├── layout.tsx              # 后台布局（鉴权）
│   │   ├── page.tsx                # 后台概览
│   │   ├── login/page.tsx          # 登录页
│   │   ├── articles/               # 文章管理
│   │   ├── comments/               # 评论管理
│   │   ├── payments/               # 打赏记录
│   │   └── settings/               # 网站设置
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth
│       ├── articles/[slug]/unlock/ # 密码验证
│       ├── comments/               # 评论提交
│       ├── payments/
│       │   ├── checkout/           # 创建支付
│       │   └── webhook/            # Stripe 回调
│       ├── admin/                  # 管理员 API（鉴权保护）
│       └── revalidate/             # ISR 触发
├── components/
│   ├── blog/                       # 前台组件
│   └── admin/                      # 后台组件
├── lib/
│   ├── prisma.ts                   # 数据库客户端
│   ├── db.ts                       # 数据库保护层
│   ├── posts.ts                    # Markdown 内容读取
│   ├── site.ts                     # 站点 URL / SEO 工具
│   ├── services/                   # 数据访问服务层
│   ├── auth.ts                     # NextAuth 配置
│   ├── stripe.ts                   # Stripe 客户端
│   ├── email.ts                    # 邮件发送
│   ├── utils.ts                    # 工具函数
│   └── middleware.ts               # 鉴权中间件
└── prisma/
    ├── schema.prisma               # 数据模型
    └── seed.ts                     # 示例数据
```

---

## 六、生产化架构说明

1. 公共博客内容改为 `content/posts` 中的 Markdown 文件，不再从数据库读取正文
2. `/blog` 与 `/blog/[slug]` 使用 `generateStaticParams()` 和 `revalidate`，适合 Vercel 缓存
3. Prisma Client 改为单例模式，降低开发和 Serverless 场景中的重复连接风险
4. 构建脚本统一为：

```bash
prisma generate && next build
```

5. 已移除 Cloudflare / OpenNext / Wrangler 部署配置，默认面向 Vercel
6. 已新增 `rss.xml`、`sitemap.xml`、`robots.txt`
7. 数据库查询被收敛到 `src/lib/services` 和 API 层，前台博客页不再直接访问 Prisma

---

## 七、常见问题

**Q：修改文章后前台没有更新？**  
A：Markdown 博客页使用了 ISR（1小时）和边缘缓存，提交到 Git 后重新部署即可生效。

**Q：Stripe 支付成功但文章没解锁？**  
A：检查 `STRIPE_WEBHOOK_SECRET` 是否正确，确认 Webhook 端点已配置且能接收到事件。

**Q：邮件没有收到？**  
A：检查垃圾邮件文件夹；确认 Gmail 应用密码正确；部分服务器需要开启 `ENABLE_SSL=true`。

**Q：怎么在本地使用 PostgreSQL？**  
A：安装 [Docker](https://docker.com)，运行：
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres
DATABASE_URL="postgresql://postgres:password@localhost:5432/blog"
```
