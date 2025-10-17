import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import SocialProof from "@/components/marketing/SocialProof";
import ProblemSection from "@/components/marketing/ProblemSection";
import SolutionSection from "@/components/marketing/SolutionSection";
import FeatureGrid from "@/components/marketing/FeatureGrid";
import VideoDemo from "@/components/marketing/VideoDemo";
import BenefitsSection from "@/components/marketing/BenefitsSection";
import Testimonials from "@/components/marketing/Testimonials";
import ComparisonTable from "@/components/marketing/ComparisonTable";
import PricingTeaser from "@/components/marketing/PricingTeaser";
import FAQServer from "@/components/marketing/FAQServer";
import CTASection from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "GTM Map - AI-Powered B2B Prospecting | Find Perfect Customers Fast",
  description: "Find 50 qualified B2B prospects in 10 minutes with AI. GTM Map analyzes your ICP and identifies perfect-fit customers. Start free trial, no credit card required.",
  keywords: ["B2B prospecting", "AI lead generation", "sales leads", "ideal customer profile", "competitor analysis"],
  openGraph: {
    title: "GTM Map - Find Your Perfect Customers in Minutes",
    description: "AI-powered B2B prospecting that actually works. 50 qualified leads in 10 minutes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GTM Map - AI-Powered B2B Prospecting",
      },
    ],
  },
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <ProblemSection />
      <SolutionSection />
      <FeatureGrid />
      <VideoDemo />
      <BenefitsSection />
      <Testimonials />
      <ComparisonTable />
      <PricingTeaser />
      <FAQServer />
      <CTASection />
    </>
  );
}