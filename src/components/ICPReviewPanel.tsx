'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Edit2 } from 'lucide-react';
import type { ICP } from '@/types';

interface ICPReviewPanelProps {
  icp: ICP;
  websiteUrl: string;
  onConfirm: (icp: ICP) => void;
  onReanalyze: () => void;
  isLoading?: boolean;
}

export default function ICPReviewPanel({ 
  icp, 
  websiteUrl, 
  onConfirm, 
  onReanalyze,
  isLoading = false 
}: ICPReviewPanelProps) {
  const [editedICP, setEditedICP] = useState<ICP>(icp);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditedICP(icp);
  }, [icp]);

  const handleFieldChange = (field: keyof ICP, value: string | string[] | { size: string; geo: string }) => {
    setEditedICP(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: 'industries' | 'workflows' | 'buyerRoles', value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    handleFieldChange(field, array);
  };

  const handleConfirm = () => {
    onConfirm(editedICP);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">Extracted ICP Profile</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? 'View Mode' : 'Edit Mode'}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Review the extracted Ideal Customer Profile from <strong>{websiteUrl}</strong>
        </p>
      </div>

      <div className="space-y-6">
        {/* Industries */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Industries
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedICP.industries.join(', ')}
              onChange={(e) => handleArrayFieldChange('industries', e.target.value)}
              placeholder="e.g., Property Surveying, Building Inspection"
              className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {editedICP.industries.map((industry, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {industry}
                </span>
              ))}
            </div>
          )}
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">Separate multiple industries with commas</p>
          )}
        </div>

        {/* Solution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Solution
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedICP.solution || ''}
              onChange={(e) => handleFieldChange('solution', e.target.value)}
              placeholder="e.g., Digital inspection and reporting software"
              className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          ) : (
            <div className="px-3 py-2 bg-green-50 rounded-md">
              <p className="text-sm text-gray-900 font-medium">{editedICP.solution || 'Not specified'}</p>
            </div>
          )}
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">One sentence describing what you provide</p>
          )}
        </div>

        {/* Key Workflows */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Key Workflows
          </label>
          {isEditing ? (
            <textarea
              value={(editedICP.workflows || []).join(', ')}
              onChange={(e) => handleArrayFieldChange('workflows', e.target.value)}
              placeholder="e.g., Coordinate inspections, Produce reports, Manage compliance"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          ) : (
            <ul className="space-y-2">
              {(editedICP.workflows || []).map((workflow, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 mt-2 mr-2 bg-green-500 rounded-full flex-shrink-0"></span>
                  <span className="text-sm text-gray-700">{workflow}</span>
                </li>
              ))}
            </ul>
          )}
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">
              Describe what users DO with your product (not problems they have)
            </p>
          )}
        </div>

        {/* Buyer Roles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buyer Roles
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedICP.buyerRoles.join(', ')}
              onChange={(e) => handleArrayFieldChange('buyerRoles', e.target.value)}
              placeholder="e.g., CTO, VP Engineering, Product Manager"
              className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {editedICP.buyerRoles.map((role, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">Separate multiple roles with commas</p>
          )}
        </div>

        {/* Firmographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Size
            </label>
            {isEditing ? (
              <select
                value={editedICP.firmographics.size}
                onChange={(e) => handleFieldChange('firmographics', { ...editedICP.firmographics, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="small">Small (1-50)</option>
                <option value="medium">Medium (51-200)</option>
                <option value="large">Large (201-1000)</option>
                <option value="enterprise">Enterprise (1000+)</option>
              </select>
            ) : (
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700 capitalize">
                {editedICP.firmographics.size}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Geography
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedICP.firmographics.geo}
                onChange={(e) => handleFieldChange('firmographics', { ...editedICP.firmographics, geo: e.target.value })}
                placeholder="e.g., North America, Europe, Global"
                className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
            ) : (
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
                {editedICP.firmographics.geo}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onReanalyze}
          disabled={isLoading}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Re-analyze Website
        </button>

        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Looks Good - Continue to Find Prospects
        </button>
      </div>
    </div>
  );
}

