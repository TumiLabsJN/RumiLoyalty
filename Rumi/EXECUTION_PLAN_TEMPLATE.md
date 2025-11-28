# [Project Name]: LLM Execution Plan
# Version: 1.0
# Status: Not Started

---

## RULES OF ENGAGEMENT (For Executing LLM)

### Core Protocol
1. Execute this plan SEQUENTIALLY - do not skip tasks
2. Before EVERY task, READ the specified documentation references
3. Do NOT implement based on general knowledge - ONLY from referenced docs
4. Mark checkbox `[x]` ONLY after Acceptance Criteria verified
5. If task fails, STOP and report: Task ID + Failure reason
6. Commit after each completed Step with message: "Complete: [Step ID] - [Description]"

### Anti-Hallucination Rules
- FORBIDDEN: Implementing features not in requirements docs
- FORBIDDEN: Assuming schema structure without reading schema docs
- FORBIDDEN: Skipping RLS policies or security requirements
- FORBIDDEN: Omitting multi-tenant client_id filters in queries
- REQUIRED: Read documentation section before implementation
- REQUIRED: Verify against requirements before marking complete

### Session Management
**Session Start:**
1. Run `/context` to check token usage
2. Find next unchecked `[ ]` task
3. Read documentation for that task
4. Execute task
5. Verify Acceptance Criteria
6. Mark `[x]` and commit

**Session End:**
1. Mark current progress
2. Commit all changes
3. Note any blockers

---

## GLOBAL PHASE CHECKLIST

- [ ] Phase 0: Documentation Review & Environment Setup
- [ ] Phase 1: Database Foundation (Schema, RLS, Triggers, Seeds)
- [ ] Phase 2: Shared Libraries (Types, Clients, Utils)
- [ ] Phase 3: Core Features (Repositories, Services, Routes)
- [ ] Phase 4: Testing & Validation
- [ ] Phase 5: Deployment & Documentation

---

# PHASE 0: DOCUMENTATION REVIEW & ENVIRONMENT SETUP

**Objective:** Establish foundation and confirm complete understanding of requirements before writing code.

## Step 0.1: Documentation Audit

- [ ] **Task 0.1.1:** Read main requirements document
    - **Path:** `/path/to/requirements.md`
    - **Focus:** Core features, critical patterns, data flows
    - **Acceptance Criteria:** Create summary document listing all features and critical patterns

- [ ] **Task 0.1.2:** Read schema documentation
    - **Path:** `/path/to/schema.md`
    - **Focus:** All table definitions, relationships, constraints
    - **Acceptance Criteria:** Create table dependency graph showing FK relationships

- [ ] **Task 0.1.3:** Read architecture documentation
    - **Path:** `/path/to/architecture.md`
    - **Focus:** Layer patterns, folder structure, security rules
    - **Acceptance Criteria:** Confirm understanding of repository → service → route pattern

- [ ] **Task 0.1.4:** Read API contracts documentation
    - **Path:** `/path/to/api_contracts.md`
    - **Focus:** All endpoints with request/response schemas
    - **Acceptance Criteria:** Create checklist of all API endpoints

## Step 0.2: Environment Setup

- [ ] **Task 0.2.1:** Initialize database project
    - **Command:** `supabase init` (or equivalent for your database)
    - **References:** Requirements.md (Database section)
    - **Acceptance Criteria:** Database directory exists with config files

- [ ] **Task 0.2.2:** Install core dependencies
    - **Action:** Extract dependencies from tech stack documentation
    - **References:** Requirements.md (Tech Stack section)
    - **Acceptance Criteria:** All required packages listed in package.json

- [ ] **Task 0.2.3:** Configure environment variables
    - **Action:** Create `.env.local` with required variables
    - **References:** Requirements.md (Environment Configuration section)
    - **Acceptance Criteria:** All required env vars set, .env.local in .gitignore

- [ ] **Task 0.2.4:** Configure development tools
    - **Action:** Create ESLint and Prettier configuration files
    - **References:** Requirements.md (Development Tools section)
    - **Acceptance Criteria:** Linting and formatting configured, can run lint command successfully

- [ ] **Task 0.2.5:** Link to cloud services
    - **Command:** Link to database/auth services
    - **Acceptance Criteria:** Connection successful, credentials validated

---

# PHASE 1: DATABASE FOUNDATION

**Objective:** Create complete, verified database schema with security policies and seed data.

## Step 1.1: Schema Migration - Core Tables

- [ ] **Task 1.1.1:** Create initial migration file
    - **Command:** `supabase migration new initial_schema` (or equivalent)
    - **References:** Schema.md
    - **Acceptance Criteria:** New empty migration file in migrations directory

- [ ] **Task 1.1.2:** Add ENUM types to migration
    - **Action:** Add all CREATE TYPE statements for enums
    - **References:** Schema.md (enum definitions section)
    - **Acceptance Criteria:** Migration contains all enum types with correct values

- [ ] **Task 1.1.3:** Add primary entity table
    - **Action:** Add CREATE TABLE for main entity with uuid primary key
    - **References:** Schema.md (primary entity table definition)
    - **Acceptance Criteria:** MUST have all required fields, constraints, and indexes per schema definition

- [ ] **Task 1.1.4:** Add related entity tables
    - **Action:** Add CREATE TABLE statements with foreign keys to primary entity
    - **References:** Schema.md (related tables definitions)
    - **Acceptance Criteria:** MUST have correct FK relationships, all constraints match schema

## Step 1.2: Schema Migration - Dependent Tables

- [ ] **Task 1.2.1:** Add first dependent table
    - **Action:** Add CREATE TABLE with FKs to core tables
    - **References:** Schema.md (dependent table definition)
    - **Acceptance Criteria:** MUST have all fields per schema, FK constraints enforced

- [ ] **Task 1.2.2:** Add second dependent table
    - **Action:** Add CREATE TABLE with composite FKs if needed
    - **References:** Schema.md (dependent table definition)
    - **Acceptance Criteria:** MUST have correct composite FK relationships, unique constraints

## Step 1.3: Indexes and Performance

- [ ] **Task 1.3.1:** Add performance indexes
    - **Action:** Add CREATE INDEX statements for frequently queried columns
    - **References:** Schema.md (indexes section)
    - **Acceptance Criteria:** Index on tenant_id/client_id for every multi-tenant table

- [ ] **Task 1.3.2:** Add composite indexes
    - **Action:** Add composite indexes for common query patterns
    - **References:** Schema.md (performance optimization section)
    - **Acceptance Criteria:** Composite indexes match documented query patterns

## Step 1.4: Row Level Security

- [ ] **Task 1.4.1:** Enable RLS on all tables
    - **Action:** Add `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;` for all tables
    - **References:** Schema.md (RLS section)
    - **Acceptance Criteria:** RLS enabled on all tables

- [ ] **Task 1.4.2:** Add user access policies
    - **Action:** Add CREATE POLICY for SELECT/INSERT/UPDATE with tenant isolation
    - **References:** Schema.md (RLS policies), Architecture.md (Multi-Tenant Isolation pattern)
    - **Acceptance Criteria:** All policies include tenant_id filter matching authenticated user

- [ ] **Task 1.4.3:** Add admin policies
    - **Action:** Add CREATE POLICY for admin role with full access
    - **References:** Schema.md (Admin RLS policies)
    - **Acceptance Criteria:** Admin policies allow bypass with role check

## Step 1.5: Database Triggers

- [ ] **Task 1.5.1:** Create trigger function for auto-updates
    - **Action:** Add CREATE FUNCTION to automatically update related records
    - **References:** Requirements.md (Auto-Sync pattern), Schema.md (triggers section)
    - **Acceptance Criteria:** Function updates correct fields when trigger event occurs

- [ ] **Task 1.5.2:** Create trigger on source table
    - **Action:** Add CREATE TRIGGER AFTER INSERT/UPDATE on source table
    - **References:** Schema.md (triggers)
    - **Acceptance Criteria:** Trigger fires on correct events and calls function

## Step 1.6: Deploy and Verify Schema

- [ ] **Task 1.6.1:** Push migration to database
    - **Command:** `supabase db push` (or equivalent)
    - **Acceptance Criteria:** Migration succeeds with no errors, all objects created

- [ ] **Task 1.6.2:** Verify schema matches specification
    - **Command:** `supabase db diff` should show no pending changes
    - **Acceptance Criteria:** Database schema exactly matches Schema.md, no drift detected

## Step 1.7: Seed Data

- [ ] **Task 1.7.1:** Create seed data script
    - **Action:** Create seed.sql with INSERT statements for reference data
    - **References:** Schema.md (seed data section)
    - **Acceptance Criteria:** Script inserts all required reference/lookup data

- [ ] **Task 1.7.2:** Run seed data
    - **Command:** Execute seed script against database
    - **Acceptance Criteria:** All reference data inserted successfully, constraints validated

---

# PHASE 2: SHARED LIBRARIES

**Objective:** Create reusable types, utilities, and client configurations used across the application.

## Step 2.1: TypeScript Types

- [ ] **Task 2.1.1:** Create database entity types
    - **Action:** Create TypeScript interfaces matching database tables
    - **References:** Schema.md (all table definitions)
    - **Acceptance Criteria:** One interface per table with correct field types

- [ ] **Task 2.1.2:** Create API request/response types
    - **Action:** Create interfaces for all API endpoints
    - **References:** API_Contracts.md (request/response schemas)
    - **Acceptance Criteria:** Types match API contracts exactly, exported from types directory

## Step 2.2: Database Clients

- [ ] **Task 2.2.1:** Create database client utility
    - **Action:** Create reusable database client with connection pooling
    - **References:** Architecture.md (Database Client pattern)
    - **Acceptance Criteria:** Client configured with environment variables, connection validated

- [ ] **Task 2.2.2:** Create admin client utility
    - **Action:** Create admin client with elevated permissions
    - **References:** Architecture.md (Admin Client pattern)
    - **Acceptance Criteria:** Admin client bypasses RLS, only used in secure contexts

## Step 2.3: Utility Functions

- [ ] **Task 2.3.1:** Create validation utilities
    - **Action:** Create input validation functions
    - **References:** API_Contracts.md (validation rules)
    - **Acceptance Criteria:** Validators for email, password, handle formats per API contracts

- [ ] **Task 2.3.2:** Create error handling utilities
    - **Action:** Create custom error classes and error response formatter
    - **References:** Architecture.md (Error Handling pattern)
    - **Acceptance Criteria:** Custom error classes extend Error, formatter returns consistent JSON structure

- [ ] **Task 2.3.3:** Create data transformation utilities
    - **Action:** Create functions to transform between snake_case and camelCase
    - **References:** Architecture.md (Data Transformation conventions)
    - **Acceptance Criteria:** Utilities handle field name conversion, nested objects, arrays

---

# PHASE 3: CORE FEATURES

**Objective:** Implement core business logic following 3-layer architecture pattern.

## Step 3.1: Feature Repositories

- [ ] **Task 3.1.1:** Create entity repository file
    - **Action:** Create /lib/repositories/entityRepository.ts
    - **References:** Architecture.md (Repository Layer, lines XXX-YYY)
    - **Acceptance Criteria:** File exists with repository object pattern matching architecture examples

- [ ] **Task 3.1.2:** Implement findById function
    - **Action:** Add function with signature `findById(id: string)`
    - **References:** Schema.md (entity table), Architecture.md (Multi-Tenant Query pattern)
    - **Acceptance Criteria:** Query MUST filter by id, returns typed entity or null

- [ ] **Task 3.1.3:** Implement findAll function
    - **Action:** Add function with tenant isolation
    - **References:** Schema.md (entity table), Architecture.md (Tenant Isolation rules)
    - **Acceptance Criteria:** Query MUST filter by tenant_id, returns array of entities

## Step 3.2: Feature Services

- [ ] **Task 3.2.1:** Create entity service file
    - **Action:** Create /lib/services/entityService.ts
    - **References:** Architecture.md (Service Layer, lines XXX-YYY)
    - **Acceptance Criteria:** File exists, imports repository, exports pure functions

- [ ] **Task 3.2.2:** Implement business logic function
    - **Action:** Add function orchestrating multiple repositories
    - **References:** API_Contracts.md (endpoint business logic), Architecture.md (Service patterns)
    - **Acceptance Criteria:** Function calls repositories, applies business rules, returns domain objects

## Step 3.3: API Routes

- [ ] **Task 3.3.1:** Create GET endpoint
    - **Action:** Create /app/api/entity/route.ts with GET handler
    - **References:** API_Contracts.md (GET /api/entity, lines XXX-YYY), Architecture.md (Presentation Layer)
    - **Acceptance Criteria:** MUST return response matching API contract schema, includes error handling

- [ ] **Task 3.3.2:** Create POST endpoint
    - **Action:** Add POST handler to route file
    - **References:** API_Contracts.md (POST /api/entity, lines XXX-YYY), Architecture.md (Validation Checklist)
    - **Implementation Guide:** MUST validate input per API contract, call service layer, return 201 on success
    - **Acceptance Criteria:** MUST return response per API contract, validates all required fields, returns appropriate error codes

## Step 3.4: Feature Testing

- [ ] **Task 3.4.1:** Create service unit tests
    - **Action:** Create test file mocking repositories
    - **References:** Architecture.md (Testing Strategy)
    - **Acceptance Criteria:** Tests cover all service functions, mocks verify repository calls

- [ ] **Task 3.4.2:** Create API integration tests
    - **Action:** Create integration test hitting real endpoints
    - **References:** Architecture.md (Integration Testing)
    - **Acceptance Criteria:** Tests verify complete request/response flow, includes auth

---

# PHASE 4: TESTING & VALIDATION

**Objective:** Verify all features work correctly and meet requirements.

## Step 4.1: Unit Testing

- [ ] **Task 4.1.1:** Run all unit tests
    - **Command:** `npm test` or equivalent
    - **Acceptance Criteria:** All unit tests pass with >80% code coverage

## Step 4.2: Integration Testing

- [ ] **Task 4.2.1:** Run integration test suite
    - **Command:** `npm run test:integration` or equivalent
    - **Acceptance Criteria:** All API endpoints return correct responses for valid/invalid inputs

## Step 4.3: Security Validation

- [ ] **Task 4.3.1:** Verify tenant isolation
    - **Action:** Test that users cannot access other tenants' data
    - **References:** Architecture.md (Security Checklist)
    - **Acceptance Criteria:** All multi-tenant queries filter by tenant_id, cross-tenant access blocked

- [ ] **Task 4.3.2:** Verify authentication
    - **Action:** Test that protected routes require valid tokens
    - **Acceptance Criteria:** Unauthenticated requests return 401, invalid tokens rejected

---

# PHASE 5: DEPLOYMENT & DOCUMENTATION

**Objective:** Deploy application and create operational documentation.

## Step 5.1: Pre-Deployment Checks

- [ ] **Task 5.1.1:** Verify all environment variables
    - **Action:** Check production environment configuration
    - **Acceptance Criteria:** All required env vars set in production, no dev credentials

- [ ] **Task 5.1.2:** Run production build
    - **Command:** `npm run build` or equivalent
    - **Acceptance Criteria:** Build succeeds with no errors or warnings

## Step 5.2: Deployment

- [ ] **Task 5.2.1:** Deploy to production environment
    - **Command:** Deploy using platform CLI or CI/CD pipeline
    - **Acceptance Criteria:** Deployment succeeds, health checks pass

- [ ] **Task 5.2.2:** Verify production functionality
    - **Action:** Test critical user flows in production
    - **Acceptance Criteria:** All core features work correctly in production environment

## Step 5.3: Documentation

- [ ] **Task 5.3.1:** Create API documentation
    - **Action:** Generate API docs from code or contracts
    - **Acceptance Criteria:** All endpoints documented with examples

- [ ] **Task 5.3.2:** Create deployment runbook
    - **Action:** Document deployment process and troubleshooting
    - **Acceptance Criteria:** Runbook includes rollback procedure, common issues

---

# COMPLETENESS CHECKLIST

## Database
- [ ] All tables created with correct schema
- [ ] All indexes created for performance
- [ ] RLS enabled on all tables
- [ ] Triggers function correctly
- [ ] Seed data loaded

## Application Code
- [ ] All repositories implemented
- [ ] All services implemented
- [ ] All API routes implemented
- [ ] Error handling in all routes

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security validation complete

## Deployment
- [ ] Production build successful
- [ ] Deployed to production
- [ ] Documentation complete

---

**END OF EXECUTION PLAN TEMPLATE**
