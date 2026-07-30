import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(useGSAP)

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)"

export function staggerReveal(targets: gsap.TweenTarget) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  gsap.from(targets, {
    opacity: 0,
    y: 8,
    scale: 0.97,
    duration: 0.3,
    ease: EASE,
    stagger: 0.06,
  })
}

export { useGSAP }
