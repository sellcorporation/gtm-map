export default function SolutionSection() {
  const steps = [
    {
      number: "01",
      title: "Add Your Website & Customers",
      description: "Simply enter your website URL and upload your existing customer list. Our AI analyzes your current customer base to understand your ideal customer profile.",
      icon: "🌐"
    },
    {
      number: "02", 
      title: "AI Extracts Your ICP",
      description: "Our advanced AI analyzes your customers to identify common patterns, characteristics, and behaviors that define your ideal customer profile.",
      icon: "🧠"
    },
    {
      number: "03",
      title: "Get 50+ Qualified Prospects",
      description: "Within minutes, receive a curated list of 50+ prospects that match your ICP, complete with contact details and why they're a perfect fit.",
      icon: "🎯"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            From Zero to Pipeline in 3 Simple Steps
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            GTM Map uses AI to automate the entire prospecting process. 
            No more manual research, no more expensive tools, no more guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-blue-300 to-purple-300 transform -translate-x-1/2 z-0"></div>
              )}
              
              <div className="relative bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow z-10">
                <div className="flex items-center mb-6">
                  <div className="text-4xl mr-4">{step.icon}</div>
                  <div className="text-3xl font-bold text-blue-600">{step.number}</div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Prospecting?
            </h3>
            <p className="text-gray-600 text-lg mb-6">
              Join hundreds of founders who've already automated their customer discovery process.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                Start Free Trial →
              </a>
              <a
                href="/how-it-works"
                className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}