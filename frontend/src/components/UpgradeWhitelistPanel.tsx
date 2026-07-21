import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Shield, Trash2, UserPlus, X } from 'lucide-react'
import {
  deleteWhitelistEntry,
  getWhitelistEntries,
  normalizeWhitelistName,
  saveWhitelistEntry,
  type WhitelistEntry,
  validateWhitelistEntry,
} from '../lib/upgradeWhitelist'

interface UpgradeWhitelistPanelProps {
  open: boolean
  onClose: () => void
  onEntriesChange: (entries: WhitelistEntry[]) => void
}

export function UpgradeWhitelistPanel({
  open,
  onClose,
  onEntriesChange,
}: UpgradeWhitelistPanelProps) {
  const [entries, setEntries] = useState<WhitelistEntry[]>([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    getWhitelistEntries().then((items) => {
      setEntries(items)
      onEntriesChange(items)
    })
    setTimeout(() => nameRef.current?.focus(), 80)
  }, [onEntriesChange, open])

  const refresh = async () => {
    const items = await getWhitelistEntries()
    setEntries(items)
    onEntriesChange(items)
  }

  const handleAdd = async () => {
    setError('')
    const validation = validateWhitelistEntry(name, address)
    if (validation) {
      setError(validation)
      return
    }
    await saveWhitelistEntry({
      name: normalizeWhitelistName(name),
      address: address.trim(),
      label: label.trim() || undefined,
    })
    setName('')
    setAddress('')
    setLabel('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
    await refresh()
    nameRef.current?.focus()
  }

  const handleDelete = async (entryName: string) => {
    await deleteWhitelistEntry(entryName)
    await refresh()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          background: 'var(--surface-primary)',
          border: '1px solid var(--panel-border)',
          maxHeight: '88vh',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--panel-border)' }}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Transfer Whitelist
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Only names saved here will be resolved inside Upgrade actions. This keeps natural-language transfers restricted to approved destinations.
          </p>
          <div className="flex flex-col gap-2">
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Name (e.g. mom)"
              className="text-sm px-3 py-2 rounded-lg outline-none min-w-0"
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-primary)',
              }}
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Optional label (e.g. Mother's Ethereum wallet)"
              className="text-sm px-3 py-2 rounded-lg outline-none min-w-0"
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex gap-2">
              <input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Wallet address (0x...)"
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none font-mono min-w-0"
                style={{
                  background: 'var(--surface-secondary)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'var(--panel-border)'}`,
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 transition-all"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                {saved ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {saved ? 'Saved' : 'Add'}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: 'rgba(239,68,68,0.9)' }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {entries.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No approved destinations yet.
            </div>
          ) : (
            <ul>
              {entries.map((entry, index) => (
                <li
                  key={entry.name}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{
                    borderBottom: index < entries.length - 1 ? '1px solid var(--panel-border)' : 'none',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' }}
                  >
                    {entry.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {entry.name}
                    </div>
                    {entry.label ? (
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {entry.label}
                      </div>
                    ) : null}
                    <div className="text-[11px] font-mono truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {entry.address}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.name)}
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Delete whitelist entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="px-5 py-3 text-xs shrink-0"
          style={{ borderTop: '1px solid var(--panel-border)', color: 'var(--text-tertiary)' }}
        >
          Whitelist entries are stored locally in your browser only.
        </div>
      </div>
    </div>
  )
}
