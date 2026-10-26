import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Work Updates",
  description: "Private daily work update tracker",
  icons: {
    icon: [{ url: "/logo-sm.png", type: "image/png", sizes: "500x500" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
