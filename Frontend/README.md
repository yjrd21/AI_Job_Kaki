# AI Job Kaki — Frontend

React 18 + TypeScript + Vite single-page application, designed from the current **Java System Architecture** Figma file and API DTOs from [`yjrd21/AI_Job_Kaki`](https://github.com/yjrd21/AI_Job_Kaki) (checked 9 October 2026).

## Quick start

1. Extract/copy **the contents** of this folder into your new `jobKaki-frontend` repository.
2. Install Node.js 20+.
3. Run `npm install`.
4. Run `cp .env.example .env` (or create `.env` manually on Windows).
5. Run `npm run dev`; open the local URL Vite prints.

**Mock mode is enabled by default.** It lets you explore the dashboard, create/edit/delete candidate profiles, submit demo jobs, navigate job history, and see an illustrative analysis without Java services. Mock data resets on page reload. Its analysis is NOT generated from the posted content and should never be presented as a real result.

Run `npm run typecheck`, `npm run build`, and `npm test` after dependencies have installed.

## Connect your Java backend

Set the following in `.env`:

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:8080
VITE_KEYCLOAK_URL=http://localhost:8181
VITE_KEYCLOAK_REALM=jobkaki
VITE_KEYCLOAK_CLIENT_ID=jobkaki-frontend
# Temporary LOCAL development mapping, not a production identity solution.
VITE_SQL_USER_ID=<real PostgreSQL User.id UUID for signed-in Keycloak user>
```

Adjust hostnames, ports, realm and client ID to match your running environment. Register your Vite origin as a Keycloak **Web Origin**, configure a public browser client with **Authorization Code + PKCE (S256)** and appropriate redirect URIs. Do not place a Keycloak client secret in frontend environment files.

**Identity integration requirement:** The gateway forwards the Keycloak `sub` as `X-User-ID`, which is intentional and corresponds to PostgreSQL `User.keycloakId`. But the user and job controller path parameters currently expect the separately generated PostgreSQL `User.id` UUID. The frontend does not silently substitute those IDs. For local-only integration testing, supply `VITE_SQL_USER_ID`; for production, implement a secure authenticated `GET /api/users/me` or equivalent subject-to-SQL-UUID resolution on the server, then remove this environment variable. **A VITE_* variable is visible to every browser; it is not an authorization mechanism.** Backend enforcement of caller ownership and trusted identity is mandatory. This is a known integration issue, not a DTO shape mismatch.

The gateway currently parses JWT claims independently in a filter; verify Spring Security authentication and inbound header sanitization before exposing user data publicly.

## Screen and API mapping

| Screen | Backend endpoint |
| --- | --- |
| Candidate Profiles | `GET/POST /api/users/{userId}/candidate-contexts` |
| Candidate Profile editor | `GET/PUT/DELETE /api/users/{userId}/candidate-contexts/{contextId}` |
| Analyse Job | `POST /api/users/{userId}/jobs` |
| Job History | `GET /api/users/{userId}/jobs` |
| Job Details / lifecycle | `GET/DELETE /api/users/{userId}/jobs/{jobId}` |
| Completed report | `GET /api/job-analyses/{analysisId}` |
| Account | `GET/PUT /api/users/{userId}` |

The backend accepts `submissionType` = `TEXT` or `URL`; job submissions include `jobContext`, `candidateContextId`, and all nine response fields. The analysis response contains `roleTitle`, `companyContext`, `salaryRange`, `applicationDeadline`, `redFlags[]`, `requirements[]` (requirement, status, explanation), `matchSummary`, and `questionsToClarify[]`. No numeric fit score is invented.

**Known API limitations:** the backend does not retrieve posting pages from URLs, does not feed CV binary contents to the AI prompt, has no CV download endpoint, and does not return a public per-job failure message. Deleting a job submission does not automatically delete the saved analysis. The AI analysis GET route currently requires a backend ownership/security review. Account edits might be overwritten by Keycloak synchronization.

## Architecture

- `src/app/` — application composition, providers, configuration and a repository-backed mock data source.
- `src/routes/` — routing and authenticated-route guard.
- `src/features/` — `auth`, `users`, `candidate-contexts`, and `jobs` (includes analysis).
- `src/features/*/presentation/` — pages and hooks.
- `src/features/*/application/` — use cases and orchestration.
- `src/features/*/domain/` — business models and repository contracts.
- `src/features/*/infrastructure/` — HTTP repositories and DTO mappings.
- `src/components/` — shared presentational UI and shell.
- `src/networks/` — generic Axios client, URL definitions, API errors.
- `src/utils/` — pure helpers.
- `tests/` — shared test setup and MSW test handlers.

Dependencies are selected in `src/app/dependencies.ts`; the same contracts work against HTTP implementations or the development mock store. Features should not import other features' private infrastructure. Domain contracts never import the HTTP client.

## Libraries

React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios, keycloak-js, React Hook Form, Zod, Lucide React, Vitest, React Testing Library and MSW.

The current UI uses small local reusable components styled with Tailwind/CSS that follow the Figma palette; `components.json` is configured for **optional** shadcn/ui component additions. This scaffold does **not** claim to include the entire shadcn/ui component library.

## Before production release

Resolve server-side identity mapping and ownership authorization, audit public endpoints, verify authentication across reload/refresh, implement suitable request-error reporting, test API responses against real Java services, add E2E tests, and configure build-time environment values in your deployment. Do not treat mock analysis or local developer identity settings as production solutions.

## Source design

Figma: https://www.figma.com/design/TlqNS7H8eS6y3poiiImCV9/Java-System-Architecture

All UI code is original React implementation inspired by the Figma structure and tokens; static Figma boards are not embedded as images.
