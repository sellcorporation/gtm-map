# 🗺️ Market Mapping Feature - Complete Specification

**Feature Name**: Market Mapping (Competitive Intelligence Matrix)  
**Branch**: `feature/market-mapping`  
**Status**: Specification Phase  
**Priority**: High (Differentiating Feature)  
**Estimated Dev Time**: 5-7 days  
**Last Updated**: October 14, 2025

---

## 🎯 Feature Overview

### What It Does
A visual, interactive 2D matrix where users can position their prospects, customers, and competitors based on custom metrics (e.g., traffic share vs conversion rate, price vs features, etc.). Users can drag and drop companies to specific positions, and the system saves their placement for persistent visualization.

### Why It Matters
- **Visual Intelligence**: Turns abstract market data into actionable visual insights
- **Strategic Planning**: Helps users identify market gaps and opportunities
- **Competitive Analysis**: Clear view of where competitors stand
- **Differentiation**: Unique feature that sets GTM Map apart from basic CRM tools

### Inspiration
BCG Matrix, Gartner Magic Quadrant, but customizable and interactive.

---

## 👤 User Stories

### Primary Use Cases

**As a founder**, I want to:
- Visualize where my competitors sit in the market based on key metrics
- Identify underserved market segments (gaps in the matrix)
- Track how competitor positions change over time
- Share market positioning with my team/investors

**As a sales person**, I want to:
- Quickly see which prospects are high-value, high-conversion opportunities
- Prioritize outreach based on visual positioning
- Understand competitive landscape before sales calls

**As a marketer**, I want to:
- Map content strategy against competitor positioning
- Identify white space opportunities
- Visualize ICP fit across different segments

---

## 🎨 UI/UX Specifications

### Visual Layout

Based on the provided image:

```
                        High [Metric Y]
                              ↑
                              |
     [Company A]              |         [Company B]
         ⭐                   |              ⭐
         🏢                   |              🏢
                              |
    Low [Metric X] ←──────────┼──────────→ High [Metric X]
                              |
                              |
     [Company C]              |         [Company D]
         ⭐                   |              ⭐
         🏢                   |              🏢
                              |
                              ↓
                        Low [Metric Y]
```

### Components

#### 1. Matrix Canvas
- **Size**: 800x600px (desktop), responsive on mobile
- **Background**: Light gray grid (#F9FAFB)
- **Grid Lines**: Subtle dotted lines every 100px
- **Center Lines**: Bold lines (X and Y axes)
- **Quadrant Labels**: Optional labels for each quadrant

#### 2. Axis Controls
**X-Axis Configuration**:
- Label (editable): Default "Conversion Rate"
- Min value label: "Low conversion rate"
- Max value label: "High conversion rate"

**Y-Axis Configuration**:
- Label (editable): Default "Traffic Share"
- Min value label: "Low traffic share"
- Max value label: "High traffic share"

**Preset Options** (dropdown):
- Traffic Share vs. Conversion Rate (default)
- Price vs. Features
- Market Size vs. Growth Rate
- Quality vs. Price
- Innovation vs. Market Share
- Custom (user-defined)

#### 3. Company Cards
Each company appears as a draggable card:

```
   ⭐
   🏢
[Company Name]
```

**Visual States**:
- **Default**: White card, subtle shadow, blue icon
- **Hover**: Lift effect, larger shadow, cursor changes to "grab"
- **Dragging**: Opacity 0.8, cursor "grabbing", larger shadow
- **Dropped**: Smooth animation to final position

**Card Data** (tooltip on hover):
- Company name
- Domain
- ICP fit score
- Last updated
- Custom notes (if any)

#### 4. Control Panel (Right Sidebar)

**Section 1: Axis Configuration**
- X-Axis label input
- Y-Axis label input
- Preset selector dropdown
- "Reset to Default" button

**Section 2: Companies List**
- Searchable list of all companies
- Filter options:
  - All Companies
  - Prospects
  - Customers
  - Competitors
  - Unmapped (not yet positioned)
- Drag from list → drop on matrix

**Section 3: View Options**
- Show/Hide grid lines
- Show/Hide quadrant labels
- Show/Hide company labels
- Zoom controls (50%, 75%, 100%, 125%, 150%)

**Section 4: Actions**
- "Export as PNG" button
- "Share Map" button (generates shareable link)
- "Reset All Positions" button (with confirmation)

---

## 🗄️ Database Schema

### New Table: `market_maps`

```sql
CREATE TABLE market_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Map',
  x_axis_label VARCHAR(100) NOT NULL DEFAULT 'Conversion Rate',
  x_axis_min_label VARCHAR(100) DEFAULT 'Low',
  x_axis_max_label VARCHAR(100) DEFAULT 'High',
  y_axis_label VARCHAR(100) NOT NULL DEFAULT 'Traffic Share',
  y_axis_min_label VARCHAR(100) DEFAULT 'Low',
  y_axis_max_label VARCHAR(100) DEFAULT 'High',
  preset_type VARCHAR(50) DEFAULT 'custom', -- 'traffic_conversion', 'price_features', 'custom', etc.
  is_default BOOLEAN DEFAULT false, -- Only one default map per user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE market_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maps"
  ON market_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own maps"
  ON market_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maps"
  ON market_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maps"
  ON market_maps FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_market_maps_user_id ON market_maps(user_id);
CREATE INDEX idx_market_maps_default ON market_maps(user_id, is_default) WHERE is_default = true;
```

### New Table: `market_map_positions`

```sql
CREATE TABLE market_map_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_map_id UUID NOT NULL REFERENCES market_maps(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  x_position DECIMAL(5,2) NOT NULL CHECK (x_position >= 0 AND x_position <= 100), -- 0-100 percentage
  y_position DECIMAL(5,2) NOT NULL CHECK (y_position >= 0 AND y_position <= 100), -- 0-100 percentage
  notes TEXT, -- Optional user notes about this positioning
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(market_map_id, company_id) -- One position per company per map
);

-- RLS Policies (inherit from market_maps)
ALTER TABLE market_map_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view positions on their maps"
  ON market_map_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create positions on their maps"
  ON market_map_positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update positions on their maps"
  ON market_map_positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete positions on their maps"
  ON market_map_positions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_market_map_positions_map_id ON market_map_positions(market_map_id);
CREATE INDEX idx_market_map_positions_company_id ON market_map_positions(company_id);
CREATE UNIQUE INDEX idx_market_map_positions_unique ON market_map_positions(market_map_id, company_id);
```

### Schema Updates to Existing Tables

**Update `companies` table** (add metadata for positioning):
```sql
ALTER TABLE companies
ADD COLUMN traffic_share_estimate INTEGER, -- 0-100 estimate
ADD COLUMN conversion_rate_estimate DECIMAL(5,2), -- 0-100 estimate
ADD COLUMN last_matrix_update TIMESTAMP WITH TIME ZONE;
```

---

## 🔌 API Endpoints

### 1. Market Maps Management

#### `GET /api/market-maps`
**Purpose**: Get all maps for current user

**Response**:
```typescript
{
  maps: [
    {
      id: string;
      name: string;
      x_axis_label: string;
      y_axis_label: string;
      preset_type: string;
      is_default: boolean;
      created_at: string;
      updated_at: string;
      company_count: number; // Number of positioned companies
    }
  ]
}
```

#### `POST /api/market-maps`
**Purpose**: Create new map

**Request**:
```typescript
{
  name?: string;
  x_axis_label?: string;
  x_axis_min_label?: string;
  x_axis_max_label?: string;
  y_axis_label?: string;
  y_axis_min_label?: string;
  y_axis_max_label?: string;
  preset_type?: string;
  is_default?: boolean;
}
```

**Response**:
```typescript
{
  map: { /* market map object */ }
}
```

#### `GET /api/market-maps/:id`
**Purpose**: Get specific map with all positioned companies

**Response**:
```typescript
{
  map: {
    id: string;
    name: string;
    x_axis_label: string;
    y_axis_label: string;
    // ... all map fields
  },
  positions: [
    {
      id: string;
      company: {
        id: string;
        name: string;
        domain: string;
        source: 'customer' | 'prospect' | 'competitor';
        icp_fit_score: number;
      },
      x_position: number;
      y_position: number;
      notes: string | null;
      updated_at: string;
    }
  ]
}
```

#### `PATCH /api/market-maps/:id`
**Purpose**: Update map configuration

**Request**:
```typescript
{
  name?: string;
  x_axis_label?: string;
  y_axis_label?: string;
  // ... any map fields
}
```

#### `DELETE /api/market-maps/:id`
**Purpose**: Delete map (cascades to positions)

---

### 2. Company Positioning

#### `POST /api/market-maps/:mapId/positions`
**Purpose**: Add/update company position on map

**Request**:
```typescript
{
  company_id: string;
  x_position: number; // 0-100
  y_position: number; // 0-100
  notes?: string;
}
```

**Response**:
```typescript
{
  position: {
    id: string;
    company_id: string;
    x_position: number;
    y_position: number;
    notes: string | null;
    updated_at: string;
  }
}
```

**Note**: Uses upsert logic - if position exists, update it; otherwise, create it.

#### `DELETE /api/market-maps/:mapId/positions/:companyId`
**Purpose**: Remove company from map

---

### 3. Export & Sharing

#### `GET /api/market-maps/:id/export`
**Purpose**: Export map as PNG image

**Query Params**:
- `width`: number (default 1200)
- `height`: number (default 900)
- `quality`: 'low' | 'medium' | 'high'

**Response**: PNG image blob

#### `POST /api/market-maps/:id/share`
**Purpose**: Generate shareable link

**Response**:
```typescript
{
  share_url: string; // e.g., "https://app.com/shared/maps/abc123"
  expires_at: string; // 30 days from now
}
```

---

## 🎨 Component Structure

### File Organization

```
src/
├── app/
│   ├── market-map/
│   │   └── page.tsx                  # Main market mapping page
│   └── api/
│       └── market-maps/
│           ├── route.ts              # GET (list), POST (create)
│           └── [id]/
│               ├── route.ts          # GET, PATCH, DELETE
│               ├── positions/
│               │   └── route.ts      # POST (upsert position)
│               ├── export/
│               │   └── route.ts      # GET (export PNG)
│               └── share/
│                   └── route.ts      # POST (generate share link)
└── components/
    └── market-map/
        ├── MarketMapCanvas.tsx       # Main canvas with drag-drop
        ├── CompanyMarker.tsx         # Individual company card/icon
        ├── AxisConfiguration.tsx     # Axis labels and controls
        ├── CompanyListSidebar.tsx    # Right sidebar with company list
        ├── MarketMapToolbar.tsx      # Top toolbar (zoom, export, etc.)
        ├── QuadrantLabels.tsx        # Optional quadrant labels
        └── hooks/
            ├── useMarketMap.ts       # Fetch and manage map data
            ├── useDragDrop.ts        # Drag-drop logic
            └── useMapExport.ts       # Export functionality
```

---

## 🧩 Core Components

### 1. MarketMapCanvas.tsx

**Purpose**: Main interactive canvas with drag-drop

```typescript
interface MarketMapCanvasProps {
  mapId: string;
  companies: CompanyPosition[];
  xAxisLabel: string;
  yAxisLabel: string;
  onPositionUpdate: (companyId: string, x: number, y: number) => Promise<void>;
  showGrid?: boolean;
  showLabels?: boolean;
  zoom?: number;
}

export function MarketMapCanvas(props: MarketMapCanvasProps) {
  // Implementation details:
  // - Canvas with 0-100 coordinate system (converted to px)
  // - Drag-and-drop using react-dnd or custom implementation
  // - Smooth animations on drop
  // - Real-time position updates
  // - Optimistic UI updates
}
```

**Key Features**:
- ✅ Drag-and-drop positioning
- ✅ Grid rendering with customizable spacing
- ✅ Axis lines (X and Y)
- ✅ Zoom in/out (50%-150%)
- ✅ Pan on drag (when zoomed)
- ✅ Responsive scaling (mobile touch support)

---

### 2. CompanyMarker.tsx

**Purpose**: Individual draggable company card

```typescript
interface CompanyMarkerProps {
  company: {
    id: string;
    name: string;
    domain: string;
    source: 'customer' | 'prospect' | 'competitor';
    icp_fit_score?: number;
  };
  position: { x: number; y: number }; // 0-100 coordinates
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
}

export function CompanyMarker(props: CompanyMarkerProps) {
  // Render:
  // - Icon (building with star)
  // - Company name (truncated)
  // - Tooltip on hover (full details)
  // - Visual state based on source (customer=green, prospect=blue, competitor=orange)
}
```

**Visual Variants**:
- **Customer**: Green accent, filled star ⭐
- **Prospect**: Blue accent, outlined star ☆
- **Competitor**: Orange accent, red flag 🚩

---

### 3. CompanyListSidebar.tsx

**Purpose**: Right sidebar with draggable company list

```typescript
interface CompanyListSidebarProps {
  companies: Company[];
  positionedCompanyIds: string[]; // Companies already on map
  onCompanyDragStart: (companyId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: 'all' | 'prospects' | 'customers' | 'competitors' | 'unmapped';
  onFilterChange: (filter: string) => void;
}
```

**Features**:
- Search/filter companies
- Show "Positioned" vs "Unmapped" status
- Drag from list → drop on canvas
- Grouped by type (collapsible sections)

---

### 4. AxisConfiguration.tsx

**Purpose**: Configure axis labels and presets

```typescript
interface AxisConfigurationProps {
  xAxisLabel: string;
  yAxisLabel: string;
  xMinLabel: string;
  xMaxLabel: string;
  yMinLabel: string;
  yMaxLabel: string;
  presetType: string;
  onUpdate: (config: AxisConfig) => Promise<void>;
}
```

**Preset Options**:
```typescript
const AXIS_PRESETS = [
  {
    id: 'traffic_conversion',
    name: 'Traffic vs. Conversion',
    xLabel: 'Conversion Rate',
    xMin: 'Low conversion',
    xMax: 'High conversion',
    yLabel: 'Traffic Share',
    yMin: 'Low traffic',
    yMax: 'High traffic',
  },
  {
    id: 'price_features',
    name: 'Price vs. Features',
    xLabel: 'Feature Set',
    xMin: 'Basic',
    xMax: 'Advanced',
    yLabel: 'Price',
    yMin: 'Budget',
    yMax: 'Premium',
  },
  // ... more presets
];
```

---

## 🎬 User Interactions & Flows

### Flow 1: First-Time User (Empty Map)

1. User navigates to `/market-map`
2. System creates default map if none exists
3. Empty canvas displayed with welcome message:
   ```
   👋 Welcome to Market Mapping!
   
   Drag companies from the sidebar to visualize
   your competitive landscape.
   
   [Watch Tutorial] [Import Companies]
   ```
4. Sidebar shows all companies (prospects, customers, competitors)
5. User drags first company → drops on canvas
6. System saves position to database
7. Company appears on map with smooth animation

---

### Flow 2: Positioning a Company

1. User clicks on company in sidebar (or existing marker on canvas)
2. Mouse cursor changes to "grab" ✋
3. User drags to desired position
4. Semi-transparent "ghost" follows cursor
5. Grid lines highlight on hover (snap-to-grid optional)
6. User releases mouse
7. System:
   - Calculates x/y coordinates (0-100 scale)
   - Sends `POST /api/market-maps/:id/positions`
   - Updates database
   - Shows success toast
   - Position saved immediately (no "Save" button needed)

---

### Flow 3: Updating Axis Configuration

1. User clicks "Edit Axes" button in toolbar
2. Modal/sidebar opens with configuration form:
   - X-Axis label input
   - Y-Axis label input
   - Preset dropdown (or "Custom")
   - Min/Max labels for each axis
3. User types new labels OR selects preset
4. System updates map configuration in real-time
5. Canvas re-renders with new labels
6. Changes saved automatically

---

### Flow 4: Exporting Map as Image

1. User clicks "Export" button in toolbar
2. Dropdown shows options:
   - Export as PNG
   - Export as PDF (future)
   - Share Link
3. User selects "Export as PNG"
4. System:
   - Renders canvas to high-res PNG (1200x900)
   - Includes all companies, labels, grid
   - Downloads file: `market-map-2025-10-14.png`
5. Success toast: "Map exported successfully"

---

### Flow 5: Sharing a Map

1. User clicks "Share" button
2. System generates shareable link
3. Modal displays:
   ```
   Share your market map
   
   Anyone with this link can view (read-only):
   https://app.com/shared/maps/abc123xyz
   
   [Copy Link] [Revoke Access]
   
   Expires: November 13, 2025
   ```
4. User copies link
5. Recipient opens link → sees read-only version of map

---

## 🔐 Permissions & Privacy

### User Permissions
- ✅ Users can only view/edit their own maps
- ✅ Shared maps are read-only for recipients
- ✅ RLS policies enforce user isolation
- ✅ Companies are user-scoped (can't position other users' companies)

### Data Privacy
- Shared links expire after 30 days
- Users can revoke shared links anytime
- Export includes watermark with user's email (optional)

---

## 📊 Analytics & Tracking

### Events to Track

```typescript
// Map creation
analytics.track('market_map_created', {
  map_id: string,
  preset_type: string,
  user_id: string
});

// Company positioned
analytics.track('company_positioned', {
  map_id: string,
  company_id: string,
  x_position: number,
  y_position: number,
  source: 'sidebar' | 'canvas' | 'import'
});

// Map exported
analytics.track('market_map_exported', {
  map_id: string,
  format: 'png' | 'pdf',
  company_count: number
});

// Map shared
analytics.track('market_map_shared', {
  map_id: string,
  share_id: string
});

// Axis configuration changed
analytics.track('axis_config_updated', {
  map_id: string,
  preset_type: string,
  custom: boolean
});
```

### Metrics Dashboard
- Total maps created
- Average companies per map
- Most used presets
- Export frequency
- Share link usage

---

## 🚀 Technical Implementation Details

### Drag-and-Drop Library

**Recommended**: `react-dnd` or `dnd-kit`

```typescript
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

function CompanyMarker({ company, position }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: company.id,
    data: { company, position }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    >
      {/* Company card */}
    </div>
  );
}
```

---

### Canvas Coordinate System

**Approach**: Use percentage-based positioning (0-100 on both axes)

**Benefits**:
- ✅ Responsive (scales with canvas size)
- ✅ Easy to save/restore positions
- ✅ Works on any screen size

**Conversion**:
```typescript
function pixelToPercent(pixelX: number, pixelY: number, canvasWidth: number, canvasHeight: number) {
  return {
    x: (pixelX / canvasWidth) * 100,
    y: (pixelY / canvasHeight) * 100
  };
}

function percentToPixel(percentX: number, percentY: number, canvasWidth: number, canvasHeight: number) {
  return {
    x: (percentX / 100) * canvasWidth,
    y: (percentY / 100) * canvasHeight
  };
}
```

---

### Optimistic Updates

**Strategy**: Update UI immediately, rollback on error

```typescript
async function handlePositionUpdate(companyId: string, x: number, y: number) {
  // 1. Optimistic update (instant UI feedback)
  setPositions(prev => prev.map(p =>
    p.company.id === companyId ? { ...p, x_position: x, y_position: y } : p
  ));

  try {
    // 2. Save to database
    const response = await fetch(`/api/market-maps/${mapId}/positions`, {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, x_position: x, y_position: y })
    });

    if (!response.ok) throw new Error('Failed to save position');

    // 3. Success toast (optional)
    toast.success('Position saved');

  } catch (error) {
    // 4. Rollback on error
    setPositions(prev => /* restore original position */);
    toast.error('Failed to save position');
  }
}
```

---

### Export to PNG

**Approach**: Use `html2canvas` or `dom-to-image`

```typescript
import html2canvas from 'html2canvas';

async function exportMapAsPNG(mapId: string) {
  const canvas = document.getElementById('market-map-canvas');
  if (!canvas) return;

  // Capture canvas as image
  const blob = await html2canvas(canvas, {
    width: 1200,
    height: 900,
    backgroundColor: '#FFFFFF',
    scale: 2 // High DPI
  });

  // Download
  const link = document.createElement('a');
  link.download = `market-map-${new Date().toISOString().split('T')[0]}.png`;
  link.href = blob.toDataURL();
  link.click();
}
```

---

## 🎨 Styling & Design

### Canvas Styling

```css
.market-map-canvas {
  width: 100%;
  height: 600px;
  background: linear-gradient(90deg, #F9FAFB 1px, transparent 1px),
              linear-gradient(#F9FAFB 1px, transparent 1px);
  background-size: 50px 50px;
  position: relative;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
}

.axis-x, .axis-y {
  position: absolute;
  background: #3B82F6;
}

.axis-x {
  width: 100%;
  height: 2px;
  top: 50%;
  left: 0;
}

.axis-y {
  width: 2px;
  height: 100%;
  top: 0;
  left: 50%;
}
```

### Company Marker Styling

```css
.company-marker {
  position: absolute;
  transform: translate(-50%, -50%); /* Center on coordinates */
  cursor: grab;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.company-marker:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.company-marker.dragging {
  cursor: grabbing;
  opacity: 0.8;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

/* Type-specific colors */
.company-marker.customer {
  border-left: 3px solid #10B981; /* Green */
}

.company-marker.prospect {
  border-left: 3px solid #3B82F6; /* Blue */
}

.company-marker.competitor {
  border-left: 3px solid #F59E0B; /* Orange */
}
```

---

## 📱 Mobile Responsiveness

### Approach for Mobile

**Challenge**: Drag-and-drop on small screens is difficult

**Solution**: Hybrid approach
1. **Desktop**: Full drag-and-drop canvas
2. **Tablet**: Same as desktop
3. **Mobile**: 
   - Tap company → opens positioning modal
   - Modal shows mini-map with tap-to-place
   - OR: Use swipe gestures to move companies

### Mobile-Optimized Layout

```
┌─────────────────────┐
│   [< Back] Market   │
│                     │
├─────────────────────┤
│                     │
│   Mini Canvas       │
│   (tap to place)    │
│                     │
├─────────────────────┤
│ Company List        │
│ [Company A] →       │
│ [Company B] →       │
│ [Company C] →       │
└─────────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Coordinate conversion (px ↔ %)
- [ ] Drag-drop position calculation
- [ ] Axis label updates
- [ ] Company filtering logic

### Integration Tests
- [ ] Save position to database
- [ ] Load positions from database
- [ ] Export map as PNG
- [ ] Generate shareable link

### E2E Tests (Playwright)
- [ ] Create new map
- [ ] Drag company from sidebar to canvas
- [ ] Update axis configuration
- [ ] Export map
- [ ] Share map and open shared link

---

## 🚀 Rollout Plan

### Phase 1: MVP (Week 1-2)
- [x] Database schema
- [ ] Basic canvas rendering
- [ ] Drag-and-drop positioning
- [ ] Save/load positions
- [ ] Simple axis configuration

### Phase 2: Core Features (Week 3)
- [ ] Company list sidebar
- [ ] Axis presets
- [ ] Visual polish (animations, tooltips)
- [ ] Mobile responsive design

### Phase 3: Export & Share (Week 4)
- [ ] Export as PNG
- [ ] Shareable links
- [ ] Read-only view for shared maps

### Phase 4: Enhancements (Future)
- [ ] Multiple maps per user
- [ ] Quadrant labeling
- [ ] Time-based snapshots (see historical positions)
- [ ] AI-suggested positioning based on data
- [ ] Collaborative maps (team sharing)

---

## 🎯 Success Metrics

### Adoption Metrics (30 days post-launch)
- **Target**: 40% of active users create at least one map
- **Target**: Average 15 companies positioned per map
- **Target**: 20% of maps are shared externally

### Engagement Metrics
- **Target**: Users return to map 3x per week on average
- **Target**: 10% export rate (maps exported as PNG)
- **Target**: Average 5 position updates per session

### Business Impact
- **Differentiation**: Feature mentioned in 50% of user testimonials
- **Retention**: Users with maps have 30% higher retention
- **Upgrades**: Maps used in 25% of upgrade decisions (Pro feature)

---

## 🔮 Future Enhancements

### Phase 5: Advanced Features
1. **AI-Powered Positioning**
   - Automatically suggest positions based on scraped data
   - "Auto-position competitors based on pricing and features"

2. **Time-Based Analysis**
   - Save snapshots of map over time
   - Slider to see how market evolved
   - "Where was Competitor X 6 months ago?"

3. **Collaborative Maps**
   - Invite team members to view/edit
   - Real-time collaboration (multiple cursors)
   - Comments on specific companies

4. **Advanced Visualizations**
   - Bubble size = company valuation
   - Heat maps (density of competitors)
   - Trend arrows (showing movement direction)

5. **Integration with CRM**
   - Sync positions to Salesforce/HubSpot
   - Tag opportunities based on quadrant
   - Auto-update positions when deals close

6. **Templates & Industry Presets**
   - Pre-built maps for common industries
   - "SaaS Competitive Landscape"
   - "E-commerce Market Positioning"

---

## 📚 Resources & References

### Inspiration
- [BCG Growth-Share Matrix](https://en.wikipedia.org/wiki/Growth%E2%80%93share_matrix)
- [Gartner Magic Quadrant](https://www.gartner.com/en/research/magic-quadrant)
- [Miro Board Templates](https://miro.com/templates/competitive-analysis/)

### Technical Libraries
- `react-dnd` - Drag and drop: https://react-dnd.github.io/react-dnd/
- `dnd-kit` - Modern alternative: https://dndkit.com/
- `html2canvas` - Export to PNG: https://html2canvas.hertzen.com/
- `react-zoom-pan-pinch` - Canvas zoom/pan: https://github.com/BetterTyped/react-zoom-pan-pinch

---

## ✅ Definition of Done

This feature is "done" when:

- [ ] User can create a market map
- [ ] User can drag companies from sidebar to canvas
- [ ] Positions are saved to database and persist on reload
- [ ] User can configure axis labels (X and Y)
- [ ] User can export map as PNG image
- [ ] Mobile-responsive (at minimum, view-only mode)
- [ ] RLS policies protect user data
- [ ] Analytics tracking implemented
- [ ] Documentation updated
- [ ] E2E tests passing
- [ ] Performance: Canvas renders smoothly (60fps) with 50+ companies
- [ ] Accessibility: Keyboard navigation works

---

## 🎬 Next Steps

1. **Review & Approve Spec** ✅
2. **Create Database Migration** (create tables)
3. **Build API Routes** (market-maps CRUD, positions)
4. **Build Core Components** (Canvas, Marker, Sidebar)
5. **Implement Drag-Drop** (dnd-kit integration)
6. **Add Export Feature** (PNG download)
7. **Polish UI/UX** (animations, tooltips)
8. **Write Tests** (unit, integration, E2E)
9. **Deploy to Staging** (test with real users)
10. **Launch to Production** 🚀

A future solution:

Claude 4.5 Sonnet honest take: Save this for when you have product-market fit and users are asking for it. Focus on features that directly drive conversions (trial → paid) and reduce time to value (signup → first prospect contacted).
However, if you want to differentiate from competitors and this is your "wow" feature for marketing/demos, then build it as a Pro-only feature and make it AI-powered auto-positioning to reduce manual work.

Make It Automatic (Not Manual)
Instead of drag-and-drop, have AI auto-position companies:
Before (Your current spec):
User drags Company A to position
User drags Company B to position
User drags Company C...
❌ Manual work, slow
Better (Auto-positioning):
Click "Generate Market Map"
AI positions all companies automatically based on scraped data
User can adjust if needed
✅ Instant value, optional customization
This would be:
Faster to use
More impressive ("AI-powered visualization")
Less work for users
Still delivers the strategic insight

---

**Status**: ✅ Specification Complete - Ready for Development  
**Estimated Dev Time**: 5-7 days (with testing)  
**Priority**: High (Differentiating Feature)

**Questions or Feedback?**  
Contact: ionut.furnea@sellcorporation.com

