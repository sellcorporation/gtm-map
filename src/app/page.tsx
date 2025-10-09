'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import InputsPanel from '@/components/InputsPanel';
import ICPReviewPanel from '@/components/ICPReviewPanel';
import MarketMapPanel from '@/components/MarketMapPanel';
import type { Company, Cluster, Ad, Customer, ICP } from '@/types';

export default function HomePage() {
  const [prospects, setProspects] = useState<Company[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  
  // New state for ICP flow
  const [analysisStep, setAnalysisStep] = useState<'input' | 'icp-review' | 'results'>('input');
  const [extractedICP, setExtractedICP] = useState<ICP | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
    restoreAnalysisState();
  }, []);

  const loadExistingData = async () => {
    try {
      // In a real app, you'd have an API to fetch existing data
      // For now, we'll just check if there's any data in localStorage
      const savedData = localStorage.getItem('gtm-data');
      if (savedData) {
        const { prospects: savedProspects, clusters: savedClusters, ads: savedAds } = JSON.parse(savedData);
        
        // Validate that ads have the required structure
        const validAds = savedAds?.every((ad: Ad) => ad.lines && Array.isArray(ad.lines));
        
        if (savedProspects?.length > 0 && validAds) {
          setProspects(savedProspects);
          setClusters(savedClusters || []);
          setAds(savedAds || []);
          setHasData(true);
        } else if (savedProspects?.length > 0 && !validAds) {
          // Clear invalid old data
          console.log('Clearing old data with invalid structure');
          localStorage.removeItem('gtm-data');
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      localStorage.removeItem('gtm-data');
    }
  };

  const restoreAnalysisState = () => {
    try {
      const savedStep = localStorage.getItem('gtm-analysis-step');
      const savedICP = localStorage.getItem('gtm-icp');
      const savedWebsiteUrl = localStorage.getItem('gtm-website-url');
      const savedCustomers = localStorage.getItem('gtm-customers');
      
      if (savedStep && savedStep !== 'input') {
        setAnalysisStep(savedStep as 'input' | 'icp-review' | 'results');
      }
      
      if (savedICP) {
        setExtractedICP(JSON.parse(savedICP));
      }
      
      if (savedWebsiteUrl) {
        setWebsiteUrl(savedWebsiteUrl);
      }
      
      if (savedCustomers) {
        setCustomers(JSON.parse(savedCustomers));
      }
    } catch (error) {
      console.error('Error restoring analysis state:', error);
    }
  };

  const handleExtractICP = async (url: string, customerList: Customer[]) => {
    setIsLoading(true);
    setWebsiteUrl(url);
    setCustomers(customerList);
    
    try {
      const response = await fetch('/api/extract-icp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setExtractedICP(data.icp);
      setAnalysisStep('icp-review');

      // Save ICP and analysis state to localStorage
      localStorage.setItem('gtm-icp', JSON.stringify(data.icp));
      localStorage.setItem('gtm-website-url', url);
      localStorage.setItem('gtm-customers', JSON.stringify(customerList));
      localStorage.setItem('gtm-analysis-step', 'icp-review');

      // Show info message if using mock data
      if (data.mockData) {
        toast.info('Using demo ICP - OpenAI quota exceeded. Add credits to your OpenAI account for real AI analysis.');
      } else {
        toast.success('ICP extracted successfully! Please review and confirm.');
      }
      
    } catch (error) {
      console.error('ICP extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract ICP';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyzeICP = async () => {
    if (!websiteUrl) return;
    await handleExtractICP(websiteUrl, customers);
  };

  const handleConfirmICP = async (confirmedICP: ICP) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl,
          customers,
          icp: confirmedICP,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setProspects(data.prospects || []);
      setClusters(data.clusters || []);
      setAds(data.ads || []);
      setHasData(true);
      setAnalysisStep('results');

      // Save to localStorage for persistence
      localStorage.setItem('gtm-data', JSON.stringify({
        prospects: data.prospects,
        clusters: data.clusters,
        ads: data.ads,
      }));
      localStorage.setItem('gtm-icp', JSON.stringify(confirmedICP));
      localStorage.setItem('gtm-analysis-step', 'results');

      // Show info message if using mock data
      if (data.mockData) {
        toast.info('Using demo data - OpenAI quota exceeded. Add credits to your OpenAI account for real AI analysis.');
      } else {
        toast.success(`Analysis complete! Found ${data.prospects?.length || 0} prospects.`);
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToInput = () => {
    setAnalysisStep('input');
    setExtractedICP(null);
    localStorage.setItem('gtm-analysis-step', 'input');
  };

  const handleClearAnalysis = () => {
    // Clear all stored data
    localStorage.removeItem('gtm-data');
    localStorage.removeItem('gtm-icp');
    localStorage.removeItem('gtm-website-url');
    localStorage.removeItem('gtm-customers');
    localStorage.removeItem('gtm-analysis-step');
    
    // Reset state
    setProspects([]);
    setClusters([]);
    setAds([]);
    setHasData(false);
    setAnalysisStep('input');
    setExtractedICP(null);
    setWebsiteUrl('');
    setCustomers([]);
    
    toast.success('Analysis cleared');
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const response = await fetch('/api/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state optimistically
      setProspects(prev => 
        prev.map(prospect => 
          prospect.id === id ? { ...prospect, status: status as Company['status'] } : prospect
        )
      );

      // Update localStorage
      const updatedProspects = prospects.map(prospect => 
        prospect.id === id ? { ...prospect, status: status as Company['status'] } : prospect
      );
      localStorage.setItem('gtm-data', JSON.stringify({
        prospects: updatedProspects,
        clusters,
        ads,
      }));

      toast.success('Status updated successfully');
      
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const handleProspectUpdate = (updatedProspect: Company) => {
    // If id is -1, it's a signal to delete
    if (updatedProspect.id === -1) {
      setProspects(prev => prev.filter(p => p.id !== updatedProspect.id));
      const filtered = prospects.filter(p => p.id !== updatedProspect.id);
      localStorage.setItem('gtm-data', JSON.stringify({
        prospects: filtered,
        clusters,
        ads,
      }));
      return;
    }

    // Update prospects state
    setProspects(prev =>
      prev.map(p => p.id === updatedProspect.id ? updatedProspect : p)
    );

    // Update localStorage
    const updatedProspects = prospects.map(p => 
      p.id === updatedProspect.id ? updatedProspect : p
    );
    localStorage.setItem('gtm-data', JSON.stringify({
      prospects: updatedProspects,
      clusters,
      ads,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Go-To-Market Map</h1>
            <p className="mt-2 text-lg text-gray-600">
              AI-powered competitor expansion CRM for B2B teams
            </p>
          </div>
          {(hasData || extractedICP || analysisStep !== 'input') && (
            <button
              onClick={handleClearAnalysis}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Clear & Start Fresh
            </button>
          )}
        </div>

        {analysisStep === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Inputs */}
            <div className="space-y-6">
              <InputsPanel onAnalyse={handleExtractICP} isLoading={isLoading} />
            </div>

            {/* Right Panel - Placeholder */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to expand your market?
                </h3>
                <p className="text-gray-500">
                  Enter your website URL and upload a customer list to start analysing and finding new prospects.
                </p>
              </div>
            </div>
          </div>
        )}

        {analysisStep === 'icp-review' && extractedICP && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={handleBackToInput}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Inputs
              </button>
            </div>
            <ICPReviewPanel
              icp={extractedICP}
              websiteUrl={websiteUrl}
              onConfirm={handleConfirmICP}
              onReanalyze={handleReanalyzeICP}
              isLoading={isLoading}
            />
          </div>
        )}

        {analysisStep === 'results' && hasData && (
          <div>
            <div className="mb-6">
              <button
                onClick={handleBackToInput}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Start New Analysis
              </button>
            </div>
            <MarketMapPanel
              prospects={prospects}
              clusters={clusters}
              ads={ads}
              onStatusUpdate={handleStatusUpdate}
              onProspectUpdate={handleProspectUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}