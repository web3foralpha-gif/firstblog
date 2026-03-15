'use client'
import { useState } from 'react'
import FileUploader from './FileUploader'
import Image from 'next/image'

type CoverPickerProps = {
  value: string
  onChange: (url: string) => void
}

export default function CoverPicker({ value, onChange }: CoverPickerProps) {
  const [showUploader, setShowUploader] = useState(false)

  return (
    <div>
      <label className="text-xs text-[#8c7d68] mb-2 block">封面图（可选）</label>

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-[#ddd5c8]" style={{ height: 180 }}>
          <img src={value} alt="封面" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="bg-white/90 text-[#3d3530] text-xs px-3 py-1.5 rounded hover:bg-white"
            >
              更换
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="bg-red-500/90 text-white text-xs px-3 py-1.5 rounded hover:bg-red-500"
            >
              删除
            </button>
          </div>
        </div>
      ) : (
        <div>
          {showUploader ? (
            <FileUploader
              accept="image"
              label="上传封面图（建议 16:9，宽度 1200px 以上）"
              onSuccess={({ url }) => {
                onChange(url)
                setShowUploader(false)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="w-full border-2 border-dashed border-[#ddd5c8] rounded-lg p-5 text-sm text-[#a89880] hover:border-[#d4711a] hover:text-[#d4711a] transition-colors"
            >
              + 添加封面图
            </button>
          )}
        </div>
      )}
    </div>
  )
}
