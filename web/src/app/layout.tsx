import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

// No `title`: the app renders the tab title itself (`DocumentTitle` in components/app.tsx), "Popcorn
// Batch" in this static page and then the screen's own, which a title here would overwrite on load.
export const metadata: Metadata = {
  description:
    "Popcorn Batch converts your media library to efficient formats in the background, verifies every file, and only then replaces the original.",
  applicationName: "Popcorn Batch",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The page colour of each theme; light and dark follow the system.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
