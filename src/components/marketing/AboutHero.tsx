export default function AboutHero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              About Us
            </span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            We're Building the Future of{" "}
            <span className="text-primary">B2B Prospecting</span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Founded by sales professionals who experienced the pain of manual prospecting, 
            GTM Map was built to eliminate the guesswork and accelerate growth for B2B companies worldwide.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#story" className="btn-primary">
              Our Story
            </a>
            <a href="/contact" className="btn-secondary">
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}