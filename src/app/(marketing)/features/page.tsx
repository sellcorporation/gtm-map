import type { Metadata } from "next";
import FeaturesHero from "@/components/marketing/FeaturesHero";
import FeatureDeepDive from "@/components/marketing/FeatureDeepDive";
import IntegrationSection from "@/components/marketing/IntegrationSection";
import CTASection from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "Features | GTM Map - AI-Powered B2B Prospecting",
  description: "Discover powerful features that accelerate your growth: AI ICP extraction, instant prospect generation, competitor discovery, decision maker identification, and more.",
  keywords: ["GTM Map features", "AI prospecting features", "B2B lead generation tools", "competitor analysis", "ICP extraction"],
  openGraph: {
    title: "GTM Map Features - AI-Powered Prospecting Tools",
    description: "Powerful features to accelerate your growth and find perfect customers",
    images: [
      {
        url: "/og-features.png",
        width: 1200,
        height: 630,
        alt: "GTM Map Features",
      },
    ],
  },
  alternates: {
    canonical: "/features",
  },
};

export default function FeaturesPage() {
  return (
    <>
      {/* Features Hero */}
      <FeaturesHero />

      {/* Feature Deep Dives */}
      <FeatureDeepDive />

      {/* Integration Section */}
      <IntegrationSection />

      {/* CTA Section */}
      <CTASection />
    </>
  );
}
