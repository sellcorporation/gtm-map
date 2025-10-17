import { Check, X } from "lucide-react";

const features = [
  {
    category: "AI & Prospecting",
    items: [
      { name: "AI-powered prospect generation", free: false, starter: "50/month", pro: "200/month" },
      { name: "ICP profile generation", free: false, starter: true, pro: true },
      { name: "Decision maker identification", free: false, starter: true, pro: true },
      { name: "Market mapping & clustering", free: false, starter: true, pro: true },
      { name: "Competitor discovery", free: false, starter: true, pro: true },
    ]
  },
  {
    category: "Data Management",
    items: [
      { name: "CSV bulk import", free: true, starter: true, pro: true },
      { name: "Export to CSV", free: true, starter: true, pro: true },
      { name: "Manual prospect addition", free: true, starter: true, pro: true },
      { name: "Status tracking & pipeline", free: true, starter: true, pro: true },
      { name: "Basic CRM functionality", free: true, starter: true, pro: true },
    ]
  },
  {
    category: "Advanced Features",
    items: [
      { name: "Advanced filtering & sorting", free: false, starter: false, pro: true },
      { name: "CRM integrations", free: false, starter: false, pro: true },
      { name: "Email template generation", free: false, starter: false, pro: true },
      { name: "Priority support", free: false, starter: false, pro: true },
      { name: "Early access to features", free: false, starter: false, pro: true },
    ]
  },
  {
    category: "Support & Limits",
    items: [
      { name: "Email support", free: true, starter: true, pro: true },
      { name: "Priority support", free: false, starter: false, pro: true },
      { name: "Dedicated account manager", free: false, starter: false, pro: false },
      { name: "Custom integrations", free: false, starter: false, pro: false },
    ]
  }
];

export default function PricingComparisonTable() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Compare Plans
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            See Exactly What&apos;s Included
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Compare features across all plans to find the perfect fit for your business needs.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">Features</h3>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Free</h3>
                <p className="text-sm text-gray-600">£0/month</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Starter</h3>
                <p className="text-sm text-gray-600">£29/month</p>
                <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
                <p className="text-sm text-gray-600">£99/month</p>
              </div>
            </div>

            {/* Feature Categories */}
            {features.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {category.category}
                </h4>
                
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="grid grid-cols-4 gap-4 items-center py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      
                      {/* Free Plan */}
                      <div className="text-center">
                        {item.free === true ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : item.free === false ? (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        ) : (
                          <span className="text-sm text-gray-600">{item.free}</span>
                        )}
                      </div>
                      
                      {/* Starter Plan */}
                      <div className="text-center">
                        {item.starter === true ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : item.starter === false ? (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        ) : (
                          <span className="text-sm text-gray-600">{item.starter}</span>
                        )}
                      </div>
                      
                      {/* Pro Plan */}
                      <div className="text-center">
                        {item.pro === true ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : item.pro === false ? (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        ) : (
                          <span className="text-sm text-gray-600">{item.pro}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="card bg-primary/5 border-primary/20 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-600 mb-6">
              Start with our 7-day free trial. No credit card required. 
              Experience the power of AI-driven prospecting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/signup" className="btn-primary">
                Start Free Trial
              </a>
              <a href="/contact" className="btn-secondary">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}