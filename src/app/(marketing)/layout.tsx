import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import "./marketing.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GTM Map - AI-Powered B2B Prospecting | Find Perfect Customers Fast",
    template: "%s | GTM Map",
  },
  description: "Find 50 qualified B2B prospects in 10 minutes with AI. GTM Map analyzes your ICP and identifies perfect-fit customers. Start free trial, no credit card required.",
  keywords: ["B2B prospecting", "AI lead generation", "sales leads", "ideal customer profile", "competitor analysis"],
  authors: [{ name: "GTM Map" }],
  creator: "GTM Map",
  publisher: "GTM Map",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://gtmmap.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gtmmap.com",
    title: "GTM Map - Find Your Perfect Customers in Minutes",
    description: "AI-powered B2B prospecting that actually works. 50 qualified leads in 10 minutes.",
    siteName: "GTM Map",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GTM Map - AI-Powered B2B Prospecting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GTM Map - AI-Powered B2B Prospecting",
    description: "Find 50 qualified prospects in 10 minutes with AI.",
    images: ["/twitter-card.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen flex flex-col ${inter.variable}`}>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
