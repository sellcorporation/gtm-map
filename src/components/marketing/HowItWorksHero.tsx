export default function HowItWorksHero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              How It Works
            </span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            From Customer Data to{" "}
            <span className="text-primary">50 Qualified Prospects</span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Our AI-powered process transforms your existing customers into a perfect ideal customer profile, 
            then finds similar companies across the market in minutes, not months.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#steps" className="btn-primary">
              See the Process
            </a>
            <a href="/signup" className="btn-secondary">
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}