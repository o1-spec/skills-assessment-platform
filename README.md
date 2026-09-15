# Skills Assessment Platform

A multi-tenant skills assessment platform that allows organizations to define role competency expectations, run employee assessments, validate results through manager corroboration, and identify capability skill gaps.

This project was developed as a **Junior Software Developer technical assessment**, delivering a complete, robust vertical slice of the core assessment lifecycle.

---

## Core Workflow

The platform implements an end-to-end capability evaluation lifecycle:

```
Organization Admin
  │
  ├── 1. Creates Role Profile (defines technical & behavioral benchmark levels)
  │
  └── 2. Launches Assessment Campaign (selects competencies & enrolls staff)
        │
        ▼
Staff Member
  │
  ├── 3. Completes Self-Assessment (rates levels & provides supporting evidence)
  │
  ├── 4. Saves & Resumes Drafts (incremental progress persistence)
  │
  └── 5. Submits Assessment (locks responses; triggers corroboration queue)
        │
        ▼
Direct Manager
  │
  ├── 6. Reviews Submissions (inspects employee self-ratings & evidence)
  │
  └── 7. Corroborates Ratings (confirms/adjusts levels; mandatory justification on changes)
        │
        ▼
Organization Admin
  │
  └── 8. Skill Gap Analysis (evaluates verified final ratings against role benchmarks)
```

---

## Features

### Authentication & Role-Based Access Control (RBAC)
- **Credentials-Based Authentication**: Secure login via email and password hashed with `bcryptjs`.
- **Stateless Signed Sessions**: HTTP-only session cookies signed with `jose` (JWT), containing user ID and re-verifying tenant association and active status on every request.
- **Four Distinct Roles**: `PLATFORM_ADMIN`, `ORGANIZATION_ADMIN`, `MANAGER`, and `STAFF`.
- **Server-Side Route & Layout Protection**: Role-specific dashboards and route guards that prevent unauthorized cross-role access.
- **Deactivated User Protection**: Automatic session invalidation for inactive accounts.

### Multi-Tenancy & Data Isolation
- **Tenant-Scoped Architecture**: All organization data (competencies, role profiles, campaigns, assessments) belongs to a specific `Tenant`.
- **Strict Server-Side Boundary Enforcement**: All database queries and server actions derive `tenantId` from authenticated server sessions rather than trusting client parameters.
- **Cross-Tenant Prevention**: Users cannot access, view, or mutate resources belonging to another tenant.

### Organization Admin
- **Role Profiles Management**: Create, view, and publish standardized job role profiles with target technical and behavioral competency levels.
- **Assessment Campaign Management**: Create draft or active campaigns, preselect competencies from published role profiles, enroll staff participants, and set deadlines.
- **Configurable Manager Corroboration**: Toggle whether manager corroboration is required or if self-assessments finalize directly.
- **Participant Roster & Tracking**: Real-time visibility into staff assessment progress across active campaigns.
- **Skill Gap Analysis**: Automated gap calculations comparing corroborated final ratings against target role benchmarks with categorized metrics (Below Target, Meets Target, Exceeds Target).

### Staff Member
- **My Assessments Portal**: Dashboard displaying active and completed assessment cycles.
- **Competency Level Rating**: Self-evaluation across granular mastery levels with benchmark definitions.
- **Evidence Documentation**: Multi-line evidence inputs to support self-ratings against level prompts.
- **Draft Save & Resume**: Incremental progress saving with flexible incomplete drafts.
- **Final Submission**: Input validation ensuring all competencies are completed before locking submission.

### Manager
- **Corroboration Queue**: Filtered review queue listing submitted assessments exclusively from direct reports.
- **Evidence Review**: Side-by-side inspection of employee self-ratings and submitted evidence.
- **Rating Corroboration & Adjustment**: Ability to confirm employee ratings or adjust them based on observed performance.
- **Mandatory Justification Rule**: Enforced requirement to provide written reasoning whenever adjusting a staff member's self-rating.
- **Final Rating Resolution**: Finalizes assessment scores and transitions status to `COMPLETED`.

### Platform Admin
- **Platform Overview**: High-level control plane landing page displaying SaaS tenant counts, platform user totals, and global competency counts.
- *Note: Advanced SaaS tenant provisioning, billing, and global framework authoring are deliberately outside the MVP scope.*

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router, Server Components, Server Actions) |
| **Language** | TypeScript |
| **UI & Styling** | React, Tailwind CSS |
| **Database** | PostgreSQL (hosted on Supabase) |
| **ORM** | Prisma ORM with `@prisma/adapter-pg` |
| **Authentication** | `jose` (JWT signing), `bcryptjs` (password hashing) |
| **Validation** | Zod |

---

## Architecture

The project is structured as a full-stack Next.js application, avoiding microservice or separate frontend/backend complexity to keep the evaluation focused and maintainable.

```
Browser Client
     │
     ▼
Next.js App Router (src/app)
  ├── Server Components & Pages (Data Fetching & Layouts)
  ├── Server Actions (Form Submissions & State Mutations)
  └── Auth & Permission Guards (src/lib/auth, src/lib/permissions)
            │
            ▼
   Service Layer (src/services)
  (Business Logic, Tenant Scope Enforcement, Justification Rules)
            │
            ▼
    Prisma ORM (src/lib/db)
            │
            ▼
  PostgreSQL Database (Supabase)
```

### Directory Structure

- **`src/app/`**: Next.js App Router routes, layouts, page views, and server action handlers grouped by role (`login`, `organization-admin`, `staff`, `manager`, `platform-admin`).
- **`src/components/`**: Reusable navigation bars, logout buttons, and UI elements.
- **`src/lib/`**: Core infrastructure including database connection client (`db`), JWT session authentication (`auth`), validation schemas (`validation`), permissions, and date/status formatting utilities (`format.ts`).
- **`src/services/`**: Encapsulated, reusable business logic functions for role profiles, campaigns, staff assessments, manager corroborations, and gap analysis.
- **`prisma/`**: Database schema (`schema.prisma`), database migrations, and deterministic seed script (`seed.ts`).

---

## Data Model

The core relational database model comprises 12 entities:

- **`Tenant`**: Multi-tenant organization container (e.g. Acme Technologies).
- **`User`**: User accounts across all roles; includes a self-referencing `managerId` relation for manager-to-staff reporting hierarchies.
- **`Competency`**: Unified model for skills, categorized by `CompetencyType` (`TECHNICAL` or `BEHAVIORAL`).
- **`CompetencyLevel`**: Mastery benchmarks (Levels 1–5) with benchmark descriptions and optional evidence prompts.
- **`RoleProfile`**: Job role definitions (e.g. Backend Engineer) with `DRAFT` / `PUBLISHED` status.
- **`RoleRequirement`**: Associates a `RoleProfile` with a `Competency` and required `targetLevel`.
- **`AssessmentCampaign`**: Assessment cycle with deadline, optional role profile linkage, and corroboration requirement flag.
- **`CampaignCompetency`**: Join table mapping competencies included in a campaign.
- **`CampaignParticipant`**: Join table mapping staff members enrolled in a campaign.
- **`Assessment`**: Staff assessment record tracking lifecycle (`NOT_STARTED`, `DRAFT`, `PENDING_CORROBORATION`, `COMPLETED`).
- **`AssessmentItem`**: Individual competency answer line storing `selfRating`, `evidenceText`, and corroborated `finalRating`.
- **`Corroboration`**: Manager review record storing confirmed/adjusted `rating` and mandatory `justification`.

### Key Design Decisions
- **Single Competency Model**: Technical and behavioral capabilities share the same `Competency` and `CompetencyLevel` tables distinguished by `CompetencyType`, avoiding duplicated schemas while allowing unified rating logic.
- **`selfRating` vs `finalRating`**: `selfRating` records the employee's original assessment. `finalRating` represents the final verified score (either corroborated by a manager or mirrored from `selfRating` if corroboration is disabled). Gap analysis strictly evaluates `finalRating`.

---

## Important Business Rules

1. **Strict Tenant Scoping**: Organization Admins can only view and manage competencies, role profiles, campaigns, and assessments belonging to their authenticated `tenantId`.
2. **Direct-Report Manager Authorization**: Managers can only view and corroborate assessments for staff members who list them as their `managerId`.
3. **Flexible Drafts**: Staff can save draft assessments with incomplete answers or partial evidence without triggering validation errors.
4. **Submission Lock**: Once submitted, staff assessments become read-only and cannot be modified.
5. **Manager Rating Justification Rule**: If a manager adjusts a staff member's self-rating to a different level, a written explanation (`justification`) is mandatory before submission.
6. **Configurable Corroboration Lifecycle**: If a campaign disables corroboration (`requiresCorroboration = false`), staff submission immediately finalizes ratings and marks the assessment `COMPLETED`. If enabled, it transitions to `PENDING_CORROBORATION`.
7. **Skill Gap Formula**: Gap analysis evaluates `Math.max(targetLevel - finalRating, 0)`. If an employee's rating equals or exceeds the target level, the gap is `0` (categorized as *Meets Target* or *Exceeds Target*).

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL database (or Supabase project)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd skills-assessment-platform
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Populate `.env` with your credentials:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
   AUTH_SECRET="your-secure-random-auth-secret-min-32-chars"
   ```

4. **Run database migrations**:
   ```bash
   npx prisma migrate dev
   ```

5. **Seed the database**:
   ```bash
   npx prisma db seed
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts

The database seed provides preconfigured development accounts for each role:

| Role | Email | Password | Scope / Context |
|---|---|---|---|
| **Organization Admin** | `admin@acme.test` | `Password123!` | Acme Technologies admin |
| **Manager** | `manager@acme.test` | `Password123!` | Engineering Manager (Michael Manager) |
| **Staff Member** | `staff@acme.test` | `Password123!` | Backend Engineer (Sarah Staff, reports to Michael) |
| **Platform Admin** | `platform@skills.test` | `Password123!` | Global Platform Administrator |

> *Note: These credentials are for development and testing environments only.*

---

## Recommended Demo Flow

Follow this walkthrough to review the complete implemented workflow:

1. **Login as Organization Admin** (`admin@acme.test` / `Password123!`):
   - Navigate to **Role Profiles** and inspect the seeded `Backend Engineer` profile (4 Technical and 3 Behavioral competencies).
   - Navigate to **Campaigns** to view the active `Q3 Engineering Skills Assessment` campaign assigned to Sarah Staff.
2. **Login as Staff Member** (`staff@acme.test` / `Password123!`):
   - Navigate to **My Assessments** and click **Start Assessment** on the Q3 campaign.
   - Rate a few competencies, enter evidence text, and click **Save Draft**.
   - Reload or return to confirm draft persistence.
   - Complete all remaining competencies and click **Submit Assessment**.
   - Confirm status transitions to `Pending Corroboration`.
3. **Login as Manager** (`manager@acme.test` / `Password123!`):
   - Navigate to **Corroboration Queue** and locate Sarah Staff's submitted assessment.
   - Click **Review Assessment** to inspect her self-ratings and evidence.
   - Confirm benchmark ratings for some competencies, and change at least one rating (e.g. adjust Level 2 to Level 3).
   - Note that justification is required for adjusted ratings; provide reasoning.
   - Click **Complete Corroboration Review**.
   - Confirm status transitions to `Completed`.
4. **Login again as Organization Admin** (`admin@acme.test` / `Password123!`):
   - Navigate to **Gap Analysis**.
   - Select Sarah Staff's finalized assessment.
   - Inspect the capability breakdown comparing Sarah's verified final ratings against the `Backend Engineer` target levels.

---

## Security & Tenant Isolation

- **Server-Derived Context**: Tenant ID and user identity are extracted directly from signed session tokens on the server. Client-submitted tenant IDs are never trusted.
- **Ownership Verification**: All assessment read/write operations verify that the resource belongs both to the authenticated user's tenant and matches required user/manager IDs.
- **Manager Hierarchy Enforcement**: Corroboration endpoints verify that the target employee's `managerId` matches the authenticated manager's ID.
- **Cryptographic Security**: Passwords are encrypted using salted `bcryptjs` hashes. Session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` flags in production.

---

## Testing & Quality Verification

The codebase adheres to strict quality checks:

```bash
# Validate Prisma schema
npx prisma validate

# Run TypeScript typecheck
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Verify Next.js production build
npm run build
```

### Verified End-to-End Scenarios
- Tenant isolation across all CRUD operations.
- Cross-role route access prevention.
- Draft persistence and resume lifecycle.
- Full assessment submission validation.
- Manager corroboration rating adjustment with justification enforcement.
- Skip-corroboration automatic finalization path.
- Mathematical correctness of skill gap calculations.

---

## MVP Scope & Future Roadmap

The MVP intentionally prioritized a complete, resilient end-to-end core lifecycle. The following features from the wider product requirement specification are deliberately deferred for future iterations:

- **Framework Authoring & Versioning**: Dynamic competency framework version branching.
- **Pre-built Industry Templates**: Out-of-the-box role template catalog.
- **Department & Team Hierarchy**: Granular organizational unit campaign targeting.
- **Career Pathways & Learning Links**: Automated LMS course recommendations linked to gap areas.
- **File Attachments**: Direct document and portfolio attachment uploads for evidence.
- **Email & Notification Engine**: Automated deadline reminders and review notifications.
- **Enterprise SSO & SCIM**: SAML/OIDC and automated user provisioning.
- **Advanced Platform Administration**: SaaS self-serve tenant provisioning and billing tiers.

---

## Deployment

This application is designed for cloud deployment:
- **Application**: Next.js deployed on [Vercel](https://vercel.com)
- **Database**: Managed PostgreSQL hosted on [Supabase](https://supabase.com)

**Production URL**: *To be added after deployment*
