import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Mock database for testing without real Supabase connection
const isMockMode = process.env.DATABASE_URL?.includes('placeholder') || !process.env.DATABASE_URL;

let db: any;
let companies: any;
let clusters: any;
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
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: () => {
          const id = Math.floor(Math.random() * 10000);
          const result = { id, ...data };
          const tableName = table.name || table;
          if (tableName === 'companies') {
            mockData.companies.push(result);
          } else if (tableName === 'clusters') {
            mockData.clusters.push(result);
          } else if (tableName === 'ads') {
            mockData.ads.push(result);
          }
          return [result];
        }
      })
    }),
    select: () => ({
      from: (table: any) => {
        const tableName = table.name || table;
        if (tableName === 'companies') return mockData.companies;
        if (tableName === 'clusters') return mockData.clusters;
        if (tableName === 'ads') return mockData.ads;
        return [];
      }
    }),
    update: (table: any) => ({
      set: (data: any) => ({
        where: (condition: any) => ({
          returning: () => {
            const tableName = table.name || table;
            let tableData: any[] = [];
            if (tableName === 'companies') tableData = mockData.companies;
            else if (tableName === 'clusters') tableData = mockData.clusters;
            else if (tableName === 'ads') tableData = mockData.ads;
            
            const index = tableData.findIndex((item: any) => item.id === condition.id);
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
