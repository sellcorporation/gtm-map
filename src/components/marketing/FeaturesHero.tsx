export default function FeaturesHero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Features
            </span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Everything You Need to{" "}
            <span className="text-primary">Scale Your Sales</span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            From AI-powered prospecting to advanced CRM integration, GTM Map provides 
            all the tools your sales team needs to find, qualify, and convert prospects at scale.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#features" className="btn-primary">
              Explore Features
            </a>
            <a href="/pricing" className="btn-secondary">
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}