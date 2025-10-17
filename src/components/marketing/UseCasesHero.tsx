export default function UseCasesHero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Use Cases
            </span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Built for Every{" "}
            <span className="text-primary">Sales Role</span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Whether you're a startup founder, sales manager, or enterprise sales team, 
            GTM Map adapts to your specific needs and accelerates your growth.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#roles" className="btn-primary">
              Explore Roles
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