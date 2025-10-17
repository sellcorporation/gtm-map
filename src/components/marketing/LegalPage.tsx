import Link from 'next/link';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  content: string;
}

export default function LegalPage({ title, lastUpdated }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">GTM Map</span>
            </div>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
            <p className="text-gray-600">Last updated: {lastUpdated}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-4">
              This is a placeholder for the {title.toLowerCase()}. The full content will be added here.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Questions?
            </h3>
            <p className="text-gray-600 mb-4">
              If you have any questions about this {title.toLowerCase()}, please contact us:
            </p>
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Email:</strong> legal@gtmmap.com
              </p>
              <p className="text-gray-700">
                <strong>Address:</strong> GTM Map, London, United Kingdom
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}