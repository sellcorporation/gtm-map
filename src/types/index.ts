export interface Customer {
  name: string;
  domain: string;
  notes?: string;
}

export interface ICP {
  industries: string[];
  pains: string[];
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
  criteria: Record<string, any>;
  companyIds: number[];
  avgIcpScore: number;
  count: number;
}
