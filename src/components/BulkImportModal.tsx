'use client';

import { useState } from 'react';
import { parseMarkdownTable, parseProspectCSV, type ParsedProspect } from '@/lib/utils';
import { toast } from 'sonner';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function BulkImportModal({ isOpen, onClose, onImportComplete }: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'csv'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [parsedProspects, setParsedProspects] = useState<ParsedProspect[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState('');

  if (!isOpen) return null;

  const handleParse = () => {
    setParseError('');
    setParsedProspects([]);

    try {
      if (activeTab === 'paste') {
        if (!pasteText.trim()) {
          setParseError('Please paste a markdown table');
          return;
        }
        const prospects = parseMarkdownTable(pasteText);
        if (prospects.length === 0) {
          setParseError('No valid prospects found in the table');
          return;
        }
        setParsedProspects(prospects);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to parse table';
      setParseError(errorMsg);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    setParsedProspects([]);

    try {
      const text = await file.text();
      const prospects = await parseProspectCSV(text);
      
      if (prospects.length === 0) {
        setParseError('No valid prospects found in the CSV');
        return;
      }
      
      setParsedProspects(prospects);
      toast.success(`Parsed ${prospects.length} prospects from CSV`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to parse CSV';
      setParseError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleImport = async () => {
    if (parsedProspects.length === 0) {
      toast.error('No prospects to import');
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/prospects/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: parsedProspects }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import prospects');
      }

      const data = await response.json();
      
      toast.success(data.message || `Imported ${data.imported} prospects`);
      
      if (data.errors && data.errors.length > 0) {
        console.warn('Import errors:', data.errors);
      }

      // Reset state and close
      setPasteText('');
      setParsedProspects([]);
      setParseError('');
      onImportComplete();
      onClose();
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to import prospects';
      toast.error(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (isImporting) return;
    setPasteText('');
    setParsedProspects([]);
    setParseError('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Import Prospects</h2>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'paste'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Paste Table
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'csv'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload CSV
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste Markdown Table from ChatGPT
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="| Name | Domain | Based on | Confidence | ICP Fit |&#10;|------|--------|----------|------------|---------|&#10;| Company | example.com | Source | 85 | 88 |"
                  className="w-full h-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  disabled={isImporting}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Paste a markdown table with Name and Domain columns (required). Confidence and ICP Fit are optional.
                </p>
              </div>
              <button
                onClick={handleParse}
                disabled={!pasteText.trim() || isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Parse Table
              </button>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Upload a CSV with columns: Name, Domain (required). Optional: Confidence, ICP Fit, Based on.
                </p>
              </div>
            </div>
          )}

          {parseError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{parseError}</p>
            </div>
          )}

          {/* Preview Table */}
          {parsedProspects.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">
                Preview ({parsedProspects.length} prospect{parsedProspects.length !== 1 ? 's' : ''})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Domain
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ICP Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedProspects.map((prospect, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{prospect.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">{prospect.domain}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prospect.confidence || 70}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prospect.icpScore || 70}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {parsedProspects.length > 0 && (
              <span>Ready to import {parsedProspects.length} prospect{parsedProspects.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parsedProspects.length === 0 || isImporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isImporting && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{isImporting ? 'Importing...' : 'Import'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

