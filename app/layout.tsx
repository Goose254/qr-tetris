import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Tetris",
  description: "Place les pièces du QR code façon Tetris !",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
