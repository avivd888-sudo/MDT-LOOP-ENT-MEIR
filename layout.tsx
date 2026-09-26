import type { Metadata, Viewport } from "next";
import { LANG_BOOT_SCRIPT } from "@/lib/i18n";
import { LangProvider } from "@/lib/i18n";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "MDT Loop · Head & Neck Oncology",
  description:
    "Multidisciplinary team coordination for head and neck cancer care at Meir Medical Center. Demonstration build with synthetic data.",
};

export const viewport: Viewport = {
  themeColor: "#101922",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * The document ships in the default language, and the script below
     * corrects it from the stored preference before the first paint. The
     * attributes still have to be here: a static export has no request to read
     * a cookie from, so the served HTML cannot know which language this reader
     * chose last time.
     */
    <html lang="he" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <LangProvider>
          <StoreProvider>{children}</StoreProvider>
        </LangProvider>
      </body>
    </html>
  );
}
