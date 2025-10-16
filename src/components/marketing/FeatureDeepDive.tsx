import { Zap, Target, TrendingUp, Users, Database, Shield, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI-Powered Prospecting",
    description: "Find perfect-fit companies in seconds using advanced AI that analyzes your ideal customer profile and market patterns.",
    benefits: [
      "50 qualified prospects in under 10 minutes",
      "95% accuracy rate in company matching",
      "Real-time market analysis",
      "Automated ICP scoring"
    ],
    image: "/api/placeholder/600/400"
  },
  {
    icon: Target,
    title: "Decision Maker Identification",
    description: "Get verified contact information for key decision makers at target companies with 95% accuracy.",
    benefits: [
      "Verified email addresses and phone numbers",
      "LinkedIn profile matching",
      "Role and seniority identification",
      "Contact preference tracking"
    ],
    image: "/api/placeholder/600/400"
  },
  {
    icon: TrendingUp,
    title: "Market Intelligence",
    description: "Understand your competitive landscape with real-time insights on market trends and competitor analysis.",
    benefits: [
      "Competitor analysis and benchmarking",
      "Market trend identification",
      "Industry insights and reports",
      "Custom market mapping"
    ],
    image: "/api/placeholder/600/400"
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Share prospect lists, track progress, and collaborate seamlessly across sales and marketing teams.",
    benefits: [
      "Shared prospect databases",
      "Real-time collaboration tools",
      "Progress tracking and reporting",
      "Team performance analytics"
    ],
    image: "/api/placeholder/600/400"
  },
  {
    icon: Database,
    title: "CRM Integration",
    description: "Sync seamlessly with your existing CRM and sales tools. No data silos, just unified workflows.",
    benefits: [
      "One-click CRM synchronization",
      "Automated data updates",
      "Custom field mapping",
      "Bulk import/export capabilities"
    ],
    image: "/api/placeholder/600/400"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption and compliance. Your data is secure with SOC 2 Type II certification.",
    benefits: [
      "SOC 2 Type II compliance",
      "End-to-end encryption",
      "GDPR and CCPA compliance",
      "Regular security audits"
    ],
    image: "/api/placeholder/600/400"
  }
];

export default function FeatureDeepDive() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="space-y-24">
          {features.map((feature, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${
              index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
            }`}>
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">{feature.title}</h3>
                </div>
                
                <p className="text-lg text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                
                <ul className="space-y-3">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="flex gap-4">
                  <a href="/signup" className="btn-primary group">
                    Try This Feature
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
                              <div className="text-sm font-medium text-gray-700">AI Analysis in Progress...</div>
                              <div className="space-y-2">
                                <div className="h-3 bg-primary/20 rounded w-full animate-pulse"></div>
                                <div className="h-3 bg-primary/10 rounded w-3/4 animate-pulse"></div>
                                <div className="h-3 bg-primary/5 rounded w-1/2 animate-pulse"></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="text-xs text-green-600">ICP Score</div>
                                  <div className="text-xl font-bold text-green-700">94%</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="text-xs text-blue-600">Matches Found</div>
                                  <div className="text-xl font-bold text-blue-700">47</div>
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
                              <div className="text-sm font-medium text-gray-700">Decision Maker Database</div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-blue-600">JD</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">John Doe</div>
                                    <div className="text-xs text-gray-500">CEO • john@company.com</div>
                                  </div>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-purple-600">SM</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">Sarah Miller</div>
                                    <div className="text-xs text-gray-500">CTO • sarah@company.com</div>
                                  </div>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-orange-600">MJ</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">Mike Johnson</div>
                                    <div className="text-xs text-gray-500">VP Sales • mike@company.com</div>
                                  </div>
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
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
                              <div className="text-sm font-medium text-gray-700">Market Intelligence Dashboard</div>
                              <div className="space-y-2">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                  <div className="text-xs text-blue-600 mb-1">Competitor Analysis</div>
                                  <div className="text-sm font-medium">3 direct competitors identified</div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <div className="text-xs text-green-600 mb-1">Market Trends</div>
                                  <div className="text-sm font-medium">Growing 23% YoY</div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg">
                                  <div className="text-xs text-purple-600 mb-1">Opportunity Score</div>
                                  <div className="text-sm font-medium">High potential segment</div>
                                </div>
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
                              <div className="text-sm font-medium text-gray-700">Team Collaboration Hub</div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-blue-600">A</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">Alex Chen</div>
                                    <div className="text-xs text-gray-500">Added 12 prospects</div>
                                  </div>
                                  <div className="text-xs text-green-600">2m ago</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-green-600">E</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">Emma Wilson</div>
                                    <div className="text-xs text-gray-500">Updated CRM sync</div>
                                  </div>
                                  <div className="text-xs text-gray-500">5m ago</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-purple-600">R</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">Ryan Davis</div>
                                    <div className="text-xs text-gray-500">Exported lead list</div>
                                  </div>
                                  <div className="text-xs text-gray-500">8m ago</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {index === 4 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">CRM Integration Status</div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span className="text-sm font-medium">Salesforce</span>
                                  </div>
                                  <span className="text-xs text-green-600">Connected</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-sm font-medium">HubSpot</span>
                                  </div>
                                  <span className="text-xs text-blue-600">Syncing</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-400 rounded"></div>
                                    <span className="text-sm font-medium">Pipedrive</span>
                                  </div>
                                  <span className="text-xs text-gray-500">Available</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {index === 5 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">Security Dashboard</div>
                              <div className="space-y-2">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="text-xs text-green-600 mb-1">SOC 2 Type II</div>
                                  <div className="text-sm font-medium">✓ Certified</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="text-xs text-blue-600 mb-1">Encryption</div>
                                  <div className="text-sm font-medium">AES-256 Active</div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="text-xs text-purple-600 mb-1">GDPR Compliance</div>
                                  <div className="text-sm font-medium">✓ Verified</div>
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