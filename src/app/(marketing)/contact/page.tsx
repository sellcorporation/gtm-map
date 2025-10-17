import type { Metadata } from "next";
import ContactHero from "@/components/marketing/ContactHero";
import ContactForm from "@/components/marketing/ContactForm";
import ContactInfo from "@/components/marketing/ContactInfo";

export const metadata: Metadata = {
  title: "Contact Us | GTM Map - AI-Powered B2B Prospecting",
  description: "Get in touch with the GTM Map team. Questions about pricing, features, or need help getting started? We're here to help.",
  keywords: ["contact GTM Map", "support", "help", "questions", "B2B prospecting support"],
  openGraph: {
    title: "Contact GTM Map - We're Here to Help",
    description: "Questions about GTM Map? We're here to help you find your perfect customers.",
    images: [
      {
        url: "/og-contact.png",
        width: 1200,
        height: 630,
        alt: "Contact GTM Map",
      },
    ],
  },
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Contact Hero */}
      <ContactHero />

      {/* Contact Form */}
      <ContactForm />

      {/* Contact Info */}
      <ContactInfo />
    </>
  );
}

