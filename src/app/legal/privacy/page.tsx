import type { Metadata } from "next";
import LegalPage from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | GTM Map - AI-Powered B2B Prospecting",
  description: "GTM Map Privacy Policy - Learn how we collect, use, and protect your personal information and data.",
  keywords: ["privacy policy", "data protection", "GDPR", "GTM Map privacy"],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/legal/privacy",
  },
};

export default function PrivacyPolicyPage() {
  const content = `
# Privacy Policy

**Last updated: October 14, 2025**

## Introduction

GTM Map ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered B2B prospecting platform.

## Information We Collect

### Information You Provide
- **Account Information**: Name, email address, password
- **Company Information**: Website URL, customer lists, company details
- **Usage Data**: How you interact with our platform
- **Communication Data**: Messages you send to our support team

### Information We Collect Automatically
- **Usage Analytics**: Pages visited, features used, time spent
- **Technical Data**: IP address, browser type, device information
- **Cookies**: Essential cookies for functionality and analytics

## How We Use Your Information

We use your information to:
- Provide and improve our AI-powered prospecting services
- Process your ICP extraction and prospect generation requests
- Communicate with you about your account and our services
- Analyze usage patterns to improve our platform
- Comply with legal obligations

## Data Storage and Security

- **Location**: Your data is stored in EU servers
- **Encryption**: All data is encrypted in transit and at rest
- **Access**: Only authorized personnel can access your data
- **Retention**: We retain your data only as long as necessary

## Data Sharing

We do not sell, trade, or rent your personal information to third parties. We may share your information only in these circumstances:
- With your explicit consent
- To comply with legal obligations
- To protect our rights and prevent fraud
- With service providers who assist in our operations (under strict confidentiality agreements)

## Your Rights

Under GDPR and other applicable laws, you have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data
- Restrict processing
- Data portability
- Object to processing

To exercise these rights, contact us at privacy@gtmmap.com.

## Cookies

We use essential cookies for:
- User authentication
- Platform functionality
- Analytics (anonymized)

You can control cookies through your browser settings.

## Third-Party Services

We may use third-party services for:
- Analytics (Google Analytics)
- Email delivery
- Payment processing (Stripe)

These services have their own privacy policies.

## International Transfers

Your data may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards are in place.

## Children's Privacy

Our service is not intended for children under 16. We do not knowingly collect information from children.

## Changes to This Policy

We may update this Privacy Policy. We will notify you of significant changes via email or platform notification.

## Contact Us

If you have questions about this Privacy Policy, contact us at:
- Email: privacy@gtmmap.com
- Address: GTM Map, London, United Kingdom

## Data Protection Officer

For GDPR-related inquiries, contact our Data Protection Officer at dpo@gtmmap.com.
  `;

  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="October 14, 2025"
      content={content}
    />
  );
}

