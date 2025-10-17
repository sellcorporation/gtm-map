import type { Metadata } from "next";
import PricingHero from "@/components/marketing/PricingHero";
import PricingCards from "@/components/marketing/PricingCards";
import PricingComparisonTable from "@/components/marketing/PricingComparisonTable";
import ValueProposition from "@/components/marketing/ValueProposition";
import Testimonials from "@/components/marketing/Testimonials";
import PricingFAQ from "@/components/marketing/PricingFAQ";
import CTASection from "@/components/marketing/CTASection";

export const metadata: Metadata = {
  title: "Pricing | GTM Map - Find Your Perfect Customers",
  description: "Simple, transparent pricing for AI-powered market intelligence. Start free, upgrade as you grow. £29/month for 50 prospects.",
  keywords: ["GTM Map pricing", "B2B prospecting pricing", "AI lead generation cost", "sales tool pricing"],
  openGraph: {
    title: "GTM Map Pricing",
    description: "Find qualified prospects 10x faster with AI",
    images: [
      {
        url: "/og-pricing.png",
        width: 1200,
        height: 630,
        alt: "GTM Map Pricing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GTM Map Pricing",
    description: "Simple, transparent pricing for AI-powered prospecting",
    images: ["/twitter-card-pricing.png"],
  },
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <>
      {/* Structured Data for Pricing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "GTM Map",
            "description": "AI-powered B2B prospecting platform",
            "offers": [
              {
                "@type": "Offer",
                "name": "Trial",
                "price": "0",
                "priceCurrency": "GBP",
                "description": "7-day free trial with 10 AI generations"
              },
              {
                "@type": "Offer", 
                "name": "Starter",
                "price": "29",
                "priceCurrency": "GBP",
                "description": "50 AI generations per month"
              },
              {
                "@type": "Offer",
                "name": "Pro", 
                "price": "99",
                "priceCurrency": "GBP",
                "description": "200 AI generations per month"
              }
            ]
          })
        }}
      />

      {/* Pricing Hero */}
      <PricingHero />

      {/* Pricing Cards */}
      <PricingCards />

      {/* Feature Comparison Table */}
      <PricingComparisonTable />

      {/* Value Proposition */}
      <ValueProposition />

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <PricingFAQ />

      {/* Final CTA */}
      <CTASection />
    </>
  );
}
