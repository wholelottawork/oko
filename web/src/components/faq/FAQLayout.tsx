import { useState, useMemo } from 'react'
import { DeepVoidBackground } from '../DeepVoidBackground'
import { t, type Language } from '../../i18n/translations'
import { FAQSearchBar } from './FAQSearchBar'
import { FAQSidebar } from './FAQSidebar'
import { FAQContent } from './FAQContent'
import { faqCategories } from '../../data/faqData'
import type { FAQCategory } from '../../data/faqData'

interface FAQLayoutProps {
  language: Language
}

export function FAQLayout({ language }: FAQLayoutProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return faqCategories
    }

    const term = searchTerm.toLowerCase()
    const filtered: FAQCategory[] = []

    faqCategories.forEach((category) => {
      const matchingItems = category.items.filter((item) => {
        const question = t(item.questionKey, language).toLowerCase()
        const answer = t(item.answerKey, language).toLowerCase()
        return question.includes(term) || answer.includes(term)
      })

      if (matchingItems.length > 0) {
        filtered.push({
          ...category,
          items: matchingItems,
        })
      }
    })

    return filtered
  }, [searchTerm, language])

  const handleItemClick = (_categoryId: string, itemId: string) => {
    const element = document.getElementById(itemId)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <DeepVoidBackground className="py-6 pt-24" disableAnimation>
      <div className="w-full px-4 md:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-oko-text-main">
            {t('faqTitle', language)}
          </h1>
          <p className="text-lg mb-8 text-oko-text-muted">
            {t('faqSubtitle', language)}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <FAQSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder={
                'Search FAQ...'
              }
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FAQSidebar
              categories={filteredCategories}
              activeItemId={activeItemId}
              language={language}
              onItemClick={handleItemClick}
            />
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {filteredCategories.length > 0 ? (
              <FAQContent
                categories={filteredCategories}
                language={language}
                onActiveItemChange={setActiveItemId}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                  {'No matching questions found'}
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-6 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--oko-gold) 0%, var(--accent-primary-hover) 100%)',
                    color: 'var(--surface-primary)',
                  }}
                >
                  {'Clear Search'}
                </button>
              </div>
            )}
          </main>
        </div>

        {/* Contact Section */}
        <div
          className="mt-16 p-8 rounded-lg text-center"
          style={{
            background:
              'linear-gradient(135deg, var(--oko-border) 0%, rgba(252, 213, 53, 0.05) 100%)',
            border: '1px solid var(--accent-primary-border)',
          }}
        >
          <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {t('faqStillHaveQuestions', language)}
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t('faqContactUs', language)}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/oko-trading/okotrading"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--surface-tertiary)',
              }}
            >
              GitHub
            </a>
            <a
              href="https://t.me/okoagent_channel"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--oko-gold) 0%, var(--accent-primary-hover) 100%)',
                color: 'var(--surface-primary)',
              }}
            >
              {t('community', language)}
            </a>
          </div>
        </div>
      </div>
    </DeepVoidBackground>
  )
}
