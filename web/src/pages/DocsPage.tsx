import { useLanguage } from '../contexts/LanguageContext'
import { DocsLayout } from '../components/docs/DocsLayout'

export function DocsPage() {
  const { language } = useLanguage()
  return <DocsLayout language={language} />
}
