export default function BenefitsSection() {
  const benefits = [
    {
      icon: "⏱️",
      title: "Save 10+ Hours Per Week",
      description: "Stop spending hours on manual research. GTM Map automates the entire prospecting process, giving you back your time to focus on closing deals.",
      stat: "10+ hours saved weekly"
    },
    {
      icon: "🎯",
      title: "Higher Quality Prospects",
      description: "Our AI ensures every prospect matches your ICP with 95% accuracy. No more wasting time on unqualified leads.",
      stat: "95% accuracy rate"
    },
    {
      icon: "💰",
      title: "Affordable for Every Team",
      description: "Starting at just £29/month, GTM Map costs less than most CRM add-ons but delivers 10x the value.",
      stat: "90% cost reduction"
    }
  ];

  const testimonials = [
    {
      quote: "GTM Map saved us 15 hours per week on prospecting. We went from 5 prospects per week to 50+ qualified leads.",
      author: "Sarah Chen",
      role: "Founder",
      company: "TechStartup Co."
    },
    {
      quote: "The AI accuracy is incredible. 9 out of 10 prospects we contact are actually interested in our solution.",
      author: "Mike Rodriguez",
      role: "Sales Director", 
      company: "B2B Agency"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Why GTM Map Works Better Than Traditional Methods
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See the measurable impact GTM Map has on your prospecting efficiency and results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center p-8 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-6xl mb-6">{benefit.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {benefit.title}
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {benefit.description}
              </p>
              <div className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold">
                {benefit.stat}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="bg-gray-50 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
            What Our Customers Say
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="ml-3">
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-600">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}