import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { storeUploadedMedia } from '@/lib/media-storage'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  buildR2PublicUrl,
  generateKey,
  getPresignedUploadUrl,
  isR2Configured,
} from '@/lib/r2'

export const runtime = 'nodejs'

type UploadBlob = Blob & {
  name?: string
  type?: string
  size: number
}

type PreparedUpload = {
  strategy: 'direct'
  uploadUrl: string
  publicUrl: string
  key: string
  filename: string
  mimeType: string
  type: 'IMAGE' | 'VIDEO'
}

function inferContentType(filename: string, contentType: string) {
  if (contentType) return contentType

  const ext = filename.split('.').pop()?.toLowerCase()
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  }

  return ext ? byExt[ext] || '' : ''
}

function validateFile(contentType: string, size: number) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(contentType)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType)

  if (!isImage && !isVideo) {
    return { error: contentType ? `不支持的文件类型：${contentType}` : '无法识别文件类型，请换用常见图片或视频格式' }
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
  if (size > maxSize) {
    return { error: `文件过大，最大支持 ${isImage ? '10MB' : '200MB'}` }
  }

  return { isImage, isVideo }
}

function isUploadBlob(file: unknown): file is UploadBlob {
  return Boolean(file && typeof file === 'object' && 'arrayBuffer' in file)
}

async function createMediaRecord(input: {
  filename: string
  originalName: string
  url: string
  key: string
  size: number
  mimeType: string
  type: 'IMAGE' | 'VIDEO'
}) {
  const media = await prisma.media.create({ data: input })
  return NextResponse.json({
    url: input.url,
    mediaId: media.id,
    type: input.type,
  })
}

async function handleMultipart(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')

  if (!isUploadBlob(file)) {
    return NextResponse.json({ error: '缺少上传文件' }, { status: 400 })
  }

  const originalName = (file.name || 'upload').trim() || 'upload'
  const mimeType = inferContentType(originalName, file.type || '')
  const validation = validateFile(mimeType, file.size)
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const stored = await storeUploadedMedia(
    file,
    validation.isImage ? 'images' : 'videos',
    { filename: originalName, contentType: mimeType }
  )

  return createMediaRecord({
    filename: stored.filename,
    originalName,
    url: stored.url,
    key: stored.key,
    size: file.size,
    mimeType,
    type: validation.isImage ? 'IMAGE' : 'VIDEO',
  })
}

async function handlePrepareUpload(body: { filename?: string; contentType?: string; size?: number }) {
  const originalName = (body.filename || 'upload').trim() || 'upload'
  const mimeType = inferContentType(originalName, body.contentType || '')
  const size = Number(body.size || 0)
  const validation = validateFile(mimeType, size)

  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  if (!isR2Configured()) {
    return NextResponse.json({
      strategy: 'multipart',
      type: validation.isImage ? 'IMAGE' : 'VIDEO',
    })
  }

  const key = generateKey(originalName, validation.isImage ? 'images' : 'videos')
  const prepared: PreparedUpload = {
    strategy: 'direct',
    uploadUrl: await getPresignedUploadUrl(key, mimeType),
    publicUrl: buildR2PublicUrl(key),
    key,
    filename: key.split('/').pop() || key,
    mimeType,
    type: validation.isImage ? 'IMAGE' : 'VIDEO',
  }

  return NextResponse.json(prepared)
}

async function handleCompleteUpload(body: {
  key?: string
  filename?: string
  originalName?: string
  url?: string
  size?: number
  mimeType?: string
  type?: 'IMAGE' | 'VIDEO'
}) {
  if (!body.key || !body.filename || !body.originalName || !body.url || !body.mimeType || !body.type) {
    return NextResponse.json({ error: '上传确认参数不完整' }, { status: 400 })
  }

  return createMediaRecord({
    key: body.key,
    filename: body.filename,
    originalName: body.originalName,
    url: body.url,
    size: Number(body.size || 0),
    mimeType: body.mimeType,
    type: body.type,
  })
}

async function handleJson(req: NextRequest) {
  const body = await req.json()
  const mode = typeof body?.mode === 'string' ? body.mode : 'prepare'

  if (mode === 'prepare') {
    return handlePrepareUpload(body)
  }

  if (mode === 'complete') {
    return handleCompleteUpload(body)
  }

  return NextResponse.json({ error: '无效的上传模式' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const contentType = req.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      return await handleMultipart(req)
    }

    if (contentType.includes('application/json')) {
      return await handleJson(req)
    }

    return NextResponse.json({ error: '不支持的上传请求' }, { status: 400 })
  } catch (err) {
    console.error('[admin/upload] upload failed:', err)
    return NextResponse.json({ error: '上传失败，请稍后重试' }, { status: 500 })
  }
}
