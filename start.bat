@echo off
echo 博客启动脚本
echo ─────────────────

if not exist ".env" (
  copy .env.example .env
  echo 已创建 .env，请编辑填写必要配置后重新运行
  pause
  exit /b
)

echo 安装依赖...
call npm install

echo 生成 Prisma Client...
call npx prisma generate

echo 同步数据库...
call npx prisma db push --skip-generate

echo 启动开发服务器...
call npm run dev
