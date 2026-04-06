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
    description: '先放章节眉题，再用一段更有呼吸感的导语带人进入正文。',
    content:
      '<p class="rt-eyebrow">写在前面</p><h2>这里放你的标题</h2><p class="rt-lead">先把最想说的感受、判断或结论放在这里，让读者一眼知道这篇文章为什么值得继续读下去。</p><p>接着再往下展开背景、细节和情绪，整体节奏会更稳一些。</p>',
  },
  {
    id: 'note',
    title: '重点信息卡',
    description: '把提醒、摘要或结论做成一块更醒目的内容。',
    content:
      '<p class="rt-note"><strong>核心提示</strong><br />这里适合放一个必须立刻看见的信息，比如结论、提醒、摘要，或者你最想让读者记住的一句话。</p><p>下面继续接正文，补充来龙去脉、例子或个人判断。</p>',
  },
  {
    id: 'summary',
    title: '摘要引导块',
    description: '适合放在开头，用几句短话先交代读点。',
    content:
      '<p class="rt-summary"><strong>这篇会写什么</strong><br />先用两三句话说清这篇文章的主题、情绪和重点。别写太满，给读者一个愿意继续往下看的理由就够了。</p><p class="rt-guide"><strong>往下会看到：</strong>一个开头判断、一段具体经历、几个你真正想说的话，最后再轻轻收住。</p>',
  },
  {
    id: 'tip',
    title: '方法步骤卡',
    description: '适合教程、经验总结或可操作建议。',
    content:
      '<p class="rt-tip"><strong>可操作建议</strong><br />如果你想让这段内容更实用，就把关键做法、步骤、注意点放进这块卡片里。</p><ul><li>先写第一步，保持足够具体。</li><li>再写第二步，让读者能顺着做下去。</li><li>最后补一句容易忽略的小提醒。</li></ul>',
  },
  {
    id: 'quote',
    title: '金句引用',
    description: '适合把一句话单独拎出来，让文章更有停顿感。',
    content:
      '<blockquote class="rt-quote">把最值得停下来读第二遍的一句话放在这里。它可以是判断、情绪，也可以是某个忽然想明白的瞬间。</blockquote><p>后面再跟一段解释，补上你的理解、延展和现实落点。</p>',
  },
  {
    id: 'section',
    title: '章节骨架',
    description: '适合长文拆段，先立章节，再自然过渡到下一部分。',
    content:
      '<p class="rt-eyebrow">Part 01</p><h3>这里放小标题</h3><p>这一段展开一个明确主题，可以写观点、事实、数据或个人判断。</p><hr><p>分割线之后就能顺势进入下一段，长文会更清楚，也更像成稿。</p>',
  },
  {
    id: 'warning',
    title: '注意事项',
    description: '适合边界提醒、风险说明、补充注释。',
    content:
      '<p class="rt-warning"><strong>补充说明</strong><br />如果这里有容易被忽略的限制、风险、时间条件或前提，就单独放在这块里，让读者一眼看见。</p><p>说明完之后，再继续回到正文，不会打断整体阅读节奏。</p>',
  },
  {
    id: 'caption',
    title: '配图说明',
    description: '适合在图片后面补一句轻一点的说明或注释。',
    content:
      '<p class="rt-caption">这张图不必解释得太满，留一句时间、地点、情绪，或者拍下它时你心里的那点意思，就够了。</p>',
  },
  {
    id: 'closing',
    title: '收尾留白',
    description: '适合文章结尾，不用说太满，也能留下余味。',
    content:
      '<h3>写在最后</h3><p class="rt-closing">写到这里，差不多也该收住了。留一句有余味的话，比把所有感受一口气说满，更容易让人记住。</p><p>如果你愿意，也可以在最后轻轻抛出一个问题，引导评论区继续说下去。</p>',
  },
  {
    id: 'signature',
    title: '署名尾注',
    description: '适合文末留一个轻一点的署名和时间感。',
    content:
      '<hr><p class="rt-eyebrow">纸杯的自留地</p><p class="rt-closing">写到这里就先停一下。愿你读完之后，能带走一句对自己还有点用的话。</p>',
  },
]

export const EMOJI_PRESETS = ['✨', '📌', '📝', '🔥', '🎯', '📷', '💡', '🚀']
