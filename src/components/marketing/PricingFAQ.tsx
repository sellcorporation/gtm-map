import { ChevronDown } from "lucide-react";

const faqs = [
  {
    category: "Pricing & Plans",
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
    category: "Features & Usage",
    questions: [
      {
        question: "How accurate is the AI prospect generation?",
        answer: "Our AI achieves 95% accuracy in identifying qualified prospects that match your ICP. We continuously improve our algorithms based on customer feedback and market data to maintain this high accuracy rate."
      },
      {
        question: "What data sources does GTM Map use?",
        answer: "We use multiple data sources including company databases, LinkedIn profiles, industry reports, and public information. All data is legally obtained and GDPR compliant."
      },
      {
        question: "Can I export my prospect data?",
        answer: "Yes! You can export all your prospect data to CSV format at any time. This includes company information, decision maker details, contact information, and any custom fields you've added."
      },
      {
        question: "How many companies can I track?",
        answer: "There's no limit on the number of companies you can track in any plan. You can import as many companies as you need and organize them with our status tracking and pipeline features."
      }
    ]
  },
  {
    category: "Security & Privacy",
    questions: [
      {
        question: "Is my customer data secure?",
        answer: "Absolutely. We're SOC 2 Type II compliant and use bank-level encryption (AES-256) for all data. Your customer data is never shared with third parties and is stored in secure, encrypted databases."
      },
      {
        question: "Do you comply with GDPR?",
        answer: "Yes, we're fully GDPR compliant. You can request data deletion, export your data, and we have strict data processing agreements in place. We only process data you explicitly provide to us."
      },
      {
        question: "Where is my data stored?",
        answer: "All data is stored in secure AWS data centers in the EU. We use multiple layers of security including encryption at rest and in transit, regular security audits, and access controls."
      }
    ]
  },
  {
    category: "Support & Billing",
    questions: [
      {
        question: "What support do you offer?",
        answer: "Free and Starter plans include email support with 24-hour response time. Pro plans include priority support with 4-hour response time and early access to new features."
      },
      {
        question: "Can I cancel anytime?",
        answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. You'll continue to have access until the end of your current billing period."
      },
      {
        question: "Do you offer refunds?",
        answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied with GTM Map, contact us within 30 days for a full refund, no questions asked."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. All payments are processed securely through Stripe."
      }
    ]
  }
];

export default function PricingFAQ() {
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
            Everything you need to know about GTM Map pricing, features, and how it works.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="max-w-4xl mx-auto">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                {category.category}
              </h3>
              
              <div className="space-y-4">
                {category.questions.map((faq, questionIndex) => (
                  <div key={questionIndex} className="card">
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
              Can't find what you're looking for? Our team is here to help. 
              Reach out and we'll get back to you within 24 hours.
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