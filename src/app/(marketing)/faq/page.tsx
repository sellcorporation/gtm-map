import type { Metadata } from "next";
import FAQHero from "@/components/marketing/FAQHero";
import FAQSectionServer from "@/components/marketing/FAQSectionServer";
import CTASection from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "FAQ | GTM Map - AI-Powered B2B Prospecting",
  description: "Find answers to common questions about GTM Map's AI-powered B2B prospecting platform. Learn about features, pricing, integrations, and more.",
  keywords: ["GTM Map FAQ", "B2B prospecting questions", "AI lead generation help", "sales prospecting support"],
  openGraph: {
    title: "GTM Map FAQ - Frequently Asked Questions",
    description: "Get answers to your questions about AI-powered B2B prospecting with GTM Map",
    images: [
      {
        url: "/og-faq.png",
        width: 1200,
        height: 630,
        alt: "GTM Map FAQ",
      },
    ],
  },
  alternates: {
    canonical: "/faq",
  },
};

export default function FAQPage() {
  return (
    <>
      {/* FAQ Hero */}
      <FAQHero />

      {/* FAQ Section */}
      <FAQSectionServer />

      {/* CTA Section */}
      <CTASection />
    </>
  );
}
