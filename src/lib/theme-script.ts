// Shared by the root layout (server) and `@/components/theme` (client): a
// server component can't import plain values from a "use client" module.

export const THEME_KEY = "morcheh.theme"
export const DARK_QUERY = "(prefers-color-scheme: dark)"

// Browser chrome on phones (status bar): the page background of each theme.
export const themeColors = { light: "#ffffff", dark: "#111113" }

// Runs in <head> before the first paint, so a reload never flashes the wrong
// theme. Saved choice absent = follow the system.
export const themeScript = `(function(){try{var c=localStorage.getItem("${THEME_KEY}"),d=c==="dark"||(c!=="light"&&matchMedia("${DARK_QUERY}").matches),r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`
