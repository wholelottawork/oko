import React from 'react'

interface DeepVoidBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
    className?: string
    disableAnimation?: boolean
    bgImage?: string
    /** When 'row', sidebar and main content sit side-by-side. Default 'col' stacks vertically. */
    contentDirection?: 'row' | 'col'
}

export function DeepVoidBackground({ children, className = '', disableAnimation = false, bgImage, style, contentDirection = 'col', ...props }: DeepVoidBackgroundProps) {
    const hasExplicitHeight = !!(style && typeof style === 'object' && 'height' in style)
    const contentFlexDir = contentDirection === 'row' ? 'flex-row' : 'flex-col'
    return (
        <div className={`relative w-full overflow-hidden flex flex-col ${hasExplicitHeight ? '' : 'min-h-screen'} ${className}`} style={{ background: 'var(--background)', color: 'var(--text-primary)', ...style }} {...props}>
            {/* Background image overlay */}
            {bgImage && (
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none"
                    style={{ backgroundImage: `url(${bgImage})` }}
                    aria-hidden
                />
            )}
            {/* Content Layer */}
            <div className={`relative z-10 flex-1 flex ${contentFlexDir} h-full w-full overflow-hidden`}>
                {children}
            </div>
        </div>
    )
}
