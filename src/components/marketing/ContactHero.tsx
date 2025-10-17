export default function ContactHero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Contact Us
            </span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Let's Build Something{" "}
            <span className="text-primary">Amazing Together</span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Have questions about GTM Map? Want to discuss your specific use case? 
            We're here to help you find your perfect customers and accelerate your growth.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact-form" className="btn-primary">
              Send Message
            </a>
            <a href="/demo" className="btn-secondary">
              Schedule Demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}