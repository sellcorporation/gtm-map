'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Zap, Shield, Users, CreditCard } from 'lucide-react';

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
      },
      {
        question: "How does the AI ICP extraction work?",
        answer: "Our AI analyzes your customer data to identify patterns across industry, company size, technology stack, geographic location, and other characteristics. It then creates a comprehensive ICP profile that we use to find similar companies. The more customer data you provide, the more accurate your ICP becomes."
      }
    ]
  },
  {
    id: 'pricing',
    title: 'Pricing',
    icon: CreditCard,
    questions: [
      {
        question: "What's included in the free trial?",
        answer: "The 7-day free trial includes full access to Pro features with 10 AI-powered prospect generations. You can upload your customer data, generate an ICP, find prospects, and identify decision makers. No credit card required to start your trial."
      },
      {
        question: "How does the AI generation limit work?",
        answer: "AI generations refer to the number of times you can run our AI prospecting process. Each generation can find 50+ prospects. Free plan has 0 generations after trial, Starter includes 50 per month, and Pro includes 200 per month. Additional generations can be purchased as needed."
      },
      {
        question: "Can I change my plan anytime?",
        answer: "Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing period. We also offer prorated billing for plan changes."
      },
      {
        question: "What happens if I exceed my AI generation limit?",
        answer: "If you exceed your monthly AI generation limit, you can purchase additional generations or upgrade your plan. We'll notify you when you're approaching your limit so you can plan accordingly. Your existing data and features remain accessible."
      },
      {
        question: "Do you offer enterprise pricing?",
        answer: "Yes, we offer custom enterprise pricing for teams with specific needs. Enterprise plans include dedicated account management, custom integrations, higher generation limits, and priority support. Contact our sales team to discuss enterprise options."
      }
    ]
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    questions: [
      {
        question: "How secure is my customer data?",
        answer: "Your data security is our top priority. We use bank-level encryption (AES-256) for data in transit and at rest. We're SOC 2 Type II compliant and follow GDPR and CCPA guidelines. Your customer data is never shared with third parties without your explicit consent."
      },
      {
        question: "Where is my data stored?",
        answer: "Your data is stored in secure, SOC 2 compliant data centers with 99.9% uptime. We use industry-leading cloud providers with multiple layers of security, including physical security, network security, and data encryption."
      },
      {
        question: "Can I delete my data?",
        answer: "Yes, you have full control over your data. You can delete individual prospect records, entire prospect lists, or your entire account at any time. We also provide data export options so you can download your data before deletion."
      },
      {
        question: "Do you comply with data protection regulations?",
        answer: "Yes, GTM Map is fully compliant with GDPR, CCPA, and other major data protection regulations. We provide data processing agreements (DPAs) for enterprise customers and maintain detailed audit logs of all data processing activities."
      }
    ]
  },
  {
    id: 'support',
    title: 'Support',
    icon: Users,
    questions: [
      {
        question: "What support options are available?",
        answer: "We offer multiple support channels: email support for all users, live chat for Pro users, and dedicated account management for enterprise customers. Our support team typically responds within 24 hours, with faster response times for Pro and enterprise users."
      },
      {
        question: "Do you offer training or onboarding?",
        answer: "Yes! We provide comprehensive onboarding for all new users, including video tutorials, documentation, and guided setup. Enterprise customers receive dedicated onboarding sessions with our customer success team to ensure optimal platform usage."
      },
      {
        question: "Is there a knowledge base or documentation?",
        answer: "Yes, we maintain a comprehensive knowledge base with step-by-step guides, video tutorials, and best practices. Our documentation covers everything from getting started to advanced features and integrations."
      },
      {
        question: "Can I schedule a demo?",
        answer: "Absolutely! We offer personalized demos where we can show you how GTM Map works with your specific industry and use case. You can schedule a demo through our contact page or by reaching out to our sales team."
      }
    ]
  }
];

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  const toggleItem = (categoryId: string, questionIndex: number) => {
    const key = `${categoryId}-${questionIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Questions & Answers
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Everything You Need to Know
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find answers to the most common questions about GTM Map. 
            Can't find what you're looking for? We're here to help.
          </p>
        </div>

        <div className="space-y-12">
          {faqCategories.map((category) => (
            <div key={category.id} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{category.title}</h3>
              </div>
              
              <div className="space-y-4">
                {category.questions.map((faq, index) => {
                  const isOpen = openItems[`${category.id}-${index}`];
                  return (
                    <div key={index} className="card border border-gray-200">
                      <button
                        onClick={() => toggleItem(category.id, index)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg font-semibold text-gray-900 pr-4">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4">
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-gray-600 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="card bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still Have Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Can't find the answer you're looking for? Our support team is here to help. 
              Get in touch and we'll get back to you within 24 hours.
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
