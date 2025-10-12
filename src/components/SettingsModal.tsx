'use client';

import { useState, useEffect } from 'react';
import { Settings, X, Zap, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearData?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onClearData }: SettingsModalProps) {
  const [batchSize, setBatchSize] = useState(10);
  const [maxTotalProspects, setMaxTotalProspects] = useState(50);
  
  useEffect(() => {
    // Load from localStorage
    const savedBatchSize = localStorage.getItem('gtm-batch-size');
    const savedMaxTotal = localStorage.getItem('gtm-max-total-prospects');
    
    if (savedBatchSize) setBatchSize(parseInt(savedBatchSize));
    if (savedMaxTotal) setMaxTotalProspects(parseInt(savedMaxTotal));
  }, []);
  
  const handleSave = () => {
    localStorage.setItem('gtm-batch-size', batchSize.toString());
    localStorage.setItem('gtm-max-total-prospects', maxTotalProspects.toString());
    onClose();
  };
  
  const estimateTokens = (size: number) => {
    // Rough estimate: ~2000 tokens per prospect analyzed
    // (website fetch + analysis + ICP comparison)
    return size * 2000;
  };
  
  const estimateCost = (tokens: number) => {
    // GPT-4o pricing: ~$0.0025 per 1K input tokens, ~$0.01 per 1K output tokens
    // Average: ~$0.006 per 1K tokens
    return (tokens / 1000) * 0.006;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">AI Token Settings</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Batch Size per Generation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prospects per Generation
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>5 (fast)</span>
              <span className="font-semibold text-blue-600">{batchSize} prospects</span>
              <span>50 (thorough)</span>
            </div>
            <div className="mt-2 p-3 bg-blue-50 rounded-md">
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <span>
                  Est. ~{estimateTokens(batchSize).toLocaleString()} tokens (~${estimateCost(estimateTokens(batchSize)).toFixed(3)}) per generation
                </span>
              </div>
            </div>
          </div>

          {/* Max Total Prospects */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Total Prospects
            </label>
            <input
              type="number"
              min="10"
              max="500"
              step="10"
              value={maxTotalProspects}
              onChange={(e) => setMaxTotalProspects(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Stop generating when this limit is reached
            </p>
          </div>

          {/* Info Section */}
          <div className="bg-gray-50 rounded-md p-3">
            <h3 className="text-sm font-medium text-gray-900 mb-2">How it works:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Initial analysis generates {batchSize} prospects</li>
              <li>• &quot;Generate More&quot; button adds {batchSize} more each time</li>
              <li>• Generation stops at {maxTotalProspects} total prospects</li>
              <li>• Each prospect analyzed costs ~2000 AI tokens</li>
            </ul>
          </div>
        </div>

        {/* Danger Zone */}
        {onClearData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-red-50 rounded-md p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Danger Zone</h3>
              <p className="text-xs text-red-600 mb-3">
                This action will delete all your data including prospects, ICP profile, and analysis results. This cannot be undone.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                    onClearData();
                    onClose();
                  }
                }}
                className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

