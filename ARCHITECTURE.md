# System Architecture Blueprint

**Platform:** SFIA-Inspired Multi-Tenant Skills Assessment Platform  
**Document Type:** Architectural Blueprint, System Context, Sequence Models & ADRs  
**Version:** 1.0 (Production-Ready Architecture)  
**Target Reference:** Training Heights `BRD_SK_2`, `FRS_SK_1`, `USERST_1`  
**Related Documents:** [README.md](README.md) · [DOCUMENTATION.md](DOCUMENTATION.md)

---

## Table of Contents

1. [Architectural Overview & System Context](#1-architectural-overview--system-context)
2. [C4 Container & Component Architecture](#2-c4-container--component-architecture)
3. [Multi-Tenant Isolation & Boundary Architecture](#3-multi-tenant-isolation--boundary-architecture)
4. [State Machine Topologies](#4-state-machine-topologies)
   - [4.1 Assessment State Machine](#41-assessment-state-machine)
   - [4.2 Assessment Campaign Lifecycle](#42-assessment-campaign-lifecycle)
   - [4.3 Framework Versioning & Adoption Lifecycle](#43-framework-versioning--adoption-lifecycle)
   - [4.4 Role Profile Lifecycle & Career Path Step Progression](#44-role-profile-lifecycle--career-path-step-progression)
5. [End-to-End Sequence Diagrams](#5-end-to-end-sequence-diagrams)
   - [5.1 Tenant Provisioning & Onboarding Flow (Flow A)](#51-tenant-provisioning--onboarding-flow-flow-a)
   - [5.2 Staff Self-Assessment & Corroboration Flow (Flow D)](#52-staff-self-assessment--corroboration-flow-flow-d)
   - [5.3 Skip-Corroboration Immediate Finalization Flow (Flow E)](#53-skip-corroboration-immediate-finalization-flow-flow-e)
   - [5.4 Automated Scheduled Reporting & Cron Pipeline (Flow H)](#54-automated-scheduled-reporting--cron-pipeline-flow-h)
6. [Data Architecture & Entity-Relationship Topology](#6-data-architecture--entity-relationship-topology)
7. [Security & Cryptography Topology](#7-security--cryptography-topology)
8. [Architectural Decision Records (ADRs)](#8-architectural-decision-records-adrs)

---

## 1. Architectural Overview & System Context

The platform delivers an evidence-based competency evaluation ecosystem for multi-tenant software and engineering organizations. It bridges the gap between high-level industry frameworks (SFIA) and day-to-day talent assessment.

### System Context Diagram (C4 Level 1)

```mermaid
C4Context
    title System Context Diagram - Skills Assessment Platform

    Person(platformAdmin, "Platform Admin", "SaaS operator managing canonical frameworks, industry templates, and tenants.")
    Person(supportUser, "Support Staff", "Diagnoses tenant operational issues using audited support impersonation.")
    Person(orgAdmin, "Org Admin", "HR/Engineering leader configuring competencies, roles, campaigns, and reports.")
    Person(manager, "Direct Manager", "Team lead corroborating ratings and viewing team capability matrices.")
    Person(staff, "Staff Member", "Employee completing self-assessments and reviewing career paths.")

    System(skillsPlatform, "Skills Assessment Platform", "Multi-tenant Next.js web application providing capability evaluation, gap analysis, and reporting.")

    System_Ext(supabaseDb, "PostgreSQL Database", "Managed database hosted on Supabase (AWS EU-West-1) with transaction pooling.")
    System_Ext(supabaseStorage, "Private Object Storage", "Supabase Storage bucket storing private evidence artifacts.")
    System_Ext(cronService, "Vercel / CloudWatch Cron", "Triggers automated assessment reminders and scheduled capability reports.")

    Rel(platformAdmin, skillsPlatform, "Authors frameworks & provisions tenants", "HTTPS")
    Rel(supportUser, skillsPlatform, "Initiates support impersonation sessions", "HTTPS")
    Rel(orgAdmin, skillsPlatform, "Builds roles, runs campaigns & schedules reports", "HTTPS")
    Rel(manager, skillsPlatform, "Corroborates direct-report evaluations", "HTTPS")
    Rel(staff, skillsPlatform, "Submits assessments & uploads evidence", "HTTPS")

    Rel(skillsPlatform, supabaseDb, "Queries and persists multi-tenant data", "Prisma / TLS / Pooler")
    Rel(skillsPlatform, supabaseStorage, "Uploads and issues signed download URLs", "S3 API / HTTPS")
    Rel(cronService, skillsPlatform, "Invokes background automation endpoints", "HTTPS Bearer Token")
```

---

## 2. C4 Container & Component Architecture

### Container Diagram (C4 Level 2)

```mermaid
graph TD
    subgraph ClientBrowser["Client Web Browser"]
        UI["React 19 Interactive Client Components"]
    end

    subgraph AppContainer["Next.js 16 Application Runtime (Node.js 20+)"]
        Router["App Router (52 Routes & Layouts)"]
        Guards["Security & Auth Guards (requireRole, requireTenantUser)"]
        Actions["Server Actions & API Route Handlers"]
        
        subgraph Services["Service Layer (src/services)"]
            TenantsSvc["Tenants & Subscription Service"]
            FrameworksSvc["Frameworks & Versions Service"]
            RolesSvc["Role Profiles & Career Paths Service"]
            CampaignsSvc["Campaigns & Monitoring Service"]
            AssessmentsSvc["Assessments & Items Service"]
            CorroborationsSvc["Corroborations & Matrix Service"]
            GapSvc["Gap Analysis & Scoring Service"]
            ReportsSvc["Reports & Document Generator (pdf-lib, exceljs)"]
            AuditSvc["Append-Only Audit Service"]
            StorageSvc["Evidence Storage Client"]
            CronSvc["Cron Automation Engine"]
        end

        Prisma["Prisma ORM 7 Client (@prisma/adapter-pg)"]
    end

    subgraph Infrastructure["External Infrastructure"]
        Postgres["PostgreSQL Database (Supabase pooler:5432)"]
        S3Bucket["Supabase Private Storage Bucket ('assessment-evidence')"]
    end

    UI -->|HTTPS Form Submissions & Server Actions| Router
    Router --> Guards
    Guards --> Actions
    Actions --> Services
    Services --> Prisma
    StorageSvc -->|Signed Upload / Download APIs| S3Bucket
    Prisma -->|Pooled PostgreSQL Connection over TLS| Postgres
```

---

## 3. Multi-Tenant Isolation & Boundary Architecture

Multi-tenancy is enforced using a **Shared Database, Shared Schema with Logical Row-Level Isolation** strategy.

### Tenant Boundary Defense Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. INCOMING REQUEST                                                         │
│    Client sends HTTP request with signed HttpOnly session cookie            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. AUTHENTICATION & CONTEXT EXTRACTION (lib/auth/service.ts)                │
│    - Verifies JWT signature using HS256 (AUTH_SECRET)                       │
│    - Extracts user identity: { id, email, role, tenantId, isActive }        │
│    - Validates account status (blocks deactivated users immediately)        │
│    - Validates tenant status (blocks SUSPENDED and ARCHIVED tenants)        │
│    - CRITICAL: Client-supplied tenant IDs are NEVER trusted                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ROLE-BASED ACCESS GUARDS (lib/auth/guards.ts)                            │
│    - Enforces portal role boundary: requireRole(allowedRoles)               │
│    - PLATFORM_ADMIN & SUPPORT must have tenantId = null                     │
│    - ORG_ADMIN, MANAGER & STAFF must have valid tenantId != null            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. SERVICE-LAYER ISOLATION SCOPING (src/services/*)                         │
│    - Every database query mandates `where: { tenantId }`                    │
│    - Attempted queries with foreign IDs return 404 / NotFoundException     │
│    - Composite unique indexes prevent cross-tenant collisions               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. DATABASE SCHEMA COMPOSITE INDEXES (prisma/schema.prisma)                 │
│    - @@index([tenantId]) on all 26 tenant-scoped operational tables         │
│    - Foreign keys cascade-delete within tenant boundaries                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. State Machine Topologies

### 4.1 Assessment State Machine

Every participant's evaluation record moves through a deterministic lifecycle matching `AssessmentStatus`:

```mermaid
stateDiagram-v2
    [*] --> NOT_STARTED: Campaign Launched / Participant Enrolled
    
    NOT_STARTED --> DRAFT: Staff enters first answer / saves draft
    DRAFT --> DRAFT: Staff incrementally updates self-ratings & evidence
    
    DRAFT --> PENDING_CORROBORATION: Staff submits (when campaign requiresCorroboration = true)
    DRAFT --> COMPLETED: Staff submits (when campaign requiresCorroboration = false)
    
    PENDING_CORROBORATION --> COMPLETED: Manager reviews, corroborates & completes
    
    COMPLETED --> [*]: Assessment locked & scores feed gap analysis
```

### 4.2 Assessment Campaign Lifecycle

Campaign lifecycle mirrors the Prisma `CampaignStatus` enum (`DRAFT`, `ACTIVE`, `CLOSED`). Scheduled opening windows are driven by an optional `startDate`:

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Org Admin authors campaign draft
    
    DRAFT --> DRAFT: Configure scope (Org/Team/Individual), competencies, deadline & optional startDate
    
    DRAFT --> ACTIVE: Org Admin launches campaign (Enrollment & assessment rows generated)
    
    state ACTIVE {
        [*] --> ScheduledWindow: If startDate > NOW() (Assessments gated)
        [*] --> OpenForSubmissions: If startDate IS NULL or startDate <= NOW()
        ScheduledWindow --> OpenForSubmissions: System time reaches startDate
        OpenForSubmissions --> OpenForSubmissions: Staff complete & submit assessments
    }
    
    ACTIVE --> CLOSED: Org Admin closes campaign OR operational period concludes
    CLOSED --> [*]: Campaign immutable, assessments and ratings finalized
```

### 4.3 Framework Versioning & Adoption Lifecycle

Framework versioning matches the Prisma `FrameworkStatus` enum (`DRAFT`, `PUBLISHED`). Version immutability and multi-tenant adoption are managed through explicit relation models:

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Platform Admin creates version draft (e.g. v2.0)
    
    DRAFT --> DRAFT: Add/edit categories, competencies, level descriptors
    
    DRAFT --> PUBLISHED: Platform Admin publishes version
    
    PUBLISHED --> PUBLISHED: IMMUTABLE FREEZE (Editing locked forever)
    
    note right of PUBLISHED
        Tenants adopt published versions via
        TenantFrameworkAdoption records.
        Framework versions are never mutated
        or deleted once published.
    end note
```

### 4.4 Role Profile Lifecycle & Career Path Step Progression

Role profiles and career ladders follow the exact relational models in the schema:

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Org Admin creates role profile benchmark
    
    DRAFT --> DRAFT: Define target levels via RoleRequirement
    
    DRAFT --> PUBLISHED: Org Admin publishes benchmark
    
    PUBLISHED --> PUBLISHED: Active benchmark for gap analysis & career progression
    
    PUBLISHED --> ARCHIVED_SOFT: Soft-archived (isArchived = true, archivedAt = NOW())
    note right of ARCHIVED_SOFT
        RoleProfileStatus enum remains PUBLISHED;
        soft-archived flag preserves historical
        assessment and career path references.
    end note
```

- **Career Path Progression**: `CareerPathStep` joins a `roleProfileId` to a `careerPathId` with `orderIndex: Int` (`@@unique([careerPathId, roleProfileId])`, `@@unique([careerPathId, orderIndex])`). Progression requirements and competency level deltas are computed dynamically by comparing sequential steps ($N$ to $N+1$) rather than storing synthetic graph edges.

---

## 5. End-to-End Sequence Diagrams

### 5.1 Tenant Provisioning & Onboarding Flow (Flow A)

```mermaid
sequenceDiagram
    autonumber
    actor PA as Platform Admin
    participant Svc as TenantService
    participant DB as PostgreSQL (Prisma)
    participant Mail as NotificationEngine
    actor OA as Org Admin

    PA->>Svc: createTenant({ name, slug, planId, seatLimit, adminEmail })
    Svc->>DB: Check slug uniqueness & load SubscriptionPlan
    Svc->>DB: INSERT INTO Tenant (status: ACTIVE, planId, seatLimit)
    Note over Svc: generate rawToken -> tokenHash = sha256(rawToken)
    Svc->>DB: INSERT INTO TenantInvitation (tokenHash, expiresAt: 7d, acceptedAt: null)
    Svc->>Mail: dispatchTenantActivationInvite(adminEmail, rawToken)
    Mail-->>OA: Email containing activation link with rawToken
    Svc->>DB: INSERT INTO AuditLog (action: TENANT_CREATE)
    Svc-->>PA: Tenant created successfully

    OA->>Svc: acceptTenantInvitation({ token: rawToken, password, name })
    Svc->>DB: Lookup TenantInvitation by sha256(rawToken), verify expiresAt & acceptedAt IS NULL
    Svc->>DB: INSERT INTO User (email, role: ORGANIZATION_ADMIN, passwordHash: bcrypt(10))
    Svc->>DB: UPDATE TenantInvitation SET acceptedAt = NOW()
    Svc-->>OA: Issue authenticated session cookie

    OA->>Svc: adoptIndustryTemplate(templateId)
    Svc->>DB: Instantiate Competency records from template with default weights
    OA->>Svc: importUsersFromCsv(fileBuffer)
    Svc->>DB: Validate seatLimit & create User records in bulk
```

### 5.2 Staff Self-Assessment & Corroboration Flow (Flow D)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff Member
    participant AssSvc as AssessmentService
    participant Store as SupabaseStorage
    participant CorrobSvc as CorroborationService
    actor Mgr as Direct Manager
    participant DB as PostgreSQL (Prisma)

    Staff->>AssSvc: getStaffAssessmentById(assessmentId)
    AssSvc-->>Staff: Return competencies, level descriptors & evidence prompts

    Staff->>Store: Upload work sample (PDF/Image) via Server Action
    Store-->>Staff: Return cloud storageKey
    Staff->>AssSvc: attachEvidence(storageKey, fileName, mimeType)
    AssSvc->>DB: INSERT INTO EvidenceAttachment

    Staff->>AssSvc: saveAssessmentDraft({ items: [{ competencyId, selfRating, selfNotes }] })
    AssSvc->>DB: UPSERT AssessmentItem (selfRating, selfNotes)
    AssSvc->>DB: UPDATE Assessment SET status = DRAFT

    Staff->>AssSvc: submitAssessment(assessmentId)
    AssSvc->>DB: Verify all competencies rated & deadline valid
    AssSvc->>DB: UPDATE Assessment SET status = PENDING_CORROBORATION
    AssSvc->>DB: INSERT INTO Notification (recipient: managerId, type: CORROBORATION_REQUESTED)

    Mgr->>CorrobSvc: getCorroborationQueue()
    CorrobSvc-->>Mgr: List pending submissions for direct reports
    Mgr->>CorrobSvc: corroborateItem({ assessmentItemId, managerRating, managerNotes })
    Note over CorrobSvc: If managerRating != selfRating, enforce managerNotes.length >= 10
    CorrobSvc->>DB: UPDATE AssessmentItem SET managerRating, managerNotes

    Mgr->>CorrobSvc: completeCorroboration(assessmentId)
    CorrobSvc->>DB: UPDATE AssessmentItem SET finalRating = managerRating
    CorrobSvc->>DB: UPDATE Assessment SET status = COMPLETED, completedAt = NOW()
    CorrobSvc->>DB: INSERT INTO Corroboration (status: COMPLETED)
    CorrobSvc-->>Mgr: Corroboration finalized
```

### 5.3 Skip-Corroboration Immediate Finalization Flow (Flow E)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff Member
    participant AssSvc as AssessmentService
    participant DB as PostgreSQL (Prisma)

    Note over AssSvc: Campaign created with requiresCorroboration = false

    Staff->>AssSvc: submitAssessment(assessmentId)
    AssSvc->>DB: Query AssessmentCampaign.requiresCorroboration
    Note over AssSvc: Condition met: Corroboration NOT required
    AssSvc->>DB: UPDATE AssessmentItem SET finalRating = selfRating
    AssSvc->>DB: UPDATE Assessment SET status = COMPLETED, completedAt = NOW()
    AssSvc->>DB: INSERT INTO AuditLog (action: ASSESSMENT_SUBMIT_AUTO_FINALIZED)
    AssSvc-->>Staff: Assessment completed immediately, no manager review queued
```

### 5.4 Automated Scheduled Reporting & Cron Pipeline (Flow H)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Vercel / CloudWatch Cron
    participant API as /api/cron/reports
    participant Runner as ScheduledReportRunner
    participant Excel as ExcelEngine (exceljs)
    participant DB as PostgreSQL (Prisma)
    participant Mail as EmailDispatcher

    Cron->>API: POST /api/cron/reports (Authorization: Bearer CRON_SECRET)
    API->>Runner: executeDueReportSchedules()
    Runner->>DB: SELECT * FROM ReportSchedule WHERE isEnabled = true AND nextRunAt <= NOW()
    
    loop For Each Due Schedule
        Runner->>DB: Fetch assessed finalRatings vs role targets for scope (Org/Team)
        Runner->>Excel: generateExcelReportBuffer(data)
        Note over Excel: Build 3 worksheets: Summary, Competency Breakdown, Employee Detail
        Excel-->>Runner: Return binary .xlsx Buffer
        Runner->>Mail: sendMultipartEmailWithAttachment(recipients, xlsxBuffer)
        Runner->>DB: UPDATE ReportSchedule SET lastRunAt = NOW(), nextRunAt = computeNext(recurrence)
        Runner->>DB: INSERT INTO AuditLog (action: REPORT_SCHEDULE_EXECUTED)
    end

    Runner-->>API: 200 OK (execution summary)
```

---

## 6. Data Architecture & Entity-Relationship Topology

The schema comprises **43 relational models** organized into four foundational clusters:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. TENANCY & IDENTITY CLUSTER                                               │
│    Tenant ──< User ──< TeamMembership >── Team ──< Department              │
│      │          │                                                           │
│      │          └── (self-referencing managerId hierarchy)                  │
│      ├── SubscriptionPlan                                                   │
│      └── TenantInvitation                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. FRAMEWORK & COMPETENCY TAXONOMY                                          │
│    FrameworkVersion ──< FrameworkCategory ──< FrameworkCompetency           │
│          │                                           │                      │
│          │                                           └──< FrameworkLevel    │
│          │                                                                  │
│    TenantFrameworkAdoption                                                  │
│          │                                                                  │
│    Competency (tenant-level, isCustom, weight) ──< CompetencyLevel          │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ROLES, CAREER PATHS & CAMPAIGNS                                          │
│    RoleProfile ──< RoleRequirement >── Competency                           │
│         │                                                                   │
│         └──< CareerPathStep (orderIndex) >── CareerPath                     │
│                                                                             │
│    AssessmentCampaign ──< CampaignCompetency >── Competency                 │
│         │         └──< CampaignParticipant >── User                         │
│         │         └──< CampaignTeam >── Team                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. EVALUATIONS, REPORTS & EVIDENCE                                          │
│    Assessment ──< AssessmentItem ──< EvidenceAttachment                     │
│         │              │                                                    │
│         │              └── Corroboration                                    │
│         │                                                                   │
│    ReportSchedule ──< ReportScheduleRecipient                               │
│    InterviewQuestionSet ──< InterviewQuestion                               │
│    LearningResource ──< CompetencyLearningResource >── Competency           │
│    AuditLog, Notification, NotificationTemplate, IntegrationConfiguration   │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Relational Integrity & State Topologies**:
  - `RoleProfile`: Follows `RoleProfileStatus` (`DRAFT`, `PUBLISHED`) with soft-archival via `isArchived: Boolean` and `archivedAt: DateTime?`.
  - `CareerPathStep`: Joins `careerPathId` and `roleProfileId` with sequential `orderIndex: Int` (`@@unique([careerPathId, roleProfileId])`, `@@unique([careerPathId, orderIndex])`). Skill deltas are dynamically derived between consecutive steps.
  - `AssessmentCampaign`: Follows `CampaignStatus` (`DRAFT`, `ACTIVE`, `CLOSED`) with `startDate` gating opening windows.

---

## 7. Security & Cryptography Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               USER CREDENTIALS                              │
│  Password  ──►  bcryptjs.hash(password, saltRounds = 10)  ──►  User.passwordHash
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            INVITATION & CRON TOKENS                         │
│  rawToken = crypto.randomBytes(32).toString('hex')                          │
│         │                                                                   │
│         ├──►  tokenHash = sha256(rawToken)  ──►  TenantInvitation.tokenHash │
│         │                                                                   │
│         └──►  Sent in activation email link  ──►  Never stored plaintext    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               SESSION SECURITY                              │
│  Payload { id, role, tenantId, impersonation }                              │
│         ▼                                                                   │
│  jose.SignJWT() using HS256 with 256-bit AUTH_SECRET                        │
│         ▼                                                                   │
│  HttpOnly, Secure, SameSite=Lax Cookie (Path=/, MaxAge=7d)                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             EVIDENCE ASSET ACCESS                           │
│  Client Request  ──►  Download Gateway (/api/evidence-attachments/download) │
│                                  │                                          │
│                       Verifies session.tenantId                             │
│                                  │                                          │
│                                  ▼                                          │
│              Supabase Storage createSignedUrl(60 seconds)                   │
│                                  │                                          │
│                                  ▼                                          │
│                   Temporary Redirect (307) to Signed URL                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION AUDIT SANITIZATION                      │
│  Incoming Details Payload                                                   │
│         ▼                                                                   │
│  isSensitiveKey() Filter (Checks: password, token, secret, cookie, binary)  │
│         ▼                                                                   │
│  Persisted to AuditLog with sensitive fields stripped                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Architectural Decision Records (ADRs)

### ADR-01: Full-Stack Next.js 16 Monolith vs. Microservices
- **Decision:** Build as a unified full-stack application using Next.js 16 App Router.
- **Rationale:** Several workflows benefit from atomic transactional guarantees across campaign launches, corroborations, and multi-tier gap reporting. A monolithic architecture eliminates distributed transaction overhead (two-phase commits), minimizes deployment complexity, and leverages React Server Components for zero-bundle-size server rendering.

### ADR-02: Server-Side Authority & Server Actions vs. Client-Side REST API
- **Decision:** Drive state mutations via Next.js Server Actions with server-enforced authentication guards (`requireTenantUser`).
- **Rationale:** Guarantees that the client browser cannot manipulate or inject `tenantId`. Every mutation runs within an isolated server execution context where session identity is verified before invoking the service layer.

### ADR-03: Shared Database, Shared Schema with Logical Isolation vs. Database-per-Tenant
- **Decision:** Implement a shared PostgreSQL database where all tables include a foreign key `tenantId`, paired with composite indexes and repository-level query scoping.
- **Rationale:** Accommodates thousands of multi-tenant accounts with minimal infrastructure overhead, permits fast cross-tenant usage analytics (`PA-07`) without distributed querying, and allows tenant provisioning (`PA-01`) to execute within sub-second response times without dynamic database migrations.

### ADR-04: Stateless JWT Cookies (`jose`) vs. Stateful Database Session Tables
- **Decision:** Issue stateless signed JWT session cookies verified using HMAC SHA-256 (`jose`).
- **Rationale:** Eliminates a database lookup on every static page or server component fetch. Account revocation is maintained by reading the user's `isActive` flag and tenant's `status` during security-critical mutations.

### ADR-05: Binary Excel Workbooks (`exceljs`) vs. Renamed CSV Files
- **Decision:** Utilize `exceljs` to generate genuine `.xlsx` binary zip workbooks complete with multiple worksheets, styled headers, and formulas.
- **Rationale:** Source requirement `OA-10` mandates Excel capability reporting. Exporting CSV files with a `.xlsx` extension triggers warnings in Microsoft Excel and fails enterprise data exchange standards.
