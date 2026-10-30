import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

// Substitute for MDIO (DESIGN.md): small uppercase labels and eyebrows only.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: "500",
})

export const metadata: Metadata = {
  title: { default: "Morcheh", template: "%s | Morcheh" },
  description:
    "Manage and monitor your servers and the services running on them.",
  appleWebApp: { title: "Morcheh", statusBarStyle: "default" },
}

// Native-app shell on phones: draw under the notch (pages pad with
// env(safe-area-inset-*)) and let the keyboard shrink the layout. Zoom stays
// enabled for accessibility; inputs are 16px on mobile so iOS won't auto-zoom.
export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
