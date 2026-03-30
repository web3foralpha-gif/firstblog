import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let r2Client: S3Client | null = null

function hasRealValue(value: string | undefined) {
  if (!value) return false
  return !value.includes('your-') && !value.includes('xxxxxxxx')
}

export function isR2Configured() {
  return Boolean(
    hasRealValue(process.env.R2_ACCOUNT_ID) &&
    hasRealValue(process.env.R2_ACCESS_KEY_ID) &&
    hasRealValue(process.env.R2_SECRET_ACCESS_KEY) &&
    hasRealValue(process.env.R2_BUCKET_NAME) &&
    hasRealValue(process.env.R2_PUBLIC_URL)
  )
}

function getR2Client() {
  if (!isR2Configured()) {
    throw new Error('R2 未配置完整，已切换为本地上传模式')
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }

  return r2Client
}

export function getR2Bucket() {
  if (!process.env.R2_BUCKET_NAME) {
    throw new Error('未设置 R2_BUCKET_NAME')
  }
  return process.env.R2_BUCKET_NAME
}

export function buildR2PublicUrl(key: string) {
  if (!process.env.R2_PUBLIC_URL) {
    throw new Error('未设置 R2_PUBLIC_URL')
  }

  return `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

// 生成唯一文件路径
export function generateKey(originalName: string, folder: 'images' | 'videos' | 'audios'): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || ''
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `${folder}/${timestamp}-${random}.${ext}`
}

// 获取预签名上传 URL（客户端直传，不经过服务器）
export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    ContentType: contentType,
  })
  // URL 有效期 5 分钟
  const url = await getSignedUrl(getR2Client(), command, { expiresIn: 300 })
  return url
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  await getR2Client().send(new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

// 删除文件
export async function deleteFromR2(key: string) {
  if (!isR2Configured()) return
  await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }))
}

// 文件类型验证
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
]
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024 // 50MB
