import { pgTable, serial, text, integer, json, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

// ========================================
// AUTHENTICATION & USER TABLES
// ========================================

// Profiles - Extends auth.users with app-specific data
// Note: auth.users is managed by Supabase Auth
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // References auth.users(id) with ON DELETE CASCADE
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// User Settings - Per-user preferences
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey(), // References profiles(id)
  timezone: text('timezone').default('Europe/London'),
  emailNotifications: boolean('email_notifications').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ========================================
// LEGACY: USER SESSIONS (may be deprecated)
// ========================================
// User sessions and ICP profiles
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(), // CHANGED: text → uuid
  websiteUrl: text('website_url'),
  icp: json('icp'), // ICP object
  analysisStep: text('analysis_step').default('input'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ========================================
// APPLICATION DATA TABLES
// ========================================

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(), // CHANGED: text → uuid, references profiles(id)
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  source: text('source', { enum: ['seed', 'expanded', 'imported'] }).notNull(),
  sourceCustomerDomain: text('source_customer_domain'),
  icpScore: integer('icp_score').notNull(),
  confidence: integer('confidence').notNull(),
  status: text('status', { 
    enum: ['New', 'Researching', 'Contacted', 'Won', 'Lost'] 
  }).notNull().default('New'),
  rationale: text('rationale').notNull(),
  evidence: json('evidence').notNull(),
  decisionMakers: json('decision_makers'), // array of DecisionMaker objects
  quality: text('quality', {
    enum: ['excellent', 'good', 'poor']
  }), // for ML feedback
  notes: text('notes'), // CRM notes for this company
  tags: json('tags'), // array of tag strings for grouping
  relatedCompanyIds: json('related_company_ids'), // array of related company IDs
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const clusters = pgTable('clusters', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(), // CHANGED: text → uuid, references profiles(id)
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

// ========================================
// TYPE EXPORTS
// ========================================

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Cluster = typeof clusters.$inferSelect;
export type NewCluster = typeof clusters.$inferInsert;
export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
