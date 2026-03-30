export type EditorTemplate = {
  id: string
  title: string
  description: string
  content: string
}

export const EDITOR_TEMPLATES: EditorTemplate[] = [
  {
    id: 'lead',
    title: '导语开场',
    description: '适合文章开头，先抛观点再展开。',
    content: '<h2>导语</h2><p>先用两三句话说明这篇文章为什么值得读，再引出核心观点与背景。</p><p>这一段建议保持简洁，让读者快速进入状态。</p>',
  },
  {
    id: 'flash',
    title: '快讯卡片',
    description: '适合资讯型内容，先给结论再给补充。',
    content: '<p><strong>一句话结论：</strong>先把最重要的信息放在第一句，让读者一眼抓住重点。</p><blockquote>补充说明：这里可以继续解释时间、背景、影响与后续观察点。</blockquote>',
  },
  {
    id: 'quote',
    title: '引用摘要',
    description: '适合观点提炼、金句或转述。',
    content: '<blockquote>把最值得被记住的一句话放在这里，作为文章情绪或观点的锚点。</blockquote><p>接着用一段正文补充你的理解、判断与延展。</p>',
  },
  {
    id: 'section',
    title: '结构分段',
    description: '适合长文拆分，让层次更清楚。',
    content: '<h3>小标题</h3><p>这一段展开一个明确主题，可以写观点、事实、数据或个人判断。</p><hr><p>用一条分割线切换到下一部分，读起来会更像公众号排版。</p>',
  },
  {
    id: 'closing',
    title: '结尾互动',
    description: '适合文章收尾，鼓励读者留言交流。',
    content: '<h3>写在最后</h3><p>可以在这里总结全文，也可以抛出一个问题，邀请读者在评论区继续交流。</p><p><strong>你怎么看？欢迎留言告诉我。</strong></p>',
  },
]

export const EMOJI_PRESETS = ['✨', '📌', '📝', '🔥', '🎯', '📷', '💡', '🚀']
