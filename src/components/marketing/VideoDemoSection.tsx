import { Play, Clock, Users, CheckCircle, ArrowRight } from "lucide-react";

export default function VideoDemoSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Demo
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            See GTM Map in Action
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Watch how our AI transforms customer data into qualified prospects in under 10 minutes.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl blur-3xl" />
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl bg-white">
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                        <Play className="w-8 h-8 text-primary ml-1" />
                      </div>
                      <div className="text-white">
                        <h3 className="text-xl font-semibold mb-2">Watch Demo Video</h3>
                        <p className="text-gray-300">See GTM Map in action</p>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Live Demo</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>10 min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Demo Preview Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="text-xs text-gray-600 mb-1">Before: Manual Research</div>
                  <div className="text-sm font-medium text-gray-800">2-3 hours per prospect</div>
                  <div className="text-xs text-gray-500">Manual LinkedIn searches</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600 mb-1">After: AI-Powered</div>
                  <div className="text-sm font-medium text-green-800">47 prospects in 10 min</div>
                  <div className="text-xs text-green-500">Automated ICP matching</div>
                </div>
              </div>
            </div>

          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">
                What You'll See in This Demo
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Customer Data Upload</h4>
                    <p className="text-gray-600">See how easy it is to upload your customer list</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">AI ICP Extraction</h4>
                    <p className="text-gray-600">Watch our AI analyze patterns and build your ICP</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Prospect Generation</h4>
                    <p className="text-gray-600">See 50+ qualified prospects found in real-time</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Decision Maker Identification</h4>
                    <p className="text-gray-600">Get verified contact information for key stakeholders</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">10 min</div>
                <div className="text-sm text-gray-600">Total time</div>
              </div>
              <div className="card p-4 text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">50+</div>
                <div className="text-sm text-gray-600">Prospects found</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/signup" className="btn-primary group">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="/contact" className="btn-secondary">
                Schedule Demo
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="card bg-white border-primary/20 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Want a Personalized Demo?
            </h3>
            <p className="text-gray-600 mb-6">
              Our team can show you how GTM Map works with your specific industry and use case. 
              Get a custom demo tailored to your business needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn-primary">
                Schedule Custom Demo
              </a>
              <a href="/pricing" className="btn-secondary">
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}