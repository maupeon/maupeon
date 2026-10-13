import { useEffect, useRef } from 'react'
import clsx from 'clsx'

// Fades an element up the first time it scrolls into view. The server-rendered
// markup is fully visible: the hidden state is only applied after hydration,
// and only to elements that start below the fold, so there is no flash and
// the page still reads with JavaScript disabled or reduced motion on.
export function Reveal({
  as: Component = 'div',
  delay = 0,
  className,
  style,
  children,
  ...props
}) {
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return

    element.classList.add('reveal-hidden')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        element.classList.remove('reveal-hidden')
        observer.disconnect()
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <Component
      ref={ref}
      className={clsx('reveal', className)}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </Component>
  )
}
