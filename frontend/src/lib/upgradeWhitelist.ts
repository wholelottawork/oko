import { isValidAddress } from './contacts'

export interface WhitelistEntry {
  name: string
  address: string
  label?: string
}

const DB_NAME = 'oko-upgrade-whitelist'
const STORE_NAME = 'entries'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'name' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getWhitelistEntries(): Promise<WhitelistEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as WhitelistEntry[])
    req.onerror = () => reject(req.error)
  })
}

export async function saveWhitelistEntry(entry: WhitelistEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteWhitelistEntry(name: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function resolveWhitelistedNames(message: string, entries: WhitelistEntry[]): string {
  let resolved = message
  for (const entry of entries) {
    const regex = new RegExp(`\\b${escapeRegex(entry.name)}\\b`, 'gi')
    resolved = resolved.replace(regex, entry.address)
  }
  return resolved
}

export function normalizeWhitelistName(name: string): string {
  return name.trim().toLowerCase()
}

export function validateWhitelistEntry(name: string, address: string): string | null {
  if (!name.trim()) return 'Name is required.'
  if (!address.trim()) return 'Address is required.'
  if (!isValidAddress(address.trim())) {
    return 'Invalid address. Must be a valid EVM (0x...) or Solana address.'
  }
  return null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
