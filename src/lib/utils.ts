/**
 * Utility functions for parsing and data manipulation
 */

export interface ParsedProspect {
  name: string;
  domain: string;
  sourceCustomerDomain?: string;
  confidence?: number;
  icpScore?: number;
}

/**
 * Clean and extract domain from various input formats
 * Examples:
 *   https://www.example.com/path -> example.com
 *   [text](https://example.com) -> example.com
 *   www.example.co.uk -> example.co.uk
 */
export function parseDomain(input: string): string {
  if (!input) return '';
  
  let cleaned = input.trim();
  
  // Extract URL from markdown link format: [text](url)
  const markdownLinkMatch = cleaned.match(/\[.*?\]\((.*?)\)/);
  if (markdownLinkMatch) {
    cleaned = markdownLinkMatch[1];
  }
  
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');
  
  // Remove www.
  cleaned = cleaned.replace(/^www\./, '');
  
  // Remove path, query params, and fragments
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
  
  return cleaned.toLowerCase().trim();
}

/**
 * Parse markdown table from ChatGPT into prospect objects
 * Expected format:
 * | Name | Domain | Based on | Confidence | ICP Fit |
 * |------|--------|----------|------------|---------|
 * | Company | example.com | Source | 85 | 88 |
 */
export function parseMarkdownTable(text: string): ParsedProspect[] {
  if (!text || !text.trim()) return [];
  
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  if (lines.length < 3) {
    throw new Error('Invalid table format: needs at least header, separator, and one data row');
  }
  
  // Parse header row
  const headerLine = lines[0];
  if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) {
    throw new Error('Invalid table format: header must start and end with |');
  }
  
  const headers = headerLine
    .split('|')
    .slice(1, -1) // Remove empty first and last elements
    .map(h => h.trim().toLowerCase());
  
  // Find column indices
  const nameIdx = headers.findIndex(h => h === 'name');
  const domainIdx = headers.findIndex(h => h === 'domain');
  const basedOnIdx = headers.findIndex(h => h.includes('based'));
  const confidenceIdx = headers.findIndex(h => h === 'confidence');
  const icpFitIdx = headers.findIndex(h => h.includes('icp') || h.includes('fit') || h.includes('score'));
  
  if (nameIdx === -1 || domainIdx === -1) {
    throw new Error('Table must have "Name" and "Domain" columns');
  }
  
  // Skip separator row (line 1)
  const dataLines = lines.slice(2);
  
  const prospects: ParsedProspect[] = [];
  
  for (const line of dataLines) {
    if (!line.startsWith('|') || !line.endsWith('|')) continue;
    
    const cells = line
      .split('|')
      .slice(1, -1)
      .map(c => c.trim());
    
    if (cells.length < 2) continue;
    
    const name = cells[nameIdx]?.trim();
    const domainRaw = cells[domainIdx]?.trim();
    
    if (!name || !domainRaw) continue;
    
    const domain = parseDomain(domainRaw);
    if (!domain) continue;
    
    const prospect: ParsedProspect = {
      name,
      domain,
    };
    
    // Optional fields
    if (basedOnIdx >= 0 && cells[basedOnIdx]) {
      prospect.sourceCustomerDomain = cells[basedOnIdx].trim();
    }
    
    if (confidenceIdx >= 0 && cells[confidenceIdx]) {
      const conf = parseInt(cells[confidenceIdx].trim(), 10);
      if (!isNaN(conf)) prospect.confidence = conf;
    }
    
    if (icpFitIdx >= 0 && cells[icpFitIdx]) {
      const icp = parseInt(cells[icpFitIdx].trim(), 10);
      if (!isNaN(icp)) prospect.icpScore = icp;
    }
    
    prospects.push(prospect);
  }
  
  return prospects;
}

/**
 * Parse CSV file into prospect objects
 * Supports headers: Name, Domain, Based on, Confidence, ICP Fit/ICP Score
 */
export async function parseProspectCSV(csvText: string): Promise<ParsedProspect[]> {
  // Dynamic import of Papa Parse
  const Papa = (await import('papaparse')).default;
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
      complete: (results) => {
        try {
          const prospects: ParsedProspect[] = [];
          
          for (const row of results.data as Record<string, string>[]) {
            // Find name and domain with flexible column names
            const name = row.name || row.company || row['company name'];
            const domainRaw = row.domain || row.website || row.url;
            
            if (!name || !domainRaw) continue;
            
            const domain = parseDomain(domainRaw);
            if (!domain) continue;
            
            const prospect: ParsedProspect = {
              name: name.trim(),
              domain,
            };
            
            // Optional fields
            const basedOn = row['based on'] || row.source || row['source customer'];
            if (basedOn) {
              prospect.sourceCustomerDomain = basedOn.trim();
            }
            
            const confidence = row.confidence;
            if (confidence) {
              const conf = parseInt(confidence, 10);
              if (!isNaN(conf)) prospect.confidence = conf;
            }
            
            const icpFit = row['icp fit'] || row['icp score'] || row.icpscore;
            if (icpFit) {
              const icp = parseInt(icpFit, 10);
              if (!isNaN(icp)) prospect.icpScore = icp;
            }
            
            prospects.push(prospect);
          }
          
          resolve(prospects);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

