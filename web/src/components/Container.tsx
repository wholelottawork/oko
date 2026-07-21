import { ReactNode, CSSProperties } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'main' | 'header' | 'section'
  style?: CSSProperties
  /** Whether to fill the available width instead of applying a maximum width. */
  fluid?: boolean
  /** Whether to remove horizontal padding. */
  noPadding?: boolean
  /** Custom maximum-width class. Defaults to max-w-[1920px]. */
  maxWidthClass?: string
}

/**
 * Provides consistent maximum width and horizontal padding for page content.
 * - max-width: 1920px
 * - padding: 24px (mobile) -> 32px (tablet) -> 48px (desktop)
 */
export function Container({
  children,
  className = '',
  as: Component = 'div',
  style,
  fluid = false,
  noPadding = false,
  maxWidthClass = 'max-w-[1920px]',
}: ContainerProps) {
  const maxWidth = fluid ? 'w-full' : maxWidthClass
  const padding = noPadding ? 'px-0' : 'px-6 sm:px-8 lg:px-12'
  return (
    <Component
      className={`${maxWidth} mx-auto ${padding} ${className}`}
      style={style}
    >
      {children}
    </Component>
  )
}
