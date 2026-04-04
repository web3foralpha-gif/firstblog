'use client'

import { useState, type ReactNode } from 'react'

import FileUploader from '@/components/houtai/FileUploader'
import type { AdminSettingField } from '@/components/houtai/admin-settings-config'
import { resolveSharedFontStack } from '@/lib/shared-fonts'

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative mt-1 inline-flex h-7 w-12 rounded-full transition-colors"
      style={{ background: value ? '#1d4ed8' : '#cbd5e1' }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: value ? 23 : 4 }}
      />
    </button>
  )
}

function FormRow({
  label,
  hint,
  status,
  actions,
  children,
}: {
  label: string
  hint?: string
  status?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5">
      <div className="pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {status}
        </div>
        {hint ? <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p> : null}
      </div>
      <div className="space-y-3">
        {children}
        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

function ImageSettingField({
  label,
  hint,
  status,
  actions,
  value,
  onChange,
}: {
  label: string
  hint?: string
  status?: ReactNode
  actions?: ReactNode
  value: string
  onChange: (value: string) => void
}) {
  const [showUploader, setShowUploader] = useState(false)

  return (
    <FormRow label={label} hint={hint} status={status} actions={actions}>
      <div className="space-y-3">
        {value ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img src={value} alt={label} className="max-h-64 w-full object-cover" />
          </div>
        ) : null}

        <input
          className="field font-mono text-xs"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="https://..."
          maxLength={1000}
        />

        {showUploader ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <FileUploader
              accept="image"
              label={`上传${label}`}
              onSuccess={({ url }) => {
                onChange(url)
                setShowUploader(false)
              }}
            />
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-700"
            >
              取消上传
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              上传图片
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 transition-colors hover:border-rose-300"
              >
                清空
              </button>
            ) : null}
          </div>
        )}
      </div>
    </FormRow>
  )
}

type AdminSettingsFieldRendererProps = {
  field: AdminSettingField
  draftValue?: string
  value: string
  savedValue: string
  defaultValue: string
  onChange: (value: string) => void
  onResetToSaved: () => void
  onResetToDefault: () => void
}

export default function AdminSettingsFieldRenderer({
  field,
  draftValue,
  value,
  savedValue,
  defaultValue,
  onChange,
  onResetToSaved,
  onResetToDefault,
}: AdminSettingsFieldRendererProps) {
  const fieldDirty = draftValue !== undefined && value !== savedValue
  const fieldSensitive = field.kind === 'password' || /(?:apiKey|secret|webhook|token)/i.test(field.key)
  const canResetToSaved = draftValue !== undefined
  const canResetToDefault = field.kind !== 'password' && value !== defaultValue
  const fieldStatus = (
    <>
      {fieldDirty ? (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          已修改
        </span>
      ) : (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          已保存
        </span>
      )}
      {fieldSensitive ? (
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
          敏感项
        </span>
      ) : null}
    </>
  )
  const fieldActions = (
    <>
      <button
        type="button"
        onClick={onResetToSaved}
        disabled={!canResetToSaved}
        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        恢复已保存
      </button>
      <button
        type="button"
        onClick={onResetToDefault}
        disabled={!canResetToDefault}
        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        恢复默认
      </button>
    </>
  )

  if (field.kind === 'image') {
    return (
      <ImageSettingField
        label={field.label}
        hint={field.hint}
        status={fieldStatus}
        actions={fieldActions}
        value={value}
        onChange={onChange}
      />
    )
  }

  if (field.kind === 'toggle') {
    return (
      <FormRow label={field.label} hint={field.hint} status={fieldStatus} actions={fieldActions}>
        <ToggleSwitch value={value === 'true'} onChange={nextValue => onChange(nextValue ? 'true' : 'false')} />
      </FormRow>
    )
  }

  if (field.kind === 'select') {
    return (
      <FormRow label={field.label} hint={field.hint} status={fieldStatus} actions={fieldActions}>
        <div className="space-y-3">
          <select className="field" value={value} onChange={event => onChange(event.target.value)}>
            {(field.options ?? []).map(option => (
              <option key={`${field.key}-${option.value || 'default'}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.key === 'poster.fontFamily' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Poster Preview</p>
              <div className="mt-3 space-y-2" style={{ fontFamily: resolveSharedFontStack(value) }}>
                <p className="text-2xl font-semibold text-slate-800">纸杯的自留地</p>
                <p className="text-sm leading-6 text-slate-500">二维码优先完整展示，扫一下就能继续阅读原文。</p>
                <p className="text-xs text-slate-400">zb2026.top</p>
              </div>
            </div>
          ) : null}
        </div>
      </FormRow>
    )
  }

  if (field.kind === 'textarea') {
    return (
      <FormRow label={field.label} hint={field.hint} status={fieldStatus} actions={fieldActions}>
        <textarea
          className="field resize-y"
          rows={field.rows ?? 4}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      </FormRow>
    )
  }

  const inputType = field.kind === 'number'
    ? 'number'
    : field.kind === 'email'
      ? 'email'
      : field.kind === 'password'
        ? 'password'
        : 'text'
  const inputValue = field.kind === 'password' ? (draftValue ?? '') : value
  const placeholder = field.kind === 'password'
    ? field.placeholder || '已加密保存，留空保持原值'
    : field.placeholder

  return (
    <FormRow label={field.label} hint={field.hint} status={fieldStatus} actions={fieldActions}>
      <input
        type={inputType}
        className={`field ${field.kind === 'number' ? 'max-w-[180px]' : ''} ${field.kind === 'password' ? 'font-mono text-xs' : ''}`}
        value={inputValue}
        min={field.min}
        max={field.max}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={field.kind === 'email' ? 'email' : field.kind === 'password' ? 'new-password' : undefined}
      />
    </FormRow>
  )
}
