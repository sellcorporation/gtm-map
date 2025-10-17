export default function FAQServer() {
  const faqs = [
    {
      question: "How accurate is GTM Map's AI?",
      answer: "Our AI achieves 95% accuracy in identifying prospects that match your ICP. We use advanced machine learning models trained on millions of B2B companies to ensure high-quality results."
    },
    {
      question: "How long does it take to get results?",
      answer: "Most searches complete within 10 minutes. The AI analyzes your customer base, extracts your ICP, and finds matching prospects automatically. You'll receive a detailed report with contact information."
    },
    {
      question: "What if I don't have existing customers?",
      answer: "No problem! You can start with just your website URL. Our AI will analyze your website content, industry, and business model to create an initial ICP, then refine it as you add customers."
    },
    {
      question: "Can I export the data to my CRM?",
      answer: "Yes! GTM Map supports CSV export and we're working on direct integrations with popular CRMs like HubSpot, Salesforce, and Pipedrive. Contact us if you need a specific integration."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! We offer a 7-day free trial with no credit card required. You can test all features and find up to 50 prospects during your trial period."
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about GTM Map&apos;s AI-powered prospecting.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="card bg-gray-50 border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our team is here to help. Contact us and we&apos;ll get back to you within 24 hours.
            </p>
            <a
              href="/contact"
              className="btn-primary"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
