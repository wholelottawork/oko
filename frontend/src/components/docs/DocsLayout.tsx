import { useState, useMemo, useCallback } from 'react'
import { Menu, BookOpen } from 'lucide-react'
import { faqCategories } from '../../data/faqData'
import { t as translate, type Language } from '../../i18n/translations'
import { DocsSidebar } from './DocsSidebar'
import { DocsContent } from './DocsContent'

interface DocsLayoutProps {
  language: Language
}

export function DocsLayout({ language }: DocsLayoutProps) {
  const t = (key: string) => translate(key, language)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeItemId, setActiveItemId] = useState<string | null>(
    faqCategories[0]?.items[0]?.id ?? null
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return faqCategories
    const lower = searchTerm.toLowerCase()
    return faqCategories
      .map(category => ({
        ...category,
        items: category.items.filter(item => {
          const q = t(item.questionKey).toLowerCase()
          const a = t(item.answerKey).toLowerCase()
          return q.includes(lower) || a.includes(lower)
        }),
      }))
      .filter(category => category.items.length > 0)
  }, [searchTerm, language])

  const handleItemClick = useCallback((_categoryId: string, itemId: string) => {
    setActiveItemId(itemId)
  }, [])

  const handleNavigate = useCallback((itemId: string) => {
    setActiveItemId(itemId)
  }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)', background: 'var(--background)' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 sm:px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--surface-tertiary)', background: 'var(--surface-primary)' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface-secondary)' }}
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
        <BookOpen className="w-5 h-5 hidden sm:block" style={{ color: 'var(--accent-primary)' }} />
        <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {language === 'zh' ? '文档' : 'Documentation'}
        </h1>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }}>
          {filteredCategories.reduce((sum, c) => sum + c.items.length, 0)} {language === 'zh' ? '篇' : 'articles'}
        </span>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <DocsSidebar
          categories={filteredCategories}
          activeItemId={activeItemId}
          language={language}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onItemClick={handleItemClick}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <DocsContent
          categories={filteredCategories}
          language={language}
          activeItemId={activeItemId}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  )
}
