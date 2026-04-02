import { Storage } from '@google-cloud/storage'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const GCS_BUCKET = process.env.GCS_BUCKET_NAME

let _storage: Storage | null = null

function getStorage(): Storage {
  if (_storage) return _storage

  if (process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY) {
    _storage = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    })
  } else {
    // Cloud Run: Application Default Credentials
    _storage = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  }

  return _storage
}

/**
 * Upload a buffer to GCS and return its public URL.
 */
export async function uploadToGCS(
  buffer: Buffer,
  path: string,
  options?: {
    contentType?: string
    bucketName?: string
    cacheControl?: string
  }
): Promise<string> {
  const contentType = options?.contentType ?? 'application/octet-stream'
  const cacheControl = options?.cacheControl ?? 'public, max-age=3600'
  const bucketName = options?.bucketName ?? GCS_BUCKET
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is not set')
  }

  const storage = getStorage()
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(path)

  await file.save(buffer, {
    contentType,
    metadata: { cacheControl },
  })

  return `https://storage.googleapis.com/${bucketName}/${path}`
}

/**
 * Validate an uploaded image file (server-side).
 * Returns the file buffer if valid, or throws with a user-facing message.
 */
export async function validateImageUpload(
  file: File,
  opts?: { maxBytes?: number; allowedTypes?: string[] }
): Promise<Buffer> {
  const maxBytes = opts?.maxBytes ?? MAX_FILE_SIZE
  const allowedTypes = opts?.allowedTypes ?? ['image/webp', 'image/png', 'image/jpeg']

  if (!allowedTypes.includes(file.type)) {
    throw new UploadValidationError(
      `対応していない画像形式です (${file.type})。WebP, PNG, JPEG のみ対応しています。`
    )
  }

  if (file.size > maxBytes) {
    const mbLimit = Math.round(maxBytes / 1024 / 1024)
    throw new UploadValidationError(`ファイルサイズが ${mbLimit}MB を超えています。`)
  }

  return Buffer.from(await file.arrayBuffer())
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadValidationError'
  }
}
