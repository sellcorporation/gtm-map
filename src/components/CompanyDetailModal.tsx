'use client';

import React, { useState } from 'react';
import { X, Save, Trash2, ExternalLink, Tag, Building2, Users, FileText, RefreshCw, Calendar, Clock, ChevronDown, ChevronRight, Mail, Phone, Linkedin, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Company, Evidence, DecisionMaker, ICP } from '@/types';

interface CompanyDetailModalProps {
  company: Company;
  allCompanies: Company[];
  icp?: ICP;
  onClose: () => void;
  onUpdate: (updated: Company) => void;
  onDelete: (id: number) => void;
}

export default function CompanyDetailModal({
  company,
  allCompanies,
  icp,
  onClose,
  onUpdate,
  onDelete,
}: CompanyDetailModalProps) {
  const [editedCompany, setEditedCompany] = useState<Company>(company);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [proposedChanges, setProposedChanges] = useState<{
    name: string;
    domain: string;
    rationale: string;
    evidence: Array<{ url: string; snippet?: string }>;
    icpScore: number;
    confidence: number;
    nameWasUpdated: boolean;
    domainWasUpdated: boolean;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    notes: true,
    evidence: true,
    rationale: true,
    tags: false,
    related: false,
  });
  const [addingDecisionMaker, setAddingDecisionMaker] = useState(false);
  const [newDecisionMaker, setNewDecisionMaker] = useState({
    name: '',
    role: '',
    linkedin: '',
    email: '',
    phone: '',
    contactStatus: 'Not Contacted' as const,
  });
  const [editingEvidence, setEditingEvidence] = useState<number | null>(null);
  const [editedEvidenceUrl, setEditedEvidenceUrl] = useState('');
  const [generatingDecisionMakers, setGeneratingDecisionMakers] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'dm' | 'evidence', index: number } | null>(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return JSON.stringify(editedCompany) !== JSON.stringify(company);
  };

  // Handle clicking outside modal
  const handleBackdropClick = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

  // Format timestamp for display
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In mock mode, we handle updates client-side only
      // The backend mock DB doesn't persist between requests
      // In production with a real DB, this would call the API
      
      // For now, just update via callback (which updates state + localStorage)
      onUpdate(editedCompany);
      toast.success('Company updated successfully');
      onClose();
      
      // If we had a real database connection, we'd do:
      // const response = await fetch('/api/company', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     companyId: editedCompany.id,
      //     name: editedCompany.name,
      //     domain: editedCompany.domain,
      //     rationale: editedCompany.rationale,
      //     status: editedCompany.status,
      //     quality: editedCompany.quality,
      //     notes: editedCompany.notes,
      //     tags: editedCompany.tags,
      //     relatedCompanyIds: editedCompany.relatedCompanyIds,
      //   }),
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to update company');
      // }
    } catch (error) {
      console.error('Failed to update company:', error);
      toast.error('Failed to update company');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      onDelete(company.id);
      toast.success('Company deleted');
      onClose();
    } catch (error) {
      console.error('Failed to delete company:', error);
      toast.error('Failed to delete company');
    }
  };

  const handleRegenerate = async () => {
    if (!icp) {
      toast.error('ICP data not available. Please run a new analysis first.');
      return;
    }

    setIsRegenerating(true);
    try {
      toast.info('Re-analyzing company details from fresh website data...');
      
      const response = await fetch('/api/company/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: editedCompany.id,
          companyName: editedCompany.name,
          companyDomain: editedCompany.domain,
          icp,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate details');
      }

      const data = await response.json();
      
      // Store proposed changes for user review (don't apply yet)
      setProposedChanges({
        name: data.proposedChanges.name,
        domain: data.proposedChanges.domain,
        rationale: data.proposedChanges.rationale,
        evidence: data.proposedChanges.evidence,
        icpScore: data.proposedChanges.icpScore,
        confidence: data.proposedChanges.confidence,
        nameWasUpdated: data.nameWasUpdated,
        domainWasUpdated: data.domainWasUpdated,
      });
      
      toast.success('Analysis complete! Review the proposed changes below.');
      
    } catch (error) {
      console.error('Failed to regenerate details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate details';
      toast.error(errorMessage);
    } finally {
      setIsRegenerating(false);
    }
  };

  const acceptProposedChanges = async () => {
    if (!proposedChanges) return;
    
    setIsSaving(true);
    try {
      // Apply the proposed changes
      const updatedCompany = {
        ...editedCompany,
        name: proposedChanges.name,
        domain: proposedChanges.domain,
        rationale: proposedChanges.rationale,
        evidence: proposedChanges.evidence,
        icpScore: proposedChanges.icpScore,
        confidence: proposedChanges.confidence,
      };
      
      setEditedCompany(updatedCompany);
      
      // Save to database
      await onUpdate(updatedCompany);
      
      // Clear proposed changes
      setProposedChanges(null);
      
      const updates = [];
      if (proposedChanges.nameWasUpdated) {
        updates.push(`name → "${proposedChanges.name}"`);
      }
      if (proposedChanges.domainWasUpdated) {
        updates.push(`domain → ${proposedChanges.domain}`);
      }
      
      if (updates.length > 0) {
        toast.success(`Changes applied! Updated: ${updates.join(', ')}`);
      } else {
        toast.success('Analysis updated successfully!');
      }
    } catch (error) {
      console.error('Failed to apply changes:', error);
      toast.error('Failed to save changes to database');
    } finally {
      setIsSaving(false);
    }
  };

  const rejectProposedChanges = () => {
    setProposedChanges(null);
    toast.info('Proposed changes discarded');
  };

  const addDecisionMaker = () => {
    if (!newDecisionMaker.name.trim() || !newDecisionMaker.role.trim()) {
      toast.error('Name and role are required');
      return;
    }

    const updatedDMs = [...decisionMakers, newDecisionMaker];
    const updatedCompany = {
      ...editedCompany,
      decisionMakers: updatedDMs,
    };
    
    setEditedCompany(updatedCompany);
    setAddingDecisionMaker(false);
    setNewDecisionMaker({
      name: '',
      role: '',
      linkedin: '',
      email: '',
      phone: '',
      contactStatus: 'Not Contacted',
    });
    
    // Auto-save to database
    onUpdate(updatedCompany);
    toast.success('Decision maker added');
  };

  const confirmDeleteDecisionMaker = (index: number) => {
    setConfirmDelete({ type: 'dm', index });
  };

  const deleteDecisionMaker = (index: number) => {
    const dmName = decisionMakers[index]?.name || 'this decision maker';
    const updatedDMs = decisionMakers.filter((_, idx) => idx !== index);
    const updatedCompany = {
      ...editedCompany,
      decisionMakers: updatedDMs,
    };
    
    setEditedCompany(updatedCompany);
    setConfirmDelete(null);
    
    // Auto-save to database
    onUpdate(updatedCompany);
    
    // Show undo toast
    toast.success(`${dmName} removed`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const restoredCompany = {
            ...updatedCompany,
            decisionMakers: [...updatedDMs.slice(0, index), decisionMakers[index], ...updatedDMs.slice(index)],
          };
          setEditedCompany(restoredCompany);
          onUpdate(restoredCompany);
          toast.success('Decision maker restored');
        },
      },
    });
  };

  const generateDecisionMakers = async () => {
    if (!icp) {
      toast.error('ICP data is required to generate decision makers');
      return;
    }

    setGeneratingDecisionMakers(true);
    try {
      const response = await fetch('/api/decision-makers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: editedCompany.id,
          companyName: editedCompany.name,
          companyDomain: editedCompany.domain,
          buyerRoles: icp.buyerRoles,
          existingDecisionMakers: decisionMakers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Decision makers API error:', errorData);
        throw new Error(errorData.error || 'Failed to generate decision makers');
      }

      const data = await response.json();
      
      if (data.decisionMakers && data.decisionMakers.length > 0) {
        // The API already saves to database, so we just need to update local state
        // Merge new decision makers with existing ones
        const allDecisionMakers = [...decisionMakers, ...data.decisionMakers];
        const updatedCompany = {
          ...editedCompany,
          decisionMakers: allDecisionMakers,
          updatedAt: new Date(),
        };
        setEditedCompany(updatedCompany);
        
        // Also update the parent component
        if (onUpdate) {
          onUpdate(updatedCompany);
        }
        
        toast.success(`Generated ${data.decisionMakers.length} new decision makers`);
      } else {
        toast.info('No new decision makers found. Try adding contacts manually.');
      }
    } catch (error) {
      console.error('Failed to generate decision makers:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate decision makers');
    } finally {
      setGeneratingDecisionMakers(false);
    }
  };

  const confirmDeleteEvidence = (index: number) => {
    setConfirmDelete({ type: 'evidence', index });
  };

  const deleteEvidence = (index: number) => {
    const evidenceArray = (editedCompany.evidence as Evidence[]) || [];
    const updatedEvidence = evidenceArray.filter((_, idx) => idx !== index);
    const updatedCompany = {
      ...editedCompany,
      evidence: updatedEvidence,
    };
    
    setEditedCompany(updatedCompany);
    setConfirmDelete(null);
    
    // Auto-save to database
    onUpdate(updatedCompany);
    
    // Show undo toast
    toast.success('Evidence removed', {
      action: {
        label: 'Undo',
        onClick: () => {
          const restoredCompany = {
            ...updatedCompany,
            evidence: [...updatedEvidence.slice(0, index), evidenceArray[index], ...updatedEvidence.slice(index)],
          };
          setEditedCompany(restoredCompany);
          onUpdate(restoredCompany);
          toast.success('Evidence restored');
        },
      },
    });
  };

  const startEditingEvidence = (index: number) => {
    const evidenceArray = (editedCompany.evidence as Evidence[]) || [];
    setEditingEvidence(index);
    setEditedEvidenceUrl(evidenceArray[index].url);
  };

  const saveEditedEvidence = () => {
    if (editingEvidence === null) return;
    
    const evidenceArray = (editedCompany.evidence as Evidence[]) || [];
    const updatedEvidence = evidenceArray.map((ev, idx) => 
      idx === editingEvidence ? { ...ev, url: editedEvidenceUrl } : ev
    );
    
    const updatedCompany = {
      ...editedCompany,
      evidence: updatedEvidence,
    };
    
    setEditedCompany(updatedCompany);
    setEditingEvidence(null);
    setEditedEvidenceUrl('');
    
    // Auto-save to database
    onUpdate(updatedCompany);
    toast.success('Evidence updated');
  };

  const addTag = () => {
    if (newTag.trim()) {
      const currentTags = (editedCompany.tags as string[]) || [];
      if (!currentTags.includes(newTag.trim())) {
        setEditedCompany({
          ...editedCompany,
          tags: [...currentTags, newTag.trim()],
        });
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = (editedCompany.tags as string[]) || [];
    setEditedCompany({
      ...editedCompany,
      tags: currentTags.filter(t => t !== tagToRemove),
    });
  };

  const toggleRelatedCompany = (companyId: number) => {
    const currentRelated = (editedCompany.relatedCompanyIds as number[]) || [];
    if (currentRelated.includes(companyId)) {
      setEditedCompany({
        ...editedCompany,
        relatedCompanyIds: currentRelated.filter(id => id !== companyId),
      });
    } else {
      setEditedCompany({
        ...editedCompany,
        relatedCompanyIds: [...currentRelated, companyId],
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
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

  const decisionMakers = (editedCompany.decisionMakers as DecisionMaker[]) || [];
  const tags = (editedCompany.tags as string[]) || [];
  const relatedIds = (editedCompany.relatedCompanyIds as number[]) || [];
  const relatedCompanies = allCompanies.filter(c => relatedIds.includes(c.id));
  const otherCompanies = allCompanies.filter(c => c.id !== company.id && !relatedIds.includes(c.id));

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-1 md:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative top-1 md:top-8 mx-auto p-2.5 md:p-5 border w-full max-w-2xl shadow-md rounded-md bg-white mb-4 md:mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="h-4 md:h-5 w-4 md:w-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={editedCompany.name}
                onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                className="text-base md:text-lg font-semibold text-gray-900 bg-white border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 flex-1"
              />
            </div>
            
            {/* Domain - Inline */}
            <div className="flex items-center space-x-2 ml-6 md:ml-7">
              <input
                type="text"
                value={editedCompany.domain}
                onChange={(e) => setEditedCompany({ ...editedCompany, domain: e.target.value })}
                placeholder="company.com"
                className="flex-1 px-2 py-0.5 text-[11px] md:text-xs border border-gray-200 text-gray-600 bg-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {editedCompany.domain && editedCompany.domain.toLowerCase() !== 'n/a' && editedCompany.domain.includes('.') && (
                <a
                  href={editedCompany.domain.startsWith('http') ? editedCompany.domain : `https://${editedCompany.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                  title="Visit website"
                >
                  <ExternalLink className="h-3 md:h-3.5 w-3 md:w-3.5" />
                </a>
              )}
            </div>
            
            {/* AI Regenerate Button */}
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="mt-2 ml-6 md:ml-7 inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
              title="AI will analyze the website and suggest updates"
            >
              <RefreshCw className={`h-3 md:h-3.5 w-3 md:w-3.5 mr-1 md:mr-1.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRegenerating ? 'Analyzing...' : 'Regenerate via AI'}</span>
              <span className="sm:hidden">{isRegenerating ? 'Analyzing...' : 'Regenerate'}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-1 md:ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comparison View - GitHub-style diff */}
        {proposedChanges && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-2 md:p-4 mb-3 md:mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 md:mb-3">
              <h3 className="text-sm md:text-lg font-semibold text-yellow-900 flex items-center">
                <RefreshCw className="h-4 md:h-5 w-4 md:w-5 mr-1.5 md:mr-2" />
                Review Proposed Changes
              </h3>
              <div className="flex items-center space-x-1.5 md:space-x-2">
                <button
                  onClick={rejectProposedChanges}
                  disabled={isSaving}
                  className="px-2 md:px-4 py-1 md:py-2 text-[10px] md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={acceptProposedChanges}
                  disabled={isSaving}
                  className="px-2 md:px-4 py-1 md:py-2 text-[10px] md:text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? 'Applying...' : 'Accept & Apply'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              {/* Current/Old Values */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 md:p-3">
                <h4 className="text-sm font-medium text-red-900 mb-3 flex items-center">
                  <span className="mr-2">−</span> Current Values
                </h4>
                
                {proposedChanges.nameWasUpdated && (
                  <div className="mb-3">
                    <label className="text-xs text-red-700 font-medium">Company Name</label>
                    <div className="text-sm text-red-900 bg-red-100 px-2 py-1 rounded mt-1 line-through">
                      {editedCompany.name}
                    </div>
                  </div>
                )}

                {proposedChanges.domainWasUpdated && (
                  <div className="mb-3">
                    <label className="text-xs text-red-700 font-medium">Domain</label>
                    <div className="text-sm text-red-900 bg-red-100 px-2 py-1 rounded mt-1 line-through">
                      {editedCompany.domain}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs text-red-700 font-medium">ICP Score / Confidence</label>
                  <div className="text-sm text-red-900 bg-red-100 px-2 py-1 rounded mt-1 line-through">
                    {editedCompany.icpScore}% / {editedCompany.confidence}%
                  </div>
                </div>

                <div>
                  <label className="text-xs text-red-700 font-medium">Rationale</label>
                  <div className="text-xs text-red-900 bg-red-100 px-2 py-1 rounded mt-1 max-h-20 overflow-y-auto line-through">
                    {editedCompany.rationale}
                  </div>
                </div>
              </div>

              {/* New/Proposed Values */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 md:p-3">
                <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center">
                  <span className="mr-2">+</span> Proposed Values
                </h4>
                
                {proposedChanges.nameWasUpdated && (
                  <div className="mb-3">
                    <label className="text-xs text-green-700 font-medium">Company Name</label>
                    <div className="text-sm text-green-900 bg-green-100 px-2 py-1 rounded mt-1 font-medium">
                      {proposedChanges.name}
                    </div>
                  </div>
                )}

                {proposedChanges.domainWasUpdated && (
                  <div className="mb-3">
                    <label className="text-xs text-green-700 font-medium">Domain</label>
                    <div className="text-sm text-green-900 bg-green-100 px-2 py-1 rounded mt-1 font-medium">
                      {proposedChanges.domain}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs text-green-700 font-medium">ICP Score / Confidence</label>
                  <div className="text-sm text-green-900 bg-green-100 px-2 py-1 rounded mt-1 font-medium">
                    {proposedChanges.icpScore}% / {proposedChanges.confidence}%
                  </div>
                </div>

                <div>
                  <label className="text-xs text-green-700 font-medium">Rationale</label>
                  <div className="text-xs text-green-900 bg-green-100 px-2 py-1 rounded mt-1 max-h-20 overflow-y-auto">
                    {proposedChanges.rationale}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-yellow-800 bg-yellow-100 px-3 py-2 rounded">
              <strong>💡 Tip:</strong> AI extracted information from the website. Review the changes and click &ldquo;Accept &amp; Apply&rdquo; to save them to the database.
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-3 md:space-y-4 max-h-[70vh] md:max-h-[75vh] overflow-y-auto pr-1 md:pr-2">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <div className="bg-gray-50 rounded-md p-2 md:p-2.5">
              <label className="text-[9px] md:text-[10px] text-gray-500 block mb-0.5 md:mb-1">ICP Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editedCompany.icpScore}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                  setEditedCompany({ ...editedCompany, icpScore: val });
                }}
                className={`text-lg md:text-xl font-bold ${getScoreColor(editedCompany.icpScore)} bg-transparent border-none focus:outline-none w-full`}
              />
            </div>
            <div className="bg-gray-50 rounded-md p-2 md:p-2.5">
              <label className="text-[9px] md:text-[10px] text-gray-500 block mb-0.5 md:mb-1">Confidence</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editedCompany.confidence}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setEditedCompany({ ...editedCompany, confidence: val });
                  }}
                  className="text-lg md:text-xl font-bold text-gray-700 bg-transparent border-none focus:outline-none w-10 md:w-12"
                />
                <span className="text-lg md:text-xl font-bold text-gray-700">%</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-2 md:p-2.5">
              <label className="text-[9px] md:text-[10px] text-gray-500 block mb-0.5 md:mb-1">Status</label>
              <select
                value={editedCompany.status}
                onChange={(e) => setEditedCompany({ ...editedCompany, status: e.target.value as Company['status'] })}
                className={`text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 rounded-full font-medium ${getStatusColor(editedCompany.status)} border-0 w-full cursor-pointer`}
              >
                <option value="New">New</option>
                <option value="Researching">Researching</option>
                <option value="Contacted">Contacted</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            <div className="bg-gray-50 rounded-md p-2 md:p-2.5">
              <label className="text-[9px] md:text-[10px] text-gray-500 block mb-0.5 md:mb-1">Quality</label>
              <select
                value={editedCompany.quality || 'none'}
                onChange={(e) => setEditedCompany({ 
                  ...editedCompany, 
                  quality: e.target.value === 'none' ? null : e.target.value as 'excellent' | 'good' | 'poor'
                })}
                className="text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 rounded-full font-medium bg-white border border-gray-200 w-full cursor-pointer"
              >
                <option value="none">Not Rated</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-1 md:space-x-1.5">
              <Calendar className="h-3 md:h-3.5 w-3 md:w-3.5 text-gray-400 flex-shrink-0" />
              <div>
                <label className="text-[9px] md:text-[10px] font-medium text-gray-500">Created</label>
                <div className="text-[10px] md:text-xs text-gray-700">
                  {formatDate(editedCompany.createdAt)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 md:space-x-1.5">
              <Clock className="h-3 md:h-3.5 w-3 md:w-3.5 text-gray-400 flex-shrink-0" />
              <div>
                <label className="text-[9px] md:text-[10px] font-medium text-gray-500">Modified</label>
                <div className="text-[10px] md:text-xs text-gray-700">
                  {formatDate(editedCompany.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Rationale - Collapsible */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, rationale: !expandedSections.rationale })}
              className="flex items-center justify-between w-full text-left group"
            >
              <span className="text-xs font-semibold text-gray-700 flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                Rationale
              </span>
              {expandedSections.rationale ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSections.rationale && (
              <textarea
                value={editedCompany.rationale}
                onChange={(e) => setEditedCompany({ ...editedCompany, rationale: e.target.value })}
                rows={2}
                className="w-full mt-2 px-2 md:px-2.5 py-1.5 md:py-2 border border-gray-200 text-xs md:text-sm text-gray-900 bg-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Notes - Collapsible */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, notes: !expandedSections.notes })}
              className="flex items-center justify-between w-full text-left group"
            >
              <span className="text-xs font-semibold text-gray-700 flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                Notes
              </span>
              {expandedSections.notes ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSections.notes && (
              <textarea
                value={editedCompany.notes || ''}
                onChange={(e) => setEditedCompany({ ...editedCompany, notes: e.target.value })}
                placeholder="Add notes about this company..."
                rows={3}
                className="w-full mt-2 px-2 md:px-2.5 py-1.5 md:py-2 border border-gray-200 text-xs md:text-sm text-gray-900 bg-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Tags - Collapsible */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, tags: !expandedSections.tags })}
              className="flex items-center justify-between w-full text-left group"
            >
              <span className="text-xs font-semibold text-gray-700 flex items-center">
                <Tag className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                Tags {tags.length > 0 && <span className="ml-1.5 text-[10px] text-gray-500">({tags.length})</span>}
              </span>
              {expandedSections.tags ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSections.tags && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 md:ml-1.5 hover:text-blue-600"
                      >
                        <X className="h-2.5 md:h-3 w-2.5 md:w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-1.5 md:space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add tag..."
                    className="flex-1 px-2 md:px-2.5 py-1 md:py-1.5 border border-gray-200 text-xs md:text-sm text-gray-900 bg-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addTag}
                    className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Decision Makers - Always Visible */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">
                  Decision Makers ({decisionMakers.length})
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 md:gap-2">
                <button
                  onClick={generateDecisionMakers}
                  disabled={generatingDecisionMakers}
                  className="inline-flex items-center justify-center px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                  title="AI will find decision makers from the web"
                >
                  <Users className={`h-3 md:h-3.5 w-3 md:w-3.5 mr-1 md:mr-1.5 ${generatingDecisionMakers ? 'animate-spin' : ''}`} />
                  {generatingDecisionMakers ? 'Finding...' : 'Find via AI'}
                </button>
                <button
                  onClick={() => setAddingDecisionMaker(true)}
                  className="inline-flex items-center justify-center px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  <Users className="h-3 md:h-3.5 w-3 md:w-3.5 mr-1 md:mr-1.5" />
                  Add Manually
                </button>
              </div>
            </div>

            {/* Add Decision Maker Form */}
            {addingDecisionMaker && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newDecisionMaker.name}
                    onChange={(e) => setNewDecisionMaker({ ...newDecisionMaker, name: e.target.value })}
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Role *"
                    value={newDecisionMaker.role}
                    onChange={(e) => setNewDecisionMaker({ ...newDecisionMaker, role: e.target.value })}
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="LinkedIn URL"
                  value={newDecisionMaker.linkedin}
                  onChange={(e) => setNewDecisionMaker({ ...newDecisionMaker, linkedin: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={newDecisionMaker.email}
                    onChange={(e) => setNewDecisionMaker({ ...newDecisionMaker, email: e.target.value })}
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newDecisionMaker.phone}
                    onChange={(e) => setNewDecisionMaker({ ...newDecisionMaker, phone: e.target.value })}
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setAddingDecisionMaker(false);
                      setNewDecisionMaker({ name: '', role: '', linkedin: '', email: '', phone: '', contactStatus: 'Not Contacted' });
                    }}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addDecisionMaker}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Decision Makers List */}
            <div className="space-y-2">
              {decisionMakers.map((dm, idx) => (
                <div key={idx} className="bg-gray-50 rounded p-2.5 group hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-gray-900 mb-0.5">{dm.name}</div>
                      <div className="text-[10px] text-gray-600 mb-1.5">{dm.role}</div>
                      
                      {/* Contact Shortcuts */}
                      <div className="flex items-center space-x-2">
                        {dm.linkedin && (
                          <a
                            href={dm.linkedin.startsWith('http') ? dm.linkedin : `https://linkedin.com/in/${dm.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[10px] text-blue-600 hover:text-blue-800"
                            title="LinkedIn"
                          >
                            <Linkedin className="h-3 w-3 mr-0.5" />
                            LinkedIn
                          </a>
                        )}
                        {dm.email && (
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={`mailto:${dm.email}`}
                              className="inline-flex items-center text-[10px] text-blue-600 hover:text-blue-800"
                              title={dm.email}
                            >
                              <Mail className="h-3 w-3 mr-0.5" />
                              Email
                            </a>
                            {dm.emailSource === 'generated' && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium" title="This email was generated using common patterns, not found in search results">
                                likely
                              </span>
                            )}
                          </div>
                        )}
                        {dm.phone && (
                          <a
                            href={`tel:${dm.phone}`}
                            className="inline-flex items-center text-[10px] text-blue-600 hover:text-blue-800"
                            title={dm.phone}
                          >
                            <Phone className="h-3 w-3 mr-0.5" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => confirmDeleteDecisionMaker(idx)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                      title="Remove decision maker"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence - Collapsible */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, evidence: !expandedSections.evidence })}
              className="flex items-center justify-between w-full text-left group"
            >
              <span className="text-xs font-semibold text-gray-700 flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                Evidence {(editedCompany.evidence as Evidence[]).length > 0 && (
                  <span className="ml-1.5 text-[10px] text-gray-500">
                    ({(editedCompany.evidence as Evidence[]).length})
                  </span>
                )}
              </span>
              {expandedSections.evidence ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSections.evidence && (
              <div className="mt-2 space-y-1.5">
                {(editedCompany.evidence as Evidence[]).map((evidence, idx) => (
                  <div key={idx} className="group flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50">
                    {editingEvidence === idx ? (
                      <>
                        <input
                          type="text"
                          value={editedEvidenceUrl}
                          onChange={(e) => setEditedEvidenceUrl(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={saveEditedEvidence}
                          className="text-green-600 hover:text-green-700"
                          title="Save"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEvidence(null);
                            setEditedEvidenceUrl('');
                          }}
                          className="text-gray-500 hover:text-gray-700"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <a
                          href={evidence.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs text-blue-600 hover:text-blue-800 underline truncate"
                          title={evidence.url}
                        >
                          {evidence.url}
                        </a>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                          <button
                            onClick={() => startEditingEvidence(idx)}
                            className="text-gray-500 hover:text-blue-600"
                            title="Edit URL"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => confirmDeleteEvidence(idx)}
                            className="text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Companies - Collapsible */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, related: !expandedSections.related })}
              className="flex items-center justify-between w-full text-left group"
            >
              <span className="text-xs font-semibold text-gray-700 flex items-center">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                Related Companies {relatedCompanies.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-gray-500">({relatedCompanies.length})</span>
                )}
              </span>
              {expandedSections.related ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expandedSections.related && (
              <div className="mt-2 space-y-2">
                {relatedCompanies.length > 0 && (
                  <div className="space-y-1">
                    {relatedCompanies.map((rc) => (
                      <div key={rc.id} className="flex items-center justify-between bg-gray-50 rounded p-1.5">
                        <span className="text-xs">{rc.name}</span>
                        <button
                          onClick={() => toggleRelatedCompany(rc.id)}
                          className="text-[10px] text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {otherCompanies.length > 0 && (
                  <select
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      if (id) toggleRelatedCompany(id);
                      e.target.value = '';
                    }}
                    className="w-full px-2 md:px-2.5 py-1 md:py-1.5 text-xs md:text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">Add related company...</option>
                    {otherCompanies.slice(0, 20).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center px-2 md:px-3 py-1.5 text-[10px] md:text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
          >
            <Trash2 className="h-3 md:h-3.5 w-3 md:w-3.5 mr-1 md:mr-1.5" />
            Delete
          </button>
          <div className="flex space-x-1.5 md:space-x-2">
            <button
              onClick={onClose}
              className="px-2 md:px-4 py-1.5 text-[10px] md:text-sm border border-gray-200 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-2 md:px-4 py-1.5 text-[10px] md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3 md:h-3.5 w-3 md:w-3.5 mr-1 md:mr-1.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog - Company */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center z-10 p-2">
            <div className="bg-white rounded-lg p-4 md:p-6 max-w-sm w-full mx-2">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Delete Company?</h3>
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                Are you sure you want to delete {company.name}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2 md:space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog - Decision Maker / Evidence */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center z-10 p-2">
            <div className="bg-white rounded-lg p-4 md:p-6 max-w-sm w-full mx-2">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                {confirmDelete.type === 'dm' ? 'Remove Decision Maker?' : 'Delete Evidence?'}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                {confirmDelete.type === 'dm' 
                  ? `Are you sure you want to remove ${decisionMakers[confirmDelete.index]?.name || 'this decision maker'}? You can undo this action.`
                  : 'Are you sure you want to delete this evidence link? You can undo this action.'
                }
              </p>
              <div className="flex justify-end space-x-2 md:space-x-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === 'dm') {
                      deleteDecisionMaker(confirmDelete.index);
                    } else {
                      deleteEvidence(confirmDelete.index);
                    }
                  }}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  {confirmDelete.type === 'dm' ? 'Remove' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unsaved Changes Dialog */}
        {showUnsavedChangesDialog && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center z-10 p-2">
            <div className="bg-white rounded-lg p-4 md:p-6 max-w-sm w-full mx-2">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Unsaved Changes</h3>
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                You have unsaved changes. Do you want to save them before closing?
              </p>
              <div className="flex justify-end space-x-2 md:space-x-3">
                <button
                  onClick={() => {
                    setShowUnsavedChangesDialog(false);
                    onClose();
                  }}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Discard
                </button>
                <button
                  onClick={() => setShowUnsavedChangesDialog(false)}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUnsavedChangesDialog(false);
                    handleSave();
                  }}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

