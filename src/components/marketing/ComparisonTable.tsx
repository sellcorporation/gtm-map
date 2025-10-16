export default function ComparisonTable() {
  const features = [
    { name: "Prospects per search", gtmMap: "50+", manual: "5-10", linkedin: "25" },
    { name: "Time per search", gtmMap: "10 minutes", manual: "6+ hours", linkedin: "2+ hours" },
    { name: "Accuracy rate", gtmMap: "95%", manual: "30%", linkedin: "60%" },
    { name: "Monthly cost", gtmMap: "£29-99", manual: "£0", linkedin: "£59-99" },
    { name: "ICP analysis", gtmMap: "AI-powered", manual: "Manual", linkedin: "Basic filters" },
    { name: "Contact details", gtmMap: "Included", manual: "Manual research", linkedin: "Limited" },
    { name: "Competitor insights", gtmMap: "Yes", manual: "No", linkedin: "No" }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            GTM Map vs. Traditional Methods
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how GTM Map compares to manual research and other prospecting tools.
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-hidden rounded-xl shadow-lg">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-blue-600 bg-blue-50">GTM Map</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Manual Research</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">LinkedIn Sales Navigator</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.map((feature, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{feature.name}</td>
                  <td className="px-6 py-4 text-sm text-center font-semibold text-blue-600 bg-blue-50">{feature.gtmMap}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">{feature.manual}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">{feature.linkedin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-6">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{feature.name}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3">
                  <span className="text-sm font-medium text-blue-600">GTM Map</span>
                  <span className="text-sm font-semibold text-blue-600">{feature.gtmMap}</span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-lg p-3">
                  <span className="text-sm font-medium text-gray-600">Manual Research</span>
                  <span className="text-sm text-gray-600">{feature.manual}</span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-lg p-3">
                  <span className="text-sm font-medium text-gray-600">LinkedIn Sales Nav</span>
                  <span className="text-sm text-gray-600">{feature.linkedin}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Upgrade Your Prospecting?
            </h3>
            <p className="text-blue-100 text-lg mb-6">
              Join hundreds of companies who've already made the switch to AI-powered prospecting.
            </p>
            <a
              href="/signup"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              Start Free Trial →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}