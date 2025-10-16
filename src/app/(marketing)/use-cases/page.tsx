import type { Metadata } from "next";
import UseCasesHero from "@/components/marketing/UseCasesHero";
import RoleSection from "@/components/marketing/RoleSection";
import IndustrySection from "@/components/marketing/IndustrySection";
import CTASection from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "Use Cases | GTM Map - AI-Powered B2B Prospecting",
  description: "Discover how GTM Map helps founders, sales leaders, marketers, and growth teams find perfect customers across SaaS, B2B services, and agencies.",
  keywords: ["GTM Map use cases", "B2B prospecting for founders", "sales prospecting", "marketing prospecting", "SaaS lead generation"],
  openGraph: {
    title: "GTM Map Use Cases - For Every Role and Industry",
    description: "See how GTM Map helps different roles and industries find their perfect customers",
    images: [
      {
        url: "/og-use-cases.png",
        width: 1200,
        height: 630,
        alt: "GTM Map Use Cases",
      },
    ],
  },
  alternates: {
    canonical: "/use-cases",
  },
};

export default function UseCasesPage() {
  return (
    <>
      {/* Use Cases Hero */}
      <UseCasesHero />

      {/* Role-Specific Sections */}
      <RoleSection />

      {/* Industry Examples */}
      <IndustrySection />

      {/* CTA Section */}
      <CTASection />
    </>
  );
}
