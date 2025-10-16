export default function ProblemSection() {
  const problems = [
    {
      title: "Manual Research Takes Forever",
      description: "Spending hours on LinkedIn, Google, and industry databases to find prospects that might fit your ICP.",
      icon: "⏰",
      pain: "Average sales team spends 6+ hours per week on manual prospecting"
    },
    {
      title: "Expensive Tools Don't Deliver",
      description: "Paying thousands for CRM add-ons and lead databases that give you low-quality, outdated contacts.",
      icon: "💰",
      pain: "Average B2B company spends $2,400/month on prospecting tools"
    },
    {
      title: "Spray and Pray Doesn't Work",
      description: "Sending generic outreach to hundreds of contacts with low response rates and wasted effort.",
      icon: "📧",
      pain: "Average cold email response rate is only 1-3%"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            The Old Way of Finding Customers is Broken
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Traditional prospecting methods are slow, expensive, and ineffective. 
            Here's what most founders and sales teams struggle with:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <div key={index} className="text-center p-8 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-6xl mb-6">{problem.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {problem.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {problem.description}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm font-medium">
                  {problem.pain}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="bg-gray-50 rounded-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              The Result? Wasted Time and Money
            </h3>
            <p className="text-gray-600 text-lg">
              Most B2B companies spend 40% of their sales budget on prospecting, 
              but only 20% of their prospects actually convert. There has to be a better way.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}