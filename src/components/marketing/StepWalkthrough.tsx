import { Upload, Brain, Search, Users, ArrowRight, CheckCircle } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Customer Data",
    description: "Simply paste your customer list or upload a CSV file. Our AI analyzes your existing customers to understand what makes them perfect for your business.",
    details: [
      "CSV upload or manual entry",
      "AI analyzes customer patterns",
      "Identifies key characteristics",
      "Builds comprehensive profile"
    ],
    visual: "📊",
    color: "primary"
  },
  {
    number: "02", 
    icon: Brain,
    title: "AI Extracts Your ICP",
    description: "Our advanced AI analyzes your customers to identify common patterns, characteristics, and behaviors that define your ideal customer profile.",
    details: [
      "Industry and company size analysis",
      "Technology stack identification",
      "Geographic and demographic patterns",
      "Behavioral characteristic mapping"
    ],
    visual: "🧠",
    color: "secondary"
  },
  {
    number: "03",
    icon: Search,
    title: "Search Millions of Companies",
    description: "Our AI searches through millions of companies worldwide to find prospects that match your ideal customer profile with 95% accuracy.",
    details: [
      "100M+ company database",
      "Real-time data updates",
      "AI-powered matching algorithms",
      "Comprehensive company insights"
    ],
    visual: "🔍",
    color: "accent"
  },
  {
    number: "04",
    icon: Users,
    title: "Identify Decision Makers",
    description: "Get verified contact information for key decision makers at each target company, including email addresses, phone numbers, and LinkedIn profiles.",
    details: [
      "C-level executive identification",
      "Department head mapping",
      "Verified contact information",
      "LinkedIn profile matching"
    ],
    visual: "👥",
    color: "success"
  }
];

export default function StepWalkthrough() {
  return (
    <section id="steps" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Process
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Simple 4-Step Process
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From customer data to qualified prospects in under 10 minutes. 
            No complex setup, no manual research required.
          </p>
        </div>

        <div className="space-y-16">
          {steps.map((step, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${
              index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
            }`}>
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
                    {step.number}
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-gray-900">{step.title}</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {step.description}
                </p>
                
                <ul className="space-y-3">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
                
                {index < steps.length - 1 && (
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <span>Next: {steps[index + 1].title}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
              
                <div className={`${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl blur-3xl" />
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl bg-white">
                      <div className="p-6">
                        {index === 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">Customer Data Upload</div>
                              <div className="space-y-2">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="text-xs text-blue-600 mb-1">CSV Upload</div>
                                  <div className="text-sm font-medium">customers.csv (47 rows)</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Acme Corp - CEO: john@acme.com</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>TechStart Inc - CTO: sarah@techstart.com</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>DataFlow Ltd - VP: mike@dataflow.com</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  ✓ 47 customers uploaded successfully
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {index === 1 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">AI ICP Analysis</div>
                              <div className="space-y-2">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="text-xs text-green-600 mb-1">Industry Pattern</div>
                                  <div className="text-sm font-medium">SaaS & Technology (89%)</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="text-xs text-blue-600 mb-1">Company Size</div>
                                  <div className="text-sm font-medium">50-500 employees (76%)</div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="text-xs text-purple-600 mb-1">Tech Stack</div>
                                  <div className="text-sm font-medium">React, Node.js, AWS</div>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <div className="text-xs text-orange-600 mb-1">Geographic</div>
                                  <div className="text-sm font-medium">North America (82%)</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {index === 2 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">Prospect Search Results</div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span className="text-sm font-medium">CloudTech Solutions</span>
                                  </div>
                                  <span className="text-xs text-green-600">94% match</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-sm font-medium">DataViz Inc</span>
                                  </div>
                                  <span className="text-xs text-blue-600">91% match</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                                    <span className="text-sm font-medium">API Gateway Co</span>
                                  </div>
                                  <span className="text-xs text-purple-600">88% match</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                    <span className="text-sm font-medium">DevOps Pro</span>
                                  </div>
                                  <span className="text-xs text-orange-600">85% match</span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                Found 47 companies matching your ICP
                              </div>
                            </div>
                          </div>
                        )}
                        {index === 3 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">Decision Maker Contacts</div>
                              <div className="space-y-2">
                                <div className="p-2 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-600 mb-1">CloudTech Solutions</div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-blue-600">JD</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">Jennifer Davis</div>
                                        <div className="text-xs text-gray-500">CEO • j.davis@cloudtech.com</div>
                                      </div>
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-green-600">MW</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">Michael Wilson</div>
                                        <div className="text-xs text-gray-500">CTO • m.wilson@cloudtech.com</div>
                                      </div>
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-600 mb-1">DataViz Inc</div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-purple-600">AB</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">Alex Brown</div>
                                        <div className="text-xs text-gray-500">VP Sales • a.brown@dataviz.com</div>
                                      </div>
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                156 decision makers identified across 47 companies
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="card bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of companies already using GTM Map to find their perfect customers. 
              Start your free trial today and see results in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/signup" className="btn-primary group">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="/demo" className="btn-secondary">
                Watch Demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}