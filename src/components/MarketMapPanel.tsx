'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import ProspectsTab from './ProspectsTab';
import ClustersTab from './ClustersTab';
import type { Company, Cluster, Ad } from '@/types';

interface MarketMapPanelProps {
  prospects: Company[];
  clusters: Cluster[];
  ads: Ad[];
  onStatusUpdate: (id: number, status: string) => Promise<void>;
}

export default function MarketMapPanel({ 
  prospects, 
  clusters, 
  ads, 
  onStatusUpdate 
}: MarketMapPanelProps) {
  const [activeTab, setActiveTab] = useState<'prospects' | 'clusters' | 'ads'>('prospects');

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
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Market Map</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={handleExportBrief}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download .md Brief
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'prospects' | 'clusters' | 'ads')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
      <div className="p-6">
        {activeTab === 'prospects' && (
          <ProspectsTab prospects={prospects} onStatusUpdate={onStatusUpdate} />
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
    </div>
  );
}
