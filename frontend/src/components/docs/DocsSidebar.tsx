import { useState, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import type { FAQCategory } from '../../data/faqData'
import { t as translate, type Language } from '../../i18n/translations'

interface DocsSidebarProps {
  categories: FAQCategory[]
  activeItemId: string | null
  language: Language
  searchTerm: string
  onSearchChange: (term: string) => void
  onItemClick: (categoryId: string, itemId: string) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function DocsSidebar({
  categories,
  activeItemId,
  language,
  searchTerm,
  onSearchChange,
  onItemClick,
  mobileOpen,
  onMobileClose,
}: DocsSidebarProps) {
  const t = (key: string) => translate(key, language)
  const isSearching = searchTerm.trim().length > 0

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const first = categories[0]?.id
    return first ? new Set([first]) : new Set()
  })

  useEffect(() => {
    if (!activeItemId) return
    for (const cat of categories) {
      if (cat.items.some(item => item.id === activeItemId)) {
        setExpandedCategories(prev => {
          const next = new Set(prev)
          next.add(cat.id)
          return next
        })
        break
      }
    }
  }, [activeItemId, categories])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 pt-6 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={language === 'zh' ? '搜索文档...' : 'Search docs...'}
            className="w-full pl-9 pr-8 py-2 rounded-lg text-sm outline-none transition-all"
            style={{
              background: 'var(--surface-secondary)',
              border: '1px solid var(--surface-tertiary)',
              color: 'var(--text-primary)',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category groups */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-tertiary) transparent' }}>
        {categories.map(category => {
          const Icon = category.icon
          const isExpanded = isSearching || expandedCategories.has(category.id)

          return (
            <div key={category.id} className="mb-1">
              <button
                onClick={() => !isSearching && toggleCategory(category.id)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors group"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <span className="flex-1 text-xs font-semibold uppercase tracking-wider truncate">
                  {t(category.titleKey)}
                </span>
                {!isSearching && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                )}
              </button>

              {isExpanded && (
                <div className="ml-2 border-l" style={{ borderColor: 'var(--surface-tertiary)' }}>
                  {category.items.map(item => {
                    const isActive = activeItemId === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onItemClick(category.id, item.id)
                          onMobileClose()
                        }}
                        className="w-full text-left px-4 py-1.5 text-[13px] leading-snug transition-all block"
                        style={{
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          marginLeft: '-1px',
                          background: isActive ? 'var(--accent-primary-bg)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                      >
                        {t(item.questionKey)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 w-[260px] h-full overflow-hidden"
        style={{
          borderRight: '1px solid var(--surface-tertiary)',
          background: 'var(--surface-primary)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-0 bottom-0 w-[280px] flex flex-col"
            style={{ background: 'var(--surface-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-tertiary)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {language === 'zh' ? '文档' : 'Documentation'}
              </span>
              <button onClick={onMobileClose} style={{ color: 'var(--text-secondary)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
