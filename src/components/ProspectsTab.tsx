'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Eye, ChevronDown, ChevronRight, Users, Mail, Phone, Linkedin, ThumbsUp, ThumbsDown, Plus, Edit2, Trash2, Save, X, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import CompanyDetailModal from './CompanyDetailModal';
import BulkImportModal from './BulkImportModal';
import type { Company, Evidence, DecisionMaker, ICP } from '@/types';

type SortField = 'name' | 'domain' | 'source' | 'confidence' | 'icpScore' | 'status' | 'quality';
type SortDirection = 'asc' | 'desc' | null;

interface ProspectsTabProps {
  prospects: Company[];
  icp?: ICP;
  onStatusUpdate: (id: number, status: string) => Promise<void>;
  onProspectUpdate: (updatedProspect: Company) => void;
  onGenerateMore?: () => void;
  onMarkAsCustomer?: (prospect: Company) => void;
  showImportModal?: boolean;
  setShowImportModal?: (show: boolean) => void;
}

export default function ProspectsTab({ prospects, icp, onStatusUpdate, onProspectUpdate, onGenerateMore, onMarkAsCustomer, showImportModal = false, setShowImportModal }: ProspectsTabProps) {
  const [selectedProspect, setSelectedProspect] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [loadingDecisionMakers, setLoadingDecisionMakers] = useState<Set<number>>(new Set());
  const [detailModalCompany, setDetailModalCompany] = useState<Company | null>(null);
  const [editingDM, setEditingDM] = useState<{ prospectId: number; dmIndex: number } | null>(null);
  const [editedDMData, setEditedDMData] = useState<DecisionMaker | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingManualDM, setAddingManualDM] = useState<number | null>(null);
  const [manualDMData, setManualDMData] = useState<DecisionMaker>({
    name: '',
    role: '',
    linkedin: '',
    email: '',
    phone: '',
    contactStatus: 'Not Contacted',
  });
  
  // Manual prospect addition state
  const [addingManualProspect, setAddingManualProspect] = useState(false);
  const [manualProspectData, setManualProspectData] = useState({
    name: '',
    domain: '',
    useAI: true, // Option to use AI for analysis
  });
  const [isAnalyzingProspect, setIsAnalyzingProspect] = useState(false);
  
  // Find competitors state
  const [findingCompetitors, setFindingCompetitors] = useState<Set<number>>(new Set());
  const [competitorProgress, setCompetitorProgress] = useState<Array<{ message: string; type: 'info' | 'success' | 'error' }>>([]);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll progress panel to bottom (but user can scroll up freely)
  useEffect(() => {
    if (competitorProgress.length > 0 && progressContainerRef.current) {
      // Only auto-scroll if user is already near the bottom
      const container = progressContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [competitorProgress]);
  
  // ICP Score filter with localStorage persistence
  const [minICPScore, setMinICPScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gtm-min-icp-score');
      return saved ? parseInt(saved, 10) : 51;
    }
    return 51;
  });

  const handleICPScoreChange = (value: number) => {
    setMinICPScore(value);
    localStorage.setItem('gtm-min-icp-score', value.toString());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Search and filter prospects
  const { filteredProspects, matchedDecisionMakers } = useMemo(() => {
    // First filter by minimum ICP score
    let filtered = prospects.filter(p => p.icpScore >= minICPScore);
    
    // Apply search filter
    const matchedDMs = new Map<number, Set<string>>(); // prospectId -> Set of matched DM names
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(prospect => {
        // Check company name
        if (prospect.name.toLowerCase().includes(query)) {
          return true;
        }
        
        // Check domain
        if (prospect.domain.toLowerCase().includes(query)) {
          return true;
        }
        
        // Check decision makers
        const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
        const matchingDMs = decisionMakers.filter(dm => 
          dm.quality !== 'poor' && (
            dm.name.toLowerCase().includes(query) ||
            dm.role.toLowerCase().includes(query)
          )
        );
        
        if (matchingDMs.length > 0) {
          matchedDMs.set(prospect.id, new Set(matchingDMs.map(dm => dm.name)));
          return true;
        }
        
        return false;
      });
    }
    
    return { filteredProspects: filtered, matchedDecisionMakers: matchedDMs };
  }, [prospects, minICPScore, searchQuery]);

  const sortedProspects = useMemo(() => {
    if (!sortField || !sortDirection) {
      return filteredProspects;
    }

    const sorted = [...filteredProspects].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'domain':
          aValue = a.domain.toLowerCase();
          bValue = b.domain.toLowerCase();
          break;
        case 'source':
          aValue = a.sourceCustomerDomain?.toLowerCase() || '';
          bValue = b.sourceCustomerDomain?.toLowerCase() || '';
          break;
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'icpScore':
          aValue = a.icpScore;
          bValue = b.icpScore;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'quality':
          // Quality: excellent > good > poor > null
          const qualityOrder = { excellent: 3, good: 2, poor: 1 };
          aValue = a.quality ? qualityOrder[a.quality] : 0;
          bValue = b.quality ? qualityOrder[b.quality] : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [filteredProspects, sortField, sortDirection]);

  // Auto-expand rows with matched decision makers
  useEffect(() => {
    if (matchedDecisionMakers.size > 0) {
      setExpandedRows(prev => {
        const newExpanded = new Set(prev);
        matchedDecisionMakers.forEach((_, prospectId) => {
          newExpanded.add(prospectId);
        });
        return newExpanded;
      });
    }
  }, [matchedDecisionMakers]);

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

  const getScoreTooltip = (score: number) => {
    if (score >= 80) {
      return 'Excellent Match (80-100): This prospect closely aligns with your ICP across industries, pain points, and buyer roles. High priority for outreach.';
    }
    if (score >= 60) {
      return 'Good Match (60-79): This prospect matches some key ICP criteria. Worth researching further before outreach.';
    }
    if (score >= 40) {
      return 'Moderate Match (40-59): This prospect has limited alignment with your ICP. Consider if there are other strategic reasons to pursue.';
    }
    return 'Weak Match (0-39): This prospect shows minimal alignment with your ICP. May not be worth immediate attention.';
  };

  const toggleRow = (prospectId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(prospectId)) {
      newExpanded.delete(prospectId);
    } else {
      newExpanded.add(prospectId);
    }
    setExpandedRows(newExpanded);
  };

  const generateDecisionMakers = async (prospect: Company) => {
    setLoadingDecisionMakers(prev => new Set(prev).add(prospect.id));
    
    try {
      // Use ICP buyer roles if available, otherwise use defaults
      const buyerRoles = icp?.buyerRoles && icp.buyerRoles.length > 0 
        ? icp.buyerRoles 
        : ['CEO', 'CTO', 'VP Sales', 'Head of Marketing'];
      
      // Prepare existing decision makers (including those marked as poor quality)
      const existingDMs = (prospect.decisionMakers as DecisionMaker[]) || [];
      const existingDecisionMakers = existingDMs.map(dm => ({
        name: dm.name,
        role: dm.role,
        quality: dm.quality,
      }));
      
      const response = await fetch('/api/decision-makers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: prospect.id,
          companyName: prospect.name,
          companyDomain: prospect.domain,
          buyerRoles,
          existingDecisionMakers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate decision makers');
      }

      const data = await response.json();
      
      // Check if any decision makers were found
      if (data.decisionMakers.length === 0) {
        // Check if we have rejected decision makers
        const rejectedCount = existingDMs.filter(dm => dm.quality === 'poor').length;
        
        if (rejectedCount > 0) {
          toast.info(`No additional decision makers found. The AI couldn't find other contacts beyond the ${rejectedCount} you already rejected. Try adding contacts manually or check back later.`, {
            duration: 6000,
          });
        } else {
          toast.info('No public decision maker data found for this company. Click "Add Manually" to add contacts yourself.');
        }
        return;
      }
      
      // Decision makers are already saved to database by the API
      // We need to fetch the updated company from database to get the merged decision makers
      // For now, manually merge in the UI (the backend already saved them)
      const updatedProspect = {
        ...prospect,
        decisionMakers: [...existingDMs, ...data.decisionMakers],
      };
      
      // Update the local state only - don't call the API again since decision-makers endpoint already saved to DB
      onProspectUpdate(updatedProspect);
      
      // Show success message - we only return real data now
      toast.success(`Added ${data.decisionMakers.length} new decision maker${data.decisionMakers.length > 1 ? 's' : ''} from web search!`);
    } catch (error) {
      console.error('Error generating decision makers:', error);
      toast.error('Failed to generate decision makers');
    } finally {
      setLoadingDecisionMakers(prev => {
        const next = new Set(prev);
        next.delete(prospect.id);
        return next;
      });
    }
  };

  const updateDecisionMakerQuality = async (
    prospect: Company,
    dmIndex: number,
    quality: 'good' | 'poor'
  ) => {
    try {
      const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
      const updatedDMs = decisionMakers.map((dm, idx) => 
        idx === dmIndex ? { ...dm, quality } : dm
      );
      
      const updatedProspect = {
        ...prospect,
        decisionMakers: updatedDMs,
      };
      
      onProspectUpdate(updatedProspect);
      
      if (quality === 'good') {
        toast.success('Marked as relevant');
      } else {
        toast.info('Marked as not relevant. This person won\'t be suggested again.');
      }
    } catch (error) {
      console.error('Error updating decision maker quality:', error);
      toast.error('Failed to update quality');
    }
  };

  const updateDecisionMakerStatus = async (
    prospect: Company,
    dmName: string,
    status: DecisionMaker['contactStatus']
  ) => {
    try {
      // In mock mode, we handle updates client-side only
      // The backend mock DB doesn't persist between requests
      // In production with a real DB, this would call the API
      
      // Update the prospect with updated decision maker
      const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
      const updatedDMs = decisionMakers.map(dm => 
        dm.name === dmName ? { ...dm, contactStatus: status } : dm
      );
      
      const updatedProspect = {
        ...prospect,
        decisionMakers: updatedDMs,
      };
      
      onProspectUpdate(updatedProspect);
      toast.success('Contact status updated');
      
      // If we had a real database connection, we'd do:
      // const response = await fetch('/api/decision-makers/update-status', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     companyId: prospect.id,
      //     decisionMakerName: dmName,
      //     contactStatus: status,
      //   }),
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to update status');
      // }
    } catch (error) {
      console.error('Error updating decision maker status:', error);
      toast.error('Failed to update status');
    }
  };

  const startEditingDM = (prospect: Company, dmIndex: number) => {
    const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
    setEditingDM({ prospectId: prospect.id, dmIndex });
    setEditedDMData({ ...decisionMakers[dmIndex] });
  };

  const cancelEditingDM = () => {
    setEditingDM(null);
    setEditedDMData(null);
  };

  const saveDecisionMaker = (prospect: Company, dmIndex: number) => {
    if (!editedDMData) return;

    try {
      const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
      const updatedDMs = [...decisionMakers];
      updatedDMs[dmIndex] = editedDMData;

      const updatedProspect = {
        ...prospect,
        decisionMakers: updatedDMs,
      };

      onProspectUpdate(updatedProspect);
      toast.success('Decision maker updated');
      cancelEditingDM();
    } catch (error) {
      console.error('Error updating decision maker:', error);
      toast.error('Failed to update decision maker');
    }
  };

  const deleteDecisionMaker = (prospect: Company, dmIndex: number) => {
    if (!confirm('Are you sure you want to delete this decision maker? They won\'t be suggested again if you regenerate.')) {
      return;
    }

    try {
      const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
      
      // Mark as poor quality before deleting so AI knows not to suggest again
      const updatedDMs = decisionMakers.map((dm, idx) => 
        idx === dmIndex ? { ...dm, quality: 'poor' as const } : dm
      );

      const updatedProspect = {
        ...prospect,
        decisionMakers: updatedDMs,
      };

      onProspectUpdate(updatedProspect);
      toast.success('Decision maker marked as not relevant and will be hidden');
      
      // Note: We're keeping them with 'poor' quality rather than actually deleting
      // This way the AI knows not to suggest them again on regeneration
    } catch (error) {
      console.error('Error deleting decision maker:', error);
      toast.error('Failed to delete decision maker');
    }
  };

  const startAddingManualDM = (prospectId: number) => {
    setAddingManualDM(prospectId);
    setManualDMData({
      name: '',
      role: '',
      linkedin: '',
      email: '',
      phone: '',
      contactStatus: 'Not Contacted',
    });
  };

  const cancelAddingManualDM = () => {
    setAddingManualDM(null);
    setManualDMData({
      name: '',
      role: '',
      linkedin: '',
      email: '',
      phone: '',
      contactStatus: 'Not Contacted',
    });
  };

  const saveManualDM = (prospect: Company) => {
    if (!manualDMData.name.trim() || !manualDMData.role.trim()) {
      toast.error('Name and role are required');
      return;
    }

    try {
      const existingDMs = (prospect.decisionMakers as DecisionMaker[]) || [];
      const updatedProspect = {
        ...prospect,
        decisionMakers: [...existingDMs, manualDMData],
      };

      onProspectUpdate(updatedProspect);
      toast.success('Decision maker added manually');
      cancelAddingManualDM();
    } catch (error) {
      console.error('Error adding manual decision maker:', error);
      toast.error('Failed to add decision maker');
    }
  };

  const getContactStatusColor = (status: DecisionMaker['contactStatus']) => {
    switch (status) {
      case 'Not Contacted': return 'bg-gray-100 text-gray-800';
      case 'Attempted': return 'bg-yellow-100 text-yellow-800';
      case 'Connected': return 'bg-blue-100 text-blue-800';
      case 'Responded': return 'bg-green-100 text-green-800';
      case 'Unresponsive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateProspectQuality = async (prospect: Company, quality: 'excellent' | 'good' | 'poor' | null) => {
    try {
      // In mock mode, we handle updates client-side only
      // The backend mock DB doesn't persist between requests
      // In production with a real DB, this would call the API
      
      // Update the prospect with new quality
      const updatedProspect = {
        ...prospect,
        quality,
      };
      
      onProspectUpdate(updatedProspect);
      toast.success('Feedback saved');
      
      // If we had a real database connection, we'd do:
      // const response = await fetch('/api/quality', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     companyId: prospect.id,
      //     quality,
      //   }),
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to update quality');
      // }
    } catch (error) {
      console.error('Error updating quality:', error);
      toast.error('Failed to save feedback');
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    try {
      // Call the API to delete from database
      const response = await fetch('/api/company', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete company');
      }
      
      // Signal deletion to parent component using a special marker
      const companyToDelete = prospects.find(p => p.id === id);
      if (companyToDelete) {
        onProspectUpdate({ ...companyToDelete, id, status: 'Lost', domain: `__DELETE_${id}__` } as Company);
      }
      
      toast.success('Company deleted from database successfully');
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete company');
    }
  };

  const startAddingManualProspect = () => {
    setAddingManualProspect(true);
    setManualProspectData({
      name: '',
      domain: '',
      useAI: true,
    });
  };

  const cancelAddingManualProspect = () => {
    setAddingManualProspect(false);
    setManualProspectData({
      name: '',
      domain: '',
      useAI: true,
    });
  };

  const findCompetitors = async (prospect: Company) => {
    if (!icp) {
      toast.error('ICP profile not found. Please run an analysis first.');
      return;
    }

    // Mark this prospect as having competitors being searched
    setFindingCompetitors(prev => new Set(prev).add(prospect.id));
    setCompetitorProgress([]); // Clear previous progress

    try {
      const response = await fetch('/api/company/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: prospect.name,
          companyDomain: prospect.domain,
          icp,
          existingProspects: prospects.map(p => ({
            id: p.id,
            domain: p.domain,
            name: p.name,
          })),
          batchSize: 10, // Find up to 10 competitors
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start competitor search');
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let finalResult: { success: boolean; competitors: Company[]; message?: string; error?: string } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE events (format: "data: {...}\n\n")
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.done) {
                // Final result
                finalResult = data;
              } else if (data.message) {
                // Progress update
                setCompetitorProgress(prev => [...prev, { message: data.message, type: data.type || 'info' }]);
                
                // Also show as toast for key updates
                if (data.type === 'success' && data.message.includes('Complete')) {
                  // Will show final toast after stream completes
                } else if (data.type === 'error') {
                  toast.error(data.message);
                }
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Handle final result
      if (finalResult && finalResult.success && finalResult.competitors.length > 0) {
        // Add new competitors to the list - batch update
        const newCompetitors = finalResult.competitors as Company[];
        
        // Update localStorage first
        const savedData = localStorage.getItem('gtm-data');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          parsed.prospects = [...(parsed.prospects || []), ...newCompetitors];
          localStorage.setItem('gtm-data', JSON.stringify(parsed));
        }

        // Add to UI - batch update by calling onProspectUpdate for each
        // This ensures the parent component's state is updated
        newCompetitors.forEach((competitor: Company) => {
          onProspectUpdate(competitor);
        });

        // Force a small delay to ensure state updates have processed
        setTimeout(() => {
          toast.success(`Found and added ${newCompetitors.length} competitor(s) of ${prospect.name}!`);
        }, 100);
        
        // Clear progress after a delay
        setTimeout(() => {
          setCompetitorProgress([]);
        }, 3000);
      } else if (finalResult) {
        toast.info(finalResult.message || `No new competitors found for ${prospect.name}.`);
        setTimeout(() => {
          setCompetitorProgress([]);
        }, 2000);
      }

    } catch (error) {
      console.error('Find competitors error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to find competitors';
      toast.error(errorMessage);
      setCompetitorProgress(prev => [...prev, { message: `Error: ${errorMessage}`, type: 'error' }]);
    } finally {
      // Remove from loading state
      setFindingCompetitors(prev => {
        const next = new Set(prev);
        next.delete(prospect.id);
        return next;
      });
    }
  };

  const saveManualProspect = async () => {
    if (!manualProspectData.name || !manualProspectData.domain) {
      toast.error('Please enter both company name and domain');
      return;
    }

    setIsAnalyzingProspect(true);

    try {
      let newProspect: Company;

      if (manualProspectData.useAI && icp) {
        // Use AI to analyze the prospect
        toast.info('Analyzing prospect with AI...');
        
        const response = await fetch('/api/company/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: manualProspectData.name,
            domain: manualProspectData.domain,
            icp,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze prospect');
        }

        const data = await response.json();
        
        newProspect = {
          id: Date.now(), // Temporary ID
          userId: 'demo-user',
          name: manualProspectData.name,
          domain: manualProspectData.domain,
          source: 'expanded' as const,
          sourceCustomerDomain: null,
          icpScore: data.icpScore,
          confidence: data.confidence,
          status: 'New' as const,
          rationale: data.rationale,
          evidence: data.evidence,
          decisionMakers: null,
          quality: null,
          notes: 'Manually added prospect',
          tags: null,
          relatedCompanyIds: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        toast.success('Prospect analyzed and added!');
      } else {
        // Add manually without AI analysis
        newProspect = {
          id: Date.now(), // Temporary ID
          userId: 'demo-user',
          name: manualProspectData.name,
          domain: manualProspectData.domain,
          source: 'expanded' as const,
          sourceCustomerDomain: null,
          icpScore: 50, // Default score
          confidence: 50, // Default confidence
          status: 'New' as const,
          rationale: 'Manually added prospect - no AI analysis performed',
          evidence: [],
          decisionMakers: null,
          quality: null,
          notes: 'Manually added prospect',
          tags: null,
          relatedCompanyIds: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        toast.success('Prospect added successfully!');
      }

      // Add to prospects list
      onProspectUpdate(newProspect);
      
      // Update localStorage
      const savedData = localStorage.getItem('gtm-data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        parsed.prospects = [...(parsed.prospects || []), newProspect];
        localStorage.setItem('gtm-data', JSON.stringify(parsed));
      }

      // Reset form
      cancelAddingManualProspect();
    } catch (error) {
      console.error('Error adding manual prospect:', error);
      toast.error('Failed to add prospect');
    } finally {
      setIsAnalyzingProspect(false);
    }
  };

  const handleImportComplete = async () => {
    // Refresh prospects list from database
    try {
      const response = await fetch('/api/prospects');
      if (response.ok) {
        const data = await response.json();
        // Update prospects via parent component
        data.prospects.forEach((prospect: Company) => {
          onProspectUpdate(prospect);
        });
      }
    } catch (error) {
      console.error('Failed to refresh prospects:', error);
    }
  };

  if (prospects.length === 0 && !addingManualProspect) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No prospects found. Run an analysis to get started.</p>
        <button
          onClick={startAddingManualProspect}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Prospect Manually
        </button>
      </div>
    );
  }

  const getProgressIcon = (type: 'info' | 'success' | 'error') => {
    if (type === 'success') return '✅';
    if (type === 'error') return '❌';
    return '⏳';
  };

  return (
    <>
      {/* Competitor Search Progress Panel - Fixed Side Panel */}
      {competitorProgress.length > 0 && (
        <div className="fixed left-2 right-2 md:left-4 md:right-auto top-20 bottom-4 w-auto md:w-80 z-50 flex flex-col bg-white border-2 border-blue-300 rounded-lg shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b border-blue-200 bg-blue-50">
            <h3 className="text-sm font-semibold text-blue-900 flex items-center">
              <Search className="h-4 w-4 mr-2 animate-pulse" />
              Finding Competitors
            </h3>
            <button
              onClick={() => setCompetitorProgress([])}
              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded"
              title="Close progress panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div 
            ref={progressContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {competitorProgress.map((progress, idx) => (
              <div 
                key={idx} 
                className={`text-xs flex items-start ${
                  progress.type === 'success' ? 'text-green-700' : 
                  progress.type === 'error' ? 'text-red-700' : 
                  'text-blue-700'
                }`}
              >
                <span className="mr-2 flex-shrink-0 mt-0.5">{getProgressIcon(progress.type)}</span>
                <span className="flex-1 leading-relaxed">{progress.message}</span>
              </div>
            ))}
          </div>
          {findingCompetitors.size > 0 && (
            <div className="p-3 border-t border-blue-200 bg-blue-50">
              <div className="text-xs text-blue-600 flex items-center">
                <svg className="animate-spin h-3 w-3 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-medium">Processing...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 py-2 w-full md:w-80 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ICP Score Filter */}
      <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 md:gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs md:text-sm font-medium text-gray-900 flex flex-wrap items-center gap-1">
              <span>ICP Score Filter</span>
              <span className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap">
                ({sortedProspects.length} of {prospects.length} shown)
              </span>
            </h3>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1">
              Only show prospects with ICP score ≥ {minICPScore}%
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button
              onClick={() => handleICPScoreChange(0)}
              className="text-[10px] md:text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap px-2 py-1 hover:bg-blue-50 rounded"
            >
              Show All
            </button>
            <button
              onClick={() => handleICPScoreChange(70)}
              className="text-[10px] md:text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap px-2 py-1 hover:bg-blue-50 rounded"
            >
              High Quality (70+)
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={minICPScore}
            onChange={(e) => handleICPScoreChange(parseInt(e.target.value, 10))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center">
            <span className="text-xs md:text-sm font-medium text-gray-700 min-w-[2.5rem] md:min-w-[3rem] text-right">
              {minICPScore}%
            </span>
          </div>
        </div>
        
        {/* Score ranges legend */}
        <div className="mt-2 md:mt-3 flex items-center justify-between text-[9px] md:text-xs text-gray-500">
          <span className="whitespace-nowrap">0 (Poor)</span>
          <span className="whitespace-nowrap">50 (Medium)</span>
          <span className="whitespace-nowrap">100 (Perfect)</span>
        </div>
        
        {/* Explanation */}
        <div className="mt-3 md:mt-4 p-2 md:p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-[10px] md:text-xs text-blue-800 leading-relaxed">
            <strong>💡 Understanding the Scores:</strong><br/>
            <strong>ICP Score</strong> = How well the prospect matches your Ideal Customer Profile (industry, pain points, size, etc.)<br/>
            <strong>Confidence</strong> = How certain the AI is about its assessment (based on data quality and evidence strength)
          </p>
          <p className="text-[10px] md:text-xs text-blue-700 mt-2 leading-relaxed">
            Example: <strong>ICP 95%, Confidence 80%</strong> = Excellent match, reliable data ✅<br/>
            Example: <strong>ICP 10%, Confidence 75%</strong> = Poor match, but we&apos;re sure about it ❌<br/>
            Example: <strong>ICP 85%, Confidence 30%</strong> = Might be good, verify manually ⚠️
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto" style={{ paddingTop: '180px', marginTop: '-180px' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('domain')}
              >
                <div className="flex items-center">
                Domain
                  {getSortIcon('domain')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('source')}
              >
                <div className="flex items-center">
                  Source
                  {getSortIcon('source')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center">
                  Conf.
                  {getSortIcon('confidence')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('icpScore')}
              >
                <div className="flex items-center">
                  ICP
                  {getSortIcon('icpScore')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                Status
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('quality')}
              >
                <div className="flex items-center">
                  Quality
                  {getSortIcon('quality')}
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProspects.length === 0 && searchQuery ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Search className="h-12 w-12 text-gray-300" />
                    <p className="text-gray-500 font-medium">No results found</p>
                    <p className="text-sm text-gray-400">
                      No prospects or decision makers match &quot;{searchQuery}&quot;
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear search
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sortedProspects.map((prospect) => {
                const isExpanded = expandedRows.has(prospect.id);
                const allDecisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
                // Filter out decision makers marked as poor quality (rejected/deleted)
                const decisionMakers = allDecisionMakers.filter(dm => dm.quality !== 'poor');
                
                return (
                <React.Fragment key={prospect.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors"
                    onMouseEnter={() => setHoveredRow(prospect.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                <td className="px-3 py-3">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleRow(prospect.id)}
                      className="flex items-center text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors mr-2"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={() => setDetailModalCompany(prospect)}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors max-w-[160px] truncate text-left"
                      title={`View details for ${prospect.name}`}
                    >
                  {prospect.name}
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {(() => {
                    const domain = prospect.domain.toLowerCase().trim();
                    const invalidDomains = ['n/a', 'na', 'unknown', 'not found', 'none', 'n'];
                    const isInvalid = invalidDomains.includes(domain) || domain.length < 3 || !domain.includes('.');
                    
                    if (isInvalid) {
                      return (
                        <span className="text-sm text-gray-400 italic" title="Domain not available">
                          N/A
                        </span>
                      );
                    }
                    
                    return (
                      <a
                        href={prospect.domain.startsWith('http') ? prospect.domain : `https://${prospect.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 max-w-[180px] truncate block"
                        title={prospect.domain}
                  >
                    {prospect.domain}
                  </a>
                    );
                  })()}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500 hidden md:table-cell max-w-[150px] truncate" title={prospect.sourceCustomerDomain || '-'}>
                  {prospect.sourceCustomerDomain || '-'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                  <div className="group relative">
                    <span 
                      className="cursor-help inline-block"
                      onClick={() => setActiveTooltip(activeTooltip === `conf-${prospect.id}` ? null : `conf-${prospect.id}`)}
                    >
                  {prospect.confidence}%
                    </span>
                    <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-[320px] sm:w-[350px] px-4 py-3 text-xs leading-relaxed text-white bg-gray-900 rounded-lg shadow-xl whitespace-normal break-words ${activeTooltip === `conf-${prospect.id}` ? 'block' : 'hidden group-hover:block'}`}>
                      <strong>Confidence Score:</strong> This indicates how certain the AI is about this match. Higher scores mean stronger evidence was found linking this prospect to your ICP criteria.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm">
                  <div className="group relative">
                    <span 
                      className={`font-medium ${getScoreColor(prospect.icpScore)} cursor-help inline-block`}
                      onClick={() => setActiveTooltip(activeTooltip === `icp-${prospect.id}` ? null : `icp-${prospect.id}`)}
                    >
                    {prospect.icpScore}
                  </span>
                    <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-[320px] sm:w-[350px] px-4 py-3 text-xs leading-relaxed text-white bg-gray-900 rounded-lg shadow-xl whitespace-normal break-words ${activeTooltip === `icp-${prospect.id}` ? 'block' : 'hidden group-hover:block'}`}>
                      {getScoreTooltip(prospect.icpScore)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <select
                    value={prospect.status}
                    onChange={(e) => handleStatusChange(prospect.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(prospect.status)} border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                  >
                    <option value="New">New</option>
                    <option value="Researching">Researching</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => updateProspectQuality(prospect, prospect.quality === 'excellent' ? null : 'excellent')}
                      className={`p-1 rounded hover:bg-green-50 ${prospect.quality === 'excellent' ? 'bg-green-50' : ''}`}
                      title="Excellent prospect"
                    >
                      <ThumbsUp className={`h-3.5 w-3.5 ${prospect.quality === 'excellent' ? 'text-green-600 fill-green-600' : 'text-gray-400'}`} />
                    </button>
                    <button
                      onClick={() => updateProspectQuality(prospect, prospect.quality === 'poor' ? null : 'poor')}
                      className={`p-1 rounded hover:bg-red-50 ${prospect.quality === 'poor' ? 'bg-red-50' : ''}`}
                      title="Poor prospect"
                    >
                      <ThumbsDown className={`h-3.5 w-3.5 ${prospect.quality === 'poor' ? 'text-red-600 fill-red-600' : 'text-gray-400'}`} />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => openEvidenceModal(prospect)}
                      className={`text-blue-600 hover:text-blue-800 flex items-center transition-all p-1 hover:bg-blue-50 rounded ${
                        hoveredRow === prospect.id ? 'opacity-100' : 'opacity-100 md:opacity-0'
                      }`}
                      title="View Evidence"
                  >
                      <Eye className="h-4 w-4" />
                      <span className="ml-1 hidden lg:inline">Evidence</span>
                  </button>
                    <button
                      onClick={() => findCompetitors(prospect)}
                      disabled={findingCompetitors.has(prospect.id)}
                      className={`text-purple-600 hover:text-purple-800 flex items-center transition-all p-1 hover:bg-purple-50 rounded ${
                        hoveredRow === prospect.id ? 'opacity-100' : 'opacity-100 md:opacity-0'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Find Competitors"
                    >
                      {findingCompetitors.has(prospect.id) ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </button>
                    {onMarkAsCustomer && (
                      <button
                        onClick={() => onMarkAsCustomer(prospect)}
                        className={`text-green-600 hover:text-green-800 flex items-center transition-all p-1 hover:bg-green-50 rounded ${
                          hoveredRow === prospect.id ? 'opacity-100' : 'opacity-100 md:opacity-0'
                        }`}
                        title="Mark as Customer"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCompany(prospect.id)}
                      className={`text-red-600 hover:text-red-800 flex items-center transition-all p-1 hover:bg-red-50 rounded ${
                        hoveredRow === prospect.id ? 'opacity-100' : 'opacity-100 md:opacity-0'
                      }`}
                      title="Delete company"
                    >
                      <Trash2 className="h-4 w-4" />
                  </button>
                  </div>
                </td>
              </tr>
              
              {/* Expandable Decision Makers Row */}
              {isExpanded && (
                <tr>
                  <td colSpan={8} className="p-0 md:px-3 md:py-4 bg-gray-50">
                    <div className="px-3 py-3 md:px-0 md:py-0 w-screen max-w-[100vw] md:w-auto md:max-w-full space-y-2 md:space-y-3 bg-gray-50 box-border">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h4 className="text-xs md:text-sm font-medium text-gray-900 flex items-center">
                          <Users className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1.5 md:mr-2" />
                          Decision Makers
                        </h4>
                        {decisionMakers.length === 0 && addingManualDM !== prospect.id && (
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            <button
                              onClick={() => generateDecisionMakers(prospect)}
                              disabled={loadingDecisionMakers.has(prospect.id)}
                              className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center whitespace-nowrap"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {loadingDecisionMakers.has(prospect.id) ? 'Searching...' : 'Find via AI'}
                            </button>
                            <button
                              onClick={() => startAddingManualDM(prospect.id)}
                              className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 whitespace-nowrap"
                            >
                              <UserPlus className="h-3 w-3 inline mr-1" />
                              Add Manually
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Manual Input Form */}
                      {addingManualDM === prospect.id && (
                        <div className="bg-white border-2 border-blue-500 rounded-lg p-2 md:p-4 space-y-2 md:space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs md:text-sm font-medium text-gray-900">Add Decision Maker Manually</h5>
                            <button
                              onClick={cancelAddingManualDM}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3.5 md:h-4 w-3.5 md:w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 md:gap-3">
                            <div>
                              <label className="text-xs text-gray-700 font-medium">Name *</label>
                              <input
                                type="text"
                                value={manualDMData.name}
                                onChange={(e) => setManualDMData({ ...manualDMData, name: e.target.value })}
                                placeholder="John Smith"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 text-gray-900 bg-white rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-700 font-medium">Role *</label>
                              <input
                                type="text"
                                value={manualDMData.role}
                                onChange={(e) => setManualDMData({ ...manualDMData, role: e.target.value })}
                                placeholder="CEO"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 text-gray-900 bg-white rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-700 font-medium">LinkedIn</label>
                              <input
                                type="url"
                                value={manualDMData.linkedin}
                                onChange={(e) => setManualDMData({ ...manualDMData, linkedin: e.target.value })}
                                placeholder="https://linkedin.com/in/..."
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 text-gray-900 bg-white rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-700 font-medium">Email</label>
                              <input
                                type="email"
                                value={manualDMData.email}
                                onChange={(e) => setManualDMData({ ...manualDMData, email: e.target.value })}
                                placeholder="john@company.com"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 text-gray-900 bg-white rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-700 font-medium">Phone</label>
                              <input
                                type="tel"
                                value={manualDMData.phone}
                                onChange={(e) => setManualDMData({ ...manualDMData, phone: e.target.value })}
                                placeholder="+44 20 1234 5678"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 text-gray-900 bg-white rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <button
                              onClick={cancelAddingManualDM}
                              className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveManualDM(prospect)}
                              className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save Decision Maker
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {decisionMakers.length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 gap-2 md:gap-3">
                            {decisionMakers.map((dm, idx) => {
                              const isEditing = editingDM?.prospectId === prospect.id && editingDM?.dmIndex === idx;
                              const isMatched = matchedDecisionMakers.get(prospect.id)?.has(dm.name);
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={`bg-white border rounded-lg p-2 md:p-3 transition-all ${
                                    isMatched 
                                      ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' 
                                      : 'border-gray-200'
                                  }`}
                                >
                                  {isEditing && editedDMData ? (
                                    // Edit mode
                                    <div className="space-y-2">
                                      <div>
                                        <label className="text-xs text-gray-700 font-medium">Name</label>
                                        <input
                                          type="text"
                                          value={editedDMData.name}
                                          onChange={(e) => setEditedDMData({ ...editedDMData, name: e.target.value })}
                                          className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-700 font-medium">Role</label>
                                        <input
                                          type="text"
                                          value={editedDMData.role}
                                          onChange={(e) => setEditedDMData({ ...editedDMData, role: e.target.value })}
                                          className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-700 font-medium">LinkedIn URL</label>
                                        <input
                                          type="text"
                                          value={editedDMData.linkedin || ''}
                                          onChange={(e) => setEditedDMData({ ...editedDMData, linkedin: e.target.value })}
                                          className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="https://linkedin.com/in/..."
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-700 font-medium">Email</label>
                                        <input
                                          type="email"
                                          value={editedDMData.email || ''}
                                          onChange={(e) => setEditedDMData({ ...editedDMData, email: e.target.value })}
                                          className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="email@example.com"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-700 font-medium">Phone</label>
                                        <input
                                          type="tel"
                                          value={editedDMData.phone || ''}
                                          onChange={(e) => setEditedDMData({ ...editedDMData, phone: e.target.value })}
                                          className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="+1 (555) 123-4567"
                                        />
                                      </div>
                                      <div className="flex gap-2 mt-3">
                                        <button
                                          onClick={() => saveDecisionMaker(prospect, idx)}
                                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                        >
                                          <Save className="h-3 w-3 mr-1" />
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEditingDM}
                                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View mode
                                    <>
                                      <div className="flex items-start justify-between mb-1.5 md:mb-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-xs md:text-sm text-gray-900 truncate">{dm.name}</p>
                                          <p className="text-[10px] md:text-xs text-gray-500 truncate">{dm.role}</p>
                                        </div>
                                        <div className="flex items-center gap-0.5 md:gap-1 ml-2 flex-shrink-0">
                                          <button
                                            onClick={() => updateDecisionMakerQuality(prospect, idx, 'good')}
                                            className={`p-0.5 md:p-1 rounded transition-colors ${
                                              dm.quality === 'good' 
                                                ? 'text-green-600 bg-green-50' 
                                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                            }`}
                                            title="Mark as relevant and accurate"
                                          >
                                            <ThumbsUp className="h-3 md:h-3.5 w-3 md:w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => updateDecisionMakerQuality(prospect, idx, 'poor')}
                                            className={`p-0.5 md:p-1 rounded transition-colors ${
                                              dm.quality === 'poor' 
                                                ? 'text-red-600 bg-red-50' 
                                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                            }`}
                                            title="Mark as incorrect or irrelevant (won't be suggested again)"
                                          >
                                            <ThumbsDown className="h-3 md:h-3.5 w-3 md:w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => startEditingDM(prospect, idx)}
                                            className="p-0.5 md:p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit decision maker"
                                          >
                                            <Edit2 className="h-3 md:h-3.5 w-3 md:w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => deleteDecisionMaker(prospect, idx)}
                                            className="p-0.5 md:p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete decision maker"
                                          >
                                            <Trash2 className="h-3 md:h-3.5 w-3 md:w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="mb-1.5 md:mb-2">
                                        <select
                                          value={dm.contactStatus}
                                          onChange={(e) => updateDecisionMakerStatus(
                                            prospect,
                                            dm.name,
                                            e.target.value as DecisionMaker['contactStatus']
                                          )}
                                          className={`text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full font-medium ${getContactStatusColor(dm.contactStatus)} border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full`}
                                        >
                                          <option value="Not Contacted">Not Contacted</option>
                                          <option value="Attempted">Attempted</option>
                                          <option value="Connected">Connected</option>
                                          <option value="Responded">Responded</option>
                                          <option value="Unresponsive">Unresponsive</option>
                                        </select>
                                      </div>
                                      
                                      <div className="space-y-0.5 md:space-y-1">
                                        {dm.linkedin && (
                                          <a
                                            href={dm.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-[10px] md:text-xs text-blue-600 hover:text-blue-800 truncate"
                                          >
                                            <Linkedin className="h-3 w-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">LinkedIn Profile</span>
                                          </a>
                                        )}
                                        {dm.email && (
                                          <div className="flex items-center gap-1 md:gap-2">
                                            <a
                                              href={`mailto:${dm.email}`}
                                              className="flex items-center text-[10px] md:text-xs text-gray-600 hover:text-gray-800 truncate min-w-0"
                                            >
                                              <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                                              <span className="truncate">{dm.email}</span>
                                            </a>
                                            {dm.emailSource === 'generated' && (
                                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex-shrink-0" title="This email was generated using common patterns, not found in search results">
                                                likely
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {dm.phone && (
                                          <a
                                            href={`tel:${dm.phone}`}
                                            className="flex items-center text-[10px] md:text-xs text-gray-600 hover:text-gray-800 truncate"
                                          >
                                            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">{dm.phone}</span>
                                          </a>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-2 md:mt-3 flex flex-col sm:flex-row justify-start gap-1.5 md:gap-2">
                            <button
                              onClick={() => generateDecisionMakers(prospect)}
                              disabled={loadingDecisionMakers.has(prospect.id)}
                              className="text-[10px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 bg-white border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center whitespace-nowrap"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {loadingDecisionMakers.has(prospect.id) ? 'Searching...' : 'Find More via AI'}
                            </button>
                            <button
                              onClick={() => startAddingManualDM(prospect.id)}
                              className="text-[10px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center whitespace-nowrap"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add Manually
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No decision makers generated yet. Click the button above to generate them.</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
                </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Generate More Prospects & Add Manually Buttons */}
      <div className="mt-6 flex justify-center gap-4">
        {onGenerateMore && (
          <button
            onClick={onGenerateMore}
            className="inline-flex items-center px-6 py-3 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Generate More Prospects
          </button>
        )}
        <button
          onClick={startAddingManualProspect}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Add Prospect Manually
        </button>
      </div>

      {/* Manual Prospect Addition Form */}
      {addingManualProspect && (
        <div className="mt-6 max-w-2xl mx-auto p-6 bg-white border-2 border-blue-500 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
              Add Prospect Manually
            </h3>
            <button
              onClick={cancelAddingManualProspect}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={manualProspectData.name}
                onChange={(e) => setManualProspectData({ ...manualProspectData, name: e.target.value })}
                placeholder="e.g., Acme Corporation"
                className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isAnalyzingProspect}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Domain *
              </label>
              <input
                type="text"
                value={manualProspectData.domain}
                onChange={(e) => setManualProspectData({ ...manualProspectData, domain: e.target.value })}
                placeholder="e.g., acme.com"
                className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isAnalyzingProspect}
              />
              <p className="mt-1 text-xs text-gray-500">Enter domain without https:// or www.</p>
            </div>

            {icp && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={manualProspectData.useAI}
                  onChange={(e) => setManualProspectData({ ...manualProspectData, useAI: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isAnalyzingProspect}
                />
                <label htmlFor="useAI" className="ml-2 block text-sm text-gray-700">
                  Use AI to analyze this prospect against my ICP
                  <span className="text-xs text-gray-500 block">
                    (Fetches website content and calculates ICP score automatically)
                  </span>
                </label>
              </div>
            )}

            {!icp && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  💡 AI analysis not available. Please run an analysis first to extract your ICP profile.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={cancelAddingManualProspect}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isAnalyzingProspect}
              >
                Cancel
              </button>
              <button
                onClick={saveManualProspect}
                disabled={isAnalyzingProspect || !manualProspectData.name || !manualProspectData.domain}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isAnalyzingProspect ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Prospect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {isModalOpen && selectedProspect && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-2 md:p-4"
          onClick={closeModal}
        >
          <div 
            className="relative top-2 md:top-20 mx-auto p-3 md:p-5 border w-full md:w-3/4 lg:w-1/2 max-w-2xl shadow-lg rounded-md bg-white mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-1 md:mt-3">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <h3 className="text-sm md:text-lg font-medium text-gray-900 pr-2">
                  Evidence for {selectedProspect.name}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 md:h-6 w-5 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-3 md:mb-4 space-y-1 md:space-y-2">
                <p className="text-xs md:text-sm text-gray-600">
                  <strong className="font-semibold">Rationale:</strong> {selectedProspect.rationale}
                </p>
                <p className="text-xs md:text-sm text-gray-600">
                  <strong className="font-semibold">Confidence:</strong> {selectedProspect.confidence}% | 
                  <strong className="font-semibold"> ICP Score:</strong> {selectedProspect.icpScore}
                </p>
              </div>

              <div className="space-y-2 md:space-y-4">
                <h4 className="text-xs md:text-sm font-semibold text-gray-900">Evidence URLs:</h4>
                {(selectedProspect.evidence as Evidence[]).map((evidence, index) => (
                  <div key={index} className="border rounded-md p-2 md:p-3 bg-gray-50">
                    <a
                      href={evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium break-all"
                    >
                      {evidence.url}
                    </a>
                    {evidence.snippet && (
                      <p className="text-[10px] md:text-sm text-gray-600 mt-1">
                        {evidence.snippet}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 md:mt-6 flex justify-end">
                <button
                  onClick={closeModal}
                  className="bg-gray-300 text-gray-700 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Detail Modal */}
      {detailModalCompany && (
        <CompanyDetailModal
          company={detailModalCompany}
          allCompanies={prospects}
          icp={icp}
          onClose={() => setDetailModalCompany(null)}
          onUpdate={(updated) => {
            onProspectUpdate(updated);
            // Update the modal's displayed company data so changes are reflected
            setDetailModalCompany(updated);
          }}
          onDelete={(id) => {
            handleDeleteCompany(id);
            setDetailModalCompany(null);
          }}
        />
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal?.(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
