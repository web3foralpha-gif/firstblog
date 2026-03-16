---
title: 欢迎来到新的 Markdown 博客
description: 这篇文章说明新的内容系统如何工作，以及为什么它更适合生产部署。
excerpt: 前台博客已经切换到 Markdown 内容源，页面使用静态生成和增量更新，部署链路也更稳定了。
publishedAt: 2026-03-16
updatedAt: 2026-03-16
tags:
  - nextjs
  - markdown
  - architecture
mood: 🌻
---

新的博客内容系统现在以 `content/posts` 目录作为唯一来源。

这样做有几个直接好处：

- 前台博客不再依赖数据库读取正文
- 页面可以使用 Static Site Generation
- 部署时不会因为文章数据查询导致额外数据库连接
- Git 版本记录天然就是内容历史

## 现在的发布方式

只需要新增一个 Markdown 文件：

```md
---
title: 我的新文章
publishedAt: 2026-03-16
---

这里是正文。
```

保存并部署后，文章就会自动出现在 `/blog` 列表和 RSS、Sitemap 中。

## 适合生产环境的原因

数据库更适合存放互动数据，比如：

- 评论
- 留言板
- 支付记录
- 站点设置

而**稳定公开内容**更适合用 Markdown 文件维护。这样博客正文和互动系统被拆开后，线上部署会更稳，也更容易做缓存。
