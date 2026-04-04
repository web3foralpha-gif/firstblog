'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import AdminSettingsFieldRenderer from '@/components/houtai/AdminSettingsFieldRenderer'
import MascotWorkbench from '@/components/houtai/MascotWorkbench'
import OwnerDeviceAllowlistButton from '@/components/houtai/OwnerDeviceAllowlistButton'
import { ADMIN_SETTING_SECTIONS, type AdminSettingSection } from '@/components/houtai/admin-settings-config'
import {
  buildSectionHref,
  formatSavedTime,
  getSectionMeta,
  isLongField,
  type AdminSettingsCenterProps,
} from '@/components/houtai/admin-settings-center-helpers'
import { useAdminSettingsCenter } from '@/components/houtai/useAdminSettingsCenter'
import { Card, PageHeader, SearchInput, useConfirm, useToast } from '@/components/houtai/ui'

type SettingsSectionCardProps = {
  section: AdminSettingSection
  sourceSection: AdminSettingSection
  dirtyCount: number
  savedAt?: number
  href?: string
  onClick?: () => void
}

function SettingsSectionCard({ section, sourceSection, dirtyCount, savedAt, href, onClick }: SettingsSectionCardProps) {
  const sectionMeta = getSectionMeta(sourceSection.id)
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-lg">{sectionMeta.icon}</span>
          <span className="text-base font-semibold text-slate-800">{section.title}</span>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          {section.fields.length} 字段
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${sectionMeta.tone}`}>
          {sectionMeta.label}
        </span>
        <span className="text-[11px] text-slate-400">上次保存 {formatSavedTime(savedAt)}</span>
        {dirtyCount > 0 ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
            {dirtyCount} 项待保存
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {sectionMeta.scope.map(item => (
          <span key={`${section.id}-${item}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
            {item}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{section.description}</p>
    </>
  )

  const className = 'rounded-[24px] border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

export default function AdminSettingsCenter({
  title = '前台控制中心',
  subtitle = '把常用前台设置整合成按场景分组的控制面板，后续扩展也只需要在一个地方挂字段。',
  mode = 'full',
  fullPageHref = '/houtai/settings',
}: AdminSettingsCenterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const isCompactMode = mode === 'compact'
  const currentSearch = searchParams.toString()
  const sections = useMemo(() => ADMIN_SETTING_SECTIONS, [])
  const selectedSectionId = isCompactMode ? null : searchParams.get('section')

  const {
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
    filteredSections,
  } = useAdminSettingsCenter({
    sections,
    selectedSectionId,
    mode,
    toast,
    confirm,
  })

  const selectedSectionMeta = selectedSection ? getSectionMeta(selectedSection.id) : null
  const selectedSectionHasLongField = selectedSectionFields.some(isLongField)

  function openSection(sectionId: string) {
    if (isCompactMode) return
    router.replace(buildSectionHref(pathname, currentSearch, sectionId), { scroll: false })
  }

  function closeSection() {
    if (isCompactMode) return
    router.replace(buildSectionHref(pathname, currentSearch, null), { scroll: false })
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-400">加载设置中…</div>
  }

  return (
    <div id="control-center" className="space-y-6">
      {dialog}

      {!isCompactMode ? (
        <PageHeader
          title={selectedSection ? `${title} · ${selectedSection.title}` : title}
          subtitle={selectedSection ? '当前只进入一个分组单独编辑，避免所有设置同时摊开。' : subtitle}
          action={selectedSection ? (
            <button
              type="button"
              onClick={closeSection}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              返回全部板块
            </button>
          ) : null}
        />
      ) : null}

      {isCompactMode ? (
        <Card className="overflow-hidden border-slate-200">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Settings Workspace</p>
                  <Link
                    href={fullPageHref}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700"
                  >
                    进入完整设置页 →
                  </Link>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">共 {sections.length} 组</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">有改动 {dirtySectionCount} 组</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">最近保存 {formatSavedTime(lastSavedAt)}</span>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <SearchInput value={search} onChange={setSearch} placeholder="搜索要进入的设置板块" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleShowDirtyOnly}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    showDirtyOnly
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {showDirtyOnly ? '只看改动中' : '筛改动'}
                </button>
                {(searchQuery || showDirtyOnly) ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                  >
                    清空筛选
                  </button>
                ) : null}
              </div>
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
                当前筛选没有匹配结果
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSections.map(section => {
                  const sourceSection = sections.find(item => item.id === section.id) ?? section
                  return (
                    <SettingsSectionCard
                      key={section.id}
                      section={section}
                      sourceSection={sourceSection}
                      dirtyCount={getDirtyKeysForSection(sourceSection).length}
                      savedAt={savedSectionTimestamps[section.id]}
                      href={`${fullPageHref}?section=${section.id}`}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      ) : selectedSection && selectedSectionMeta ? (
        <>
          <Card className="overflow-hidden border-slate-200">
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={closeSection}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white"
                    >
                      ← 返回板块列表
                    </button>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${selectedSectionMeta.tone}`}>
                      {selectedSectionMeta.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      最近保存 {formatSavedTime(savedSectionTimestamps[selectedSection.id])}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                      {selectedSectionMeta.icon}
                    </span>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedSection.title}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{selectedSection.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedSectionMeta.scope.map(item => (
                      <span key={`${selectedSection.id}-${item}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{selectedSectionMeta.note}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {previousSection ? (
                    <button
                      type="button"
                      onClick={() => openSection(previousSection.id)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      ← 上一组
                    </button>
                  ) : null}
                  {nextSection ? (
                    <button
                      type="button"
                      onClick={() => openSection(nextSection.id)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      下一组 →
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => clearSectionChanges(selectedSection)}
                    disabled={getDirtyKeysForSection(selectedSection).length === 0 || savingTarget !== null}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    恢复本组改动
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveKeys(selectedSection.fields.map(field => field.key), selectedSection.id)}
                    disabled={getDirtyKeysForSection(selectedSection).length === 0 || savingTarget !== null}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTarget === selectedSection.id ? '保存中…' : '保存本组'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                <SearchInput value={search} onChange={setSearch} placeholder={`搜索 ${selectedSection.title} 内的字段`} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleShowDirtyOnly}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      showDirtyOnly
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {showDirtyOnly ? '只看改动中' : '只看改动项'}
                  </button>
                  {(searchQuery || showDirtyOnly) ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                    >
                      清空筛选
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void saveKeys(Array.from(dirtyKeys), 'all')}
                    disabled={dirtyCount === 0 || savingTarget !== null}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    保存全部修改
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <section id={`settings-${selectedSection.id}`}>
            <Card className="overflow-hidden border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">本组共 {selectedSection.fields.length} 项</span>
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">当前展示 {selectedSectionFields.length} 项</span>
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">待保存 {getDirtyKeysForSection(selectedSection).length} 项</span>
                </div>
              </div>
              {selectedSectionFields.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">
                  当前筛选下没有字段可显示，试试清空搜索或关闭“只看改动项”。
                </div>
              ) : (
                <div className={selectedSectionHasLongField ? 'space-y-5 p-5 sm:p-6' : 'grid gap-5 p-5 sm:p-6 xl:grid-cols-2'}>
                  {selectedSectionFields.map(field => (
                    <div key={field.key} className={selectedSectionHasLongField || isLongField(field) ? '' : 'xl:col-span-1'}>
                      <AdminSettingsFieldRenderer
                        field={field}
                        draftValue={dirty[field.key]}
                        value={getSettingValue(field.key)}
                        savedValue={getSavedValue(field.key)}
                        defaultValue={defs[field.key]?.default ?? ''}
                        onChange={value => setSettingValue(field.key, value)}
                        onResetToSaved={() => resetFieldToSaved(field.key)}
                        onResetToDefault={() => resetFieldToDefault(field.key)}
                      />
                    </div>
                  ))}

                  {selectedSection.id === 'security' ? (
                    <div className="xl:col-span-2">
                      <Card className="border border-slate-200 bg-slate-50 p-5 shadow-none">
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-slate-800">修改管理员密码</h3>
                          <p className="mt-1 text-xs leading-5 text-slate-500">修改后立即生效，建议保存后重新登录确认。</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <input
                            type="password"
                            className="field"
                            value={oldPassword}
                            onChange={event => setOldPassword(event.target.value)}
                            placeholder="旧密码"
                            autoComplete="current-password"
                          />
                          <input
                            type="password"
                            className="field"
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            placeholder="新密码（至少 8 位）"
                            autoComplete="new-password"
                          />
                          <input
                            type="password"
                            className="field"
                            value={confirmPassword}
                            onChange={event => setConfirmPassword(event.target.value)}
                            placeholder="确认新密码"
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void changePassword()}
                            disabled={passwordSaving}
                            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {passwordSaving ? '更新中…' : '更新密码'}
                          </button>
                        </div>
                      </Card>
                    </div>
                  ) : null}

                  {selectedSection.id === 'analytics' ? (
                    <div className="xl:col-span-2">
                      <Card className="border border-slate-200 bg-slate-50 p-5 shadow-none">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800">一键加入当前设备白名单</h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              这里会生成当前设备的精确签名并写入白名单，避免手动填写时把真实访客误排除。
                            </p>
                          </div>
                          <OwnerDeviceAllowlistButton />
                        </div>
                      </Card>
                    </div>
                  ) : null}

                  {selectedSection.id === 'ai' ? <MascotWorkbench draftSettings={effectiveSettings} /> : null}
                </div>
              )}
            </Card>
          </section>
        </>
      ) : (
        <Card className="overflow-hidden border-slate-200">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Section Navigator</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">先选择要进入的设置板块</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  这里不再把所有表单整页铺开，而是先按板块收纳；点击卡片后进入对应分组单独编辑。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">未保存 {dirtyCount} 项</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">当前分组 {filteredSections.length}/{sections.length}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">最近保存 {formatSavedTime(lastSavedAt)}</span>
                <button
                  type="button"
                  onClick={() => void saveKeys(Array.from(dirtyKeys), 'all')}
                  disabled={dirtyCount === 0 || savingTarget !== null}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingTarget === 'all' ? '保存中…' : '保存全部修改'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <SearchInput value={search} onChange={setSearch} placeholder="搜索要进入的设置板块" />
              <div className="flex flex-wrap gap-2">
                {firstDirtySectionId ? (
                  <button
                    type="button"
                    onClick={() => openSection(firstDirtySectionId)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                  >
                    跳到第一处改动
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={toggleShowDirtyOnly}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    showDirtyOnly
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {showDirtyOnly ? '只看改动中' : '筛改动'}
                </button>
                {(searchQuery || showDirtyOnly) ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                  >
                    清空筛选
                  </button>
                ) : null}
              </div>
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
                当前筛选没有匹配结果
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSections.map(section => {
                  const sourceSection = sections.find(item => item.id === section.id) ?? section
                  return (
                    <SettingsSectionCard
                      key={section.id}
                      section={section}
                      sourceSection={sourceSection}
                      dirtyCount={getDirtyKeysForSection(sourceSection).length}
                      savedAt={savedSectionTimestamps[section.id]}
                      onClick={() => openSection(section.id)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
