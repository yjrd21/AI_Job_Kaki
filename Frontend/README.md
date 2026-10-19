# JobKaki Frontend

## LLD Architecture

> **Figma link coming soon.** Frontend low-level design covering feature layers and component interactions.

<!-- Replace this placeholder with the frontend LLD Figma link. -->

Features such as jobs, candidate profiles, and users separate responsibilities into four layers:

| Layer          | Responsibility                                    |
| -------------- | ------------------------------------------------- |
| Presentation   | Pages, forms, query hooks, and UI state           |
| Application    | Use cases that call repository contracts          |
| Domain         | Business models and repository interfaces         |
| Infrastructure | HTTP repositories, API DTOs, and response mapping |

Concrete repositories are wired in [`src/app/dependencies.ts`](src/app/dependencies.ts). Authentication and onboarding use a smaller presentation-focused structure.

## Job Submission Flow

```mermaid
---
config:
  theme: base
---
sequenceDiagram
    participant UI as Frontend Pages
    participant Q as Query Hooks
    participant API as API Gateway

    UI->>Q: useSubmitJob with job input and profile ID
    Q->>API: POST job submission
    API-->>Q: Submission ID and status
    Q-->>UI: Return submission ID and status
    UI->>UI: Navigate to /jobs/{jobId}

    loop Every 2.5 seconds while PENDING or PROCESSING
        Q->>API: useJob requests submission status
        API-->>Q: Current status and outcome
        Q-->>UI: Update displayed status
    end

    alt Status [COMPLETED]
        UI->>Q: Enable useAnalysis with jobAnalysisId
        Q->>API: GET saved analysis
        API-->>Q: Evaluation report
        Q-->>UI: Display report
    else Status [FAILED]
        Q-->>UI: Display error message and corrective action
    end
```

- **Happy flow:** Requests follow hooks → application use cases → HTTP repositories → shared Axios client. While the results page is open, `useJob` polls until `COMPLETED`, then `useAnalysis` fetches the report through the API using the analysis ID.
- **Failure flow:** `FAILED` stops polling and displays the error. LinkedIn retrieval failures prompt pasting the description; CV failures prompt a profile update.

## Authentication

- [`AuthProvider`](src/features/auth/presentation/AuthProvider.tsx) checks for an existing Keycloak session when the application loads.
- Login uses Authorization Code with PKCE S256 and returns to `/dashboard`.
- The token's `sub` identifies the signed-in user.
- The shared Axios client obtains an access token before each request, refreshing it if it expires within 30 seconds, and sends it as a bearer token.
- Logout ends the Keycloak session and returns to the application's root URL.

## Routing

Routes are defined in [`src/routes/index.tsx`](src/routes/index.tsx) using React Router.

| Route                  | Page                                  |
| ---------------------- | ------------------------------------- |
| `/login`               | Sign in                               |
| `/onboarding`          | Initial account and candidate setup   |
| `/dashboard`           | Overview and recent analyses          |
| `/analyse`             | Submit a job                          |
| `/jobs/:jobId`         | Submission status and analysis report |
| `/history`             | Job submission history                |
| `/profiles`            | Candidate profiles                    |
| `/profiles/new`        | Create a candidate profile            |
| `/profiles/:contextId` | Edit a candidate profile              |
| `/account`             | Account details                       |

- `Guard` waits for authentication and redirects signed-out users to `/login`.
- `OnboardingGate` checks the account's saved `onboardingCompleted` flag before showing the main application.
- `/onboarding` requires authentication but sits outside `OnboardingGate`.
- Unknown routes redirect to `/dashboard`, where the same access checks apply.

## Setup and Running Locally

The steps below describe how I run the frontend locally.

### Prerequisites

- Node.js and npm.
- A public Keycloak client configured for Authorization Code with PKCE S256, redirects to `http://localhost:5173/*`, and Web Origins of `http://localhost:5173`.

Create `.env` with values matching the backend and Keycloak configuration:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_KEYCLOAK_URL=http://localhost:8084
VITE_KEYCLOAK_REALM=jobkaki-oauth2
VITE_KEYCLOAK_CLIENT_ID=oauth2-pkce-client
```

This file is excluded from Git. `VITE_*` values are exposed to the browser, so they must not contain secrets.

From the repository root:

```sh
cd Frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Restart Vite after changing environment values.
