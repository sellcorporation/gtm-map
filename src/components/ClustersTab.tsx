'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { Cluster, Ad } from '@/types';

interface ClustersTabProps {
  clusters: Cluster[];
  ads: Ad[];
}

export default function ClustersTab({ clusters, ads }: ClustersTabProps) {
  const [copiedAdId, setCopiedAdId] = useState<number | null>(null);

  const copyToClipboard = async (text: string, adId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAdId(adId);
      setTimeout(() => setCopiedAdId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getClusterAds = (clusterId: number) => {
    return ads.filter(ad => ad.clusterId === clusterId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (clusters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No clusters found. Run an analysis to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {clusters.map((cluster) => {
        const clusterAds = getClusterAds(cluster.id);
        const criteria = cluster.criteria as any;
        const avgIcpScore = criteria?.avgIcpScore || 0;
        const companyIds = cluster.companyIds as number[];

        return (
          <div key={cluster.id} className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{cluster.label}</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-sm text-gray-500">
                    {companyIds.length} companies
                  </span>
                  <span className={`text-sm font-medium ${getScoreColor(avgIcpScore)}`}>
                    Avg ICP Score: {Math.round(avgIcpScore)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(criteria || {}).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>

            {clusterAds.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Ad Campaigns</h4>
                <div className="space-y-4">
                  {clusterAds.map((ad) => (
                    <div key={ad.id} className="border rounded-md p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-medium text-gray-900">{ad.headline}</h5>
                        <button
                          onClick={() => copyToClipboard(
                            `${ad.headline}\n\n${ad.lines && Array.isArray(ad.lines) ? ad.lines.join('\n') : ''}\n\n${ad.cta}`,
                            ad.id
                          )}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copiedAdId === ad.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {ad.lines && Array.isArray(ad.lines) && ad.lines.map((line, index) => (
                          <p key={index} className="text-sm text-gray-700">
                            {line}
                          </p>
                        ))}
                      </div>
                      
                      <div className="mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {ad.cta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
