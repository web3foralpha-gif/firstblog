import { put } from '@vercel/blob'
import { buildR2PublicUrl, deleteFromR2, generateKey, isR2Configured } from './r2'

type MediaFolder = 'images' | 'videos'
type UploadSource = Blob & { name?: string; type?: string }
type UploadOptions = {
  filename?: string
  contentType?: string
}

const BLOB_STORE_NAME = 'blog-media'

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function storeUploadedMedia(file: UploadSource, folder: MediaFolder, options: UploadOptions = {}) {
  const originalName = options.filename || file.name || `upload-${Date.now()}`
  const contentType = options.contentType || file.type || 'application/octet-stream'
  const key = generateKey(originalName, folder)

  // 优先使用 Vercel Blob
  if (isBlobConfigured()) {
    const blob = await put(key, file, {
      contentType,
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return {
      key,
      url: blob.url,
      filename: key.split('/').pop() || key,
    }
  }

  // 其次使用 R2
  if (isR2Configured()) {
    const { uploadToR2 } = await import('./r2')
    const body = Buffer.from(await file.arrayBuffer())
    await uploadToR2(key, body, contentType)
    return {
      key,
      url: buildR2PublicUrl(key),
      filename: key.split('/').pop() || key,
    }
  }

  throw new Error('请配置 BLOB_READ_WRITE_TOKEN 或 R2 环境变量')
}

export async function deleteStoredMedia(key: string) {
  // Vercel Blob 删除需要 token
  if (isBlobConfigured() && !key.startsWith('local/')) {
    // Vercel Blob 不支持直接删除，可以通过管理 API 删除
    console.log('Vercel Blob 删除需要通过管理 API:', key)
    return
  }

  // R2 删除
  await deleteFromR2(key)
}
