import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Counter — Good things, paid for simply",
  description: "A small shop for useful digital goods. Pay with NIM in Nimiq Pay and download after verified payment.",
  metadataBase: new URL("https://counter-pay.theeagle2407.workers.dev"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Counter — Good things, paid for simply",
    description: "Discover useful digital goods. Pay in Nimiq Pay. Download after verified payment.",
    url: "https://counter-pay.theeagle2407.workers.dev",
    siteName: "Counter",
    images: [{ url: "/counter-preview.png", width: 1200, height: 630, alt: "Counter — a small shop for useful digital goods" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Counter — Good things, paid for simply",
    description: "Useful digital goods, paid for with NIM.",
    images: ["/counter-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
