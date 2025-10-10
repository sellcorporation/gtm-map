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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let userSessions: any;

if (isMockMode) {
  // Mock database implementation
  console.log('Running in mock mode - data will not persist');
  
  const mockData = {
    companies: [],
    clusters: [],
    ads: [],
    userSessions: []
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
          } else if (tableName === 'user_sessions') {
            mockData.userSessions.push(result as never);
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
        if (tableName === 'user_sessions') return mockData.userSessions;
        return [];
      },
      where: (condition: unknown) => ({
        orderBy: () => ({
          limit: (n: number) => {
            // For mock, just return the data (simplified)
            return mockData.userSessions.slice(0, n);
          }
        }),
        limit: (n: number) => {
          return mockData.userSessions.slice(0, n);
        }
      })
    }),
    update: (table: MockTable) => ({
      set: (data: Record<string, unknown>) => ({
        where: (condition: unknown) => ({
          returning: () => {
            const tableName = table.name || table;
            let tableData: Record<string, unknown>[] = [];
            if (tableName === 'companies') tableData = mockData.companies;
            else if (tableName === 'clusters') tableData = mockData.clusters;
            else if (tableName === 'ads') tableData = mockData.ads;
            else if (tableName === 'user_sessions') tableData = mockData.userSessions;
            
            // Extract ID from drizzle-orm eq() condition
            // Drizzle's eq() returns an object with right/left sides
            // The right side contains the value we're comparing against
            let targetId: number | undefined;
            
            if (condition && typeof condition === 'object') {
              // Try different possible structures
              if ('right' in condition && condition.right && typeof condition.right === 'object') {
                const right = condition.right as Record<string, unknown>;
                if ('value' in right) {
                  targetId = right.value as number;
                }
              } else if ('value' in condition) {
                targetId = (condition as { value: number }).value;
              }
            }
            
            // Find and update the matching record
            const index = tableData.findIndex((item) => {
              return targetId !== undefined && item.id === targetId;
            });
            
            if (index !== -1) {
              tableData[index] = { ...tableData[index], ...data };
              return [tableData[index]];
            }
            
            console.warn('[Mock DB] Could not find record to update, targetId:', targetId);
            return [];
          }
        })
      })
    })
  };

  companies = { name: 'companies' };
  clusters = { name: 'clusters' };
  ads = { name: 'ads' };
  userSessions = { name: 'user_sessions' };
} else {
  // Real database connection
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString);
  db = drizzle(client, { schema });
  companies = schema.companies;
  clusters = schema.clusters;
  ads = schema.ads;
  userSessions = schema.userSessions;
}

export { db, schema, companies, clusters, ads, userSessions };
