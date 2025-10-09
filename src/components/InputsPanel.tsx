'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Plus, X } from 'lucide-react';
import Papa from 'papaparse';
import type { Customer } from '@/types';

interface InputsPanelProps {
  onAnalyse: (websiteUrl: string, customers: Customer[]) => void;
  isLoading: boolean;
}

export default function InputsPanel({ onAnalyse, isLoading }: InputsPanelProps) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [manualCustomers, setManualCustomers] = useState<Customer[]>([
    { name: '', domain: '', notes: '' }
  ]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const parsedCustomers: Customer[] = (results.data as Record<string, string>[])
            .filter((row) => row.name && row.domain)
            .map((row) => ({
              name: row.name.trim(),
              domain: row.domain.trim(),
              notes: row.notes?.trim(),
            }));

          if (parsedCustomers.length === 0) {
            setError('No valid customer data found in CSV');
            return;
          }

          setCustomers(parsedCustomers);
          setError('');
        } catch {
          setError('Error parsing CSV file');
        }
      },
      error: () => {
        setError('Error reading CSV file');
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const removeCustomer = (index: number) => {
    setCustomers(customers.filter((_, i) => i !== index));
  };

  const addManualCustomer = () => {
    setManualCustomers([...manualCustomers, { name: '', domain: '', notes: '' }]);
  };

  const removeManualCustomer = (index: number) => {
    if (manualCustomers.length > 1) {
      setManualCustomers(manualCustomers.filter((_, i) => i !== index));
    }
  };

  const updateManualCustomer = (index: number, field: keyof Customer, value: string) => {
    const updated = [...manualCustomers];
    updated[index] = { ...updated[index], [field]: value };
    setManualCustomers(updated);
  };

  const handleAnalyse = () => {
    if (!websiteUrl.trim()) {
      setError('Please enter a website URL');
      return;
    }

    const currentCustomers = inputMode === 'csv' ? customers : manualCustomers.filter(c => c.name.trim() && c.domain.trim());
    
    if (currentCustomers.length === 0) {
      setError(inputMode === 'csv' ? 'Please upload a customer CSV file' : 'Please add at least one customer');
      return;
    }

    setError('');
    onAnalyse(websiteUrl, currentCustomers);
  };

  const currentCustomers = inputMode === 'csv' ? customers : manualCustomers.filter(c => c.name.trim() && c.domain.trim());

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Inputs</h2>
      
      {/* Website URL */}
      <div className="mb-6">
        <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-2">
          Your Website URL
        </label>
        <input
          id="website-url"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://yourcompany.com"
          className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
      </div>

      {/* Input Mode Toggle */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customer Input Method
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setInputMode('csv')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              inputMode === 'csv'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            disabled={isLoading}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Upload CSV
          </button>
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              inputMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Manual Entry
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      {inputMode === 'csv' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer List (CSV)
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} disabled={isLoading} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop a CSV file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Expected columns: name, domain, notes (optional)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry */}
      {inputMode === 'manual' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Information
          </label>
          <div className="space-y-4">
            {manualCustomers.map((customer, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Customer {index + 1}
                  </h4>
                  {manualCustomers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeManualCustomer(index)}
                      className="text-red-600 hover:text-red-800"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => updateManualCustomer(index, 'name', e.target.value)}
                      placeholder="e.g., Acme Corp"
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Domain *
                    </label>
                    <input
                      type="text"
                      value={customer.domain}
                      onChange={(e) => updateManualCustomer(index, 'domain', e.target.value)}
                      placeholder="e.g., acme.com"
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Additional Context (Optional)
                  </label>
                  <textarea
                    value={customer.notes}
                    onChange={(e) => updateManualCustomer(index, 'notes', e.target.value)}
                    placeholder="e.g., Enterprise software company, focuses on CRM solutions, 500+ employees..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addManualCustomer}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
              disabled={isLoading}
            >
              <Plus className="h-5 w-5 mx-auto mb-2" />
              Add Another Customer
            </button>
          </div>
        </div>
      )}

      {/* Customer Preview */}
      {currentCustomers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Customer Preview ({currentCustomers.length} customers)
          </h3>
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    {inputMode === 'csv' && (
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCustomers.map((customer, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {customer.domain}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {customer.notes || '-'}
                      </td>
                      {inputMode === 'csv' && (
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => removeCustomer(index)}
                            className="text-red-600 hover:text-red-800"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Analyse Button */}
      <button
        onClick={handleAnalyse}
        disabled={isLoading || !websiteUrl.trim() || currentCustomers.length === 0}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Extracting ICP...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Extract ICP & Continue
          </>
        )}
      </button>
    </div>
  );
}
