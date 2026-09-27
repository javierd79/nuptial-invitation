import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { get as getBlob, put as putBlob } from '@vercel/blob'

const DATA_DIR = path.join(process.cwd(), 'data')

/**
 * Guest data lives in a plain JSON document. Two drivers, same interface:
 *
 * - `json`: a file under `data/`. Used for local dev and any host with a
 *   persistent filesystem.
 * - `blob`: Vercel Blob, part of the same Vercel project. Used automatically
 *   when `BLOB_READ_WRITE_TOKEN` is set, because Vercel's filesystem is
 *   read-only and rebuilt on every deploy.
 *
 * `DATA_DRIVER` forces one explicitly; otherwise blob wins if the token exists.
 */
type Driver = 'json' | 'blob'

function resolveDriver(): Driver {
  const configured = process.env.DATA_DRIVER
  if (configured === 'json' || configured === 'blob') return configured
  return process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'json'
}

export function getDriver(): Driver {
  return resolveDriver()
}

interface ReadResult {
  contents: string
  /** Blob ETag, used as an optimistic-concurrency token on write. */
  etag: string | null
}

/**
 * Serializes every read-modify-write per file so concurrent RSVP submissions
 * cannot clobber each other. Not reentrant: `mutateJson` calls the raw
 * read/write helpers instead of the locked public ones.
 */
const locks = new Map<string, Promise<unknown>>()

function withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(name) ?? Promise.resolve()
  const result = previous.then(task, task)
  locks.set(
    name,
    result.then(
      () => undefined,
      () => undefined,
    ),
  )
  return result
}

async function readText(name: string): Promise<ReadResult | null> {
  if (resolveDriver() === 'blob') {
    const result = await getBlob(name, { access: 'private', useCache: false })
    if (!result || result.statusCode !== 200) return null
    return {
      contents: await new Response(result.stream).text(),
      etag: result.blob.etag,
    }
  }

  try {
    return { contents: await readFile(path.join(DATA_DIR, name), 'utf8'), etag: null }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function writeText(name: string, contents: string, etag: string | null): Promise<void> {
  if (resolveDriver() === 'blob') {
    await putBlob(name, contents, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 0,
      // On serverless there is no shared memory, so the in-process lock does
      // not cover other instances. `ifMatch` makes the write fail loudly
      // instead of silently discarding a concurrent change.
      ...(etag ? { ifMatch: etag } : {}),
    })
    return
  }

  await mkdir(DATA_DIR, { recursive: true })
  const target = path.join(DATA_DIR, name)
  const temp = `${target}.${process.pid}.tmp`
  await writeFile(temp, contents, 'utf8')
  await rename(temp, target)
}

const invalidJson = (name: string) => new Error(`El archivo data/${name} no contiene JSON válido.`)

/**
 * Strict parse, for the read-modify-write path: if the file is corrupt we must
 * fail loudly rather than write the fallback over the real data.
 */
function parse<T>(name: string, raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw invalidJson(name)
  }
}

/**
 * Lenient parse, for read-only callers. A corrupt file should not turn every
 * guest link into a 500; the data is still on disk, so warn and fall back.
 */
function parseOrFallback<T>(name: string, raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    console.warn(`[data] ${name} no contiene JSON válido; se usa el valor por defecto.`)
    return fallback
  }
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  const result = await withLock(name, () => readText(name))
  return result === null ? fallback : parseOrFallback<T>(name, result.contents, fallback)
}

export async function writeJson<T>(name: string, value: T): Promise<void> {
  const contents = `${JSON.stringify(value, null, 2)}\n`
  await withLock(name, () => writeText(name, contents, null))
}

/**
 * Reads, hands the document to `mutate`, then writes the (possibly mutated)
 * document back — all while holding the file lock.
 */
export async function mutateJson<T>(
  name: string,
  fallback: T,
  mutate: (current: T) => void | Promise<void>,
): Promise<void> {
  await withLock(name, async () => {
    const result = await readText(name)
    const current = result === null ? fallback : parse<T>(name, result.contents)
    await mutate(current)
    await writeText(name, `${JSON.stringify(current, null, 2)}\n`, result?.etag ?? null)
  })
}
