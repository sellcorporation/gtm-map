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
    <div className="space-y-4 md:space-y-6">
      {clusters.map((cluster) => {
        const clusterAds = getClusterAds(cluster.id);
        const criteria = cluster.criteria as Record<string, unknown>;
        const avgIcpScore = (criteria?.avgIcpScore as number) || 0;
        const companyIds = cluster.companyIds as number[];

        return (
          <div key={cluster.id} className="bg-white border rounded-lg p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">{cluster.label}</h3>
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <span className="text-xs md:text-sm text-gray-500">
                    {companyIds.length} companies
                  </span>
                  <span className={`text-xs md:text-sm font-medium ${getScoreColor(avgIcpScore)}`}>
                    Avg ICP Score: {Math.round(avgIcpScore)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {Object.entries(criteria || {}).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>

            {clusterAds.length > 0 && (
              <div className="mt-3 md:mt-4">
                <h4 className="text-sm md:text-md font-medium text-gray-900 mb-2 md:mb-3">Ad Campaigns</h4>
                <div className="space-y-3 md:space-y-4">
                  {clusterAds.map((ad) => (
                    <div key={ad.id} className="border rounded-md p-3 md:p-4 bg-gray-50">
                      <div className="flex items-start justify-between gap-2 mb-2 md:mb-3">
                        <h5 className="font-medium text-sm md:text-base text-gray-900 flex-1">{ad.headline}</h5>
                        <button
                          onClick={() => copyToClipboard(
                            `${ad.headline}\n\n${ad.lines && Array.isArray(ad.lines) ? ad.lines.join('\n') : ''}\n\n${ad.cta}`,
                            ad.id
                          )}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          aria-label="Copy ad content"
                        >
                          {copiedAdId === ad.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      
                      <div className="space-y-1.5 md:space-y-2">
                        {ad.lines && Array.isArray(ad.lines) ? (ad.lines as string[]).map((line, index) => (
                          <p key={index} className="text-xs md:text-sm text-gray-700">
                            {line}
                          </p>
                        )) : null}
                      </div>
                      
                      <div className="mt-2 md:mt-3">
                        <span className="inline-flex items-center px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium bg-blue-100 text-blue-800">
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
