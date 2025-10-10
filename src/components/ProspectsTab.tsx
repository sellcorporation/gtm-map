'use client';

import React, { useState, useMemo } from 'react';
import { Eye, ChevronDown, ChevronRight, Users, Mail, Phone, Linkedin, ThumbsUp, ThumbsDown, Plus, Edit2, Trash2, Save, X, UserPlus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import CompanyDetailModal from './CompanyDetailModal';
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
}

export default function ProspectsTab({ prospects, icp, onStatusUpdate, onProspectUpdate, onGenerateMore, onMarkAsCustomer }: ProspectsTabProps) {
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
  const [addingManualDM, setAddingManualDM] = useState<number | null>(null);
  const [manualDMData, setManualDMData] = useState<DecisionMaker>({
    name: '',
    role: '',
    linkedin: '',
    email: '',
    phone: '',
    contactStatus: 'Not Contacted',
  });

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

  const sortedProspects = useMemo(() => {
    if (!sortField || !sortDirection) {
      return prospects;
    }

    const sorted = [...prospects].sort((a, b) => {
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
  }, [prospects, sortField, sortDirection]);

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
      
      const response = await fetch('/api/decision-makers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: prospect.id,
          companyName: prospect.name,
          companyDomain: prospect.domain,
          buyerRoles,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate decision makers');
      }

      const data = await response.json();
      
      // Check if any decision makers were found
      if (data.decisionMakers.length === 0) {
        toast.info('No public decision maker data found for this company. Click "Add Manually" to add contacts yourself.');
        return;
      }
      
      // Append new decision makers to existing ones (if any)
      const existingDMs = (prospect.decisionMakers as DecisionMaker[]) || [];
      const updatedProspect = {
        ...prospect,
        decisionMakers: [...existingDMs, ...data.decisionMakers],
      };
      
      onProspectUpdate(updatedProspect);
      
      // Show success message - we only return real data now
      toast.success(`Added ${data.decisionMakers.length} real decision maker${data.decisionMakers.length > 1 ? 's' : ''} from web search!`);
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
    if (!confirm('Are you sure you want to delete this decision maker?')) {
      return;
    }

    try {
      const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
      const updatedDMs = decisionMakers.filter((_, idx) => idx !== dmIndex);

      const updatedProspect = {
        ...prospect,
        decisionMakers: updatedDMs,
      };

      onProspectUpdate(updatedProspect);
      toast.success('Decision maker deleted');
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
      // In mock mode, handle deletions client-side only
      // Signal deletion to parent component using a special marker
      const companyToDelete = prospects.find(p => p.id === id);
      if (companyToDelete) {
        // Use domain as the deletion marker since it's unique
        onProspectUpdate({ ...companyToDelete, id, status: 'Lost', domain: `__DELETE_${id}__` } as Company);
        toast.success('Company deleted successfully');
      }
      
      // If we had a real database connection, we'd do:
      // const response = await fetch('/api/company', {
      //   method: 'DELETE',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ companyId: id }),
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to delete company');
      // }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
    }
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
            {sortedProspects.map((prospect) => {
              const isExpanded = expandedRows.has(prospect.id);
              const decisionMakers = (prospect.decisionMakers as DecisionMaker[]) || [];
              
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
                  <a
                    href={prospect.domain.startsWith('http') ? prospect.domain : `https://${prospect.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 max-w-[180px] truncate block"
                    title={prospect.domain}
                  >
                    {prospect.domain}
                  </a>
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
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEvidenceModal(prospect)}
                      className={`text-blue-600 hover:text-blue-800 flex items-center transition-all ${
                        hoveredRow === prospect.id ? 'opacity-100' : 'opacity-0'
                      }`}
                      title="View Evidence"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="ml-1 hidden lg:inline">Evidence</span>
                    </button>
                    {onMarkAsCustomer && (
                      <button
                        onClick={() => onMarkAsCustomer(prospect)}
                        className={`text-green-600 hover:text-green-800 flex items-center transition-all p-1 hover:bg-green-50 rounded ${
                          hoveredRow === prospect.id ? 'opacity-100' : 'opacity-0'
                        }`}
                        title="Mark as Customer"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCompany(prospect.id)}
                      className={`text-red-600 hover:text-red-800 flex items-center transition-all p-1 hover:bg-red-50 rounded ${
                        hoveredRow === prospect.id ? 'opacity-100' : 'opacity-0'
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
                  <td colSpan={8} className="px-3 py-4 bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Decision Makers
                        </h4>
                        {decisionMakers.length === 0 && addingManualDM !== prospect.id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => generateDecisionMakers(prospect)}
                              disabled={loadingDecisionMakers.has(prospect.id)}
                              className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {loadingDecisionMakers.has(prospect.id) ? 'Searching...' : 'Find via AI'}
                            </button>
                            <button
                              onClick={() => startAddingManualDM(prospect.id)}
                              className="text-xs px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                              <UserPlus className="h-3 w-3 inline mr-1" />
                              Add Manually
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Manual Input Form */}
                      {addingManualDM === prospect.id && (
                        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-900">Add Decision Maker Manually</h5>
                            <button
                              onClick={cancelAddingManualDM}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {decisionMakers.map((dm, idx) => {
                              const isEditing = editingDM?.prospectId === prospect.id && editingDM?.dmIndex === idx;
                              
                              return (
                                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
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
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm text-gray-900 truncate">{dm.name}</p>
                                          <p className="text-xs text-gray-500 truncate">{dm.role}</p>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                          <button
                                            onClick={() => startEditingDM(prospect, idx)}
                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit decision maker"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => deleteDecisionMaker(prospect, idx)}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete decision maker"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="mb-2">
                                        <select
                                          value={dm.contactStatus}
                                          onChange={(e) => updateDecisionMakerStatus(
                                            prospect,
                                            dm.name,
                                            e.target.value as DecisionMaker['contactStatus']
                                          )}
                                          className={`text-xs px-2 py-1 rounded-full font-medium ${getContactStatusColor(dm.contactStatus)} border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full`}
                                        >
                                          <option value="Not Contacted">Not Contacted</option>
                                          <option value="Attempted">Attempted</option>
                                          <option value="Connected">Connected</option>
                                          <option value="Responded">Responded</option>
                                          <option value="Unresponsive">Unresponsive</option>
                                        </select>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        {dm.linkedin && (
                                          <a
                                            href={dm.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-xs text-blue-600 hover:text-blue-800 truncate"
                                          >
                                            <Linkedin className="h-3 w-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">LinkedIn Profile</span>
                                          </a>
                                        )}
                                        {dm.email && (
                                          <a
                                            href={`mailto:${dm.email}`}
                                            className="flex items-center text-xs text-gray-600 hover:text-gray-800 truncate"
                                          >
                                            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">{dm.email}</span>
                                          </a>
                                        )}
                                        {dm.phone && (
                                          <a
                                            href={`tel:${dm.phone}`}
                                            className="flex items-center text-xs text-gray-600 hover:text-gray-800 truncate"
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
                          <div className="mt-3 flex justify-center gap-2">
                            <button
                              onClick={() => generateDecisionMakers(prospect)}
                              disabled={loadingDecisionMakers.has(prospect.id)}
                              className="text-xs px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {loadingDecisionMakers.has(prospect.id) ? 'Searching...' : 'Find More via AI'}
                            </button>
                            <button
                              onClick={() => startAddingManualDM(prospect.id)}
                              className="text-xs px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center"
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
            })}
          </tbody>
        </table>
      </div>

      {/* Generate More Prospects Button */}
      {onGenerateMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onGenerateMore}
            className="inline-flex items-center px-6 py-3 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Generate More Prospects
          </button>
        </div>
      )}

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

      {/* Company Detail Modal */}
      {detailModalCompany && (
        <CompanyDetailModal
          company={detailModalCompany}
          allCompanies={prospects}
          icp={icp}
          onClose={() => setDetailModalCompany(null)}
          onUpdate={(updated) => {
            onProspectUpdate(updated);
            setDetailModalCompany(null);
          }}
          onDelete={(id) => {
            handleDeleteCompany(id);
            setDetailModalCompany(null);
          }}
        />
      )}
    </>
  );
}
