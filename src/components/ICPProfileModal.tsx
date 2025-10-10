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
  
  // Store raw input strings during edit mode to preserve commas while typing
  const [inputValues, setInputValues] = useState({
    industries: '',
    pains: '',
    buyerRoles: '',
  });

  // Sync editedICP with icp when modal opens
  useEffect(() => {
    if (isOpen && icp) {
      console.log('ICPProfileModal: Modal opened, setting editedICP');
      setEditedICP(icp);
      setInputValues({
        industries: icp.industries.join(', '),
        pains: icp.pains.join(', '),
        buyerRoles: icp.buyerRoles.join(', '),
      });
      setIsEditing(false); // Reset edit mode when reopening
    }
  }, [isOpen, icp]);

  console.log('ICPProfileModal render:', { isOpen, hasICP: !!icp, hasEditedICP: !!editedICP });
  
  if (!isOpen || !icp || !editedICP) return null;

  const handleSave = () => {
    if (!editedICP) return;
    
    // Parse the input values into arrays
    const industries = inputValues.industries.split(',').map(item => item.trim()).filter(item => item.length > 0);
    const pains = inputValues.pains.split(',').map(item => item.trim()).filter(item => item.length > 0);
    const buyerRoles = inputValues.buyerRoles.split(',').map(item => item.trim()).filter(item => item.length > 0);
    
    // Validate
    if (industries.length === 0) {
      toast.error('Please add at least one industry');
      return;
    }
    if (pains.length === 0) {
      toast.error('Please add at least one pain point');
      return;
    }
    if (buyerRoles.length === 0) {
      toast.error('Please add at least one buyer role');
      return;
    }

    const updatedICP = {
      ...editedICP,
      industries,
      pains,
      buyerRoles,
    };

    onUpdate(updatedICP);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedICP(icp);
    setInputValues({
      industries: icp.industries.join(', '),
      pains: icp.pains.join(', '),
      buyerRoles: icp.buyerRoles.join(', '),
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: 'industries' | 'pains' | 'buyerRoles', value: string) => {
    setInputValues({
      ...inputValues,
      [field]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Ideal Customer Profile</h2>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
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

            {/* Pain Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Pain Points
              </label>
              {isEditing ? (
                <textarea
                  value={inputValues.pains}
                  onChange={(e) => handleInputChange('pains', e.target.value)}
                  placeholder="e.g., Manual processes, High costs, Lack of visibility"
                  className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              ) : (
                <div className="space-y-2">
                  {editedICP.pains.map((pain, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{pain}</span>
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
        </div>
      </div>
    </div>
  );
}

