'use client'
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'

// ─────────────────────────────────────────────
// Toast 系统
// ─────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; msg: string; type: ToastType }

const ToastCtx = createContext<(msg: string, type?: ToastType) => void>(() => {})
export function useToast() { return useContext(ToastCtx) }

let _idSeq = 0
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((msg: string, type: ToastType = 'success') => {
    const id = ++_idSeq
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium
            pointer-events-auto animate-slide-in
            ${t.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              t.type === 'error'   ? 'bg-red-50 text-red-700 border border-red-200' :
                                     'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slide-in {
          from { opacity:0; transform:translateX(16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .animate-slide-in { animation: slide-in .2s ease-out both; }
      `}</style>
    </ToastCtx.Provider>
  )
}

// ─────────────────────────────────────────────
// 确认弹窗
// ─────────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}
export function ConfirmDialog({ open, title, message, confirmLabel = '确认', danger = false, onConfirm, onCancel }: ConfirmProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            取消
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 页面标题栏
// ─────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────
// 状态徽章
// ─────────────────────────────────────────────
const BADGE_STYLES: Record<string, string> = {
  PUBLIC:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  PASSWORD:  'bg-violet-50 text-violet-700 border-violet-200',
  PAID:      'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED:  'bg-red-50 text-red-600 border-red-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED:    'bg-red-50 text-red-600 border-red-200',
  default:   'bg-slate-50 text-slate-600 border-slate-200',
}
const BADGE_LABELS: Record<string, string> = {
  PUBLIC: '公开', PASSWORD: '加密', PAID: '打赏',
  APPROVED: '已通过', PENDING: '待审核', REJECTED: '已拒绝',
  COMPLETED: '已完成', FAILED: '失败',
}
export function Badge({ status, label }: { status: string; label?: string }) {
  const cls = BADGE_STYLES[status] || BADGE_STYLES.default
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      {label ?? BADGE_LABELS[status] ?? status}
    </span>
  )
}

// ─────────────────────────────────────────────
// 响应式表格容器
// ─────────────────────────────────────────────
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 lg:mx-0">
      <div className="min-w-[640px] lg:min-w-0 px-4 lg:px-0">
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 通用表格
// ─────────────────────────────────────────────
export interface ColDef<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render: (row: T) => React.ReactNode
}
interface TableProps<T> {
  cols: ColDef<T>[]
  rows: T[]
  keyFn: (row: T) => string | number
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  empty?: string
  loading?: boolean
}
export function DataTable<T>({ cols, rows, keyFn, sortKey, sortDir, onSort, empty = '暂无数据', loading }: TableProps<T>) {
  return (
    <TableWrap>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {cols.map(col => (
              <th key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide select-none
                  ${col.sortable ? 'cursor-pointer hover:text-slate-700' : ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span className="text-slate-300">
                      {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={cols.length} className="py-12 text-center text-slate-400 text-sm">加载中…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="py-12 text-center text-slate-400 text-sm">{empty}</td></tr>
          ) : (
            rows.map(row => (
              <tr key={keyFn(row)} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                {cols.map(col => (
                  <td key={col.key} className="py-3 px-3 text-slate-700 align-middle">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableWrap>
  )
}

// ─────────────────────────────────────────────
// 分页
// ─────────────────────────────────────────────
export function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
      <p className="text-xs text-slate-500">共 {total} 条</p>
      <div className="flex gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={i} className="px-2.5 py-1.5 text-xs text-slate-400">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                p === page
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          ›
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 卡片容器
// ─────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 ${className}`}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// 搜索框
// ─────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = '搜索…' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all"
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// useConfirm hook
// ─────────────────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel?: string; danger?: boolean;
    resolve?: (v: boolean) => void
  }>({ open: false, title: '', message: '' })

  const confirm = useCallback((title: string, message: string, opts?: { confirmLabel?: string; danger?: boolean }) =>
    new Promise<boolean>(resolve => {
      setState({ open: true, title, message, ...opts, resolve })
    }), [])

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      danger={state.danger}
      onConfirm={() => { setState(s => ({ ...s, open: false })); state.resolve?.(true) }}
      onCancel={()  => { setState(s => ({ ...s, open: false })); state.resolve?.(false) }}
    />
  )
  return { confirm, dialog }
}

// ─────────────────────────────────────────────
// 通用加载骨架
// ─────────────────────────────────────────────
export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-slate-100 rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}
