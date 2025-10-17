import { Clock, Target, TrendingUp, Users, Zap, Shield } from "lucide-react";

const reasons = [
  {
    icon: Clock,
    title: "Save 20+ Hours Per Week",
    description: "Stop spending hours on manual LinkedIn searches and spreadsheet management. Our AI finds qualified prospects in minutes, not months.",
    stats: "Average time saved: 20 hours/week",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  {
    icon: Target,
    title: "95% Accuracy Rate",
    description: "Our AI-powered ICP analysis ensures you're targeting the right companies with the right decision makers. No more wasted outreach.",
    stats: "95% of prospects are qualified matches",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  {
    icon: TrendingUp,
    title: "300% Higher Conversion",
    description: "Targeted prospecting leads to better conversations and higher close rates. Our customers see 3x improvement in conversion rates.",
    stats: "Average conversion increase: 300%",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  }
];

const features = [
  {
    icon: Users,
    title: "Built for Founders",
    description: "Designed specifically for startup founders who need to move fast and find customers quickly."
  },
  {
    icon: Zap,
    title: "AI-Powered Intelligence",
    description: "Advanced machine learning algorithms analyze your best customers to find similar prospects."
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description: "SOC 2 compliant with bank-level encryption. Your data is safe and secure."
  }
];

export default function ValueProposition() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Why GTM Map?
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Three Reasons Why Founders Choose GTM Map
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Stop wasting time on manual prospecting. Start finding your perfect customers with AI-powered intelligence.
          </p>
        </div>

        {/* Main Reasons */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {reasons.map((reason, index) => (
            <div key={index} className={`card p-8 text-center ${reason.bgColor} ${reason.borderColor} border-2`}>
              <div className={`w-16 h-16 rounded-full ${reason.bgColor} flex items-center justify-center mx-auto mb-6`}>
                <reason.icon className={`w-8 h-8 ${reason.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{reason.title}</h3>
              <p className="text-gray-600 mb-4">{reason.description}</p>
              <div className={`inline-block px-3 py-1 rounded-full ${reason.bgColor} ${reason.color} text-sm font-medium`}>
                {reason.stats}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* ROI Calculator */}
        <div className="card bg-white border-primary/20 p-8 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Calculate Your ROI
            </h3>
            <p className="text-gray-600">
              See how much time and money GTM Map can save your business
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">Time Saved Per Week</div>
                  <div className="text-sm text-gray-600">Manual prospecting time</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">20 hrs</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">Monthly Cost Savings</div>
                  <div className="text-sm text-gray-600">Based on £35/hour rate</div>
                </div>
                <div className="text-2xl font-bold text-green-600">£2,800</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">GTM Map Cost</div>
                  <div className="text-sm text-gray-600">Starter plan</div>
                </div>
                <div className="text-2xl font-bold text-gray-600">£29</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">97x</div>
              <div className="text-xl font-semibold text-gray-900 mb-2">ROI</div>
              <div className="text-gray-600 mb-6">
                For every £1 you spend on GTM Map, you save £97 in time costs
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Break-even time</div>
                <div className="text-2xl font-bold text-primary">50 minutes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-gray-600">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">2,500+</div>
              <div className="text-gray-600">Prospects Found</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">95%</div>
              <div className="text-gray-600">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">300%</div>
              <div className="text-gray-600">Avg. Conversion Increase</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}