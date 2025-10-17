import Link from 'next/link';

export default function PricingTeaser() {
  const plans = [
    {
      name: "Trial",
      price: "Free",
      period: "7 days",
      description: "Perfect for testing GTM Map",
      features: ["50 prospects", "Basic ICP analysis", "Email support"],
      cta: "Start Free Trial",
      href: "/signup",
      badge: "Start Here"
    },
    {
      name: "Starter",
      price: "£29",
      period: "per month",
      description: "Ideal for small teams",
      features: ["200 prospects/month", "Advanced ICP analysis", "Priority support", "CSV export"],
      cta: "Choose Starter",
      href: "/signup",
      badge: "Most Popular",
      highlighted: true
    },
    {
      name: "Pro",
      price: "£99",
      period: "per month",
      description: "For growing companies",
      features: ["Unlimited prospects", "AI competitor analysis", "Dedicated support", "API access"],
      cta: "Choose Pro",
      href: "/signup",
      badge: "Best Value"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your needs. All plans include our core AI prospecting features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-white rounded-xl p-8 shadow-lg ${plan.highlighted ? 'ring-2 ring-blue-500 transform scale-105' : ''}`}>
              {plan.badge && (
                <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold ${
                  plan.badge === 'Most Popular' ? 'bg-blue-600 text-white' :
                  plan.badge === 'Best Value' ? 'bg-green-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {plan.badge}
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                  plan.highlighted 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans include a 7-day free trial. No credit card required.
          </p>
          <Link
            href="/pricing"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            View detailed pricing comparison →
          </Link>
        </div>
      </div>
    </section>
  );
}