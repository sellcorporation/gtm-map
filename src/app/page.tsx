'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import InputsPanel from '@/components/InputsPanel';
import ICPReviewPanel from '@/components/ICPReviewPanel';
import ICPProfileModal from '@/components/ICPProfileModal';
import SettingsModal from '@/components/SettingsModal';
import MarketMapPanel from '@/components/MarketMapPanel';
import UserMenu from '@/components/UserMenu';
import { UsageBadge } from '@/components/billing/UsageBadge';
import { WarningBanner } from '@/components/billing/WarningBanner';
import { BlockModal } from '@/components/billing/BlockModal';
import { createClient } from '@/lib/supabase/client';
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
  
  // Billing state
  const [usage, setUsage] = useState<{ used: number; allowed: number; plan: string } | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockModalData, setBlockModalData] = useState<{ used: number; allowed: number; plan: string } | null>(null);
  
  // ✅ Initial page loading state (prevents flash of empty content)
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load existing data on mount
  useEffect(() => {
    // Load all initial data in parallel, then show the page
    const initializeApp = async () => {
      setIsInitialLoading(true);
      await Promise.all([
        loadExistingData(),
        restoreAnalysisState(),
        loadUsageData(),
      ]);
      setIsInitialLoading(false);
    };
    
    initializeApp();
  }, []);

  const loadUsageData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get subscription and trial info
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status')
        .eq('user_id', user.id)
        .single();

      const { data: trial } = await supabase
        .from('trial_usage')
        .select('generations_used, max_generations, expires_at')
        .eq('user_id', user.id)
        .single();

      const now = new Date();
      const hasActiveTrial = trial && now < new Date(trial.expires_at);

      let used = 0;
      let allowed = 0;
      let plan = sub?.plan_id || 'free';

      if (hasActiveTrial) {
        used = trial.generations_used || 0;
        allowed = trial.max_generations || 10;
        plan = 'trial';
      } else {
        // Get monthly usage
        const periodStart = new Date();
        periodStart.setUTCDate(1);
        periodStart.setUTCHours(0, 0, 0, 0);

        const { data: usageData } = await supabase
          .from('usage_counters')
          .select('used')
          .eq('user_id', user.id)
          .eq('metric', 'ai_generations')
          .eq('period_start', periodStart.toISOString().split('T')[0])
          .single();

        used = usageData?.used || 0;

        // Get plan limit
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('max_ai_generations_per_month')
          .eq('id', plan)
          .single();

        allowed = planData?.max_ai_generations_per_month || 0;
      }

      setUsage({ used, allowed, plan });
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  const loadExistingData = async () => {
    try {
      // Fetch prospects from database
      const response = await fetch('/api/prospects');
      if (!response.ok) {
        console.error('Failed to fetch prospects from database');
        return;
      }
      
      const data = await response.json();
      
      if (data.prospects && data.prospects.length > 0) {
        setProspects(data.prospects);
        setHasData(true);
        console.log(`Loaded ${data.prospects.length} prospects from database`);
        
        // TODO: Load clusters and ads from database as well (for now they're regenerated on analysis)
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const restoreAnalysisState = async () => {
    try {
      // Fetch session from database
      const response = await fetch('/api/session');
      if (!response.ok) {
        console.log('No previous session found');
        return;
      }
      
      const data = await response.json();
      
      if (data.session) {
        const session = data.session;
        
        // Convert integer analysisStep to string enum
        if (session.analysisStep !== undefined && session.analysisStep !== 0) {
          const stepMap = { 0: 'input', 1: 'icp-review', 2: 'results' } as const;
          setAnalysisStep(stepMap[session.analysisStep as 0 | 1 | 2] || 'input');
        }
        
        if (session.icp) {
          setExtractedICP(session.icp);
        }
        
        if (session.websiteUrl) {
          setWebsiteUrl(session.websiteUrl);
        }
        
        if (session.customers && session.customers.length > 0) {
          setCustomers(session.customers);
        }
        
        console.log('Restored session from database');
      }
    } catch (error) {
      console.error('Error restoring analysis state:', error);
    }
  };

  const handleExtractICP = async (url: string, customerList: Customer[], isRegenerating = false) => {
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
          customers: customerList,
          isRegenerating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle incomplete ICP with regenerate option
        if (response.status === 422 && errorData.canRegenerate) {
          toast.error(errorData.error, {
            duration: 10000,
            action: {
              label: 'Regenerate',
              onClick: () => handleExtractICP(url, customerList, true),
            },
          });
          return;
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setExtractedICP(data.icp);
      setAnalysisStep('icp-review');

      // Save session to database
      try {
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteUrl: url,
            icp: data.icp,
            analysisStep: 1, // 0=input, 1=icp-review, 2=results
            customers: customerList,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to save session:', errorData);
          throw new Error(errorData.error || 'Failed to save session');
        }
        
        console.log('Session saved to database');
      } catch (error) {
        console.error('Failed to save session:', error);
        toast.error('Could not save session — please retry');
      }

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

      // Handle 402 Payment Required (limit reached)
      if (response.status === 402) {
        const errorData = await response.json();
        
        // Refresh usage counter to show updated limit state
        await loadUsageData();
        
        // Show BlockModal for upgrade
        setBlockModalData({
          used: errorData.usage?.used || 0,
          allowed: errorData.usage?.allowed || 0,
          plan: errorData.usage?.plan || 'trial'
        });
        setShowBlockModal(true);
        
        return;
      }

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
      
      // ✅ ADD new prospects to existing ones (always grow the list)
      const newProspects = finalResult.prospects || [];
      setProspects(prev => [...prev, ...newProspects]); // Append new to existing
      setClusters(prev => [...prev, ...(finalResult.clusters || [])]); // Append clusters
      setAds(prev => [...prev, ...(finalResult.ads || [])]); // Append ads
      setHasData(true);
      setAnalysisStep('results');
      
      // Log for audit trail
      console.log(`[ANALYSIS] Added ${newProspects.length} new prospects. Total: ${prospects.length + newProspects.length}`);

      // Save session to database
      try {
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteUrl,
            icp: confirmedICP,
            analysisStep: 2, // 0=input, 1=icp-review, 2=results
            customers,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to save session:', errorData);
          throw new Error(errorData.error || 'Failed to save session');
        }
        
        console.log('Session saved to database');
      } catch (error) {
        console.error('Failed to save session:', error);
        toast.error('Could not save session — please retry');
      }

      // Hide progress panel after completion
      setTimeout(() => {
        setShowAnalysisProgress(false);
        setAnalysisProgress([]);
      }, 1000);

      // Show info message if using mock data
      if (finalResult.mockData) {
        toast.info('Using demo data - OpenAI quota exceeded. Add credits to your OpenAI account for real AI analysis.');
      } else {
        const totalCount = prospects.length + newProspects.length;
        toast.success(`Analysis complete! Added ${newProspects.length} new prospects. Total: ${totalCount} prospects.`);
      }

      // ✅ Refresh usage counter immediately after successful analysis
      await loadUsageData();
      
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
    toast.success(
      `💡 Add more customers to expand your prospect list! You currently have ${prospects.length} prospects.`,
      { duration: 5000 }
    );
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
      
      // Clear session from database
      try {
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteUrl: null,
            icp: null,
            analysisStep: 0,
            customers: null,
          }),
        });
      } catch (error) {
        console.error('Failed to clear session:', error);
      }
      
      // Reset all state (including input fields)
      setProspects([]);
      setClusters([]);
      setAds([]);
      setHasData(false);
      setAnalysisStep('input');
      setExtractedICP(null);
      setWebsiteUrl(''); // Clear website URL input
      setCustomers([]); // Clear customers list
      
      toast.success('All data cleared from database successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear data');
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      // Save to database
      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyId: id, 
          status: status as Company['status']
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status in database');
      }
      
      // Update local state
      setProspects(prev => 
        prev.map(prospect => 
          prospect.id === id ? { ...prospect, status: status as Company['status'] } : prospect
        )
      );

      toast.success('Status updated successfully');
      
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const handleProspectUpdate = async (updatedProspect: Company) => {
    // Check if this is a deletion signal (domain starts with __DELETE_)
    if (updatedProspect.domain.startsWith('__DELETE_')) {
      const idToDelete = updatedProspect.id;
      
      // Remove from state
      setProspects(prev => prev.filter(p => p.id !== idToDelete));
      return;
    }

    // Check if prospect exists in current state
    const existingIndex = prospects.findIndex(p => p.id === updatedProspect.id);
    
    // If updating an existing prospect, save to database
    if (existingIndex >= 0) {
      try {
        await fetch('/api/company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            companyId: updatedProspect.id,
            name: updatedProspect.name,
            domain: updatedProspect.domain,
            status: updatedProspect.status,
            quality: updatedProspect.quality,
            notes: updatedProspect.notes,
            tags: updatedProspect.tags,
            relatedCompanyIds: updatedProspect.relatedCompanyIds,
            decisionMakers: updatedProspect.decisionMakers,
            // Include analysis fields from regenerate
            rationale: updatedProspect.rationale,
            evidence: updatedProspect.evidence,
            icpScore: updatedProspect.icpScore,
            confidence: updatedProspect.confidence,
          }),
        });
      } catch (error) {
        console.error('Failed to update prospect in database:', error);
        // Continue with local update even if database fails
      }
    }

    // Update local state
    setProspects(prev => {
      const existingIndex = prev.findIndex(p => p.id === updatedProspect.id);
      
      if (existingIndex >= 0) {
        // Update existing prospect
        return prev.map(p => p.id === updatedProspect.id ? updatedProspect : p);
      } else {
        // Add new prospect (from import or generation)
        return [...prev, updatedProspect];
      }
    });
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

    // Add to customers and persist to session
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    
    // Save updated customers to session (preserve all existing session data!)
    try {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp: extractedICP, // ✅ Preserve ICP
          websiteUrl: websiteUrl, // ✅ Preserve website URL
          analysisStep: analysisStep === 'input' ? 0 : analysisStep === 'icp-review' ? 1 : 2,
          customers: updatedCustomers, // ✅ Update customers
        }),
      });
    } catch (error) {
      console.error('Failed to save customers to session:', error);
    }
    
    toast.success(`${prospect.name} marked as customer! Click "Add More Customers" to run a new analysis with this updated customer base.`);
  };

  const handleICPUpdate = async (updatedICP: ICP) => {
    setExtractedICP(updatedICP);
    
    // Save to session
    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp: updatedICP,
        }),
      });
      toast.success('ICP Profile updated successfully');
    } catch (error) {
      console.error('Failed to save ICP to session:', error);
      toast.error('Could not save ICP — please retry');
    }
  };

  const handleUpgrade = async (plan: 'starter' | 'pro') => {
    try {
      console.log('[APP] Starting upgrade to:', plan);
      
      // Call checkout API (handles both new subscriptions and upgrades)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate upgrade');
      }
      
      const data = await response.json();
      
      if (data.upgraded) {
        // Direct upgrade (existing subscription updated)
        console.log('[APP] Direct upgrade successful:', data.plan);
        toast.success(data.message || 'Successfully upgraded!');
        
        // Refresh usage data to show new limits
        await loadUsageData();
        
        // Close modal and redirect to billing page
        setShowBlockModal(false);
        window.location.href = data.url;
      } else if (data.url) {
        // New subscription (redirect to Stripe Checkout)
        console.log('[APP] Redirecting to Stripe Checkout...');
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from checkout API');
      }
    } catch (error) {
      console.error('[APP] Error during upgrade:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upgrade');
    }
  };

  // Calculate warning thresholds based on plan (matching entitlements.ts)
  const getWarningThreshold = (plan: string, allowed: number) => {
    if (plan === 'trial') return 8; // Trial: warn at 8/10
    if (plan === 'starter') return 45; // Starter: warn at 45/50
    if (plan === 'pro') return 190; // Pro: warn at 190/200
    return allowed - 2; // Fallback: warn at limit - 2
  };

  const warnThreshold = usage ? getWarningThreshold(usage.plan, usage.allowed) : 0;
  const shouldShowWarning = usage && usage.allowed > 0 && usage.used >= warnThreshold;
  const isAtLimit = usage && usage.allowed > 0 && usage.used >= usage.allowed;

  // ✅ Show loading spinner while initial data loads (prevents content flashing)
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Warning/Limit Banner - Show at 80%+ including 100% */}
      {shouldShowWarning && usage && (
        <WarningBanner 
          used={usage.used} 
          allowed={usage.allowed} 
          plan={usage.plan}
          isAtLimit={isAtLimit}
        />
      )}

      {/* Block Modal */}
      {showBlockModal && blockModalData && (
        <BlockModal 
          isOpen={showBlockModal}
          used={blockModalData.used}
          allowed={blockModalData.allowed}
          plan={blockModalData.plan}
          onClose={() => setShowBlockModal(false)}
          onUpgrade={handleUpgrade}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Go-To-Market Map</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-lg text-gray-600">
              AI-powered competitor expansion CRM for B2B teams
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {usage && <UsageBadge used={usage.used} allowed={usage.allowed} plan={usage.plan} />}
            <UserMenu onOpenSettings={() => setShowSettings(true)} />
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
              onUsageUpdate={loadUsageData}
              onShowBlockModal={(data) => {
                setBlockModalData(data);
                setShowBlockModal(true);
              }}
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
        onClearData={handleClearAnalysis}
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