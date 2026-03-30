export type SharedFontOption = {
  id: string
  label: string
  value: string
}

export const DEFAULT_SHARED_FONT_STACK =
  "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"

export const SHARED_FONT_OPTIONS: readonly SharedFontOption[] = [
  { id: 'default', label: '默认字体', value: '' },
  {
    id: 'noto-sans-sc',
    label: '思源黑体',
    value: "'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', sans-serif",
  },
  {
    id: 'noto-serif-sc',
    label: '思源宋体',
    value: "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif",
  },
  {
    id: 'pingfang',
    label: '苹方',
    value: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  },
  {
    id: 'hiragino',
    label: '冬青黑体',
    value: "'Hiragino Sans GB', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  {
    id: 'yahei',
    label: '微软雅黑',
    value: "'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif",
  },
  {
    id: 'stheiti',
    label: '华文黑体',
    value: "'STHeiti', 'SimHei', 'Microsoft YaHei', sans-serif",
  },
  {
    id: 'songti',
    label: '宋体',
    value: "'Songti SC', 'STSong', 'SimSun', serif",
  },
  {
    id: 'fangsong',
    label: '仿宋',
    value: "'STFangsong', 'FangSong', 'Songti SC', serif",
  },
  {
    id: 'kaiti',
    label: '楷体',
    value: "'Kaiti SC', 'STKaiti', 'KaiTi', serif",
  },
  {
    id: 'xihei',
    label: '华文细黑',
    value: "'STXihei', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  {
    id: 'georgia',
    label: 'Georgia',
    value: "Georgia, 'Times New Roman', serif",
  },
  {
    id: 'times',
    label: 'Times New Roman',
    value: "'Times New Roman', Times, serif",
  },
  {
    id: 'baskerville',
    label: 'Baskerville',
    value: "Baskerville, 'Times New Roman', serif",
  },
  {
    id: 'palatino',
    label: 'Palatino',
    value: "'Palatino Linotype', Palatino, serif",
  },
  {
    id: 'garamond',
    label: 'Garamond',
    value: "Garamond, Baskerville, serif",
  },
  {
    id: 'helvetica-neue',
    label: 'Helvetica Neue',
    value: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  {
    id: 'arial',
    label: 'Arial',
    value: "Arial, 'Helvetica Neue', sans-serif",
  },
  {
    id: 'avenir',
    label: 'Avenir Next',
    value: "'Avenir Next', Avenir, 'Helvetica Neue', sans-serif",
  },
  {
    id: 'gill-sans',
    label: 'Gill Sans',
    value: "'Gill Sans', 'Helvetica Neue', sans-serif",
  },
  {
    id: 'optima',
    label: 'Optima',
    value: "Optima, 'Helvetica Neue', sans-serif",
  },
  {
    id: 'trebuchet',
    label: 'Trebuchet MS',
    value: "'Trebuchet MS', Verdana, sans-serif",
  },
  {
    id: 'verdana',
    label: 'Verdana',
    value: "Verdana, Geneva, sans-serif",
  },
  {
    id: 'courier-new',
    label: 'Courier New',
    value: "'Courier New', Courier, monospace",
  },
  {
    id: 'menlo',
    label: 'Menlo',
    value: "Menlo, Monaco, 'Courier New', monospace",
  },
  {
    id: 'monaco',
    label: 'Monaco',
    value: "Monaco, Menlo, 'Courier New', monospace",
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    value: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
  },
] as const

export function resolveSharedFontOption(value?: string | null) {
  return SHARED_FONT_OPTIONS.find(option => option.value === (value ?? '')) ?? SHARED_FONT_OPTIONS[0]
}

export function resolveSharedFontStack(value?: string | null) {
  const option = resolveSharedFontOption(value)
  return option.value || DEFAULT_SHARED_FONT_STACK
}
