import type { Metadata } from "next";
import AboutHero from "@/components/marketing/AboutHero";
import MissionSection from "@/components/marketing/MissionSection";
import ValuesSection from "@/components/marketing/ValuesSection";
import CTASection from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "About Us | GTM Map - AI-Powered B2B Prospecting",
  description: "Learn about GTM Map's mission to help founders find their perfect customers. We're building AI-powered tools to transform B2B prospecting.",
  keywords: ["about GTM Map", "company story", "mission", "B2B prospecting company"],
  openGraph: {
    title: "About GTM Map - Helping Founders Find Perfect Customers",
    description: "Our mission is to help founders find their perfect customers through AI-powered prospecting",
    images: [
      {
        url: "/og-about.png",
        width: 1200,
        height: 630,
        alt: "About GTM Map",
      },
    ],
  },
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      {/* About Hero */}
      <AboutHero />

      {/* Mission Section */}
      <MissionSection />

      {/* Values Section */}
      <ValuesSection />

      {/* CTA Section */}
      <CTASection />
    </>
  );
}
