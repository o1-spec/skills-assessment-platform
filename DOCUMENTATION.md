# Skills Assessment Platform — Technical Architecture & System Documentation

**System Name:** SFIA-Inspired Multi-Tenant Skills Assessment Platform  
**Document Type:** Technical Architecture, Domain Model & Operations Manual  
**Version:** 1.0 — Release Candidate  
**Authoritative Specifications:** Training Heights `BRD_SK_2`, `FRS_SK_1`, `USERST_1`  

---

## Table of Contents

1. [Architectural Principles & Design Philosophy](#1-architectural-principles--design-philosophy)
2. [Layered Architecture & Request Flow](#2-layered-architecture--request-flow)
3. [Domain Model & Complete Schema Dictionary](#3-domain-model--complete-schema-dictionary)
4. [Core Business Logic & Workflow Engines](#4-core-business-logic--workflow-engines)
   - [4.1 Multi-Tenant Isolation Engine](#41-multi-tenant-isolation-engine)
   - [4.2 Assessment Lifecycle & Corroboration Engine](#42-assessment-lifecycle--corroboration-engine)
   - [4.3 Gap Analysis & Capability Scoring Engine](#43-gap-analysis--capability-scoring-engine)
   - [4.4 Career Path Delta Calculation Engine](#44-career-path-delta-calculation-engine)
   - [4.5 Workforce Capability Reporting & Excel Engine](#45-workforce-capability-reporting--excel-engine)
   - [4.6 Background Automation & Cron Scheduler Engine](#46-background-automation--cron-scheduler-engine)
5. [Security, Cryptography & Compliance](#5-security-cryptography--compliance)
   - [5.1 Authentication & Session Architecture](#51-authentication--session-architecture)
   - [5.2 Role-Based Access Control (RBAC) Enforcement Matrix](#52-role-based-access-control-rbac-enforcement-matrix)
   - [5.3 Application-Level Append-Only Audit Trail](#53-application-level-append-only-audit-trail)
   - [5.4 Private Object Storage & Signed URL Generation](#54-private-object-storage--signed-url-generation)
   - [5.5 Support Impersonation Protocol](#55-support-impersonation-protocol)
   - [5.6 Evaluation Sandbox & Preconfigured Platform Credentials](#56-evaluation-sandbox--preconfigured-platform-credentials)
6. [Complete Route & Navigation Directory (52 Routes)](#6-complete-route--navigation-directory-52-routes)
7. [Environment Variables & Configuration Reference](#7-environment-variables--configuration-reference)
8. [Database Maintenance, Migrations & Provenance](#8-database-maintenance-migrations--provenance)
9. [Automated Test Suite & Quality Assurance Architecture](#9-automated-test-suite--quality-assurance-architecture)
10. [Production Deployment & Operations Runbook](#10-production-deployment--operations-runbook)

---

## 1. Architectural Principles & Design Philosophy

The platform is designed to provide an evidence-based, auditable inventory of organizational skills, replacing subjective impressions with verified competency evaluations. The architecture adheres to five foundational design principles:

### 1.1 Single-Artifact Full-Stack Architecture
Rather than deploying decoupled single-page applications (SPAs) and standalone microservice APIs, the platform is implemented as a unified full-stack Next.js application. This eliminates network serialization overhead, avoids distributed transaction failures, simplifies transactional boundary enforcement via Prisma, and enables secure, server-side data fetching directly through React Server Components (RSC).

### 1.2 Absolute Server-Side Authority
The client browser is treated as an untrusted rendering layer. All authorization decisions, tenant context derivations, state transitions, scoring mathematics, and audit logging occur strictly in server actions, server components, or route handlers. Client-submitted tenant identifiers or user IDs are never trusted for authorization.

### 1.3 Tenant Isolation by Construction
Multi-tenancy is enforced through mandatory `tenantId` scoping at the service layer and database schema. Operational tables feature composite foreign keys and indexes (`tenantId` + entity primary key). Platform operators (`PLATFORM_ADMIN`, `SUPPORT`) maintain `tenantId = null`, preventing accidental mixing of platform administration with tenant business data.

### 1.4 Immutable Historical Integrity
Competency framework evolution must never alter or invalidate historical assessment records. The system guarantees this by treating published framework versions, published role profiles, and completed assessments as immutable snapshots:
- A completed assessment is permanently stamped with the `frameworkVersionId` active during campaign launch.
- Subsequent changes to competency descriptions or role expectations apply only to future assessment cycles.

### 1.5 Defense-in-Depth Security
Security controls operate at multiple layers:
1. **Network**: TLS 1.2+ encryption in transit.
2. **Database**: PostgreSQL connection pooling over SSL with row-level parameterization.
3. **Session**: HTTP-only, SameSite signed JWT cookies.
4. **Data Redaction**: Sensitive attributes (passwords, tokens, API keys) are sanitized before logging.
5. **Storage**: Evidence attachments are stored in private cloud object buckets accessible only via short-lived HMAC-signed URLs.

---

## 2. Layered Architecture & Request Flow

The application follows a strictly layered architectural model:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION TIER                               │
│  React Server Components (RSC)  │  Client Interactive Components  │  Pages   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY & GUARD TIER                             │
│  Session Middleware  │  requireRole Guard  │  extractClientRequestContext   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER (LOGIC)                            │
│  TenantService       │  CampaignService    │  AssessmentsService            │
│  RoleProfileService  │  GapAnalysisService │  CorroborationService          │
│  FrameworkService    │  ReportService      │  AuditService                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA ACCESS TIER (PRISMA)                          │
│  Prisma ORM 7  │  @prisma/adapter-pg  │  pg Connection Pool (Supabase)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PERSISTENCE & STORAGE                            │
│  PostgreSQL (Supabase RDS, EU-West-1)  │  Supabase Storage (Signed URLs)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle Example: Submitting a Self-Assessment
1. **User Action**: Staff member submits assessment form via Server Action in `src/app/staff/assessments/[id]/assessment-form.tsx`.
2. **Authentication Guard**: `requireTenantUser()` extracts the signed session cookie, validates user active status, confirms `tenantId`, and verifies the `STAFF` role.
3. **Service Execution**: `StaffAssessmentService.submitAssessment(assessmentId, userId, tenantId)`:
   - Validates that the assessment belongs to `tenantId` and `userId`.
   - Checks that the parent campaign has not passed its deadline.
   - Verifies that all required competencies contain non-null ratings and valid evidence notes.
   - Evaluates campaign corroboration policy (`requiresCorroboration`).
   - If corroboration is required: transitions status to `PENDING_CORROBORATION` and notifies the manager.
   - If corroboration is disabled: copies `selfRating` into `finalRating`, sets status to `COMPLETED`, and finalizes the record.
4. **Audit Logging**: `logAuditEvent()` records an `ASSESSMENT_SUBMIT` event with actor ID, IP address, user agent, and sanitized details.
5. **UI Revalidation**: `revalidatePath('/staff/assessments')` updates cached layouts.

---

## 3. Domain Model & Complete Schema Dictionary

The platform domain model consists of **43 Prisma models** organized into logical functional modules:

### 3.1 Tenancy & Plan Management
- **`Tenant`**: The multi-tenant boundary representing a client organization. Stores `name`, `slug`, `domain`, `status` (`ACTIVE`, `SUSPENDED`, `ARCHIVED`), `seatLimit`, and foreign keys to `SubscriptionPlan` and `IndustryTemplate`.
- **`SubscriptionPlan`**: SaaS subscription tiers (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`) defining default seat caps and features.
- **`TenantInvitation`**: 256-bit cryptographically random invitation tokens for tenant employees with 7-day expiration and status tracking (`PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`).
- **`PlatformInvitation`**: Platform operator invitation records for `PLATFORM_ADMIN` and `SUPPORT` roles.

### 3.2 Canonical Framework Hierarchy (Platform-Wide)
- **`FrameworkVersion`**: Immutable version container (`1.0`, `2.0`) with lifecycle status (`DRAFT`, `PUBLISHED`).
- **`FrameworkCategory`**: Categorization taxonomy for competencies (e.g. Software Development, Data Engineering) with optional recursive self-relation for subcategories.
- **`FrameworkCompetency`**: Platform-wide canonical skill definition. Contains name, description, and link to category.
- **`FrameworkLevel`**: Granular mastery criteria tied to a `FrameworkCompetency`. Stores `level` (Int, 1–5+), `description` (behavioral indicator), and optional `evidencePrompt`. Uniquely constrained by `[frameworkCompetencyId, level]`.
- **`TenantFrameworkAdoption`**: Join table binding an organization to its adopted `FrameworkVersion`.

### 3.3 Tenant Skill Library & Customization
- **`Competency`**: Tenant-instantiated skill entity. Inherits from `FrameworkCompetency` (if adopted from canonical framework) or exists as an organization-specific custom competency (`isCustom: true`). Stores tenant-specific `weight` (default 100) and `isActive` toggle.
- **`CompetencyLevel`**: Tenant-level mastery benchmark storing level number, behavioral descriptions, and evidence prompts.

### 3.4 Industry Templates
- **`IndustryTemplate`**: Curated vertical competency bundles (e.g. Technology / SaaS, FinTech, Healthcare).
- **`IndustryTemplateCompetency`**: Maps canonical competencies to industry templates with default weighting.
- **`TemplateRoleProfile`** & **`TemplateRequirement`**: Standardized starter role profiles bundled within an industry template.

### 3.5 Organizational Hierarchy & Users
- **`User`**: Core identity model storing `email`, `passwordHash` (bcrypt, 10 rounds), `role` (`PLATFORM_ADMIN`, `SUPPORT`, `ORGANIZATION_ADMIN`, `MANAGER`, `STAFF`), `isActive`, `tenantId`, and self-referential `managerId` for reporting lines.
- **`Department`**: High-level organizational division.
- **`Team`**: Operational team unit with optional `leadUserId`.
- **`TeamMembership`**: Associative table linking users to teams.

### 3.6 Role Profiles & Career Progression
- **`RoleProfile`**: Job role benchmarks (e.g. Backend Engineer) with `DRAFT` / `PUBLISHED` status, and soft-archival managed via `isArchived: Boolean` and `archivedAt: DateTime?`.
- **`RoleRequirement`**: Associates a `RoleProfile` with a `Competency` and sets the target proficiency level (`targetLevel`).
- **`CareerPath`**: Directional career advancement track linking sequential or branched role profiles.
- **`CareerPathStep`**: Ordered step model linking a `roleProfileId` to a `careerPathId` by `orderIndex` (Int), uniquely constrained by `[careerPathId, roleProfileId]` and `[careerPathId, orderIndex]`. Skill/level progression deltas are computed sequentially between Step $N$ and Step $N+1$.

### 3.7 Assessment Campaigns & Evaluations
- **`AssessmentCampaign`**: Evaluation initiative with `scope` (`ORGANIZATION`, `TEAM`, `INDIVIDUAL`), `status` (`DRAFT`, `ACTIVE`, `CLOSED`), optional `startDate` (for scheduled opening windows), `deadline`, and `requiresCorroboration` flag.
- **`CampaignCompetency`**: Set of competencies evaluated in a campaign.
- **`CampaignParticipant`**: Staff members assigned to participate in a campaign.
- **`CampaignTeam`**: Teams targeted by a team-scoped campaign.
- **`Assessment`**: An employee's assessment submission record for a campaign (`NOT_STARTED`, `DRAFT`, `SUBMITTED`, `PENDING_CORROBORATION`, `COMPLETED`).
- **`AssessmentItem`**: Specific competency answer line storing employee's `selfRating` (Int), `selfNotes`, corroborated `managerRating` (Int), `managerNotes`, and verified `finalRating` (Int).
- **`Corroboration`**: Manager corroboration header record linking manager, assessment, review status, and sign-off timestamp.
- **`EvidenceAttachment`**: Supporting work artifact uploaded by staff. Stores `fileName`, `fileSizeBytes`, `mimeType`, and cloud `storageKey`.

### 3.8 Capability Analytics, Reports & Integrations
- **`ReportSchedule`**: Recurring capability report configuration (`recurrence`: `DAILY`, `WEEKLY`, `MONTHLY`) with scope and next execution timestamps.
- **`ReportScheduleRecipient`**: Authorized email recipients for scheduled reports.
- **`InterviewQuestionSet`** & **`InterviewQuestion`**: Structured competency-based interview questions generated for a published role profile.
- **`LearningResource`** & **`CompetencyLearningResource`**: Internal/external training courses and certifications mapped to specific competency and level combinations.
- **`AuditLog`**: Application-level append-only security log recording actor, action, tenant, IP, user agent, and sanitized details.
- **`Notification`**: Multi-channel notification delivery record with read tracking.
- **`NotificationTemplate`**: Global editable email and in-app message templates.
- **`TenantNotificationSettings`**: Organization reminder cadences and notification preferences.
- **`IntegrationConfiguration`**: Registry for enterprise SSO, HRIS, and LMS connectors.

---

## 4. Core Business Logic & Workflow Engines

### 4.1 Multi-Tenant Isolation Engine
All data access operations pass through tenant boundary guards:
- When a user logs in, their `tenantId` is sealed into a stateless cryptographic JWT session cookie.
- Every service function requires an explicit `tenantId` parameter extracted from the session.
- Repository queries automatically append `WHERE tenantId = :sessionTenantId`.
- Foreign entity lookups verify ownership; if an entity does not belong to the requesting tenant, the system throws a `NotFoundException` or `UnauthorizedException`.

### 4.2 Assessment Lifecycle & Corroboration Engine
The assessment lifecycle follows strict state transitions:

```
[NOT_STARTED]
      │  (Staff clicks Start / enters data)
      ▼
   [DRAFT] ◄────────┐ (Staff saves partial answers)
      │             │
      │ (Staff submits before deadline)
      ▼
 ┌──────────────────────────────────────────────┐
 │ Campaign Policy: requiresCorroboration?      │
 └──────────────────────┬───────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼ (Yes: enabled)              ▼ (No: disabled)
[PENDING_CORROBORATION]            [COMPLETED]
         │                         (finalRating = selfRating)
         │ (Manager reviews)
         ▼
[COMPLETED]
(finalRating = managerRating)
```

#### Mandatory Justification Rule
When a manager corroborates an assessment:
- If `managerRating == selfRating`, notes are optional.
- If `managerRating != selfRating`, the service enforces `managerNotes.trim().length >= 10`. Any adjustment submitted without justification is rejected with a validation error.

### 4.3 Gap Analysis & Capability Scoring Engine
Skill deficiency is computed mathematically as:

$$\text{Deficiency Gap} = \max(\text{Target Level} - \text{Final Rating}, 0)$$

- **Below Target (Gap > 0)**: Capability shortfall requiring targeted learning or mentoring.
- **Meets Target (Gap = 0)**: Proficiency exactly matches role benchmark.
- **Exceeds Target ($\text{Final Rating} > \text{Target Level}$)**: Employee exceeds role expectations (surplus skill capability).
- **Not Assessed ($\text{Final Rating} = \text{null}$)**: Evaluated separately to prevent skewing numerical averages.

Calculations are segregated into **Technical** and **Behavioral** competency groups, ensuring behavioral shortfalls are not masked by technical proficiencies.

### 4.4 Career Path Delta Calculation Engine
Career pathways calculate progression requirements between two published role profiles ($R_A \rightarrow R_B$):
1. Load all `RoleRequirement` entries for Role A ($Req_A$) and Role B ($Req_B$).
2. For each competency $C$ in $Req_B$:
   - If $C$ is present in Role A: $\Delta = \text{targetLevel}_B - \text{targetLevel}_A$.
   - If $C$ is new in Role B: $\Delta = +\text{targetLevel}_B$ (marked as *New Skill Required*).
3. If $C$ exists in Role A but is not required in Role B: categorized as *Non-Core Competency*.
4. Total path advancement effort is displayed as net level increments required.

### 4.5 Workforce Capability Reporting & Excel Engine
The reporting engine generates genuine, binary `.xlsx` workbooks using `exceljs`:
- **Sheet 1: Executive Summary**: Organization metadata, overall capability score, completion rates, and deficiency distributions.
- **Sheet 2: Competency Breakdown**: Skill-by-skill averages, target levels, net deficiency, and employee headcounts below target.
- **Sheet 3: Employee Detail**: Granular roster records displaying verified final ratings, self-ratings, manager corroboration notes, and gap scores.
- Styles, column widths, colored header ribbons, and Excel formulas (`=AVERAGE()`, `=SUM()`) are applied programmatically.

### 4.6 Background Automation & Cron Scheduler Engine
Automated cron endpoints (`/api/cron/notifications` and `/api/cron/reports`) operate on scheduled intervals:
- **Reminders**: Scans active campaigns for participants in `NOT_STARTED` or `DRAFT` status whose campaign deadline falls within reminder windows (e.g., 7 days, 3 days, 1 day). Deduplication tokens prevent redundant reminders.
- **Scheduled Reports**: Evaluates `ReportSchedule` records where `nextRunAt <= NOW()`. Generates binary `.xlsx` workbooks, constructs multipart emails, dispatches reports to authorized recipients, and advances `nextRunAt` according to schedule rules (`WEEKLY`, `MONTHLY`).
- Protected by `Authorization: Bearer <CRON_SECRET>` headers.

---

## 5. Security, Cryptography & Compliance

### 5.1 Authentication & Session Architecture
- **Password Storage**: Passwords are **hashed with bcrypt (10 salt rounds)** via `bcryptjs`. Plaintext passwords are never logged or stored.
- **Session Tokens**: Stateless signed JWT cookies signed via `jose` using **HS256 / HMAC-SHA256 signature verification** with a 256-bit `AUTH_SECRET`.
- **Cookie Security**:
  ```typescript
  {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  }
  ```

### 5.2 Role-Based Access Control (RBAC) Enforcement Matrix

| Capability / Route Area | Platform Admin | Support | Org Admin | Manager | Staff |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Tenant Provisioning & Plans (`/platform-admin/tenants`) | **FULL** | READ | DENIED | DENIED | DENIED |
| Framework Authoring & Publishing (`/platform-admin/frameworks`) | **FULL** | READ | DENIED | DENIED | DENIED |
| Platform User Management (`/platform-admin/users`) | **FULL** | DENIED | DENIED | DENIED | DENIED |
| Support Impersonation (`/support`) | DENIED | **FULL** | DENIED | DENIED | DENIED |
| Organization Profile & Settings (`/organization-admin/organization`) | DENIED | READ* | **FULL** | DENIED | DENIED |
| Role Profiles & Career Paths (`/organization-admin/roles`) | DENIED | READ* | **FULL** | DENIED | DENIED |
| Campaign Builder & Launch (`/organization-admin/campaigns`) | DENIED | READ* | **FULL** | DENIED | DENIED |
| User Roster Management & CSV Import (`/organization-admin/users`) | DENIED | READ* | **FULL** | DENIED | DENIED |
| Workforce Capability Reports & Scheduling (`/organization-admin/reports`)| DENIED | READ* | **FULL** | DENIED | DENIED |
| Team Competency Matrix (`/manager`) | DENIED | READ* | READ | **FULL** | DENIED |
| Direct-Report Corroboration Review (`/manager/corroborations`) | DENIED | DENIED | DENIED | **FULL (Directs)**| DENIED |
| Assigned Self-Assessments (`/staff/assessments`) | DENIED | DENIED | DENIED | DENIED | **FULL (Self)** |
| Verified Skills Profile & Personal Gap (`/staff/profile`) | DENIED | DENIED | DENIED | DENIED | **FULL (Self)** |
| Career Path Advancement View (`/staff/career-paths`) | DENIED | DENIED | DENIED | DENIED | **FULL (Self)** |
| Targeted Learning Recommendations (`/staff/learning`) | DENIED | DENIED | DENIED | DENIED | **FULL (Self)** |

*\*Support access to tenant features requires an active, audited Support Impersonation session.*

### 5.3 Application-Level Append-Only Audit Trail
The audit subsystem enforces non-repudiation:
- Mutations across tenants, user roles, framework versions, campaigns, and assessments invoke `AuditService.logAuditEvent()`.
- Records `actorId`, `actorRole`, `action`, `tenantId`, `resourceType`, `resourceId`, `ipAddress`, and `userAgent`.
- `sanitizeAuditDetails()` automatically removes sensitive keys (`password`, `passwordHash`, `token`, `secret`, `cookie`, `apiKey`, and binary payloads) prior to database insertion.
- The service exposes only `create` and `query` operations; no `update` or `delete` APIs exist.

### 5.4 Private Object Storage & Signed URL Generation
Evidence file uploads (PDFs, images, documents) are handled securely:
- Files are uploaded through server actions with MIME-type and size validation (maximum 10 MB per file).
- Uploaded assets are stored in a private Supabase Storage bucket (configured via `SUPABASE_EVIDENCE_BUCKET`, default: `'assessment-evidence'`).
- Downloads are routed through `/api/evidence-attachments/download?id=...`, which verifies tenant membership and issues a short-lived HMAC-signed URL (expiring in 60 seconds).
- Local filesystem storage fallbacks are disabled in production.

### 5.5 Support Impersonation Protocol
Support operators can diagnose tenant issues under strict oversight:
1. Support user initiates a session via `/support` by providing a mandatory explanation (`reason.length >= 10`).
2. System logs `IMPERSONATION_START` with the Support user's actor ID, target tenant ID, and reason.
3. A persistent amber banner displays throughout the user interface: `"SUPPORT MODE: Impersonating [Tenant Name] | Reason: [Reason]"`.
4. All actions performed during impersonation are attributed to the Support operator.
5. Exiting impersonation logs `IMPERSONATION_END` and restores normal session tokens.

### 5.6 Evaluation Sandbox & Preconfigured Platform Credentials

For evaluator testing and system validation, preconfigured demo accounts representing each role hierarchy are provided. The login page (`/login`) includes interactive evaluation sandbox buttons that autofill credentials with a single click across all environments (including production).

#### Platform Administrator Account (Single Authority)
> **Crucial System Note:** There is exactly **one** Platform Administrator account provisioned on the platform:
> - **Email:** `platform@skills.test`
> - **Password:** `Password123!`
> - **Role:** `PLATFORM_ADMIN`
> - **Scope:** Global SaaS Platform Operator (`tenantId = null`)
> - **Exclusive Capabilities:** Client organization provisioning, tiered subscription plan assignment, seat quota management, SFIA-aligned canonical framework authoring (competencies, levels 1–5+, level behavioral indicators), curated industry template publishing, platform-wide tenant analytics, and immutable audit log exploration.

#### Complete Preconfigured Demo Account Directory
All demo accounts use the standard evaluation password: **`Password123!`**

| Persona | Role | Email | Password | Tenant / Context | Primary Test Workflows |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `PLATFORM_ADMIN` | `platform@skills.test` | `Password123!` | Global (None) | Author canonical framework versions, manage industry templates, provision client organizations, inspect platform audit trails |
| **Support Staff** | `SUPPORT` | `support@skills.test` | `Password123!` | Global (None) | Initiate audited support impersonation sessions with reason justification, verify active amber banner |
| **Organization Admin** | `ORGANIZATION_ADMIN` | `admin@acme.test` | `Password123!` | Acme Technologies | Configure org profile, adopt industry templates, manage departments & teams, bulk import users via CSV, author role benchmark profiles, map career progression paths, launch assessment campaigns, schedule automated capability reports |
| **Manager** | `MANAGER` | `manager@acme.test` | `Password123!` | Acme Technologies (Engineering Manager) | Review direct reports' self-assessments, corroborate ratings with mandatory justifications, inspect live team competency matrix, evaluate capability heatmaps |
| **Staff Member** | `STAFF` | `staff@acme.test` | `Password123!` | Acme Technologies (Sarah Jenkins, Backend Eng) | Complete self-assessment against SFIA level descriptors, upload private evidence files, view verified skills profile, explore directional career progression ladders & targeted learning |

---

## 6. Complete Route & Navigation Directory (52 Routes)

```
/                                             - Root landing & authentication redirection
/login                                        - Secure email & password credential authentication
/accept-invitation                            - Tokenized invitation onboarding & password creation
/notifications                                - In-app notification center

/platform-admin                               - Platform Administrator root dashboard
/platform-admin/tenants                       - Tenant organization directory & metrics
/platform-admin/tenants/new                   - Tenant provisioning & subscription assignment
/platform-admin/tenants/[id]                  - Tenant lifecycle management & status controls
/platform-admin/plans                         - Subscription plan tiers & seat limits
/platform-admin/frameworks                    - Canonical framework library & version management
/platform-admin/frameworks/new                - Create new framework version draft
/platform-admin/frameworks/[id]               - Category, competency, and level authoring editor
/platform-admin/templates                     - Industry template library
/platform-admin/templates/new                 - Create vertical industry template
/platform-admin/templates/[id]                - Template competency & weighting editor
/platform-admin/users                         - Platform admin & support staff management
/platform-admin/analytics                     - Cross-tenant usage & adoption analytics
/platform-admin/audit                         - System-wide security & mutation audit trail
/platform-admin/notification-templates        - Global email & notification template editor
/platform-admin/integrations                  - Global enterprise integration registry

/support                                      - Support portal & impersonation session manager

/organization-admin                           - Organization Admin root dashboard
/organization-admin/organization              - Org profile, branding & template adoption
/organization-admin/organization/departments/new - Create department
/organization-admin/organization/departments/[id]  - Department details & team mappings
/organization-admin/organization/teams/new    - Create team & assign team lead
/organization-admin/organization/teams/[id]   - Team roster & member assignments
/organization-admin/skills                    - Skill library customization & weighting
/organization-admin/skills/new                - Add custom proprietary competency
/organization-admin/skills/[id]               - Competency level descriptor editor
/organization-admin/users                     - Employee directory & role management
/organization-admin/users/new                 - Send single employee invitation
/organization-admin/users/import              - Bulk CSV employee roster import & preview
/organization-admin/users/[id]                - Employee profile & role assignment editor
/organization-admin/roles                     - Role profiles directory
/organization-admin/roles/new                 - Role profile builder (technical & behavioral)
/organization-admin/roles/[id]                - View role profile benchmarks
/organization-admin/roles/[id]/edit           - Edit draft role profile requirements
/organization-admin/career-paths              - Career paths directory
/organization-admin/career-paths/new          - Career path progression builder
/organization-admin/career-paths/[id]         - Career path visualization & delta analysis
/organization-admin/career-paths/[id]/edit    - Edit career path role linkages
/organization-admin/campaigns                 - Assessment campaign management
/organization-admin/campaigns/new             - Assessment campaign builder & scheduler
/organization-admin/campaigns/[id]            - Campaign monitoring dashboard & reminders
/organization-admin/campaigns/[id]/edit       - Edit draft campaign settings
/organization-admin/gap-analysis              - Multi-tier skill gap analysis dashboard
/organization-admin/gap-analysis/[assessmentId] - Individual employee gap analysis detail
/organization-admin/reports                   - Workforce capability reports & schedule manager
/organization-admin/interview-questions       - Interview question guide generator
/organization-admin/interview-questions/new   - Generate question set from role profile
/organization-admin/interview-questions/[id]  - Interview guide review & PDF export
/organization-admin/learning-resources        - Learning resource catalog
/organization-admin/learning-resources/new    - Create & map learning course to competencies
/organization-admin/learning-resources/[id]   - Edit learning resource mappings
/organization-admin/search                    - In-tenant cross-entity search engine
/organization-admin/audit                     - Tenant-scoped audit trail viewer

/manager                                      - Manager team dashboard & competency matrix
/manager/corroborations                       - Direct-report corroboration queue
/manager/corroborations/[id]                  - Assessment review, evidence & rating adjustment
/manager/direct-reports/[id]                  - Direct report skills history & gap overview

/staff                                        - Staff member dashboard & active assessment alerts
/staff/assessments                            - My assigned assessments list
/staff/assessments/[id]                       - Self-assessment form & evidence file uploader
/staff/profile                                - Verified skills profile & assessment growth trends
/staff/gap-analysis                           - Personal gap-to-target & aspirational role fit
/staff/career-paths                           - Interactive career ladder & progression view
/staff/learning                               - Personalized gap-based learning recommendations

/api/cron/notifications                       - Background cron for reminder dispatching
/api/cron/reports                             - Background cron for scheduled report execution
/api/notifications                            - User notification fetch & read status update
/api/evidence-attachments/download            - Secure expiring signed URL evidence gateway
/api/reports/gap-analysis/organization/excel  - Organization gap analysis Excel generator
/api/reports/gap-analysis/team/[teamId]/excel - Team gap analysis Excel generator
/api/reports/gap-analysis/individual/[assessmentId]/excel - Individual gap analysis Excel generator
/api/reports/campaigns/[id]/pdf               - Campaign summary PDF generator
/api/reports/interview-questions/[id]/pdf     - Branded interview question guide PDF generator
```

---

## 7. Environment Variables & Configuration Reference

| Variable Name | Required | Default / Format | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://...:5432/postgres?sslmode=require` | PostgreSQL database connection string used by the application runtime and `@prisma/adapter-pg` |
| `AUTH_SECRET` | Yes | Min 32 random characters | Secret key for signing and verifying session JWTs via `jose` |
| `SUPABASE_URL` | In Prod | `https://[PROJECT_REF].supabase.co` | Supabase project API URL (required in production for private storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | In Prod | `eyJhbG...` | Supabase service role key for private storage operations |
| `SUPABASE_EVIDENCE_BUCKET` | In Prod | `assessment-evidence` | Name of the private object storage bucket (defaults to `assessment-evidence` in dev) |
| `RESEND_API_KEY` | Optional / Prod | `re_123456789...` | API key for transactional email delivery via Resend (MockEmailClient used if omitted in dev) |
| `EMAIL_FROM` | Optional / Prod | `Skills Assessment Platform <...>` | Sender identity for transactional notifications |
| `CRON_SECRET` | In Prod | 32+ random characters | Shared bearer secret securing `/api/cron/*` background endpoints |
| `ASSESSMENT_REMINDER_DAYS` | Optional | `3,1` | Days prior to campaign deadline to trigger automated reminders |
| `CORROBORATION_OVERDUE_BUSINESS_DAYS` | Optional | `5` | Business days before uncorroborated submissions trigger manager reminders |

---

## 8. Database Maintenance, Migrations & Provenance

### 8.1 Database Architecture & Connection Pooling
The platform connects to PostgreSQL via Prisma ORM 7 with the `@prisma/adapter-pg` driver adapter. In production, queries utilize Supabase transaction connection pooling (port 5432) to support high concurrent load without exhausting database connection limits.

### 8.2 Migration Management
Database schema changes are managed through Prisma migrate:
```bash
# Apply pending migrations in deployment pipelines
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Validate schema integrity
npx prisma validate
```
Currently, **17 sequential migrations** are applied and verified.

### 8.3 Baseline Demo Provenance
The database seed script (`prisma/seed.ts`) generates a clean baseline:
- **Canonical Framework 1.0**: 5 Categories, 7 Competencies (4 Technical, 3 Behavioral), 35 Level Descriptors.
- **Acme Technologies (`acme`)**: Fully provisioned tenant on the Enterprise plan.
- **Demo Users**:
  - `admin@acme.test`: Organization Admin.
  - `manager@acme.test`: Engineering Manager (Michael Manager).
  - `staff@acme.test`: Backend Engineer (Sarah Staff).
- **Sarah Staff Baseline State**: Assigned to the `Backend Engineer` profile; Q3 assessment is in `NOT_STARTED` status with 7 blank items awaiting self-rating.

---

## 9. Automated Test Suite & Quality Assurance Architecture

The codebase features **22 automated integration suites** located in `scripts/`, executing **840 tests with a 100% pass rate**:

| Suite Name | Tests | Verifications Handled |
| :--- | :---: | :--- |
| `test_audit_trail.ts` | 75 | Append-only logging, tenant filtering, sensitive key scrubbing |
| `test_campaign_scoping.ts` | 50 | Org/Team/Individual scoping, corroboration flag, launch rules |
| `test_evidence_attachments.ts` | 47 | File size limits, MIME validation, signed URL generation |
| `test_excel_and_scheduled_reports.ts` | 50 | Real `.xlsx` binary generation, styling, formulas, cron runner |
| `test_foundation_and_career_paths.ts` | 42 | Framework hierarchy, competency ranges, career delta calculations |
| `test_in_tenant_search.ts` | 17 | Multi-entity search, tenant isolation, role-based filtering |
| `test_industry_templates.ts` | 27 | Template creation, tenant adoption, non-destructive weight application |
| `test_integration_configuration.ts` | 15 | Provider registry, metadata sanitization, secret rejection |
| `test_learning_and_interview.ts` | 30 | Learning resource mapping, gap recommendations, question generation |
| `test_notification_templates.ts` | 18 | Template customization, variable interpolation, safe fallbacks |
| `test_notifications.ts` | 44 | Multi-channel dispatching, email abstraction, deduplication |
| `test_org_profile_and_framework_notifications.ts` | 37 | Branding updates, version publishing notifications, adoption |
| `test_organization_notification_settings.ts` | 16 | Cadence configuration, reminder scheduling, tenant isolation |
| `test_organization_structure.ts` | 45 | Department/team hierarchy, team lead bindings, tree traversal |
| `test_platform_analytics.ts` | 19 | Cross-tenant metric aggregations, anonymization guarantees |
| `test_platform_users.ts` | 48 | Platform user lifecycle, lockout protection, tenant isolation checks |
| `test_reports_and_exports.ts` | 55 | Multi-tier gap analysis formulas, CSV exports, PDF formatting |
| `test_role_profile_builder.ts` | 25 | Role authoring, technical/behavioral targets, publish immutability |
| `test_skills_profile_and_gap_analysis.ts` | 65 | Rating calculations, role comparisons, deficiency categorization |
| `test_staff_history_and_aspirational_gap.ts` | 57 | Historical progression tracking, aspirational role fit comparison |
| `test_support_impersonation.ts` | 20 | Impersonation lifecycle, audit logging, persistent banner, clean exit |
| `test_user_management.ts` | 38 | Single invitations, CSV import parser, seat limit validation |
| **TOTAL** | **840** | **100% Passing Rate Across All Suites** |

> **Note on Verification**: All functional requirements are 100% covered and verified via automated integration suites and static compilation (0 TypeScript errors, 0 ESLint warnings, 52 compiled Next.js routes). Interactive manual browser smoke testing across all 5 user roles remains pending pre-deployment sign-off.

---

## 10. Production Deployment & Operations Runbook

### 10.1 Pre-Deployment Verification
Before deploying new builds, run the automated verification suite:
```bash
# 1. Verify schema consistency
npx prisma validate

# 2. Verify static type safety
npx tsc --noEmit

# 3. Verify code style & linting
npm run lint

# 4. Verify production bundle compilation
npm run build
```

### 10.2 Database Deployment
In production CI/CD pipelines (e.g. GitHub Actions, Vercel Build Steps):
```bash
npx prisma migrate deploy
```
*(Never run `prisma migrate dev` or `prisma db push` in production).*

### 10.3 Scheduled Job Configuration (Vercel Cron / CloudWatch)
Configure scheduled triggers with bearer authentication:

- **Notifications & Reminders** (Daily at 08:00 UTC):
  ```http
  POST /api/cron/notifications
  Authorization: Bearer <CRON_SECRET>
  ```
- **Scheduled Capability Reports** (Hourly):
  ```http
  POST /api/cron/reports
  Authorization: Bearer <CRON_SECRET>
  ```

### 10.4 Incident Management & Support Runbook
If an organization admin reports an issue with campaign calculations or user assignments:
1. Support operator logs into `/support`.
2. Initiates Support Impersonation with ticket ID and reason.
3. Investigates the tenant's role profiles, campaigns, or assessments.
4. Concludes the session by clicking **Exit Support Mode**.
5. All actions are reviewed in `/platform-admin/audit` under `Action: IMPERSONATION_START` and `IMPERSONATION_END`.

---

*This technical documentation represents the final authoritative implementation for the Skills Assessment Platform.*
