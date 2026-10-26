import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Work Updates",
  description: "Private daily work update tracker",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
