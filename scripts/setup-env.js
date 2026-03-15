#!/usr/bin/env node
/**
 * 首次部署初始化脚本
 * 用法: node scripts/setup-env.js  或  npm run setup
 *
 * 功能:
 *  - 读取 .env.example 作为模板
 *  - 自动生成 NEXTAUTH_SECRET、SETTINGS_ENCRYPTION_KEY 等随机密钥
 *  - 写入 .env（已有值不覆盖，只补充缺失项）
 */

const fs     = require('fs')
const path   = require('path')
const crypto = require('crypto')

const ROOT     = path.resolve(__dirname, '..')
const EXAMPLE  = path.join(ROOT, '.env.example')
const ENV_FILE = path.join(ROOT, '.env')

if (!fs.existsSync(EXAMPLE)) {
  console.error('❌ 找不到 .env.example，请确认项目根目录正确')
  process.exit(1)
}

// 读取已有 .env 中的值（防止覆盖用户已填好的配置）
const existing = {}
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (m) existing[m[1]] = m[2]
  })
}

// 需要自动生成随机值的 key
const AUTO_GENERATE = {
  NEXTAUTH_SECRET:          () => crypto.randomBytes(32).toString('hex'),
  SETTINGS_ENCRYPTION_KEY:  () => crypto.randomBytes(32).toString('hex'),
}

const exampleLines = fs.readFileSync(EXAMPLE, 'utf-8').split('\n')
const output = []
const generated = []
const kept = []

for (const line of exampleLines) {
  const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)

  // 注释行或空行，原样保留
  if (!match) {
    output.push(line)
    continue
  }

  const [, key, placeholder] = match

  // 已有非空值 → 原样保留
  if (existing[key] !== undefined && existing[key] !== '') {
    output.push(`${key}=${existing[key]}`)
    kept.push(key)
    continue
  }

  // 需要自动生成
  if (AUTO_GENERATE[key]) {
    const val = AUTO_GENERATE[key]()
    output.push(`${key}=${val}`)
    generated.push(key)
    continue
  }

  // 其余保留占位符（用户手动填）
  output.push(`${key}=${placeholder}`)
}

fs.writeFileSync(ENV_FILE, output.join('\n') + '\n', 'utf-8')

console.log('\n────────────────────────────────────────────────')
console.log('  ✅  .env 初始化完成')
console.log('────────────────────────────────────────────────')

if (generated.length > 0) {
  console.log('\n🔑 已自动生成随机密钥：')
  generated.forEach(k => console.log(`   ✓ ${k}`))
}

if (kept.length > 0) {
  console.log(`\n📦 保留已有配置：${kept.length} 项（未覆盖）`)
}

console.log('\n📝 请手动填写以下必填项（在 .env 中找到对应行）：')
const required = [
  ['DATABASE_URL',              'PostgreSQL 连接字符串，本地开发可用 file:./dev.db (SQLite)'],
  ['ADMIN_EMAIL',               '管理员登录邮箱'],
  ['ADMIN_PASSWORD',            '管理员登录密码'],
  ['NEXT_PUBLIC_SITE_NAME',     '网站名称（显示在页面标题）'],
  ['NEXT_PUBLIC_SITE_URL',      '网站完整 URL，本地开发已自动填为 http://localhost:3000'],
]
required.forEach(([k, desc]) => {
  const already = kept.includes(k)
  console.log(`   ${already ? '✓' : '○'} ${k.padEnd(28)} ${already ? '(已有)' : desc}`)
})

console.log('\n💳 开启打赏功能还需填写：')
console.log('   ○ STRIPE_SECRET_KEY')
console.log('   ○ STRIPE_WEBHOOK_SECRET')
console.log('   ○ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')

console.log('\n☁️  开启图片上传还需填写：')
console.log('   ○ R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY')
console.log('   ○ R2_BUCKET_NAME / R2_PUBLIC_URL')

console.log('\n📧 开启邮件通知还需填写：')
console.log('   ○ SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS')

console.log('\n🚀 填写完成后运行：')
console.log('   npm run db:migrate && npm run dev\n')
