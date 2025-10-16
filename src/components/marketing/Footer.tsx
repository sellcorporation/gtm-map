import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <span className="ml-2 text-xl font-bold">GTM Map</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              AI-powered B2B prospecting that helps founders find their perfect customers in minutes, not months.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li><Link href="/features" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Features</Link></li>
              <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Pricing</Link></li>
              <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">How It Works</Link></li>
              <li><Link href="/use-cases" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Use Cases</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">About</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Contact</Link></li>
              <li><Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Privacy</Link></li>
              <li><Link href="/legal/terms" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Terms</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              <li><a href="mailto:support@gtmmap.com" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Email Support</a></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} GTM Map. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">
              Made with ❤️ in London
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}