import Link from "next/link";
import { Check, X, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    badge: null,
    cta: "Start Free",
    ctaVariant: "outline" as const,
    popular: false,
    features: [
      { name: "AI-powered generations", value: "0 per month", included: false, note: "After trial ends" },
      { name: "Status tracking & pipeline", value: true, included: true },
      { name: "Import companies to track", value: true, included: true },
      { name: "Manual decision maker addition", value: true, included: true },
      { name: "Basic CRM functionality", value: true, included: true },
      { name: "Export to CSV", value: true, included: true },
      { name: "CSV bulk import", value: true, included: true },
      { name: "ICP profiles", value: false, included: false },
      { name: "Market map & clustering", value: false, included: false },
      { name: "Competitor discovery", value: false, included: false },
    ],
  },
  {
    name: "Starter",
    description: "For growing teams",
    price: 29,
    badge: "Most Popular",
    cta: "Start 7-Day Trial",
    ctaVariant: "default" as const,
    popular: true,
    features: [
      { name: "AI-powered generations", value: "50 per month", included: true },
      { name: "Everything in Free", value: true, included: true },
      { name: "AI generated ICP profiles", value: true, included: true },
      { name: "Market map & clustering", value: true, included: true },
      { name: "Competitor discovery", value: true, included: true },
      { name: "CSV bulk import", value: true, included: true },
      { name: "Decision maker identification", value: true, included: true },
      { name: "Priority support", value: false, included: false },
      { name: "Early access to features", value: false, included: false },
      { name: "Advanced filtering", value: false, included: false, note: "Coming soon" },
    ],
  },
  {
    name: "Pro",
    description: "For scaling businesses",
    price: 99,
    badge: null,
    cta: "Start 7-Day Trial",
    ctaVariant: "default" as const,
    popular: false,
    features: [
      { name: "AI-powered generations", value: "200 per month", included: true },
      { name: "Everything in Starter", value: true, included: true },
      { name: "Priority support", value: true, included: true },
      { name: "Early access to new features", value: true, included: true },
      { name: "Advanced sorting & filtering", value: true, included: true, note: "Coming soon" },
      { name: "CRM integrations", value: true, included: true, note: "Coming soon" },
      { name: "Email template generation", value: true, included: true, note: "Coming soon" },
      { name: "Dedicated account manager", value: false, included: false, note: "Enterprise only" },
    ],
  },
];

export default function PricingCards() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Pricing
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with a 7-day free trial. Full Pro features, 10 AI generations. No credit card required.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`card relative flex flex-col ${
                plan.popular
                  ? 'border-primary shadow-xl scale-105 md:scale-110'
                  : 'border-gray-200'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="badge-primary px-4 py-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-8 pb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">£{plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                </div>
              </div>

              <div className="px-8 flex-1 space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-0.5 ${
                        feature.included
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {feature.included ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={feature.included ? 'text-gray-900' : 'text-gray-500'}>
                          {typeof feature.value === 'string' ? (
                            <>
                              <span className={feature.included ? '' : 'line-through'}>{feature.name}:</span>{' '}
                              <span className={feature.included ? '' : ''}>{feature.value}</span>
                            </>
                          ) : (
                            <span className={feature.included ? '' : 'line-through'}>{feature.name}</span>
                          )}
                        </span>
                        {feature.note && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {feature.note}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 pt-0">
                <Link
                  href="/signup"
                  className={`w-full ${
                    plan.ctaVariant === 'default' ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Trial Information */}
        <div className="max-w-3xl mx-auto">
          <div className="card bg-secondary/50 border-primary/20 p-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Start with a 7-Day Free Trial</h3>
                <p className="text-gray-600 mb-4">
                  Get full access to Pro features with 10 AI-powered prospect generations. 
                  No credit card required. Experience the power of AI-driven go-to-market intelligence.
                </p>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-700">10 AI generations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-700">All Pro features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-700">No credit card</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Need more? Looking for enterprise features?
          </p>
          <Link href="/contact" className="btn-secondary">
            Contact Sales
          </Link>
        </div>
      </div>
    </section>
  );
}