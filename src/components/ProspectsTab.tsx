'use client';

import { useState } from 'react';
import { Eye, ChevronDown } from 'lucide-react';
import type { Company, Evidence } from '@/types';

interface ProspectsTabProps {
  prospects: Company[];
  onStatusUpdate: (id: number, status: string) => Promise<void>;
}

export default function ProspectsTab({ prospects, onStatusUpdate }: ProspectsTabProps) {
  const [selectedProspect, setSelectedProspect] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await onStatusUpdate(id, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const openEvidenceModal = (prospect: Company) => {
    setSelectedProspect(prospect);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProspect(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Researching': return 'bg-yellow-100 text-yellow-800';
      case 'Contacted': return 'bg-purple-100 text-purple-800';
      case 'Won': return 'bg-green-100 text-green-800';
      case 'Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No prospects found. Run an analysis to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ICP Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prospects.map((prospect) => (
              <tr key={prospect.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {prospect.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a
                    href={`https://${prospect.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {prospect.domain}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prospect.sourceCustomerDomain || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prospect.confidence}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-medium ${getScoreColor(prospect.icpScore)}`}>
                    {prospect.icpScore}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={prospect.status}
                    onChange={(e) => handleStatusChange(prospect.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(prospect.status)} border-0 focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="New">New</option>
                    <option value="Researching">Researching</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => openEvidenceModal(prospect)}
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Evidence
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Evidence Modal */}
      {isModalOpen && selectedProspect && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Evidence for {selectedProspect.name}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Rationale:</strong> {selectedProspect.rationale}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Confidence:</strong> {selectedProspect.confidence}% | 
                  <strong> ICP Score:</strong> {selectedProspect.icpScore}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Evidence URLs:</h4>
                {(selectedProspect.evidence as Evidence[]).map((evidence, index) => (
                  <div key={index} className="border rounded-md p-3">
                    <a
                      href={evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {evidence.url}
                    </a>
                    {evidence.snippet && (
                      <p className="text-sm text-gray-600 mt-1">
                        {evidence.snippet}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModal}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
