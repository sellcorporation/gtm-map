import { Building2, ShoppingCart, Heart, GraduationCap, Car, Plane, CheckCircle } from "lucide-react";

const industries = [
  {
    icon: Building2,
    title: "SaaS & Technology",
    description: "Find enterprise customers and scale your software business",
    useCases: [
      "Identify ideal company size and tech stack",
      "Find decision makers in IT and procurement",
      "Analyze competitor customer bases",
      "Scale to new verticals and markets"
    ]
  },
  {
    icon: ShoppingCart,
    title: "E-commerce & Retail",
    description: "Discover B2B customers and expand your market reach",
    useCases: [
      "Find retailers and distributors",
      "Identify procurement managers",
      "Analyze market opportunities",
      "Scale to new geographic regions"
    ]
  },
  {
    icon: Heart,
    title: "Healthcare & Life Sciences",
    description: "Navigate complex healthcare organizations and compliance",
    useCases: [
      "Identify healthcare decision makers",
      "Find compliance and procurement teams",
      "Analyze healthcare market segments",
      "Scale to new therapeutic areas"
    ]
  },
  {
    icon: GraduationCap,
    title: "Education & EdTech",
    description: "Connect with educational institutions and administrators",
    useCases: [
      "Find school administrators and IT directors",
      "Identify district-level decision makers",
      "Analyze education market opportunities",
      "Scale to new educational segments"
    ]
  },
  {
    icon: Car,
    title: "Manufacturing & Industrial",
    description: "Target industrial buyers and supply chain managers",
    useCases: [
      "Find manufacturing decision makers",
      "Identify supply chain managers",
      "Analyze industrial market segments",
      "Scale to new manufacturing verticals"
    ]
  },
  {
    icon: Plane,
    title: "Professional Services",
    description: "Connect with service providers and consultants",
    useCases: [
      "Find consulting firm partners",
      "Identify service provider networks",
      "Analyze professional services markets",
      "Scale to new service verticals"
    ]
  }
];

export default function IndustrySection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Industries
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Trusted Across Industries
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From SaaS startups to enterprise manufacturers, GTM Map helps businesses 
            across all industries find their perfect customers.
          </p>
        </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, index) => (
              <div key={index} className="card p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <industry.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{industry.title}</h3>
                <p className="text-gray-600">{industry.description}</p>
                
                {/* Industry-specific visual mockup */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  {index === 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">SaaS Companies Found</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm font-medium">Salesforce</span>
                        <span className="text-xs text-gray-500">Enterprise</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm font-medium">HubSpot</span>
                        <span className="text-xs text-gray-500">Mid-market</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <span className="text-sm font-medium">Slack</span>
                        <span className="text-xs text-gray-500">Enterprise</span>
                      </div>
                    </div>
                  )}
                  {index === 1 && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">Retail Partners</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-sm font-medium">Walmart</span>
                        <span className="text-xs text-gray-500">Procurement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm font-medium">Target</span>
                        <span className="text-xs text-gray-500">Buying Team</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span className="text-sm font-medium">Amazon</span>
                        <span className="text-xs text-gray-500">Vendor Relations</span>
                      </div>
                    </div>
                  )}
                  {index === 2 && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">Healthcare Systems</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm font-medium">Mayo Clinic</span>
                        <span className="text-xs text-gray-500">IT Director</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm font-medium">Cleveland Clinic</span>
                        <span className="text-xs text-gray-500">CMO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <span className="text-sm font-medium">Johns Hopkins</span>
                        <span className="text-xs text-gray-500">Compliance</span>
                      </div>
                    </div>
                  )}
                  {index === 3 && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">Educational Institutions</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-sm font-medium">Harvard</span>
                        <span className="text-xs text-gray-500">IT Admin</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm font-medium">Stanford</span>
                        <span className="text-xs text-gray-500">Dean</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm font-medium">MIT</span>
                        <span className="text-xs text-gray-500">Tech Director</span>
                      </div>
                    </div>
                  )}
                  {index === 4 && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">Manufacturing Companies</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-500 rounded"></div>
                        <span className="text-sm font-medium">General Motors</span>
                        <span className="text-xs text-gray-500">Supply Chain</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm font-medium">Boeing</span>
                        <span className="text-xs text-gray-500">Operations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span className="text-sm font-medium">Caterpillar</span>
                        <span className="text-xs text-gray-500">Procurement</span>
                      </div>
                    </div>
                  )}
                  {index === 5 && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">Service Providers</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm font-medium">McKinsey</span>
                        <span className="text-xs text-gray-500">Partner</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm font-medium">Deloitte</span>
                        <span className="text-xs text-gray-500">Director</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <span className="text-sm font-medium">PwC</span>
                        <span className="text-xs text-gray-500">Principal</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <ul className="space-y-2">
                  {industry.useCases.map((useCase, useCaseIndex) => (
                    <li key={useCaseIndex} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        <div className="text-center mt-16">
          <div className="card bg-white border-primary/20 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Don't See Your Industry?
            </h3>
            <p className="text-gray-600 mb-6">
              GTM Map works across all industries. Our AI adapts to your specific market 
              and helps you find customers regardless of your vertical.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn-primary">
                Contact Us
              </a>
              <a href="/demo" className="btn-secondary">
                See Demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}