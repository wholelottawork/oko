import { FAQLayout } from '../components/faq/FAQLayout'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * FAQ page.
 *
 * MainLayout provides the HeaderBar and Footer.
 *
 * FAQ behavior lives in child components:
 * - FAQLayout: Overall layout and search behavior.
 * - FAQSearchBar: Search input.
 * - FAQSidebar: Left-side table of contents.
 * - FAQContent: Main content area.
 *
 * FAQ data is defined in data/faqData.ts.
 */
export function FAQPage() {
  const { language } = useLanguage()

  return <FAQLayout language={language} />
}
