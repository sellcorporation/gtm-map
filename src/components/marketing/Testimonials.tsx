export default function Testimonials() {
  const testimonials = [
    {
      quote: "GTM Map transformed our prospecting process. We went from spending 20 hours per week on manual research to getting 50+ qualified prospects in minutes. Our conversion rate increased by 300%.",
      author: "Sarah Chen",
      role: "Founder & CEO",
      company: "TechFlow Solutions",
      avatar: "SC",
      rating: 5
    },
    {
      quote: "The AI accuracy is incredible. 9 out of 10 prospects we contact are actually interested in our solution. GTM Map pays for itself in the first week.",
      author: "Mike Rodriguez",
      role: "Sales Director",
      company: "Growth Partners",
      avatar: "MR",
      rating: 5
    },
    {
      quote: "As a solo founder, I don't have time for manual prospecting. GTM Map gives me enterprise-level lead generation at a fraction of the cost. It's a game-changer.",
      author: "Emma Thompson",
      role: "Founder",
      company: "StartupXYZ",
      avatar: "ET",
      rating: 5
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Loved by Founders & Sales Teams
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how GTM Map is helping companies across industries find their perfect customers faster than ever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 mb-6 italic leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {testimonial.avatar}
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 bg-white rounded-xl p-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-gray-600">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">300%</div>
              <div className="text-gray-600">Avg. Conversion Increase</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">10hrs</div>
              <div className="text-gray-600">Time Saved Weekly</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}