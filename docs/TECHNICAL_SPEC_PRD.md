# Technical Specification & Product Requirements Document

## Megatron Digital Service Work Card System

**Version:** 1.0  
**Last Updated:** March 27, 2026  
**Status:** In Development  
**Platform:** Next.js 16 + Supabase + Vercel

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Roles & Personas](#3-user-roles--personas)
4. [System Architecture](#4-system-architecture)
5. [Database Schema](#5-database-schema)
6. [Feature Specifications](#6-feature-specifications)
7. [UI/UX Specifications](#7-uiux-specifications)
8. [API & Integration Specifications](#8-api--integration-specifications)
9. [Security Requirements](#9-security-requirements)
10. [Performance Requirements](#10-performance-requirements)
11. [Future Roadmap](#11-future-roadmap)

---

## 1. Executive Summary

### 1.1 Purpose

The **Megatron Digital Service Work Card** system is a comprehensive field service management application designed for **Megatron EAD**, an authorized John Deere dealer in Bulgaria. The system digitizes the entire service workflow from job scheduling through completion, replacing paper-based processes with a modern, real-time platform.

### 1.2 Business Objectives

- **Eliminate paper work cards** - Transition from manual paper forms to digital capture
- **Real-time visibility** - Enable managers to monitor technician workloads and job status
- **Operational efficiency** - Reduce administrative overhead and data entry errors
- **Integration readiness** - Prepare for Navision ERP synchronization
- **Compliance** - Maintain audit trails and digital signatures for warranty claims

### 1.3 Key Metrics for Success

| Metric | Target |
|--------|--------|
| Paper reduction | 100% digital by Q2 2026 |
| Time to complete work card | <5 minutes field entry |
| Data accuracy | >99% vs paper baseline |
| Technician adoption | 100% within 30 days |

---

## 2. Product Overview

### 2.1 Core Modules

```
+--------------------------------------------------+
|           MEGATRON SERVICE PLATFORM              |
+--------------------------------------------------+
|                                                  |
|  +------------+  +------------+  +------------+  |
|  | TECHNICIAN |  |  PLANNING  |  |   ADMIN    |  |
|  |   PORTAL   |  |   BOARD    |  | DASHBOARD  |  |
|  +------------+  +------------+  +------------+  |
|                                                  |
|  +------------+  +------------+  +------------+  |
|  |   FLEET    |  |  PENDING   |  |  REPORTS   |  |
|  |INTELLIGENCE|  |   QUEUE    |  |  & KPIs    |  |
|  +------------+  +------------+  +------------+  |
|                                                  |
+--------------------------------------------------+
```

### 2.2 Application Routes

| Route | Purpose | Access Level |
|-------|---------|--------------|
| `/technician` | Main work card entry interface | Technician |
| `/tablet` | Tablet-optimized work card view | Technician |
| `/planning` | Service scheduling & dispatch | Manager |
| `/admin/dashboard` | Management overview | Admin |
| `/admin/pending` | Pending orders queue | Admin |
| `/admin/queue` | Work proposals management | Admin |
| `/admin/job-cards` | Job cards administration | Admin |
| `/admin/fleet` | Fleet intelligence dashboard | Admin |
| `/orders` | Order management | Admin |

---

## 3. User Roles & Personas

### 3.1 Field Technician

**Name:** Иван Петров (Ivan Petrov)  
**Role:** Service Technician  
**Device:** Rugged tablet (Android/iOS) or smartphone  

**Key Needs:**
- Quick access to work orders assigned for the day
- Easy input of parts used, labor performed
- Photo capture of machine faults/repairs
- Digital signature collection from customers
- Offline capability for remote locations

**Daily Workflow:**
1. View assigned jobs for the day
2. Start work timer on arrival
3. Perform free check (15-point inspection)
4. Document diagnostics and repairs
5. Log parts and labor
6. Capture customer signature
7. Submit completed work card

### 3.2 Service Manager

**Name:** Георги Димитров (Georgi Dimitrov)  
**Role:** Service Department Manager  
**Device:** Desktop computer, tablet  

**Key Needs:**
- Real-time view of all technician schedules
- Ability to assign/reassign jobs dynamically
- Monitor job completion and delays
- Review and approve completed work cards
- Generate reports for management

**Daily Workflow:**
1. Review incoming service requests
2. Assign jobs to technicians based on skills/location
3. Monitor real-time progress via Gantt/Kanban views
4. Handle emergency rescheduling
5. Approve completed work cards for invoicing

### 3.3 Administrator

**Name:** Мария Стоянова (Maria Stoyanova)  
**Role:** Back-Office Administrator  
**Device:** Desktop computer  

**Key Needs:**
- Sync completed work cards to Navision ERP
- Manage client credit status
- Handle warranty claims documentation
- Archive and retrieve historical records

---

## 4. System Architecture

### 4.1 Technology Stack

```
+------------------+     +------------------+     +------------------+
|    FRONTEND      |     |     BACKEND      |     |    DATABASE      |
+------------------+     +------------------+     +------------------+
| Next.js 16       |     | Next.js API      |     | Supabase         |
| React 19.2       |     | Server Actions   |     | PostgreSQL       |
| TypeScript 5.x   |     | Server Comps     |     | Row Level Sec.   |
| Tailwind CSS 4   |     |                  |     |                  |
| shadcn/ui        |     |                  |     |                  |
| dnd-kit          |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
         |                       |                       |
         +----------- Vercel Edge Network --------------+
```

### 4.2 Key Libraries & Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| `next` | 16.x | React framework with App Router |
| `react` | 19.2 | UI library |
| `@supabase/supabase-js` | 2.x | Database client |
| `@dnd-kit/core` | 6.x | Drag and drop functionality |
| `date-fns` | 4.x | Date manipulation |
| `recharts` | 2.x | Charts and visualizations |
| `lucide-react` | latest | Icon library |
| `sonner` | latest | Toast notifications |
| `signature_pad` | 5.x | Digital signature capture |

### 4.3 Deployment Architecture

```
                    +-------------------+
                    |    Vercel Edge    |
                    |   (Global CDN)    |
                    +-------------------+
                            |
            +---------------+---------------+
            |                               |
    +-------v-------+               +-------v-------+
    | Next.js App   |               | Supabase      |
    | (Serverless)  |               | (PostgreSQL)  |
    +---------------+               +---------------+
                                            |
                                    +-------v-------+
                                    | Supabase      |
                                    | Storage       |
                                    | (Photos/Docs) |
                                    +---------------+
```

---

## 5. Database Schema

### 5.1 Core Tables

#### `technicians`
```sql
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    specialization TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `machines`
```sql
CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    brand TEXT DEFAULT 'John Deere',
    engine_serial_number TEXT,
    year_manufactured INTEGER,
    client_id UUID REFERENCES clients(id),
    last_service_date DATE,
    total_engine_hours DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `clients`
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    navision_id TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_blocked BOOLEAN DEFAULT false,
    credit_limit DECIMAL(12,2),
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `job_cards`
```sql
CREATE TABLE job_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no TEXT,
    job_card_no TEXT,
    status TEXT DEFAULT 'draft',
    job_type TEXT DEFAULT 'repair',
    
    -- Machine & Client
    machine_id UUID REFERENCES machines(id),
    client_id UUID REFERENCES clients(id),
    payer_id UUID REFERENCES clients(id),
    
    -- Technician
    technician_id UUID REFERENCES technicians(id),
    lead_technician_id UUID REFERENCES technicians(id),
    
    -- Timestamps
    work_start_time TIMESTAMPTZ,
    work_end_time TIMESTAMPTZ,
    
    -- Machine Readings
    current_machine_hours DECIMAL(10,2),
    previous_machine_hours DECIMAL(10,2),
    hours_photo_url TEXT,
    
    -- Diagnostics
    complaint_description TEXT,
    fault_found TEXT,
    work_performed TEXT,
    
    -- Completion
    recommendations TEXT,
    pending_issues TEXT,
    signature_data TEXT,
    client_name_signed TEXT,
    photo_urls TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `service_appointments`
```sql
CREATE TABLE service_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_name TEXT NOT NULL,
    machine_model TEXT,
    serial_number TEXT,
    client_name TEXT,
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    planned_hours DECIMAL(4,2) DEFAULT 0,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'scheduled',
    task_type TEXT DEFAULT 'service',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Supporting Tables

| Table | Purpose |
|-------|---------|
| `parts` | Parts catalog with pricing |
| `labor_catalog` | Standard labor operations |
| `job_card_parts` | Parts used on each job card |
| `job_card_labor` | Labor operations performed |
| `free_check_items` | 15-point inspection results |
| `machine_issues` | Unresolved machine problems |

### 5.3 Database Views

```sql
-- Daily load statistics for capacity planning
CREATE VIEW daily_load_stats AS
SELECT 
    work_date,
    COUNT(DISTINCT technician_name) as active_technicians,
    SUM(planned_hours) as reserved_hours,
    (48 - SUM(planned_hours)) as free_hours,
    ROUND((SUM(planned_hours) / 48) * 100) as load_percentage
FROM service_appointments
GROUP BY work_date;

-- Admin view for job cards list
CREATE VIEW admin_job_cards_view AS
SELECT 
    jc.id,
    jc.created_at,
    jc.status,
    m.serial_number,
    m.model,
    c.name as client_name,
    p.name as payer_name,
    p.is_blocked as payer_blocked,
    (SELECT SUM(jcp.quantity * pt.price) 
     FROM job_card_parts jcp 
     JOIN parts pt ON jcp.part_id = pt.id 
     WHERE jcp.job_card_id = jc.id) as total_parts_cost
FROM job_cards jc
LEFT JOIN machines m ON jc.machine_id = m.id
LEFT JOIN clients c ON jc.client_id = c.id
LEFT JOIN clients p ON jc.payer_id = p.id;
```

---

## 6. Feature Specifications

### 6.1 Work Card Entry (Technician Portal)

#### F-001: Order Selection
**Priority:** P0 (Critical)

| Requirement | Description |
|-------------|-------------|
| Search | Unified search across orders, machines, clients |
| Scan | QR/barcode scanning for machine identification |
| Auto-fill | Pre-populate client/machine data from database |
| New Order | Create temporary order when Navision unavailable |

**User Flow:**
```
[Search/Scan] → [Select Order] → [Verify Machine] → [Begin Work Card]
```

#### F-002: Free Check (15-Point Inspection)
**Priority:** P1 (High)

Inspection points include:
1. Engine oil level
2. Coolant level
3. Hydraulic fluid
4. Air filter condition
5. Belt condition
6. Battery terminals
7. Tire pressure/tracks
8. Light operation
9. Horn/safety systems
10. Cab condition
11. External damage
12. Fluid leaks
13. Exhaust system
14. Steering play
15. Brake function

**Capture per point:**
- Status: OK / Issue Found / N/A
- Photo (optional)
- Notes (if issue found)

#### F-003: Diagnostics & Repair Documentation
**Priority:** P0 (Critical)

| Field | Type | Required |
|-------|------|----------|
| Complaint Description | Text | Yes |
| Fault Found | Text | Yes |
| Work Performed | Text | Yes |
| JDLink Diagnostics | Integration | No |
| Fault Photos | Image[] | No |

#### F-004: Parts & Labor Entry
**Priority:** P0 (Critical)

**Parts Entry:**
- Search parts catalog by part number or description
- Display stock availability
- Support manual entry for unlisted parts
- Calculate line totals automatically

**Labor Entry:**
- Select from standard operations catalog
- Auto-populate standard hours
- Support multiple technicians per operation
- Track actual vs standard time

#### F-005: Customer Signature
**Priority:** P0 (Critical)

- Canvas-based signature capture
- Print customer name
- Timestamp recording
- Signature stored as base64 in database

#### F-006: Work Timer
**Priority:** P1 (High)

- Start/pause/stop timer functionality
- Persist across page refreshes (localStorage + context)
- Calculate total work time for billing
- Support job-level vs technician-level tracking

### 6.2 Planning Board (Manager Portal)

#### F-010: Daily Gantt View (Live Dispatcher)
**Priority:** P0 (Critical)

**Features:**
- Horizontal timeline from 06:00 to 23:00
- One row per technician
- Drag-and-drop appointment scheduling
- Resize appointments to change duration
- Double-click to edit booking details
- Real-time updates via Supabase subscriptions

**Visual Elements:**
- Task cards with status indicators
- Progress bars showing completion
- Color coding by priority/status
- Drop preview with time indicator

#### F-011: Waiting List Sidebar
**Priority:** P1 (High)

- Display unassigned jobs
- Filter by date/priority
- Drag from sidebar to technician row
- Quick note creation
- Convert notes to full appointments

#### F-012: Weekly/Monthly Calendar Views
**Priority:** P2 (Medium)

- Traditional calendar grid layout
- Appointment count per day
- Click to drill into daily view
- Week/month navigation

#### F-013: Kanban Status Board
**Priority:** P2 (Medium)

**Columns:**
1. Scheduled
2. In Progress
3. Completed
4. Cancelled

- Drag cards between columns to update status
- Real-time sync across all users
- Filter by technician/date range

### 6.3 Admin Dashboard

#### F-020: Statistics Overview
**Priority:** P1 (High)

| Stat Card | Metric |
|-----------|--------|
| Pending Orders | Count of TEMP-* orders awaiting Navision |
| Total Value | Sum of parts costs |
| Financial Alerts | Count of blocked payer jobs |
| Today's Jobs | Jobs created today |

#### F-021: Job Cards Table
**Priority:** P0 (Critical)

- Paginated list of all job cards
- Filter by status/date/technician
- Click to view full details
- Push to Navision action
- Export functionality

#### F-022: Navision Sync
**Priority:** P0 (Critical)

**Workflow:**
1. Job card created with TEMP-XXXXXX order number
2. Admin reviews and enters Navision order number
3. Status changes from `pending_order` to `completed`
4. Data available for ERP import

### 6.4 Fleet Intelligence

#### F-030: Machine Registry
**Priority:** P2 (Medium)

- Complete machine database
- Service history per machine
- Upcoming maintenance alerts
- JDLink integration status

#### F-031: Pending Repairs Queue
**Priority:** P1 (High)

- Track deferred issues from free checks
- Prioritize by severity
- Generate proposals for customers
- Link to original job cards

---

## 7. UI/UX Specifications

### 7.1 Design System

**Theme:** Dark mode primary (light mode supported)

**Color Palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `hsl(0 0% 7%)` | Page background |
| `--foreground` | `hsl(0 0% 95%)` | Primary text |
| `--primary` | `hsl(142 76% 36%)` | John Deere Green |
| `--secondary` | `hsl(52 98% 51%)` | John Deere Yellow |
| `--accent` | `hsl(0 0% 15%)` | Card backgrounds |
| `--destructive` | `hsl(0 84% 60%)` | Errors/alerts |

**Typography:**
- Font Family: Geist Sans
- Headings: Bold, 1.25rem - 2rem
- Body: Regular, 0.875rem - 1rem
- Monospace: Geist Mono (for codes/numbers)

### 7.2 Responsive Breakpoints

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| Mobile | < 640px | Smartphones |
| Tablet | 640px - 1024px | Tablets, small laptops |
| Desktop | > 1024px | Desktop computers |

### 7.3 Component Library

Built on **shadcn/ui** components:
- Button, Input, Select, Dialog, Sheet
- Card, Badge, Table
- Tabs, Accordion, ScrollArea
- Toast notifications via Sonner

### 7.4 Navigation Structure

**Technician View:**
```
[Header: Megatron Logo + Mode Toggle]
[Main Content: Work Card Form]
[Footer: Timer Controls + Submit]
```

**Manager View:**
```
[Sidebar: Navigation Menu]
  - Dashboard
  - Planning & Calendar
  - Fleet Intelligence
  - Pending Cards
  - Proposals Queue
  - Archive & Reports
[Main Content: Selected View]
```

---

## 8. API & Integration Specifications

### 8.1 Server Actions

All database operations use Next.js Server Actions for type-safe, secure data mutations.

**Key Actions:**

| Action | Purpose | Parameters |
|--------|---------|------------|
| `searchMachines` | Find machines by serial/model | `query: string` |
| `fetchTechnicians` | Get active technician list | none |
| `createJobCard` | Create new work card | `JobCardInput` |
| `updateJobCard` | Update existing card | `id, updates` |
| `assignTechnician` | Schedule appointment | `appointmentId, technicianName, date, time` |
| `fetchPendingJobCards` | Get TEMP-* orders | none |
| `linkNavisionOrder` | Link to ERP order | `jobCardId, navisionOrderNo` |

### 8.2 Real-time Subscriptions

Using Supabase Realtime for live updates:

```typescript
// Example: Live appointment updates
supabase
  .channel('appointments')
  .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'service_appointments' },
      (payload) => refetchAppointments()
  )
  .subscribe();
```

### 8.3 External Integrations

#### Navision ERP (Planned)
- **Protocol:** REST API or file-based export
- **Data Flow:** Job cards → Navision orders
- **Frequency:** On-demand push

#### JDLink Telematics (Planned)
- **Purpose:** Remote diagnostics, machine hours
- **Authentication:** OAuth 2.0
- **Data:** DTCs, location, operating metrics

---

## 9. Security Requirements

### 9.1 Authentication

| Method | Implementation |
|--------|----------------|
| PIN Authentication | 4-digit PIN for admin access |
| Session Storage | `sessionStorage` for admin auth state |
| Supabase Auth | (Planned) Full user authentication |

### 9.2 Authorization

| Role | Permissions |
|------|-------------|
| Technician | Create/edit own job cards only |
| Manager | Full read access, schedule management |
| Admin | Full system access, ERP sync |

### 9.3 Data Protection

- All data transmitted over HTTPS
- Supabase Row Level Security (RLS) policies
- Sensitive fields (signatures) stored securely
- No PII in client-side logs

---

## 10. Performance Requirements

### 10.1 Response Time Targets

| Operation | Target | Maximum |
|-----------|--------|---------|
| Page load | < 1s | 3s |
| Search results | < 500ms | 2s |
| Form submission | < 2s | 5s |
| Photo upload | < 3s | 10s |

### 10.2 Scalability

- Support 50+ concurrent users
- Handle 1000+ job cards per month
- Store 10,000+ machine records
- Archive data beyond 2 years

### 10.3 Offline Capability (Planned)

- Service Worker for asset caching
- IndexedDB for offline form data
- Background sync when connection restored

---

## 11. Future Roadmap

### Phase 1: Current (Q1 2026)
- [x] Work card entry form
- [x] Planning board with Gantt view
- [x] Admin dashboard
- [x] Real-time updates
- [x] Drag-and-drop scheduling
- [x] Resize appointments
- [x] Double-click editing

### Phase 2: Q2 2026
- [ ] Full Supabase authentication
- [ ] Role-based access control
- [ ] Navision API integration
- [ ] Mobile PWA optimization
- [ ] Offline mode

### Phase 3: Q3 2026
- [ ] JDLink integration
- [ ] Automated scheduling suggestions
- [ ] Customer self-service portal
- [ ] Advanced analytics dashboard
- [ ] Multi-language support (EN/BG)

### Phase 4: Q4 2026
- [ ] AI-powered diagnostics suggestions
- [ ] Predictive maintenance alerts
- [ ] Route optimization for field visits
- [ ] Inventory management integration

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Job Card | Digital work order documenting service performed |
| Free Check | 15-point preventive inspection |
| TEMP Order | Temporary order number pending Navision allocation |
| JDLink | John Deere telematics system |
| Navision | Microsoft Dynamics NAV ERP system |
| DTC | Diagnostic Trouble Code |
| RLS | Row Level Security (Supabase) |

---

## Appendix B: Contact

**Project Owner:** Megatron EAD  
**Development:** v0 by Vercel  
**Repository:** `v0-digital-service-work-card_pl_update`  
**Branch:** `APP-2-Technician-Service-OS`

---

*Document generated from codebase analysis on March 27, 2026*
