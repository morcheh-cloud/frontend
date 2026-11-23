// Bring a drill-in menu's current entry into sight, up/down only. The menus
// slide in sideways, and scrollIntoView would also scroll the box sideways
// to chase the moving entry, leaving the menu shifted after the animation.
export function scrollActiveIntoView(box: HTMLElement | null) {
  const el = box?.querySelector<HTMLElement>(
    "[data-sidebar=menu-button][data-active]",
  )
  if (!box || !el) return
  const b = box.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (r.top < b.top) box.scrollTop -= b.top - r.top
  else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom
  box.scrollLeft = 0
}
