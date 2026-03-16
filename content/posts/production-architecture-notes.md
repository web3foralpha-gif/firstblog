---
title: 这次生产化改造做了什么
description: 记录这次架构收口的核心点，包括 Prisma、缓存、SEO 和部署配置。
excerpt: 这次改造的核心目标不是推倒重写，而是在尽量少动现有功能的前提下，把公共博客面稳定下来。
publishedAt: 2026-03-15
updatedAt: 2026-03-16
tags:
  - prisma
  - vercel
  - seo
  - caching
mood: 🛠️
---

这次重构重点解决的是几个老问题：

## 1. Prisma 生成重复

现在构建脚本收口成：

```bash
prisma generate && next build
```

不再在 `postinstall` 和 `prepare` 里重复生成。

## 2. 连接数控制

Prisma 客户端已经改为单例模式，避免在开发和 Serverless 场景里反复实例化。

## 3. 内容层脱离数据库

前台博客页不再直接读取数据库正文，而是改成读取 `content/posts/*.md`。

这让这些页面可以自然使用：

- `generateStaticParams()`
- `revalidate`
- Vercel 的边缘缓存

## 4. SEO 补齐

项目现在会自动生成：

- `sitemap.xml`
- `robots.txt`
- `rss.xml`

## 5. 服务层收口

数据库读取被收进了 `src/lib/services`，这样页面层不再自己拼 Prisma 查询，后续继续扩展也更清晰。
