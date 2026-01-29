import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from 'next/font/google';
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

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
  title: "BidMatch - GovCon Gap Analysis",
  description: "AI-powered past performance gap analysis for government contractors",
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
      </body>
    </html>
  );
}
