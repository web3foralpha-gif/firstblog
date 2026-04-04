'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { AdminSettingField, AdminSettingSection } from '@/components/houtai/admin-settings-config'
import { SETTINGS_CENTER_UI_KEY, type SettingDef } from '@/components/houtai/admin-settings-center-helpers'

type ToastType = 'success' | 'error' | 'info'

type ToastFn = (message: string, type?: ToastType) => void

type ConfirmFn = (
  title: string,
  message: string,
  options?: {
    confirmLabel?: string
    danger?: boolean
  },
) => Promise<boolean>

type UseAdminSettingsCenterArgs = {
  sections: AdminSettingSection[]
  selectedSectionId: string | null
  mode: 'full' | 'compact'
  toast: ToastFn
  confirm: ConfirmFn
}

function getFieldSearchText(section: AdminSettingSection, field: AdminSettingField, defs: Record<string, SettingDef>) {
  return [
    section.title,
    section.description,
    field.label,
    field.hint,
    field.placeholder,
    field.key,
    defs[field.key]?.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function useAdminSettingsCenter({
  sections,
  selectedSectionId,
  mode,
  toast,
  confirm,
}: UseAdminSettingsCenterArgs) {
  const uiStorageKey = `${SETTINGS_CENTER_UI_KEY}:${mode}`
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [defs, setDefs] = useState<Record<string, SettingDef>>({})
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingTarget, setSavingTarget] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDirtyOnly, setShowDirtyOnly] = useState(false)
  const [savedSectionTimestamps, setSavedSectionTimestamps] = useState<Record<string, number>>({})
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/houtai/settings', { cache: 'no-store' })
      if (!response.ok) throw new Error('load failed')

      const data = await response.json()
      setSettings(data.settings ?? {})
      setDefs(data.defs ?? {})
    } catch {
      toast('设置读取失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(uiStorageKey)
      if (!raw) return

      const parsed = JSON.parse(raw) as {
        showDirtyOnly?: boolean
        savedSectionTimestamps?: Record<string, number>
      }

      if (typeof parsed.showDirtyOnly === 'boolean') {
        setShowDirtyOnly(parsed.showDirtyOnly)
      }
      if (parsed.savedSectionTimestamps && typeof parsed.savedSectionTimestamps === 'object') {
        setSavedSectionTimestamps(parsed.savedSectionTimestamps)
      }
    } catch {
      window.localStorage.removeItem(uiStorageKey)
    }
  }, [uiStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(
      uiStorageKey,
      JSON.stringify({
        showDirtyOnly,
        savedSectionTimestamps,
      }),
    )
  }, [savedSectionTimestamps, showDirtyOnly, uiStorageKey])

  const dirtyKeys = useMemo(() => new Set(Object.keys(dirty)), [dirty])
  const dirtyCount = dirtyKeys.size
  const searchQuery = search.trim().toLowerCase()

  const effectiveSettings = useMemo(() => {
    const merged: Record<string, string> = {}
    const keys = new Set([...Object.keys(defs), ...Object.keys(settings), ...Object.keys(dirty)])

    keys.forEach(key => {
      merged[key] = dirty[key] !== undefined ? dirty[key] : (settings[key] ?? defs[key]?.default ?? '')
    })

    return merged
  }, [defs, dirty, settings])

  const getSettingValue = useCallback(
    (key: string) => dirty[key] !== undefined ? dirty[key] : (settings[key] ?? defs[key]?.default ?? ''),
    [defs, dirty, settings],
  )

  const setSettingValue = useCallback((key: string, value: string) => {
    setDirty(current => ({ ...current, [key]: value }))
  }, [])

  const getSavedValue = useCallback((key: string) => settings[key] ?? defs[key]?.default ?? '', [defs, settings])

  const getDirtyKeysForSection = useCallback(
    (section: AdminSettingSection) => section.fields.map(field => field.key).filter(key => dirtyKeys.has(key)),
    [dirtyKeys],
  )

  const matchesSearch = useCallback(
    (section: AdminSettingSection, field: AdminSettingField) => {
      if (!searchQuery) return true
      return getFieldSearchText(section, field, defs).includes(searchQuery)
    },
    [defs, searchQuery],
  )

  const getVisibleFields = useCallback(
    (section: AdminSettingSection) => {
      return section.fields.filter(field => {
        if (showDirtyOnly && !dirtyKeys.has(field.key)) return false
        return matchesSearch(section, field)
      })
    },
    [dirtyKeys, matchesSearch, showDirtyOnly],
  )

  const filteredSections = useMemo(
    () => sections.map(section => ({ ...section, fields: getVisibleFields(section) })).filter(section => section.fields.length > 0),
    [getVisibleFields, sections],
  )

  const dirtySectionCount = useMemo(
    () => sections.filter(section => getDirtyKeysForSection(section).length > 0).length,
    [getDirtyKeysForSection, sections],
  )

  const firstDirtySectionId = useMemo(
    () => sections.find(section => getDirtyKeysForSection(section).length > 0)?.id ?? null,
    [getDirtyKeysForSection, sections],
  )

  const lastSavedAt = useMemo(() => {
    const values = Object.values(savedSectionTimestamps)
    if (values.length === 0) return null
    return Math.max(...values)
  }, [savedSectionTimestamps])

  const selectedSection = useMemo(
    () => (selectedSectionId ? sections.find(section => section.id === selectedSectionId) ?? null : null),
    [sections, selectedSectionId],
  )

  const selectedSectionFields = useMemo(() => {
    if (!selectedSection) return []

    return selectedSection.fields.filter(field => {
      if (showDirtyOnly && !dirtyKeys.has(field.key)) return false
      return matchesSearch(selectedSection, field)
    })
  }, [dirtyKeys, matchesSearch, selectedSection, showDirtyOnly])

  const selectedSectionIndex = useMemo(
    () => (selectedSection ? sections.findIndex(section => section.id === selectedSection.id) : -1),
    [sections, selectedSection],
  )

  const previousSection = selectedSectionIndex > 0 ? sections[selectedSectionIndex - 1] : null
  const nextSection = selectedSectionIndex >= 0 && selectedSectionIndex < sections.length - 1 ? sections[selectedSectionIndex + 1] : null

  const resetFieldToSaved = useCallback((key: string) => {
    setDirty(current => {
      if (current[key] === undefined) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])

  const resetFieldToDefault = useCallback((key: string) => {
    setDirty(current => ({ ...current, [key]: defs[key]?.default ?? '' }))
  }, [defs])

  const clearSectionChanges = useCallback((section: AdminSettingSection) => {
    setDirty(current => {
      const next = { ...current }
      section.fields.forEach(field => {
        delete next[field.key]
      })
      return next
    })
  }, [])

  const saveKeys = useCallback(async (keys: string[], target: string) => {
    const payload = Object.fromEntries(keys.filter(key => dirty[key] !== undefined).map(key => [key, dirty[key]]))
    if (Object.keys(payload).length === 0) {
      toast('这一组没有改动', 'info')
      return
    }

    setSavingTarget(target)
    try {
      const response = await fetch('/api/houtai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('save failed')

      const savedAt = Date.now()
      const touchedSectionIds = sections
        .filter(section => section.fields.some(field => payload[field.key] !== undefined))
        .map(section => section.id)

      setSettings(current => ({ ...current, ...payload }))
      setDirty(current => {
        const next = { ...current }
        keys.forEach(key => {
          delete next[key]
        })
        return next
      })
      setSavedSectionTimestamps(current => {
        const next = { ...current }
        touchedSectionIds.forEach(sectionId => {
          next[sectionId] = savedAt
        })
        return next
      })
      toast(target === 'all' ? '全部设置已保存' : '本组设置已保存')
    } catch {
      toast('保存失败，请稍后重试', 'error')
    } finally {
      setSavingTarget(null)
    }
  }, [dirty, sections, toast])

  const changePassword = useCallback(async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast('请填写完整密码信息', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('两次新密码不一致', 'error')
      return
    }
    if (newPassword.length < 8) {
      toast('新密码至少 8 位', 'error')
      return
    }

    const approved = await confirm('修改密码', '确认更新管理员登录密码？更新后会立即生效。', {
      confirmLabel: '确认修改',
    })
    if (!approved) return

    setPasswordSaving(true)
    try {
      const response = await fetch('/api/houtai/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(String(data?.error || '密码修改失败'))

      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast(data.message || '管理员密码已更新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '密码修改失败', 'error')
    } finally {
      setPasswordSaving(false)
    }
  }, [confirm, confirmPassword, newPassword, oldPassword, toast])

  const clearFilters = useCallback(() => {
    setSearch('')
    setShowDirtyOnly(false)
  }, [])

  const toggleShowDirtyOnly = useCallback(() => {
    setShowDirtyOnly(current => !current)
  }, [])

  return {
    changePassword,
    clearFilters,
    clearSectionChanges,
    confirmPassword,
    defs,
    dirty,
    dirtyCount,
    dirtyKeys,
    dirtySectionCount,
    effectiveSettings,
    firstDirtySectionId,
    filteredSections,
    getDirtyKeysForSection,
    getSavedValue,
    getSettingValue,
    lastSavedAt,
    loading,
    newPassword,
    nextSection,
    oldPassword,
    passwordSaving,
    previousSection,
    resetFieldToDefault,
    resetFieldToSaved,
    saveKeys,
    savedSectionTimestamps,
    savingTarget,
    search,
    searchQuery,
    selectedSection,
    selectedSectionFields,
    setConfirmPassword,
    setNewPassword,
    setOldPassword,
    setSearch,
    setSettingValue,
    showDirtyOnly,
    toggleShowDirtyOnly,
  }
}
