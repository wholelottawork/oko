import { notify } from './notify'

/**
 *  Copies text to the clipboard and displays a lightweight tooltip.
 */
export async function copyWithToast(text: string, successMsg = 'Copied to clipboard') {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Compatibility downgrade: Create temporary text field to perform copy
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    notify.success(successMsg)
    return true
  } catch (err) {
    console.error('Clipboard copy failed:', err)
    notify.error('Unable to copy to clipboard')
    return false
  }
}

export default { copyWithToast }
