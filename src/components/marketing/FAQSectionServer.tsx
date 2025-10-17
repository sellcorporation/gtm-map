import { HelpCircle, Zap, Shield, Users, CreditCard } from 'lucide-react';

const faqCategories = [
  {
    id: 'general',
    title: 'General',
    icon: HelpCircle,
    questions: [
      {
        question: "What is GTM Map?",
        answer: "GTM Map is an AI-powered B2B prospecting platform that helps sales teams find qualified prospects by analyzing their existing customers to build an ideal customer profile (ICP), then finding similar companies across the market. Our AI can identify 50+ qualified prospects in under 10 minutes."
      },
      {
        question: "How does GTM Map work?",
        answer: "GTM Map works in 4 simple steps: 1) Upload your customer data (CSV or manual entry), 2) Our AI analyzes patterns to build your ICP, 3) We search millions of companies to find matches, 4) We identify decision makers with verified contact information. The entire process takes under 10 minutes."
      },
      {
        question: "What makes GTM Map different from other prospecting tools?",
        answer: "GTM Map uses AI to analyze your actual customers to build a perfect ICP, rather than relying on generic industry assumptions. We provide verified contact information for decision makers, not just company data. Our platform is designed specifically for B2B sales teams who need accurate, actionable prospect data."
      },
      {
        question: "Do I need any technical knowledge to use GTM Map?",
        answer: "No technical knowledge required! GTM Map is designed to be user-friendly. Simply upload your customer list (CSV format) or enter customers manually, and our AI does the rest. The interface is intuitive and designed for sales professionals, not technical users."
      }
    ]
  },
  {
    id: 'features',
    title: 'Features',
    icon: Zap,
    questions: [
      {
        question: "What data sources does GTM Map use?",
        answer: "GTM Map uses a comprehensive database of over 100 million companies worldwide, including public company information, technology stack data, employee counts, funding information, and more. We continuously update our database to ensure accuracy and freshness."
      },
      {
        question: "How accurate is the decision maker information?",
        answer: "Our decision maker identification has a 95% accuracy rate. We verify email addresses and phone numbers using multiple data sources and validation methods. We also provide LinkedIn profile matching and role verification to ensure you're reaching the right people."
      },
      {
        question: "Can I export my prospect data?",
        answer: "Yes! You can export your prospect lists to CSV format, which includes company information, decision maker contacts, ICP scores, and match percentages. This makes it easy to import into your CRM or use in other sales tools."
      },
      {
        question: "Does GTM Map integrate with my CRM?",
        answer: "GTM Map integrates with popular CRMs including Salesforce, HubSpot, and Pipedrive. We also support Zapier for connecting with 5000+ other applications. Custom integrations are available for enterprise customers."
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    questions: [
      {
        question: "Is my customer data secure?",
        answer: "Absolutely. We use enterprise-grade security including SOC 2 Type II compliance, AES-256 encryption, and secure data centers. Your data is never shared with third parties and is stored in encrypted databases with strict access controls."
      },
      {
        question: "Do you comply with GDPR?",
        answer: "Yes, we're fully GDPR compliant. You can request data deletion, export your data, and we have strict data processing agreements in place. We only process data you explicitly provide to us and never sell or share your information."
      },
      {
        question: "Where is my data stored?",
        answer: "All data is stored in secure AWS data centers in the EU. We use multiple layers of security including encryption at rest and in transit, regular security audits, and access controls. Your data never leaves our secure infrastructure."
      }
    ]
  },
  {
    id: 'pricing',
    title: 'Pricing & Billing',
    icon: CreditCard,
    questions: [
      {
        question: "What's included in the free trial?",
        answer: "The 7-day free trial includes full access to Pro features with 10 AI-powered prospect generations. No credit card required. You can upload your customer data, generate ICP profiles, and find qualified prospects just like Pro users."
      },
      {
        question: "Can I change plans anytime?",
        answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences. Downgrades will take effect at your next billing cycle."
      },
      {
        question: "What happens when I exceed my AI generation limit?",
        answer: "When you reach your monthly limit, you can either wait for the next month's reset or upgrade to a higher plan for more generations. We'll notify you when you're approaching your limit."
      },
      {
        question: "Do you offer annual discounts?",
        answer: "Currently, we only offer monthly billing. We're considering annual plans for the future, but for now, all plans are billed monthly."
      }
    ]
  },
  {
    id: 'support',
    title: 'Support',
    icon: Users,
    questions: [
      {
        question: "What support do you offer?",
        answer: "Free and Starter plans include email support with 24-hour response time. Pro plans include priority support with 4-hour response time and early access to new features. Enterprise customers get dedicated account managers."
      },
      {
        question: "Do you offer training or onboarding?",
        answer: "Yes! We provide comprehensive onboarding for all customers, including video tutorials, documentation, and live training sessions. Pro and Enterprise customers get personalized onboarding with our success team."
      },
      {
        question: "Can I schedule a demo?",
        answer: "Absolutely! You can schedule a personalized demo with our team to see GTM Map in action. We'll show you how to upload your data, generate prospects, and integrate with your existing tools."
      }
    ]
  }
];

export default function FAQSectionServer() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              FAQ
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about GTM Map&apos;s AI-powered B2B prospecting platform.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="max-w-4xl mx-auto">
          {faqCategories.map((category) => (
            <div key={category.id} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {category.title}
                </h3>
              </div>
              
              <div className="space-y-4">
                {category.questions.map((faq, index) => (
                  <div key={index} className="card">
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        {faq.question}
                      </h4>
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="text-center mt-16">
          <div className="card bg-white border-primary/20 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still Have Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Can&apos;t find what you&apos;re looking for? Our team is here to help. 
              Reach out and we&apos;ll get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn-primary">
                Contact Support
              </a>
              <a href="/demo" className="btn-secondary">
                Schedule Demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
