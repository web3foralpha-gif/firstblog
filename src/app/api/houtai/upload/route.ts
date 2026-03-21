import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
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

type MediaKind = 'IMAGE' | 'VIDEO'

type UploadClientPayload = {
  pathname: string
  originalName: string
  mimeType: string
  size: number
  type: MediaKind
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

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
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
  let media
  try {
    media = await prisma.media.upsert({
      where: { key: input.key },
      update: input,
      create: input,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`媒体记录写入失败：${message}`)
  }

  return media
}

function mediaResponse(media: { id: string; url: string; type: string }) {
  return NextResponse.json({
    url: media.url,
    mediaId: media.id,
    type: media.type,
  })
}

function parseClientPayload(clientPayload: string | null): UploadClientPayload | null {
  if (!clientPayload) return null

  try {
    const parsed = JSON.parse(clientPayload) as Partial<UploadClientPayload>
    if (
      typeof parsed.pathname !== 'string' ||
      typeof parsed.originalName !== 'string' ||
      typeof parsed.mimeType !== 'string' ||
      typeof parsed.size !== 'number' ||
      (parsed.type !== 'IMAGE' && parsed.type !== 'VIDEO')
    ) {
      return null
    }

    return parsed as UploadClientPayload
  } catch {
    return null
  }
}

function isSafeUploadPath(pathname: string, type: MediaKind) {
  const expectedPrefix = type === 'IMAGE' ? 'images/' : 'videos/'
  return pathname.startsWith(expectedPrefix) && /^[a-z0-9/_\-.]+$/i.test(pathname)
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

  const media = await createMediaRecord({
    filename: stored.filename,
    originalName,
    url: stored.url,
    key: stored.key,
    size: file.size,
    mimeType,
    type: validation.isImage ? 'IMAGE' : 'VIDEO',
  })

  return mediaResponse(media)
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

  const media = await createMediaRecord({
    key: body.key,
    filename: body.filename,
    originalName: body.originalName,
    url: body.url,
    size: Number(body.size || 0),
    mimeType: body.mimeType,
    type: body.type,
  })

  return mediaResponse(media)
}

async function handleBlobClientUpload(req: NextRequest, body: HandleUploadBody) {
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: '站点未配置 Vercel Blob，请联系管理员' }, { status: 503 })
  }

  if (body.type === 'blob.generate-client-token') {
    const { error } = await requireAdmin()
    if (error) return error
  }

  const json = await handleUpload({
    request: req,
    body,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const parsedPayload = parseClientPayload(clientPayload)
      if (!parsedPayload) {
        throw new Error('上传参数无效')
      }

      if (parsedPayload.pathname !== pathname) {
        throw new Error('上传路径校验失败')
      }

      if (!isSafeUploadPath(pathname, parsedPayload.type)) {
        throw new Error('上传路径不安全')
      }

      const validation = validateFile(parsedPayload.mimeType, parsedPayload.size)
      if ('error' in validation) {
        throw new Error(validation.error)
      }

      return {
        allowedContentTypes: [parsedPayload.mimeType],
        maximumSizeInBytes: parsedPayload.type === 'IMAGE' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE,
        addRandomSuffix: false,
        allowOverwrite: false,
        tokenPayload: JSON.stringify(parsedPayload),
      }
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      const parsedPayload = parseClientPayload(tokenPayload ?? null)
      const type: MediaKind =
        parsedPayload?.type ||
        (blob.contentType.startsWith('video/') ? 'VIDEO' : 'IMAGE')

      await createMediaRecord({
        key: blob.pathname,
        filename: blob.pathname.split('/').pop() || blob.pathname,
        originalName: parsedPayload?.originalName || blob.pathname.split('/').pop() || 'upload',
        url: blob.url,
        size: parsedPayload?.size || 0,
        mimeType: blob.contentType || parsedPayload?.mimeType || 'application/octet-stream',
        type,
      })
    },
  })

  return NextResponse.json(json)
}

async function handleJson(req: NextRequest, body: unknown) {
  const eventType = typeof (body as { type?: unknown })?.type === 'string' ? (body as { type: string }).type : ''
  if (eventType === 'blob.generate-client-token' || eventType === 'blob.upload-completed') {
    return handleBlobClientUpload(req, body as HandleUploadBody)
  }

  const { error } = await requireAdmin()
  if (error) return error

  const mode = typeof (body as { mode?: unknown })?.mode === 'string' ? (body as { mode: string }).mode : ''

  if (mode === 'complete') {
    return handleCompleteUpload(body as Parameters<typeof handleCompleteUpload>[0])
  }

  if (mode === 'prepare') {
    const originalName = (body as { filename?: string })?.filename || 'upload'
    const mimeType = inferContentType(originalName, (body as { contentType?: string })?.contentType || '')
    const size = Number((body as { size?: number })?.size || 0)
    const validation = validateFile(mimeType, size)

    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (isBlobConfigured()) {
      return NextResponse.json({ error: '旧上传接口已停用，请刷新页面后重试' }, { status: 409 })
    }

    if (!isR2Configured()) {
      return NextResponse.json({
        strategy: 'multipart',
        type: validation.isImage ? 'IMAGE' : 'VIDEO',
      })
    }

    const key = generateKey(originalName, validation.isImage ? 'images' : 'videos')
    return NextResponse.json({
      strategy: 'direct',
      uploadUrl: await getPresignedUploadUrl(key, mimeType),
      publicUrl: buildR2PublicUrl(key),
      key,
      filename: key.split('/').pop() || key,
      mimeType,
      type: validation.isImage ? 'IMAGE' : 'VIDEO',
    })
  }

  return NextResponse.json({ error: '无效的上传请求' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const { error } = await requireAdmin()
      if (error) return error
      return await handleMultipart(req)
    }

    if (contentType.includes('application/json')) {
      const body = await req.json()
      return await handleJson(req, body)
    }

    return NextResponse.json({ error: '不支持的上传请求' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误'
    console.error('[admin/upload] upload failed:', err)
    return NextResponse.json({ error: `上传失败：${message}` }, { status: 500 })
  }
}
