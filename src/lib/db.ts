import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Mock database for testing without real Supabase connection
const isMockMode = process.env.DATABASE_URL?.includes('placeholder') || !process.env.DATABASE_URL;

interface MockTable {
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let companies: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clusters: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ads: any;

if (isMockMode) {
  // Mock database implementation
  console.log('Running in mock mode - data will not persist');
  
  const mockData = {
    companies: [],
    clusters: [],
    ads: []
  };

  db = {
    insert: (table: MockTable) => ({
      values: (data: Record<string, unknown>) => ({
        returning: () => {
          const id = Math.floor(Math.random() * 10000);
          const result = { id, ...data };
          const tableName = table.name || table;
          if (tableName === 'companies') {
            mockData.companies.push(result as never);
          } else if (tableName === 'clusters') {
            mockData.clusters.push(result as never);
          } else if (tableName === 'ads') {
            mockData.ads.push(result as never);
          }
          return [result];
        }
      })
    }),
    select: () => ({
      from: (table: MockTable) => {
        const tableName = table.name || table;
        if (tableName === 'companies') return mockData.companies;
        if (tableName === 'clusters') return mockData.clusters;
        if (tableName === 'ads') return mockData.ads;
        return [];
      }
    }),
    update: (table: MockTable) => ({
      set: (data: Record<string, unknown>) => ({
        where: (condition: Record<string, unknown>) => ({
          returning: () => {
            const tableName = table.name || table;
            let tableData: Record<string, unknown>[] = [];
            if (tableName === 'companies') tableData = mockData.companies;
            else if (tableName === 'clusters') tableData = mockData.clusters;
            else if (tableName === 'ads') tableData = mockData.ads;
            
            const index = tableData.findIndex((item) => item.id === condition.id);
            if (index !== -1) {
              tableData[index] = { ...tableData[index], ...data };
              return [tableData[index]];
            }
            return [];
          }
        })
      })
    })
  };

  companies = { name: 'companies' };
  clusters = { name: 'clusters' };
  ads = { name: 'ads' };
} else {
  // Real database connection
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString);
  db = drizzle(client, { schema });
  companies = schema.companies;
  clusters = schema.clusters;
  ads = schema.ads;
}

export { db, schema, companies, clusters, ads };
