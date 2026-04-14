import { useEffect, useRef } from 'react'
import './CustomCursor.css'

export function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Disable on touch/non-pointer devices
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let mx = 0, my = 0
    let rx = 0, ry = 0
    let frame: number
    let isHover = false

    const lerp = (a: number, b: number, n: number) => a + (b - a) * n

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }

    const tick = () => {
      rx = lerp(rx, mx, 0.11)
      ry = lerp(ry, my, 0.11)

      const dotSize  = 4          // half of 8px dot
      const ringSize = isHover ? 24 : 18  // half of 48px / 36px ring

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mx - dotSize}px, ${my - dotSize}px)`
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx - ringSize}px, ${ry - ringSize}px)`
      }

      frame = requestAnimationFrame(tick)
    }

    const onOver = (e: MouseEvent) => {
      const el = (e.target as Element).closest(
        'a, button, [role="button"], select, input, textarea, label, [tabindex]'
      )
      isHover = !!el
      ringRef.current?.classList.toggle('cursor-ring--hover', isHover)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    frame = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  )
}
