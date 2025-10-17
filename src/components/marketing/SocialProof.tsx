export default function SocialProof() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Trusted by Founders & Growth Teams
          </h2>
          <p className="text-gray-600">
            Join 50+ companies finding their ideal customers with GTM Map
          </p>
        </div>
        
        {/* Company logos placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-60">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-center">
              <div className="h-12 w-24 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-gray-400 text-sm font-medium">Company {i}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
            <div className="text-gray-600">Companies Using GTM Map</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">2,500+</div>
            <div className="text-gray-600">Prospects Found This Month</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">95%</div>
            <div className="text-gray-600">Customer Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
}