'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import InputsPanel from '@/components/InputsPanel';
import ICPReviewPanel from '@/components/ICPReviewPanel';
import ICPProfileModal from '@/components/ICPProfileModal';
import SettingsModal from '@/components/SettingsModal';
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
  const [showICPModal, setShowICPModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string[]>([]);
  const [showAnalysisProgress, setShowAnalysisProgress] = useState(false);

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
          // Fix duplicate IDs (migration for old data)
          const seenIds = new Set<number>();
          const fixedProspects = savedProspects.map((prospect: Company) => {
            if (seenIds.has(prospect.id)) {
              // Duplicate ID detected, generate a new unique one
              const newId = Date.now() + Math.floor(Math.random() * 1000000);
              console.log(`Fixed duplicate ID ${prospect.id} for ${prospect.name} → ${newId}`);
              return { ...prospect, id: newId };
            }
            seenIds.add(prospect.id);
            return prospect;
          });
          
          // Save fixed data back to localStorage
          if (fixedProspects.length !== savedProspects.length || 
              fixedProspects.some((p: Company, i: number) => p.id !== savedProspects[i].id)) {
            localStorage.setItem('gtm-data', JSON.stringify({
              prospects: fixedProspects,
              clusters: savedClusters,
              ads: savedAds,
            }));
            console.log('Migrated prospects with duplicate IDs');
          }
          
          setProspects(fixedProspects);
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
    setAnalysisProgress([]);
    setShowAnalysisProgress(true);
    
    try {
      // Read batch size from localStorage
      const batchSize = parseInt(localStorage.getItem('gtm-batch-size') || '10');
      
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl,
          customers,
          icp: confirmedICP,
          batchSize,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.message) {
              setAnalysisProgress(prev => [...prev, data.message]);
            } else if (data.result) {
              finalResult = data.result;
            } else if (data.error) {
              throw new Error(data.error);
            }
          }
        }
      }

      if (!finalResult) {
        throw new Error('No result received from analysis');
      }
      
      setProspects(finalResult.prospects || []);
      setClusters(finalResult.clusters || []);
      setAds(finalResult.ads || []);
      setHasData(true);
      setAnalysisStep('results');

      // Save to localStorage for persistence
      localStorage.setItem('gtm-data', JSON.stringify({
        prospects: finalResult.prospects,
        clusters: finalResult.clusters,
        ads: finalResult.ads,
      }));
      localStorage.setItem('gtm-icp', JSON.stringify(confirmedICP));
      localStorage.setItem('gtm-analysis-step', 'results');

      // Hide progress panel after completion
      setTimeout(() => {
        setShowAnalysisProgress(false);
        setAnalysisProgress([]);
      }, 1000);

      // Show info message if using mock data
      if (finalResult.mockData) {
        toast.info('Using demo data - OpenAI quota exceeded. Add credits to your OpenAI account for real AI analysis.');
      } else {
        toast.success(`Analysis complete! Found ${finalResult.prospects?.length || 0} prospects.`);
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      toast.error(errorMessage);
      setShowAnalysisProgress(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToInput = () => {
    setAnalysisStep('input');
    // Don't clear ICP - keep it for context
    localStorage.setItem('gtm-analysis-step', 'input');
    toast.info('Add more customers to improve your prospect list');
  };

  const handleClearAnalysis = async () => {
    if (!confirm('Are you sure you want to clear all data? This will delete all prospects from the database and cannot be undone.')) {
      return;
    }
    
    try {
      // Call API to clear database
      const response = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear data');
      }
      
      // Clear all stored data from localStorage
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
      
      toast.success('All data cleared from database successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear data');
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      // In mock mode, we handle updates client-side only
      // The backend mock DB doesn't persist between requests
      // In production with a real DB, this would call the API
      
      // Update local state
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
      
      // If we had a real database connection, we'd do:
      // const response = await fetch('/api/status', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ id, status }),
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to update status');
      // }
      
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const handleProspectUpdate = (updatedProspect: Company) => {
    // Check if this is a deletion signal (domain starts with __DELETE_)
    if (updatedProspect.domain.startsWith('__DELETE_')) {
      const idToDelete = updatedProspect.id;
      
      // Remove from state
      setProspects(prev => prev.filter(p => p.id !== idToDelete));
      
      // Update localStorage
      const filtered = prospects.filter(p => p.id !== idToDelete);
      localStorage.setItem('gtm-data', JSON.stringify({
        prospects: filtered,
        clusters,
        ads,
      }));
      return;
    }

    // Check if prospect exists (update) or is new (add)
    setProspects(prev => {
      const existingIndex = prev.findIndex(p => p.id === updatedProspect.id);
      
      if (existingIndex >= 0) {
        // Update existing prospect
        return prev.map(p => p.id === updatedProspect.id ? updatedProspect : p);
      } else {
        // Add new prospect
        return [...prev, updatedProspect];
      }
    });

    // Update localStorage
    const existingIndex = prospects.findIndex(p => p.id === updatedProspect.id);
    const updatedProspects = existingIndex >= 0
      ? prospects.map(p => p.id === updatedProspect.id ? updatedProspect : p)
      : [...prospects, updatedProspect];
      
    localStorage.setItem('gtm-data', JSON.stringify({
      prospects: updatedProspects,
      clusters,
      ads,
    }));
  };

  const handleMarkAsCustomer = (prospect: Company) => {
    // Add prospect to customer list
    const newCustomer: Customer = {
      name: prospect.name,
      domain: prospect.domain,
      notes: prospect.notes || `Added from prospects. ICP Score: ${prospect.icpScore}. ${prospect.rationale}`,
    };

    // Check if already exists
    if (customers.some(c => c.domain === prospect.domain)) {
      toast.info(`${prospect.name} is already in your customer list`);
      return;
    }

    // Update prospect status to "Won" (customer)
    const updatedProspect = {
      ...prospect,
      status: 'Won' as Company['status'],
    };
    
    // Update prospects state
    setProspects(prev =>
      prev.map(p => p.id === prospect.id ? updatedProspect : p)
    );

    // Update localStorage for prospects
    const updatedProspects = prospects.map(p => 
      p.id === prospect.id ? updatedProspect : p
    );
    localStorage.setItem('gtm-data', JSON.stringify({
      prospects: updatedProspects,
      clusters,
      ads,
    }));

    // Add to customers and persist
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    localStorage.setItem('gtm-customers', JSON.stringify(updatedCustomers));
    
    toast.success(`${prospect.name} marked as customer! Click "Add More Customers" to run a new analysis with this updated customer base.`);
  };

  const handleICPUpdate = (updatedICP: ICP) => {
    setExtractedICP(updatedICP);
    localStorage.setItem('gtm-icp', JSON.stringify(updatedICP));
    toast.success('ICP Profile updated successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Go-To-Market Map</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-lg text-gray-600">
              AI-powered competitor expansion CRM for B2B teams
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {extractedICP && (
              <button
                onClick={() => {
                  console.log('ICP Profile button clicked, extractedICP:', extractedICP);
                  setShowICPModal(true);
                }}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center text-sm sm:text-base"
              >
                <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">ICP Profile</span>
                <span className="sm:hidden">ICP</span>
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center text-sm sm:text-base"
            >
              <Settings className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </button>
            {(hasData || analysisStep === 'results') && (
              <button
                onClick={handleBackToInput}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add More Customers</span>
                <span className="sm:hidden">Add Customers</span>
              </button>
            )}
            {(hasData || extractedICP || analysisStep !== 'input') && (
              <button
                onClick={handleClearAnalysis}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Clear All Data</span>
                <span className="sm:hidden">Clear Data</span>
              </button>
            )}
          </div>
        </div>

        {analysisStep === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Inputs */}
            <div className="space-y-6">
              <InputsPanel 
                onAnalyse={handleExtractICP} 
                isLoading={isLoading}
                initialWebsiteUrl={websiteUrl}
                initialCustomers={customers}
              />
            </div>

            {/* Right Panel - Status / Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                {hasData || prospects.length > 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Current Analysis
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p><strong>{prospects.length}</strong> prospects found</p>
                      <p><strong>{customers.length}</strong> customers in your list</p>
                      {extractedICP && (
                        <p className="text-xs text-gray-500 mt-4">
                          ICP profile saved - add more customers to refine your search
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setAnalysisStep('results');
                        localStorage.setItem('gtm-analysis-step', 'results');
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      View Current Results
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Ready to expand your market?
                    </h3>
                    <p className="text-gray-500">
                      Enter your website URL and upload a customer list to start analysing and finding new prospects.
                    </p>
                  </>
                )}
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
              icp={extractedICP || undefined}
              onStatusUpdate={handleStatusUpdate}
              onProspectUpdate={handleProspectUpdate}
              onMarkAsCustomer={handleMarkAsCustomer}
            />
          </div>
        )}
      </div>

      {/* ICP Profile Modal */}
      <ICPProfileModal
        isOpen={showICPModal}
        onClose={() => setShowICPModal(false)}
        icp={extractedICP}
        onUpdate={handleICPUpdate}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Analysis Progress Panel - Compact Left Sidebar */}
      {showAnalysisProgress && (
        <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl border-r border-gray-200 z-40 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <h3 className="font-medium text-sm">AI Working...</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-50">
            {analysisProgress.map((message, index) => (
              <div
                key={index}
                className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-100 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {message}
              </div>
            ))}
            {analysisProgress.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-8">
                Initializing...
              </div>
            )}
          </div>
          <div className="p-2 bg-blue-50 border-t border-blue-100 text-center">
            <p className="text-xs text-blue-700 font-medium">
              ✨ AI analyzing prospects
            </p>
          </div>
        </div>
      )}
    </div>
  );
}