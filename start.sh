#!/bin/bash
set -e
echo ""
echo "╔══════════════════════════════════╗"
echo "║       博客一键启动脚本           ║"
echo "╚══════════════════════════════════╝"
echo ""

# 检查 .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ 已创建 .env 文件"
  echo ""
  echo "⚠️  请先编辑 .env 填写以下必填项，然后重新运行 bash start.sh："
  echo ""
  echo "   DATABASE_URL=\"file:./dev.db\""
  echo "   ADMIN_EMAIL=你的邮箱"
  echo "   ADMIN_PASSWORD=你的登录密码"
  echo "   NEXTAUTH_SECRET=任意随机字符串"
  echo "   NEXT_PUBLIC_SITE_NAME=我的博客"
  echo "   NEXT_PUBLIC_SITE_URL=http://localhost:3000"
  echo ""
  exit 0
fi

echo "📦 安装依赖（首次较慢，请耐心等待）..."
npm install --legacy-peer-deps

echo ""
echo "🔧 生成 Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  创建数据库表..."
npx prisma db push

echo ""
echo "✅ 全部完成！启动开发服务器..."
echo ""
echo "   访问地址：http://localhost:3000"
echo "   后台地址：http://localhost:3000/admin"
echo ""
npm run dev
