'use client'

import { upload as blobUpload } from '@vercel/blob/client'
import { useCallback, useRef, useState } from 'react'

type UploadResult = {
  url: string
  mediaId: string
  type: 'IMAGE' | 'VIDEO' | 'AUDIO'
}

export type UploadLifecycleState = {
  status: 'uploading' | 'success' | 'error'
  progress: number | null
  fileName?: string
  message?: string
  mode?: 'server' | 'direct'
}

type UploaderProps = {
  accept?: 'image' | 'video' | 'audio' | 'both'
  onSuccess: (result: UploadResult) => void
  label?: string
  onUploadStateChange?: (state: UploadLifecycleState) => void
}

function buildUploadPath(file: File, type: 'IMAGE' | 'VIDEO' | 'AUDIO') {
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : ''
  const safeExt = ext.replace(/[^a-z0-9]/gi, '')
  const folder = type === 'IMAGE' ? 'images' : type === 'VIDEO' ? 'videos' : 'audios'
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return `${folder}/${id}${safeExt ? `.${safeExt}` : ''}`
}

function inferMimeType(file: File) {
  if (file.type) return file.type

  const ext = file.name.split('.').pop()?.toLowerCase()
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
  }

  return ext ? byExt[ext] || '' : ''
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function getUploadTypeLabel(type: UploadResult['type']) {
  if (type === 'VIDEO') return '视频'
  if (type === 'AUDIO') return '音频'
  return '图片'
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

export default function FileUploader({ accept = 'both', onSuccess, label, onUploadStateChange }: UploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [modeLabel, setModeLabel] = useState<'server' | 'direct'>('server')
  const [currentFileName, setCurrentFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const currentFileNameRef = useRef('')
  const uploadModeRef = useRef<'server' | 'direct'>('server')

  const emitUploadState = useCallback((state: UploadLifecycleState) => {
    onUploadStateChange?.({
      ...state,
      fileName: state.fileName ?? currentFileNameRef.current,
      mode: state.mode ?? uploadModeRef.current,
    })
  }, [onUploadStateChange])

  const updateProgress = useCallback((value: number) => {
    setProgress(value)
    emitUploadState({ status: 'uploading', progress: value })
  }, [emitUploadState])

  const acceptAttr =
    accept === 'image' ? 'image/jpeg,image/png,image/gif,image/webp'
    : accept === 'video' ? 'video/mp4,video/webm,video/quicktime'
    : accept === 'audio' ? 'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm'
    : 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm'

  const uploadMultipart = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    setModeLabel('server')
    uploadModeRef.current = 'server'

    return uploadWithXhr<UploadResult>({
      method: 'POST',
      url: '/api/houtai/upload',
      body: formData,
      onProgress: updateProgress,
    })
  }, [updateProgress])

  const finalizeUpload = useCallback(async (input: {
    key: string
    filename: string
    originalName: string
    url: string
    size: number
    mimeType: string
    type: 'IMAGE' | 'VIDEO' | 'AUDIO'
  }) => {
    const res = await fetch('/api/houtai/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'complete',
        ...input,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(String(data?.error || '上传确认失败'))
    }
    return data as UploadResult
  }, [])

  const uploadBlob = useCallback(async (file: File) => {
    const mimeType = inferMimeType(file)
    const type = mimeType.startsWith('video/') ? 'VIDEO' : mimeType.startsWith('audio/') ? 'AUDIO' : 'IMAGE'
    const pathname = buildUploadPath(file, type)
    const controller = new AbortController()
    let stalled = true
    const stallTimer = window.setTimeout(() => {
      if (stalled) {
        controller.abort(new Error('直传超时'))
      }
    }, 12000)

    setModeLabel('direct')
    uploadModeRef.current = 'direct'
    try {
      const blob = await blobUpload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/houtai/upload',
        contentType: mimeType || undefined,
        multipart: file.size >= 5 * 1024 * 1024,
        abortSignal: controller.signal,
        clientPayload: JSON.stringify({
          pathname,
          originalName: file.name,
          mimeType,
          size: file.size,
          type,
        }),
        onUploadProgress: event => {
          if (event.percentage > 0) {
            stalled = false
            window.clearTimeout(stallTimer)
          }
          updateProgress(Math.round(event.percentage))
        },
      })

      stalled = false
      window.clearTimeout(stallTimer)

      return finalizeUpload({
        key: blob.pathname,
        filename: blob.pathname.split('/').pop() || blob.pathname,
        originalName: file.name,
        url: blob.url,
        size: file.size,
        mimeType: blob.contentType || mimeType,
        type,
      })
    } finally {
      window.clearTimeout(stallTimer)
    }
  }, [finalizeUpload, updateProgress])

  const runUpload = useCallback(async (file: File) => {
    const fileLabel = `${file.name} · ${formatFileSize(file.size)}`
    setError('')
    setProgress(0)
    setCurrentFileName(fileLabel)
    currentFileNameRef.current = fileLabel
    emitUploadState({
      status: 'uploading',
      progress: 0,
      fileName: fileLabel,
      message: `正在上传 ${file.name}`,
    })

    try {
      let result: UploadResult
      const mimeType = inferMimeType(file)
      const shouldUseServerUpload = !mimeType || mimeType.startsWith('image/')

      if (shouldUseServerUpload) {
        result = await uploadMultipart(file)
      } else {
        try {
          result = await uploadBlob(file)
        } catch (directError) {
          console.warn('[FileUploader] blob upload failed, fallback to server upload', directError)
          result = await uploadMultipart(file)
        }
      }

      setProgress(100)
      emitUploadState({
        status: 'success',
        progress: 100,
        fileName: fileLabel,
        message: `${getUploadTypeLabel(result.type)}上传完成`,
      })
      setTimeout(() => setProgress(null), 800)
      onSuccess(result)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败'
      setError(message)
      setProgress(null)
      emitUploadState({
        status: 'error',
        progress: null,
        fileName: fileLabel,
        message,
      })
    }
  }, [emitUploadState, onSuccess, uploadBlob, uploadMultipart])

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    void runUpload(files[0])
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
            {currentFileName ? (
              <p className="text-xs text-[#a89880] break-all">
                {currentFileName}
              </p>
            ) : null}
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
              {accept === 'video' ? '🎬' : accept === 'image' ? '🖼️' : accept === 'audio' ? '🎵' : '📁'}
            </div>
            <p className="text-sm text-[#5a4f42] font-medium">
              {label || '点击或拖拽上传'}
            </p>
            <p className="text-xs text-[#a89880] mt-1">
              {accept === 'image' && 'JPG、PNG、GIF、WebP，最大 10MB'}
              {accept === 'video' && 'MP4、WebM、MOV，最大 200MB'}
              {accept === 'audio' && 'MP3、M4A、AAC、WAV、OGG，最大 50MB'}
              {accept === 'both' && '图片（10MB）、视频（200MB）或音频（50MB）'}
            </p>
            {currentFileName ? <p className="mt-1 text-[11px] text-[#c1aa8d]">最近选择：{currentFileName}</p> : null}
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {progress === null && currentFileName && !error ? (
        <p className="mt-1 text-[11px] text-[#b59f84]">文件已就绪：{currentFileName}</p>
      ) : null}
    </div>
  )
}
