export default function FeatureGrid() {
  const features = [
    {
      icon: "🧠",
      title: "AI-Powered ICP Extraction",
      description: "Our AI analyzes your existing customers to automatically identify your ideal customer profile, saving hours of manual analysis.",
      benefits: ["Instant ICP analysis", "Pattern recognition", "Customer insights"]
    },
    {
      icon: "⚡",
      title: "Instant Prospect Generation",
      description: "Get 50+ qualified prospects in minutes, not hours. Our AI finds companies that match your ICP with high accuracy.",
      benefits: ["50+ prospects per search", "High accuracy matching", "Real-time results"]
    },
    {
      icon: "🔍",
      title: "Competitor Discovery",
      description: "Identify companies that work with your competitors and are likely to be interested in your solution.",
      benefits: ["Competitor analysis", "Market intelligence", "Expansion opportunities"]
    },
    {
      icon: "👥",
      title: "Decision Maker Identification",
      description: "Find the right contacts at each company with verified email addresses and LinkedIn profiles.",
      benefits: ["Contact details", "LinkedIn profiles", "Role verification"]
    },
    {
      icon: "🗺️",
      title: "Market Map Visualization",
      description: "Visualize your prospect landscape with interactive maps showing company relationships and market clusters.",
      benefits: ["Visual mapping", "Market clusters", "Relationship insights"]
    },
    {
      icon: "📊",
      title: "CSV Import/Export",
      description: "Easily import your existing customer data and export prospect lists to your CRM or sales tools.",
      benefits: ["CRM integration", "Data portability", "Bulk operations"]
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Powerful Features to Accelerate Your Growth
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to find, qualify, and convert your ideal customers - all in one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-6">{feature.icon}</div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                {feature.description}
              </p>
              
              <ul className="space-y-2">
                {feature.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              See All Features in Action
            </h3>
            <p className="text-blue-100 text-lg mb-6">
              Watch our 2-minute demo to see how GTM Map can transform your prospecting process.
            </p>
            <a
              href="/how-it-works"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              Watch Demo →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}