import type { Metadata } from "next";
import HowItWorksHero from "@/components/marketing/HowItWorksHero";
import StepWalkthrough from "@/components/marketing/StepWalkthrough";
import VideoDemoSection from "@/components/marketing/VideoDemoSection";
import CTASection from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "How It Works | GTM Map - AI-Powered B2B Prospecting",
  description: "See how GTM Map works in 5 simple steps: add your website and customers, AI extracts your ICP, review and confirm, AI finds prospects, export and close deals.",
  keywords: ["how GTM Map works", "AI prospecting process", "B2B lead generation steps", "ICP extraction process"],
  openGraph: {
    title: "How GTM Map Works - 5 Simple Steps",
    description: "See how AI-powered prospecting transforms your customer acquisition process",
    images: [
      {
        url: "/og-how-it-works.png",
        width: 1200,
        height: 630,
        alt: "How GTM Map Works",
      },
    ],
  },
  alternates: {
    canonical: "/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <>
      {/* How It Works Hero */}
      <HowItWorksHero />

      {/* Step-by-Step Walkthrough */}
      <StepWalkthrough />

      {/* Video Demo Section */}
      <VideoDemoSection />

      {/* CTA Section */}
      <CTASection />
    </>
  );
}
