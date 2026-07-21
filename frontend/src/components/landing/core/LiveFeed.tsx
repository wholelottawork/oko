export default function LiveFeed() {
  return (
    <section
      className="py-8 border-y"
      style={{
        background: 'var(--surface-primary)',
        borderColor: 'var(--surface-tertiary)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-sm">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--binance-green)' }} />
            Self-hosted
          </div>
        </div>
      </div>
    </section>
  )
}
