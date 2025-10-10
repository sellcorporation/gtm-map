'use client';

import React, { useState } from 'react';
import { X, Save, Trash2, ExternalLink, Tag, Building2, Users, FileText, RefreshCw } from 'lucide-react';
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
      
      // Update the edited company with new analysis (including potentially updated domain)
      const updatedCompany = {
        ...editedCompany,
        domain: data.domain || editedCompany.domain, // Use new domain if found
        rationale: data.rationale,
        evidence: data.evidence,
        icpScore: data.icpScore,
        confidence: data.confidence,
      };
      
      setEditedCompany(updatedCompany);
      
      // Also update via callback so parent state is updated
      onUpdate(updatedCompany);
      
      if (data.domain && data.domain !== editedCompany.domain) {
        toast.success(`Found correct domain: ${data.domain}! Details regenerated.`);
      } else if (data.mockData) {
        toast.success('Company details regenerated (using demo data - OpenAI quota exceeded)');
      } else {
        toast.success('Company details regenerated successfully with fresh data!');
      }
      
    } catch (error) {
      console.error('Failed to regenerate details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate details';
      toast.error(errorMessage);
    } finally {
      setIsRegenerating(false);
    }
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
      <div className="relative top-8 mx-auto p-4 sm:p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white mb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={editedCompany.name}
                onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                className="text-xl sm:text-2xl font-bold text-gray-900 bg-white border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 w-full"
              />
            </div>
            
            {/* Domain Edit Field */}
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Website Domain
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editedCompany.domain}
                  onChange={(e) => setEditedCompany({ ...editedCompany, domain: e.target.value })}
                  placeholder="e.g., company.com"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 text-gray-900 bg-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {editedCompany.domain && editedCompany.domain.toLowerCase() !== 'n/a' && editedCompany.domain.includes('.') && (
                  <a
                    href={editedCompany.domain.startsWith('http') ? editedCompany.domain : `https://${editedCompany.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                    title="Visit website"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate Details'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 block mb-1">ICP Score</label>
              <div className={`text-2xl font-bold ${getScoreColor(editedCompany.icpScore)}`}>
                {editedCompany.icpScore}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 block mb-1">Confidence</label>
              <div className="text-2xl font-bold text-gray-700">{editedCompany.confidence}%</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select
                value={editedCompany.status}
                onChange={(e) => setEditedCompany({ ...editedCompany, status: e.target.value as Company['status'] })}
                className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(editedCompany.status)} border-0 w-full cursor-pointer`}
              >
                <option value="New">New</option>
                <option value="Researching">Researching</option>
                <option value="Contacted">Contacted</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 block mb-1">Quality</label>
              <select
                value={editedCompany.quality || 'none'}
                onChange={(e) => setEditedCompany({ 
                  ...editedCompany, 
                  quality: e.target.value === 'none' ? null : e.target.value as 'excellent' | 'good' | 'poor'
                })}
                className="text-xs px-2 py-1 rounded-full font-medium bg-white border border-gray-300 w-full cursor-pointer"
              >
                <option value="none">Not Rated</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          {/* Rationale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Rationale
            </label>
            <textarea
              value={editedCompany.rationale}
              onChange={(e) => setEditedCompany({ ...editedCompany, rationale: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={editedCompany.notes || ''}
              onChange={(e) => setEditedCompany({ ...editedCompany, notes: e.target.value })}
              placeholder="Add notes about this company..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="h-4 w-4 inline mr-1" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Decision Makers */}
          {decisionMakers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Decision Makers ({decisionMakers.length})
              </label>
              <div className="space-y-2">
                {decisionMakers.map((dm, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-md p-3">
                    <div className="font-medium text-sm">{dm.name}</div>
                    <div className="text-xs text-gray-500">{dm.role} - {dm.contactStatus}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence
            </label>
            <div className="space-y-2">
              {(editedCompany.evidence as Evidence[]).map((evidence, idx) => (
                <a
                  key={idx}
                  href={evidence.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {evidence.url}
                </a>
              ))}
            </div>
          </div>

          {/* Related Companies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Companies
            </label>
            {relatedCompanies.length > 0 && (
              <div className="space-y-1 mb-3">
                {relatedCompanies.map((rc) => (
                  <div key={rc.id} className="flex items-center justify-between bg-gray-50 rounded-md p-2">
                    <span className="text-sm">{rc.name}</span>
                    <button
                      onClick={() => toggleRelatedCompany(rc.id)}
                      className="text-xs text-red-600 hover:text-red-800"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Company
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Company?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete {company.name}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

