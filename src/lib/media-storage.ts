import { promises as fs } from 'fs'
import path from 'path'
import { buildR2PublicUrl, deleteFromR2, generateKey, isR2Configured, uploadToR2 } from './r2'

type MediaFolder = 'images' | 'videos'
type UploadSource = Blob & { name?: string; type?: string }
type UploadOptions = {
  filename?: string
  contentType?: string
}

const LOCAL_PREFIX = 'local/'

export async function storeUploadedMedia(file: UploadSource, folder: MediaFolder, options: UploadOptions = {}) {
  const originalName = options.filename || file.name || `upload-${Date.now()}`
  const contentType = options.contentType || file.type || 'application/octet-stream'
  const key = generateKey(originalName, folder)
  const body = Buffer.from(await file.arrayBuffer())

  if (isR2Configured()) {
    await uploadToR2(key, body, contentType)
    return {
      key,
      url: buildR2PublicUrl(key),
      filename: path.basename(key),
    }
  }

  const relativePath = path.posix.join('uploads', key)
  const diskPath = path.join(process.cwd(), 'public', ...relativePath.split('/'))
  await fs.mkdir(path.dirname(diskPath), { recursive: true })
  await fs.writeFile(diskPath, body)

  return {
    key: `${LOCAL_PREFIX}${relativePath}`,
    url: `/${relativePath}`,
    filename: path.basename(relativePath),
  }
}

export async function deleteStoredMedia(key: string) {
  if (key.startsWith(LOCAL_PREFIX)) {
    const relativePath = key.slice(LOCAL_PREFIX.length)
    const diskPath = path.join(process.cwd(), 'public', ...relativePath.split('/'))
    await fs.rm(diskPath, { force: true })
    return
  }

  await deleteFromR2(key)
}
