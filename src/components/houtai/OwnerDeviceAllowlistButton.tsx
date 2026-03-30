'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { getClientDeviceInfoSync } from '@/lib/client-device'
import { useToast } from '@/components/houtai/ui'

export default function OwnerDeviceAllowlistButton() {
  const router = useRouter()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  async function appendCurrentDevice() {
    if (saving) return

    const deviceInfo = getClientDeviceInfoSync()
    if (!deviceInfo) {
      toast('当前设备信息读取失败，请稍后重试', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/houtai/settings/owner-traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'append-device',
          deviceInfo,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast(String(data?.error || '加入设备白名单失败'), 'error')
        return
      }

      toast(data?.existed ? '这台设备已经在白名单里了' : '已加入当前设备白名单')
      router.refresh()
    } catch {
      toast('加入设备白名单失败，请稍后重试', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void appendCurrentDevice()}
      disabled={saving}
      className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {saving ? '加入中…' : '一键加入当前设备'}
    </button>
  )
}
