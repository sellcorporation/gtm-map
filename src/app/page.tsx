'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import InputsPanel from '@/components/InputsPanel';
import MarketMapPanel from '@/components/MarketMapPanel';
import type { Company, Cluster, Ad, Customer } from '@/types';

export default function HomePage() {
  const [prospects, setProspects] = useState<Company[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
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

  const handleAnalyse = async (websiteUrl: string, customers: Customer[]) => {
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

      // Save to localStorage for persistence
      localStorage.setItem('gtm-data', JSON.stringify({
        prospects: data.prospects,
        clusters: data.clusters,
        ads: data.ads,
      }));

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Go-To-Market Map</h1>
          <p className="mt-2 text-lg text-gray-600">
            AI-powered competitor expansion CRM for B2B teams
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Inputs */}
          <div className="space-y-6">
            <InputsPanel onAnalyse={handleAnalyse} isLoading={isLoading} />
          </div>

          {/* Right Panel - Market Map */}
          <div className="space-y-6">
            {hasData ? (
              <MarketMapPanel
                prospects={prospects}
                clusters={clusters}
                ads={ads}
                onStatusUpdate={handleStatusUpdate}
              />
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}