'use client'

import { useCallback, useRef, useState } from 'react'

type UploadResult = {
  url: string
  mediaId: string
  type: 'IMAGE' | 'VIDEO'
}

type PrepareUploadResult =
  | {
      strategy: 'multipart'
      type: 'IMAGE' | 'VIDEO'
    }
  | {
      strategy: 'direct'
      uploadUrl: string
      publicUrl: string
      key: string
      filename: string
      mimeType: string
      type: 'IMAGE' | 'VIDEO'
    }

type UploaderProps = {
  accept?: 'image' | 'video' | 'both'
  onSuccess: (result: UploadResult) => void
  label?: string
}

function uploadWithXhr<T>({
  method,
  url,
  body,
  responseType = 'json',
  headers,
  withCredentials = true,
  onProgress,
}: {
  method: 'POST' | 'PUT'
  url: string
  body: Document | XMLHttpRequestBodyInit | null
  responseType?: XMLHttpRequestResponseType
  headers?: Record<string, string>
  withCredentials?: boolean
  onProgress?: (value: number) => void
}) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      const target = method === 'PUT' ? xhr.upload : xhr.upload
      target.addEventListener('progress', event => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      })
    }

    xhr.addEventListener('load', () => {
      let data: unknown = null
      try {
        data = xhr.responseType === 'json' ? xhr.response : JSON.parse(xhr.responseText || '{}')
      } catch {
        data = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T)
        return
      }

      const message =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error?: string }).error || '上传失败')
          : xhr.status === 413
            ? '文件过大，服务器拒绝接收'
            : '上传失败'
      reject(new Error(message))
    })

    xhr.addEventListener('error', () => reject(new Error('网络错误')))
    xhr.responseType = responseType
    xhr.withCredentials = withCredentials
    xhr.open(method, url)
    Object.entries(headers || {}).forEach(([key, value]) => xhr.setRequestHeader(key, value))
    xhr.send(body)
  })
}

export default function FileUploader({ accept = 'both', onSuccess, label }: UploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [modeLabel, setModeLabel] = useState<'server' | 'direct'>('server')
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptAttr =
    accept === 'image' ? 'image/jpeg,image/png,image/gif,image/webp'
    : accept === 'video' ? 'video/mp4,video/webm,video/quicktime'
    : 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime'

  const uploadMultipart = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    setModeLabel('server')

    return uploadWithXhr<UploadResult>({
      method: 'POST',
      url: '/api/admin/upload',
      body: formData,
      onProgress: setProgress,
    })
  }, [])

  const prepareUpload = useCallback(async (file: File) => {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'prepare',
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(String(data?.error || '上传初始化失败'))
    }

    return data as PrepareUploadResult
  }, [])

  const completeDirectUpload = useCallback(async (file: File, prepared: Extract<PrepareUploadResult, { strategy: 'direct' }>) => {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'complete',
        key: prepared.key,
        filename: prepared.filename,
        originalName: file.name,
        url: prepared.publicUrl,
        size: file.size,
        mimeType: prepared.mimeType,
        type: prepared.type,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(String(data?.error || '上传确认失败'))
    }
    return data as UploadResult
  }, [])

  const uploadDirect = useCallback(async (file: File, prepared: Extract<PrepareUploadResult, { strategy: 'direct' }>) => {
    setModeLabel('direct')
    await uploadWithXhr({
      method: 'PUT',
      url: prepared.uploadUrl,
      body: file,
      responseType: 'text',
      headers: { 'Content-Type': prepared.mimeType },
      withCredentials: false,
      onProgress: setProgress,
    })
    return completeDirectUpload(file, prepared)
  }, [completeDirectUpload])

  const upload = useCallback(async (file: File) => {
    setError('')
    setProgress(0)

    try {
      const prepared = await prepareUpload(file)
      let result: UploadResult

      if (prepared.strategy === 'direct') {
        try {
          result = await uploadDirect(file, prepared)
        } catch (directError) {
          console.warn('[FileUploader] direct upload failed, fallback to server upload', directError)
          result = await uploadMultipart(file)
        }
      } else {
        result = await uploadMultipart(file)
      }

      setProgress(100)
      setTimeout(() => setProgress(null), 800)
      onSuccess(result)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
      setProgress(null)
    }
  }, [onSuccess, prepareUpload, uploadDirect, uploadMultipart])

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    void upload(files[0])
  }

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-[#d4711a] bg-[#fdf6ee]' : 'border-[#ddd5c8] hover:border-[#d4711a] hover:bg-[#faf8f5]'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {progress !== null ? (
          <div className="space-y-2">
            <p className="text-sm text-[#8c7d68]">
              上传中… {progress}% {modeLabel === 'direct' ? '· 直传存储' : '· 服务器处理中'}
            </p>
            <div className="w-full bg-[#f0ebe3] rounded-full h-1.5">
              <div
                className="bg-[#d4711a] h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="text-2xl mb-2">
              {accept === 'video' ? '🎬' : accept === 'image' ? '🖼️' : '📁'}
            </div>
            <p className="text-sm text-[#5a4f42] font-medium">
              {label || '点击或拖拽上传'}
            </p>
            <p className="text-xs text-[#a89880] mt-1">
              {accept === 'image' && 'JPG、PNG、GIF、WebP，最大 10MB'}
              {accept === 'video' && 'MP4、WebM、MOV，最大 200MB'}
              {accept === 'both' && '图片（10MB）或视频（200MB）'}
            </p>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
