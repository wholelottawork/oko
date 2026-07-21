export interface Contact {
  name: string     // human-readable nickname, e.g. "mom", "alice"
  address: string  // EVM 0x... or Solana base58 pubkey
  label?: string   // optional longer display label
}

const DB_NAME = 'oko-contacts'
const STORE_NAME = 'contacts'
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

export async function getContacts(): Promise<Contact[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as Contact[])
    req.onerror = () => reject(req.error)
  })
}

export async function saveContact(contact: Contact): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(contact)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteContact(name: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Replace contact names in a message with their wallet addresses.
 * Matches whole words, case-insensitive.
 * e.g. "Send 1 BNB to mom" → "Send 1 BNB to 0xABC..."
 */
export function resolveContacts(message: string, contacts: Contact[]): string {
  let resolved = message
  for (const contact of contacts) {
    // Match the contact name as a whole word, case-insensitive
    const regex = new RegExp(`\\b${escapeRegex(contact.name)}\\b`, 'gi')
    resolved = resolved.replace(regex, contact.address)
  }
  return resolved
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Basic validation: EVM address or Solana base58 pubkey */
export function isValidAddress(addr: string): boolean {
  // EVM: 0x followed by 40 hex chars
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) return true
  // Solana: base58, 32-44 chars
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return true
  return false
}
