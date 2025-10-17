import { Zap, Database, Users, BarChart3, CheckCircle } from "lucide-react";

const integrations = [
  {
    name: "Salesforce",
    description: "Sync prospects directly to your Salesforce CRM",
    icon: Database,
    features: ["Automatic lead creation", "Custom field mapping", "Real-time sync"]
  },
  {
    name: "HubSpot",
    description: "Seamlessly integrate with HubSpot workflows",
    icon: Users,
    features: ["Contact import", "Deal tracking", "Email sequences"]
  },
  {
    name: "Pipedrive",
    description: "Connect with Pipedrive for streamlined sales",
    icon: BarChart3,
    features: ["Pipeline management", "Activity tracking", "Deal updates"]
  },
  {
    name: "Zapier",
    description: "Connect with 5000+ apps via Zapier",
    icon: Zap,
    features: ["Custom workflows", "Multi-app integration", "Automated actions"]
  }
];

export default function IntegrationSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Integrations
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Works with Your Existing Tools
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect GTM Map with your favorite CRM, marketing tools, and business applications. 
            No data silos, just seamless workflows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {integrations.map((integration, index) => (
            <div key={index} className="card p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <integration.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{integration.name}</h3>
              <p className="text-gray-600">{integration.description}</p>
              <ul className="space-y-2 text-sm text-gray-500">
                {integration.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="card bg-white border-primary/20 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Need a Custom Integration?
            </h3>
            <p className="text-gray-600 mb-6">
              Our team can build custom integrations for your specific tools and workflows. 
              Get in touch to discuss your requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn-primary">
                Request Integration
              </a>
              <a href="/api-docs" className="btn-secondary">
                View API Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}