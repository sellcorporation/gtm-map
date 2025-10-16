export default function FAQHero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              FAQ
            </span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Frequently Asked{" "}
            <span className="text-primary">Questions</span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Find answers to common questions about GTM Map's AI-powered B2B prospecting platform. 
            Can't find what you're looking for? We're here to help.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#faq" className="btn-primary">
              Browse Questions
            </a>
            <a href="/contact" className="btn-secondary">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
