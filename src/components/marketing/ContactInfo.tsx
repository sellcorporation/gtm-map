import { Mail, Phone, MapPin, Clock, MessageCircle, Calendar } from "lucide-react";

export default function ContactInfo() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Contact Info
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're here to help you succeed. Choose the best way to reach us based on your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Email Support</h3>
            <p className="text-gray-600">
              Get help with your account, technical questions, or general inquiries.
            </p>
            <a href="mailto:support@gtmmap.com" className="btn-secondary">
              support@gtmmap.com
            </a>
          </div>

          <div className="card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Live Chat</h3>
            <p className="text-gray-600">
              Chat with our support team in real-time for immediate assistance.
            </p>
            <button className="btn-secondary">
              Start Chat
            </button>
          </div>

          <div className="card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Schedule Demo</h3>
            <p className="text-gray-600">
              Book a personalized demo to see GTM Map in action with your data.
            </p>
            <a href="/demo" className="btn-primary">
              Book Demo
            </a>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Office Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Address</h4>
                  <p className="text-gray-600">
                    123 Innovation Drive<br />
                    San Francisco, CA 94105<br />
                    United States
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Phone</h4>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Business Hours</h4>
                  <p className="text-gray-600">
                    Monday - Friday: 9:00 AM - 6:00 PM PST<br />
                    Saturday: 10:00 AM - 4:00 PM PST<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Quick Links</h3>
            
            <div className="space-y-4">
              <div className="card p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Documentation</h4>
                <p className="text-gray-600 mb-3">Find guides, tutorials, and API documentation.</p>
                <a href="/docs" className="text-primary hover:underline">View Docs</a>
              </div>

              <div className="card p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Status Page</h4>
                <p className="text-gray-600 mb-3">Check our system status and uptime.</p>
                <a href="/status" className="text-primary hover:underline">Check Status</a>
              </div>

              <div className="card p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Community</h4>
                <p className="text-gray-600 mb-3">Join our community of users and get support.</p>
                <a href="/community" className="text-primary hover:underline">Join Community</a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="card bg-white border-primary/20 p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still Have Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Can't find what you're looking for? Our team is here to help. 
              Reach out and we'll get back to you as soon as possible.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact-form" className="btn-primary">
                Contact Us
              </a>
              <a href="/faq" className="btn-secondary">
                View FAQ
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}