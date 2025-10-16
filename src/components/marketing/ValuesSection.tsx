import { Heart, Shield, Lightbulb, Users, CheckCircle } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Customer Success First",
    description: "We measure our success by our customers' success. Every feature we build and decision we make is guided by what helps our customers grow faster.",
    details: [
      "Customer-centric product development",
      "Transparent communication",
      "Proactive support and guidance",
      "Continuous feedback integration"
    ]
  },
  {
    icon: Shield,
    title: "Trust & Security",
    description: "Your data is sacred. We maintain the highest standards of security and privacy, ensuring your customer information is always protected.",
    details: [
      "SOC 2 Type II compliance",
      "End-to-end encryption",
      "Regular security audits",
      "GDPR and CCPA compliance"
    ]
  },
  {
    icon: Lightbulb,
    title: "Innovation & Excellence",
    description: "We're constantly pushing the boundaries of what's possible with AI and data science to deliver breakthrough results for our customers.",
    details: [
      "Cutting-edge AI technology",
      "Continuous product innovation",
      "Research-driven development",
      "Performance optimization"
    ]
  },
  {
    icon: Users,
    title: "Collaboration & Transparency",
    description: "We believe in open communication, shared knowledge, and working together to solve complex challenges in B2B prospecting.",
    details: [
      "Open and honest communication",
      "Knowledge sharing and education",
      "Community-driven improvements",
      "Partnership approach"
    ]
  }
];

export default function ValuesSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Values
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Our Core Values
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The principles that guide everything we do at GTM Map, from product development 
            to customer support and company culture.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {values.map((value, index) => (
            <div key={index} className="card p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{value.title}</h3>
              </div>
              
              <p className="text-gray-600 leading-relaxed">
                {value.description}
              </p>
              
              <ul className="space-y-3">
                {value.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="card bg-white border-primary/20 p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Join Our Mission
            </h3>
            <p className="text-gray-600 mb-6">
              We're always looking for talented individuals who share our values and want to help 
              build the future of B2B prospecting. Come help us make sales more intelligent and efficient.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn-primary">
                Get in Touch
              </a>
              <a href="/careers" className="btn-secondary">
                View Careers
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}