import { pgTable, serial, text, integer, json } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').notNull().unique(),
  source: text('source', { enum: ['seed', 'expanded'] }).notNull(),
  sourceCustomerDomain: text('source_customer_domain'),
  icpScore: integer('icp_score').notNull(),
  confidence: integer('confidence').notNull(),
  status: text('status', { 
    enum: ['New', 'Researching', 'Contacted', 'Won', 'Lost'] 
  }).notNull().default('New'),
  rationale: text('rationale').notNull(),
  evidence: json('evidence').notNull(),
});

export const clusters = pgTable('clusters', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  criteria: json('criteria').notNull(),
  companyIds: json('company_ids').notNull(),
});

export const ads = pgTable('ads', {
  id: serial('id').primaryKey(),
  clusterId: integer('cluster_id').notNull().references(() => clusters.id),
  headline: text('headline').notNull(),
  lines: json('lines').notNull(),
  cta: text('cta').notNull(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Cluster = typeof clusters.$inferSelect;
export type NewCluster = typeof clusters.$inferInsert;
export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;
