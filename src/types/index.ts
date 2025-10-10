export interface Customer {
  name: string;
  domain: string;
  notes?: string;
}

export interface ICP {
  solution: string;
  workflows: string[];
  industries: string[];
  buyerRoles: string[];
  firmographics: {
    size: string;
    geo: string;
  };
}

export interface Competitor {
  name: string;
  domain: string;
  rationale: string;
  evidenceUrls: string[];
  confidence: number;
}

export interface Evidence {
  url: string;
  snippet: string;
}

export interface DecisionMaker {
  name: string;
  role: string;
  linkedin?: string;
  email?: string;
  emailSource?: 'found' | 'generated'; // Whether email was found in results or generated
  phone?: string;
  contactStatus: 'Not Contacted' | 'Attempted' | 'Connected' | 'Responded' | 'Unresponsive';
  quality?: 'good' | 'poor'; // User feedback on decision maker quality
  notes?: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface AdCopy {
  headline: string;
  lines: string[];
  cta: string;
}

export interface ClusterSummary {
  label: string;
  criteria: Record<string, unknown>;
  companyIds: number[];
  avgIcpScore: number;
  count: number;
}

export type { Company, Cluster, Ad } from '@/lib/schema';
