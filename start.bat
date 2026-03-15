@echo off
echo 博客启动脚本
echo ─────────────────

if not exist ".env" (
  copy .env.example .env
  echo 已创建 .env，请编辑填写必要配置后重新运行
  echo.
  echo 你至少需要填写：
  echo DATABASE_URL=postgresql://postgres:password@localhost:5432/blog?schema=public
  pause
  exit /b
)

findstr /b /c:"DATABASE_URL=file:" .env >nul
if %errorlevel%==0 (
  echo 当前 .env 里的 DATABASE_URL 仍是旧版 SQLite 写法，请先改成 PostgreSQL 连接串
  pause
  exit /b 1
)

echo 安装依赖...
call npm install

echo 生成 Prisma Client...
call npm run db:generate

echo 应用数据库迁移...
call npx prisma migrate deploy

echo 启动开发服务器...
call npm run dev
