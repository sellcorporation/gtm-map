import { User, Users, TrendingUp, Building2, CheckCircle, ArrowRight } from "lucide-react";

const roles = [
  {
    icon: User,
    title: "Startup Founders",
    subtitle: "Scale from 0 to 100 customers",
    challenge: "You need to find your first customers quickly but don't have time for manual research.",
    solution: "GTM Map analyzes your existing customers to build a perfect ICP, then finds 50+ qualified prospects in minutes.",
    outcomes: [
      "Find product-market fit faster",
      "Identify your ideal customer profile",
      "Generate qualified leads instantly",
      "Focus on building, not prospecting"
    ],
    visual: "🚀",
    color: "primary"
  },
  {
    icon: Users,
    title: "Sales Managers",
    subtitle: "Empower your team with better leads",
    challenge: "Your sales team spends too much time researching prospects instead of selling.",
    solution: "Give your team instant access to qualified prospects with verified decision makers and contact information.",
    outcomes: [
      "Increase team productivity by 3x",
      "Improve lead quality and conversion",
      "Reduce time-to-first-contact",
      "Better pipeline visibility"
    ],
    visual: "📈",
    color: "secondary"
  },
  {
    icon: TrendingUp,
    title: "Growth Teams",
    subtitle: "Accelerate expansion and scaling",
    challenge: "You need to identify new market opportunities and expand into adjacent segments.",
    solution: "Use AI to discover new market segments, analyze competitors, and find expansion opportunities.",
    outcomes: [
      "Discover new market segments",
      "Analyze competitive landscape",
      "Identify expansion opportunities",
      "Scale to new geographies"
    ],
    visual: "🌍",
    color: "accent"
  },
  {
    icon: Building2,
    title: "Enterprise Sales",
    subtitle: "Target large accounts strategically",
    challenge: "Enterprise deals require deep research and multiple stakeholders across complex organizations.",
    solution: "Map entire organizations, identify all decision makers, and understand buying committees.",
    outcomes: [
      "Map complex organizations",
      "Identify all stakeholders",
      "Understand buying committees",
      "Increase deal size and velocity"
    ],
    visual: "🏢",
    color: "success"
  }
];

export default function RoleSection() {
  return (
    <section id="roles" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Roles
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Perfect for Every Sales Role
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From solo founders to enterprise sales teams, GTM Map adapts to your specific needs and workflow.
          </p>
        </div>

        <div className="space-y-16">
          {roles.map((role, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${
              index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
            }`}>
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <role.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">{role.title}</h3>
                    <p className="text-lg text-gray-600">{role.subtitle}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">The Challenge</h4>
                    <p className="text-gray-600">{role.challenge}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">The Solution</h4>
                    <p className="text-gray-600">{role.solution}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Key Outcomes</h4>
                  <ul className="space-y-2">
                    {role.outcomes.map((outcome, outcomeIndex) => (
                      <li key={outcomeIndex} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex gap-4">
                  <a href="/signup" className="btn-primary group">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a href="/demo" className="btn-secondary">
                    Watch Demo
                  </a>
                </div>
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
                              <div className="text-sm font-medium text-gray-700">Startup Founder Dashboard</div>
                              <div className="space-y-2">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="text-xs text-green-600 mb-1">Product-Market Fit</div>
                                  <div className="text-sm font-medium">87% match with ICP</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="text-xs text-blue-600 mb-1">First Customers</div>
                                  <div className="text-sm font-medium">23 qualified prospects</div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="text-xs text-purple-600 mb-1">Time Saved</div>
                                  <div className="text-sm font-medium">40 hours this week</div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                "Found our first 10 customers in 2 days instead of 2 months"
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
                              <div className="text-sm font-medium text-gray-700">Sales Team Performance</div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-bold text-blue-600">JS</span>
                                    </div>
                                    <span className="text-sm font-medium">John Smith</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-green-600">+340%</div>
                                    <div className="text-xs text-gray-500">productivity</div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-bold text-green-600">MJ</span>
                                    </div>
                                    <span className="text-sm font-medium">Maria Johnson</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-blue-600">+280%</div>
                                    <div className="text-xs text-gray-500">productivity</div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-bold text-purple-600">DL</span>
                                    </div>
                                    <span className="text-sm font-medium">David Lee</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-purple-600">+420%</div>
                                    <div className="text-xs text-gray-500">productivity</div>
                                  </div>
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
                              <div className="text-sm font-medium text-gray-700">Growth Team Analytics</div>
                              <div className="space-y-2">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                  <div className="text-xs text-blue-600 mb-1">New Segments</div>
                                  <div className="text-sm font-medium">Healthcare, FinTech, EdTech</div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <div className="text-xs text-green-600 mb-1">Market Expansion</div>
                                  <div className="text-sm font-medium">EU, APAC regions</div>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg">
                                  <div className="text-xs text-orange-600 mb-1">Competitor Intel</div>
                                  <div className="text-sm font-medium">5 new insights</div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                "Discovered 3 new market opportunities worth $2M ARR"
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
                              <div className="text-sm font-medium text-gray-700">Enterprise Account Mapping</div>
                              <div className="space-y-2">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="text-xs text-gray-600 mb-1">Fortune 500 Account</div>
                                  <div className="text-sm font-medium">Microsoft Corp</div>
                                  <div className="text-xs text-gray-500 mt-1">12 decision makers mapped</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="text-xs text-gray-600 mb-1">Buying Committee</div>
                                  <div className="text-sm font-medium">CFO, CTO, VP Sales</div>
                                  <div className="text-xs text-gray-500 mt-1">All contacts verified</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="text-xs text-gray-600 mb-1">Deal Size</div>
                                  <div className="text-sm font-medium">$2.5M potential</div>
                                  <div className="text-xs text-gray-500 mt-1">Enterprise deal</div>
                                </div>
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
      </div>
    </section>
  );
}