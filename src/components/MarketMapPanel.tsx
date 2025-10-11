'use client';

import { useState } from 'react';
import { Download, FileText, Plus, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import ProspectsTab from './ProspectsTab';
import ClustersTab from './ClustersTab';
import type { Company, Cluster, Ad, ICP } from '@/types';

interface MarketMapPanelProps {
  prospects: Company[];
  clusters: Cluster[];
  ads: Ad[];
  icp?: ICP;
  onStatusUpdate: (id: number, status: string) => Promise<void>;
  onProspectUpdate: (updatedProspect: Company) => void;
  onMarkAsCustomer?: (prospect: Company) => void;
}

export default function MarketMapPanel({ 
  prospects, 
  clusters, 
  ads,
  icp, 
  onStatusUpdate,
  onProspectUpdate,
  onMarkAsCustomer
}: MarketMapPanelProps) {
  const [activeTab, setActiveTab] = useState<'prospects' | 'clusters' | 'ads'>('prospects');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<string[]>([]);
  const [showGenerateProgress, setShowGenerateProgress] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleExportCSV = async () => {
    try {
      // Create CSV headers
      const headers = [
        'Name',
        'Domain',
        'Source',
        'Source Customer Domain',
        'ICP Score',
        'Confidence',
        'Status',
        'Rationale',
      ];
      
      // Create CSV rows from prospects
      const rows = prospects.map(company => [
        company.name,
        company.domain,
        company.source,
        company.sourceCustomerDomain || '',
        company.icpScore,
        company.confidence,
        company.status,
        company.rationale,
      ]);
      
      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gtm-prospects.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleGenerateMore = async () => {
    if (!icp) {
      toast.error('ICP profile not found. Please run a new analysis first.');
      return;
    }

    // Read batch size from settings
    const batchSize = parseInt(localStorage.getItem('gtm-batch-size') || '10');
    const maxTotalProspects = parseInt(localStorage.getItem('gtm-max-total-prospects') || '100');

    setIsGenerating(true);
    setGenerateProgress([]);
    setShowGenerateProgress(true);
    
    try {
      toast.info(`Searching for ${batchSize} new high-quality prospects...`);
      
      const response = await fetch('/api/generate-more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize,
          maxTotalProspects,
          icp,
          existingProspects: prospects.map(p => ({ 
            id: p.id, 
            domain: p.domain,
            name: p.name,
            quality: p.quality, 
            icpScore: p.icpScore,
            rationale: p.rationale
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.message) {
              // Add progress message
              setGenerateProgress(prev => [...prev, data.message]);
            }

            if (data.result) {
              // Final result received
              if (data.result.prospects && data.result.prospects.length > 0) {
                // Fetch updated prospects from database
                const updatedResponse = await fetch('/api/prospects');
                if (updatedResponse.ok) {
                  const updatedData = await updatedResponse.json();
                  updatedData.prospects.forEach((prospect: Company) => {
                    onProspectUpdate(prospect);
                  });
                }

                toast.success(`Successfully added ${data.result.prospects.length} new prospects!`);
                setActiveTab('prospects');
              } else {
                toast.info(data.result.message || 'No new prospects found. Try adjusting your ICP or rating more prospects.');
              }
              
              // Hide progress panel after completion
              setTimeout(() => {
                setShowGenerateProgress(false);
                setGenerateProgress([]);
              }, 2000);
            }

            if (data.error) {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Generate more failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate more prospects';
      toast.error(errorMessage);
      setShowGenerateProgress(false);
      setGenerateProgress([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportBrief = async () => {
    try {
      // Generate markdown content
      const date = new Date().toLocaleDateString('en-GB');
      let markdown = `# Go-To-Market Map Brief\n\n`;
      markdown += `**Date:** ${date}\n\n`;
      markdown += `**Total Prospects:** ${prospects.length}\n\n`;
      
      // Clusters section
      markdown += `## Market Clusters\n\n`;
      clusters.forEach(cluster => {
        const clusterProspects = prospects.filter(p => 
          (cluster.companyIds as number[]).includes(p.id)
        );
        const avgScore = clusterProspects.reduce((sum, p) => sum + p.icpScore, 0) / clusterProspects.length || 0;
        markdown += `### ${cluster.label}\n`;
        markdown += `- **Count:** ${clusterProspects.length} companies\n`;
        markdown += `- **Avg ICP Score:** ${Math.round(avgScore)}/100\n\n`;
      });
      
      // Prospects by status
      markdown += `## Prospects by Status\n\n`;
      const statuses = ['New', 'Researching', 'Contacted', 'Won', 'Lost'];
      statuses.forEach(status => {
        const count = prospects.filter(p => p.status === status).length;
        if (count > 0) {
          markdown += `- **${status}:** ${count}\n`;
        }
      });
      
      markdown += `\n## Top Prospects\n\n`;
      const topProspects = [...prospects]
        .sort((a, b) => b.icpScore - a.icpScore)
        .slice(0, 10);
      
      topProspects.forEach((prospect, index) => {
        markdown += `${index + 1}. **${prospect.name}** (${prospect.domain})\n`;
        markdown += `   - ICP Score: ${prospect.icpScore}/100\n`;
        markdown += `   - Confidence: ${prospect.confidence}/100\n`;
        markdown += `   - Status: ${prospect.status}\n`;
        markdown += `   - ${prospect.rationale}\n\n`;
      });
      
      // Create and download the markdown file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gtm-brief.md';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Brief exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export brief');
    }
  };

  const tabs = [
    { id: 'prospects', label: 'Prospects', count: prospects.length },
    { id: 'clusters', label: 'Clusters', count: clusters.length },
    { id: 'ads', label: 'Ad Ideas', count: ads.length },
  ];

  return (
    <div className="bg-white rounded-lg shadow overflow-visible">
      {/* Header */}
      <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Market Map</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-2 md:px-3 py-1.5 md:py-2 border border-transparent shadow-sm text-xs md:text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-3.5 md:h-4 w-3.5 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">Import Prospects</span>
              <span className="sm:hidden ml-1">Import</span>
            </button>
            <button
              onClick={handleGenerateMore}
              disabled={isGenerating}
              className="inline-flex items-center px-2 md:px-3 py-1.5 md:py-2 border border-transparent shadow-sm text-xs md:text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 md:h-4 w-3.5 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Generate More'}</span>
              <span className="sm:hidden ml-1">{isGenerating ? 'Gen...' : 'Generate'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 shadow-sm text-xs md:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-3.5 md:h-4 w-3.5 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden ml-1">CSV</span>
            </button>
            <button
              onClick={handleExportBrief}
              className="inline-flex items-center px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 shadow-sm text-xs md:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FileText className="h-3.5 md:h-4 w-3.5 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">Download .md Brief</span>
              <span className="sm:hidden ml-1">Brief</span>
            </button>
          </div>
        </div>
      </div>


      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 md:space-x-8 px-3 md:px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'prospects' | 'clusters' | 'ads')}
              className={`py-3 md:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6 overflow-visible">
        {activeTab === 'prospects' && (
          <ProspectsTab 
            prospects={prospects}
            icp={icp}
            onStatusUpdate={onStatusUpdate}
            onProspectUpdate={onProspectUpdate}
            onGenerateMore={handleGenerateMore}
            onMarkAsCustomer={onMarkAsCustomer}
            showImportModal={showImportModal}
            setShowImportModal={setShowImportModal}
          />
        )}
        {activeTab === 'clusters' && (
          <ClustersTab clusters={clusters} ads={ads} />
        )}
        {activeTab === 'ads' && (
          <ClustersTab clusters={clusters} ads={ads} />
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Not legal advice:</strong> Data is probabilistic; verify before outreach.
        </p>
      </div>

      {/* Generate More Progress Panel - Compact Left Sidebar */}
      {showGenerateProgress && (
        <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl border-r border-gray-200 z-40 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <h3 className="font-medium text-sm">AI Working...</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-50">
            {generateProgress.map((message, index) => (
              <div
                key={index}
                className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-100 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {message}
              </div>
            ))}
            {generateProgress.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-8">
                Initializing...
              </div>
            )}
          </div>
          <div className="p-2 bg-blue-50 border-t border-blue-100 text-center">
            <p className="text-xs text-blue-700 font-medium">
              ✨ AI finding prospects
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
