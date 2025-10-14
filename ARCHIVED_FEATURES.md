# 📦 Archived Features

This document tracks features that have been designed and specified but are not currently prioritized for development.

---

## 🗺️ Market Mapping (Visual Competitive Matrix)

**Status**: Archived  
**Date Archived**: October 14, 2025  
**Branch**: `feature/market-mapping` (preserved in remote)  
**Tag**: `archive/market-mapping-v1`  
**Spec Document**: `MARKET_MAPPING_FEATURE_SPEC.md` (in branch)  

### What It Is
A visual 2D matrix where users can drag-and-drop companies to position them based on custom metrics (e.g., Traffic Share vs. Conversion Rate, Price vs. Features). Similar to BCG Matrix or Gartner Magic Quadrant, but customizable and interactive.

### Why Archived
**Decision**: Not a priority for early-stage target audience

**Reasoning**:
- Early-stage founders typically have 0-10 prospects, not enough for meaningful visualization
- Manual drag-and-drop positioning creates friction for time-starved users
- The problem we're solving is "I need leads" (acquisition), not "I need to visualize leads" (analysis)
- 5-7 days of dev time better spent on action-oriented features
- Visual mapping is valuable at 50+ companies, but most users won't reach that threshold early

**Higher Priority Alternatives**:
1. ✅ Email template generation (immediate action → closing deals)
2. ✅ Smart prospect prioritization (AI scoring → saves time)
3. ✅ LinkedIn integration (bridges to where founders work)
4. ✅ CRM integrations (HubSpot, Salesforce)
5. ✅ Better filtering & search (quick wins with existing data)

### When to Revisit
**Criteria for Re-prioritization**:
- [ ] Product has reached product-market fit
- [ ] Average user has 50+ prospects in system
- [ ] Users explicitly requesting visualization features
- [ ] Positioned as premium/Pro-only differentiator
- [ ] Can be built with AI auto-positioning (not manual drag-drop)

**Estimated Effort**: 5-7 days for MVP (canvas, drag-drop, save positions)  
**Future Enhancement**: Make it AI-powered (auto-position based on scraped data)

### How to Restore
If you decide to build this feature:

```bash
# Checkout the archived branch
git checkout -b feature/market-mapping origin/feature/market-mapping

# Or restore from tag
git checkout -b feature/market-mapping archive/market-mapping-v1

# Review the spec
open MARKET_MAPPING_FEATURE_SPEC.md

# Run the migration
psql -f migrations/market_mapping_feature.sql
```

**Documentation**:
- Full specification: See `MARKET_MAPPING_FEATURE_SPEC.md` in branch
- Database migration: `migrations/market_mapping_feature.sql`
- 3 new tables: `market_maps`, `market_map_positions`, `market_map_shares`
- 8 API endpoints defined
- Component architecture specified

---

## 📋 How to Archive a Feature

For future reference, here's the process used:

1. **Complete the specification** (design, database, API, components)
2. **Commit all work** to a feature branch
3. **Push branch to remote** (`git push origin feature/name`)
4. **Create archive tag** (`git tag -a archive/feature-name-v1 -m "Archive reason"`)
5. **Push tag** (`git push origin archive/feature-name-v1`)
6. **Switch to main** (`git checkout main`)
7. **Delete local branch** (`git branch -D feature/name`)
8. **Document in this file** (what, why, when to revisit)

The branch and tag remain in the remote repository for future reference.

---

**Last Updated**: October 14, 2025

