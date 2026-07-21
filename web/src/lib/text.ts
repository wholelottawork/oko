/**
 * Removes leading decorative emoji or symbols and their following delimiters.
 * This avoids duplicate icons when the component renders its own icon.
 */
export function stripLeadingIcons(input: string | undefined | null): string {
  if (!input) return ''
  let s = String(input)

  // 1) Remove common Emoji/symbol blocks (arrows, miscellaneous symbols, geometric shapes, emoticons, etc.)
  // Covers common ranges and is more compatible than using Unicode attribute classes.
  s = s.replace(
    /^[\s\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF\u1F000-\u1FAFF]+/u,
    ''
  )

  // 2) Remove possible remaining delimiters at the beginning (spaces, hyphens, colons, dots, etc.)
  s = s.replace(/^[\s\-:•·]+/, '')

  return s.trim()
}

export default { stripLeadingIcons }
