import { Target, Users, Zap, CheckCircle } from "lucide-react";

export default function MissionSection() {
  return (
    <section id="story" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Our Mission
              </span>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
              Eliminating the Guesswork in B2B Sales
            </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              We believe that every B2B company should have access to intelligent prospecting tools 
              that help them find their perfect customers. No more cold outreach to the wrong people. 
              No more wasted time on unqualified leads.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">AI-Powered Intelligence</h4>
                  <p className="text-gray-600">Leverage advanced AI to understand your ideal customer profile</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Data-Driven Decisions</h4>
                  <p className="text-gray-600">Make informed decisions based on real market data and insights</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Scalable Growth</h4>
                  <p className="text-gray-600">Scale your prospecting efforts without scaling your team</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl blur-3xl" />
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl bg-white">
              <div className="p-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Target className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Vision</h3>
                    <p className="text-gray-600">
                      A world where every B2B company can find their perfect customers in minutes, not months.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">500+</div>
                      <div className="text-sm text-gray-600">Companies</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">50K+</div>
                      <div className="text-sm text-gray-600">Prospects Found</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}