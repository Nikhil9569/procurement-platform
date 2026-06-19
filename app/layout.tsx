import type { Metadata } from"next";
import { Inter } from"next/font/google";
import"./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:"Procure·AI",
  description:"AI-powered procurement — find the right vendor in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${inter.className} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
