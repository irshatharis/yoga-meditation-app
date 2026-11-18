// Thin promise wrapper over IndexedDB. Everything the person creates or
// completes lives here, on their device only.

export type StoreName = 'kv' | 'poses' | 'practices' | 'logs' | 'blobs'

const DB_NAME = 'still'
const VERSION = 1

let opening: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      for (const name of ['poses', 'practices', 'logs', 'blobs'] as const) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('Storage is blocked by another open tab of still.'))
  })
  return opening
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

const result = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

export async function getAll<T>(store: Exclude<StoreName, 'kv'>): Promise<T[]> {
  const db = await open()
  return result(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>
}

export async function put<T extends { id: string }>(store: Exclude<StoreName, 'kv'>, value: T) {
  const db = await open()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value)
  await done(tx)
}

export async function putMany<T extends { id: string }>(store: Exclude<StoreName, 'kv'>, values: readonly T[]) {
  const db = await open()
  const tx = db.transaction(store, 'readwrite')
  for (const v of values) tx.objectStore(store).put(v)
  await done(tx)
}

export async function remove(store: Exclude<StoreName, 'kv'>, id: string) {
  const db = await open()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(id)
  await done(tx)
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  const db = await open()
  return result(db.transaction('kv').objectStore('kv').get(key)) as Promise<T | undefined>
}

export async function setKV(key: string, value: unknown) {
  const db = await open()
  const tx = db.transaction('kv', 'readwrite')
  if (value === undefined) tx.objectStore('kv').delete(key)
  else tx.objectStore('kv').put(value, key)
  await done(tx)
}

export async function getBlob(id: string): Promise<StoredBlob | undefined> {
  const db = await open()
  return result(db.transaction('blobs').objectStore('blobs').get(id)) as Promise<StoredBlob | undefined>
}

export type StoredBlob = { id: string; blob: Blob; mime: string; name: string }

export async function clearAll() {
  const db = await open()
  const names: StoreName[] = ['kv', 'poses', 'practices', 'logs', 'blobs']
  const tx = db.transaction(names, 'readwrite')
  for (const n of names) tx.objectStore(n).clear()
  await done(tx)
}

// Ask the browser not to evict this origin's data under storage pressure.
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
