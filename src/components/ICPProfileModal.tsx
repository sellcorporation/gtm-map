'use client';

import { useState, useEffect } from 'react';
import { X, Edit2, Save, FileText } from 'lucide-react';
import type { ICP } from '@/types';
import { toast } from 'sonner';

interface ICPProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  icp: ICP | null;
  onUpdate: (updatedICP: ICP) => void;
}

export default function ICPProfileModal({ isOpen, onClose, icp, onUpdate }: ICPProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedICP, setEditedICP] = useState<ICP | null>(icp);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  
  // Store raw input strings during edit mode to preserve commas while typing
  const [inputValues, setInputValues] = useState({
    industries: '',
    workflows: '',
    buyerRoles: '',
  });

  // Sync editedICP with icp when modal opens
  useEffect(() => {
    if (isOpen && icp) {
      console.log('ICPProfileModal: Modal opened, setting editedICP');
      setEditedICP(icp);
      setInputValues({
        industries: icp.industries.join(', '),
        workflows: icp.workflows.join(', '),
        buyerRoles: icp.buyerRoles.join(', '),
      });
      setIsEditing(false); // Reset edit mode when reopening
    }
  }, [isOpen, icp]);

  console.log('ICPProfileModal render:', { isOpen, hasICP: !!icp, hasEditedICP: !!editedICP });
  
  if (!isOpen || !icp || !editedICP) return null;

  // Check if there are unsaved changes in edit mode
  const hasUnsavedChanges = () => {
    if (!isEditing) return false;
    return JSON.stringify(editedICP) !== JSON.stringify(icp);
  };

  // Handle backdrop click
  const handleBackdropClick = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    if (!editedICP) return;
    
    // Parse the input values into arrays
    const industries = inputValues.industries.split(',').map(item => item.trim()).filter(item => item.length > 0);
    const workflows = inputValues.workflows.split(',').map(item => item.trim()).filter(item => item.length > 0);
    const buyerRoles = inputValues.buyerRoles.split(',').map(item => item.trim()).filter(item => item.length > 0);
    
    // Validate
    if (industries.length === 0) {
      toast.error('Please add at least one industry');
      return;
    }
    if (workflows.length === 0) {
      toast.error('Please add at least one workflow');
      return;
    }
    if (buyerRoles.length === 0) {
      toast.error('Please add at least one buyer role');
      return;
    }

    const updatedICP = {
      ...editedICP,
      industries,
      workflows,
      buyerRoles,
    };

    onUpdate(updatedICP);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedICP(icp);
    setInputValues({
      industries: icp.industries.join(', '),
      workflows: icp.workflows.join(', '),
      buyerRoles: icp.buyerRoles.join(', '),
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: 'industries' | 'workflows' | 'buyerRoles', value: string) => {
    setInputValues({
      ...inputValues,
      [field]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-2 md:p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleBackdropClick}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 md:space-x-3">
              <FileText className="h-5 md:h-6 w-5 md:w-6 text-blue-600" />
              <h2 className="text-lg md:text-2xl font-bold text-gray-900">ICP</h2>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                >
                  <Edit2 className="h-3 md:h-4 w-3 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    <Save className="h-3 md:h-4 w-3 md:w-4 mr-1 md:mr-2" />
                    Save
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 md:h-6 w-5 md:w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
            {/* Industries */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Industries
              </label>
              {isEditing ? (
                <textarea
                  value={inputValues.industries}
                  onChange={(e) => handleInputChange('industries', e.target.value)}
                  placeholder="e.g., SaaS, FinTech, Healthcare"
                  className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editedICP.industries.map((industry, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {industry}
                    </span>
                  ))}
                </div>
              )}
              {isEditing && (
                <p className="mt-1 text-xs text-gray-500">Separate multiple items with commas</p>
              )}
            </div>

            {/* Workflows */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Workflows
              </label>
              {isEditing ? (
                <textarea
                  value={inputValues.workflows}
                  onChange={(e) => handleInputChange('workflows', e.target.value)}
                  placeholder="e.g., Data collection, Report generation, Client communication"
                  className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              ) : (
                <div className="space-y-2">
                  {editedICP.workflows.map((workflow, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{workflow}</span>
                    </div>
                  ))}
                </div>
              )}
              {isEditing && (
                <p className="mt-1 text-xs text-gray-500">Separate multiple items with commas</p>
              )}
            </div>

            {/* Buyer Roles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Buyer Roles
              </label>
              {isEditing ? (
                <textarea
                  value={inputValues.buyerRoles}
                  onChange={(e) => handleInputChange('buyerRoles', e.target.value)}
                  placeholder="e.g., CEO, CTO, VP Sales"
                  className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editedICP.buyerRoles.map((role, idx) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {role}
                    </span>
                  ))}
                </div>
              )}
              {isEditing && (
                <p className="mt-1 text-xs text-gray-500">Separate multiple items with commas</p>
              )}
            </div>

            {/* Firmographics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedICP.firmographics.size}
                    onChange={(e) => setEditedICP({
                      ...editedICP,
                      firmographics: { ...editedICP.firmographics, size: e.target.value }
                    })}
                    placeholder="e.g., 50-500 employees"
                    className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-md">{editedICP.firmographics.size}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Geographic Focus
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedICP.firmographics.geo}
                    onChange={(e) => setEditedICP({
                      ...editedICP,
                      firmographics: { ...editedICP.firmographics, geo: e.target.value }
                    })}
                    placeholder="e.g., United States, Europe"
                    className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-md">{editedICP.firmographics.geo}</p>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Updating your ICP will help generate better prospects. Click &ldquo;Generate More&rdquo; to find additional companies that match your refined profile.
              </p>
            </div>
          </div>

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
                      setIsEditing(false);
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
    </div>
  );
}

