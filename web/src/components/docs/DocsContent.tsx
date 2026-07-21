import { useMemo } from 'react'
import { ChevronRight, ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import type { FAQCategory, FAQItem } from '../../data/faqData'
import { t as translate, type Language } from '../../i18n/translations'

interface DocsContentProps {
  categories: FAQCategory[]
  language: Language
  activeItemId: string | null
  onNavigate: (itemId: string) => void
}

interface FlatItem {
  category: FAQCategory
  item: FAQItem
  globalIndex: number
}

export function DocsContent({ categories, language, activeItemId, onNavigate }: DocsContentProps) {
  const t = (key: string) => translate(key, language)

  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = []
    let idx = 0
    for (const cat of categories) {
      for (const item of cat.items) {
        items.push({ category: cat, item, globalIndex: idx++ })
      }
    }
    return items
  }, [categories])

  const activeFlat = useMemo(() => {
    if (!activeItemId) return flatItems[0] ?? null
    return flatItems.find(f => f.item.id === activeItemId) ?? flatItems[0] ?? null
  }, [activeItemId, flatItems])

  if (!activeFlat) {
    return (
      <div className="flex-1 min-w-0 overflow-y-auto flex items-center justify-center">
        <div className="text-center px-6 py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {'No articles found'}
          </p>
        </div>
      </div>
    )
  }

  const { category, item } = activeFlat
  const flatIdx = activeFlat.globalIndex
  const prev = flatIdx > 0 ? flatItems[flatIdx - 1] : null
  const next = flatIdx < flatItems.length - 1 ? flatItems[flatIdx + 1] : null
  const Icon = category.icon
  const answerText = t(item.answerKey)

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-5 text-xs flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
          <span>{'Docs'}</span>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span>{t(category.titleKey)}</span>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span style={{ color: 'var(--text-secondary)' }}>{t(item.questionKey)}</span>
        </div>

        {/* Category badge */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-primary-bg)', border: '1px solid var(--accent-primary-border)' }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            {t(category.titleKey)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 leading-tight" style={{ color: 'var(--text-primary)' }}>
          {t(item.questionKey)}
        </h1>

        {/* Answer content */}
        <div
          className="rounded-xl p-5 sm:p-6 mb-8"
          style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)' }}
        >
          <FormattedAnswer text={answerText} />
        </div>

        {/* Prev / Next navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prev ? (
            <button
              onClick={() => onNavigate(prev.item.id)}
              className="flex items-start gap-3 p-4 rounded-xl text-left transition-all group"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary-border)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--surface-tertiary)' }}
            >
              <ArrowLeft className="w-4 h-4 mt-0.5 flex-shrink-0 transition-colors" style={{ color: 'var(--text-tertiary)' }} />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  {'Previous'}
                </div>
                <div className="text-sm font-medium truncate transition-colors group-hover:text-[var(--accent-primary)]" style={{ color: 'var(--text-primary)' }}>
                  {t(prev.item.questionKey)}
                </div>
              </div>
            </button>
          ) : <div />}

          {next ? (
            <button
              onClick={() => onNavigate(next.item.id)}
              className="flex items-start gap-3 p-4 rounded-xl text-right transition-all group sm:col-start-2"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--surface-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary-border)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--surface-tertiary)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  {'Next'}
                </div>
                <div className="text-sm font-medium truncate transition-colors group-hover:text-[var(--accent-primary)]" style={{ color: 'var(--text-primary)' }}>
                  {t(next.item.questionKey)}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 transition-colors" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          ) : <div />}
        </div>
      </div>
    </div>
  )
}

function FormattedAnswer({ text }: { text: string }) {
  const stepPattern = /(?:^|[\s;])(\d+)\)\s/g
  const hasSteps = stepPattern.test(text)

  if (!hasSteps) {
    const sentences = text.split(/(?<=[.!！?？])\s+/).filter(Boolean)
    return (
      <div className="text-sm sm:text-[15px] leading-relaxed space-y-3" style={{ color: 'var(--text-secondary)' }}>
        {sentences.map((s, i) => <p key={i}>{s}</p>)}
      </div>
    )
  }

  const parts: { type: 'text' | 'step'; content: string; num?: number }[] = []
  const stepRegex = /(\d+)\)\s/g
  let lastEnd = 0
  let match: RegExpExecArray | null

  const allMatches: { index: number; num: number }[] = []
  while ((match = stepRegex.exec(text)) !== null) {
    allMatches.push({ index: match.index, num: parseInt(match[1]) })
  }

  if (allMatches.length === 0) {
    return <p className="text-sm sm:text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
  }

  for (let i = 0; i < allMatches.length; i++) {
    const m = allMatches[i]

    if (m.index > lastEnd) {
      const before = text.slice(lastEnd, m.index).replace(/[;；:\s]+$/, '').trim()
      if (before) parts.push({ type: 'text', content: before })
    }

    const stepStart = m.index + `${m.num}) `.length
    const stepEnd = i < allMatches.length - 1 ? allMatches[i + 1].index : text.length
    const stepText = text.slice(stepStart, stepEnd).replace(/[;；]\s*$/, '').trim()
    parts.push({ type: 'step', content: stepText, num: m.num })
    lastEnd = stepEnd
  }

  if (lastEnd < text.length) {
    const trailing = text.slice(lastEnd).replace(/^[;；\s]+/, '').trim()
    if (trailing) parts.push({ type: 'text', content: trailing })
  }

  return (
    <div className="space-y-3">
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <p key={i} className="text-sm sm:text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {part.content}
          </p>
        ) : (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--surface-tertiary)' }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }}
            >
              {part.num}
            </span>
            <span className="text-sm sm:text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {part.content}
            </span>
          </div>
        )
      )}
    </div>
  )
}
