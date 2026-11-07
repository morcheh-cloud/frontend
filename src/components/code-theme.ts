"use client"

import { syntaxHighlighting } from "@codemirror/language"
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark"
import { EditorView } from "@uiw/react-codemirror"

import { useTheme } from "./theme"

// CodeMirror's surface on our tokens in dark mode, with One Dark's syntax
// colors (the default highlight style is made for white). Each editor's own
// theme (gutters, selection) already uses tokens, so it follows by itself.
const dark = [
  EditorView.theme(
    {
      "&": {
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      },
      ".cm-content": { caretColor: "var(--foreground)" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
      ".cm-tooltip": {
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
      },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--accent)",
        color: "var(--accent-foreground)",
      },
      ".cm-searchMatch": {
        backgroundColor:
          "color-mix(in oklab, var(--color-warning) 25%, transparent)",
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor:
          "color-mix(in oklab, var(--color-brand) 35%, transparent)",
      },
      "&.cm-focused .cm-matchingBracket": {
        backgroundColor:
          "color-mix(in oklab, var(--color-brand) 30%, transparent)",
      },
      ".cm-panels": { color: "var(--foreground)" },
    },
    { dark: true },
  ),
  syntaxHighlighting(oneDarkHighlightStyle),
]

/** The `theme` prop for `<CodeMirror>`: follows the panel's theme. */
export function useCodeTheme() {
  return useTheme().resolved === "dark" ? dark : "light"
}
