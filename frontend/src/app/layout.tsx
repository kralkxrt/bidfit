import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from 'next/font/google';
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "react-hot-toast";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700']
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600']
});

export const metadata: Metadata = {
  title: "BidWin - GovCon Proposal Management",
  description: "AI-powered past performance gap analysis for government contractors",
  icons: {
    icon: '/brand/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${sourceSerif.variable} antialiased`}
      >
        <AppLayout>{children}</AppLayout>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
