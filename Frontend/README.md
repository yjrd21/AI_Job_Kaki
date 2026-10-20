# JobKaki Frontend

## LLD

![JobKaki frontend low-level design](docs/images/frontend-lld.png)

[View the LLD in Figma](https://www.figma.com/design/TlqNS7H8eS6y3poiiImCV9/Java-System-Architecture?node-id=339-170)

The diagram summarises the shared request and response flow for jobs, accounts and candidate profiles, with authentication as a supporting flow.

## Layers and responsibilities

The frontend uses application-wide Clean Architecture, organised by layer rather than feature.

| Layer | Directory | Responsibility |
| --- | --- | --- |
| Entities | `src/domain` | Define frontend models independently of UI frameworks and external services. |
| Use cases | `src/application` | Coordinate application operations and declare controller, repository, presenter and client contracts. |
| Interface adapters | `src/adapters` | Validate input through controllers, format output through presenters, implement repositories and authentication clients, and connect React views through hooks and containers. |
| Frameworks and drivers | `src/infrastructure` | Configure Axios transport, Keycloak SDK, React Query, environment values and provider assembly. |

Domain and application code remain independent of React, Axios and Keycloak. Outer implementations depend on application contracts; ESLint enforces the dependency boundaries.

[`src/app/dependencies.ts`](src/app/dependencies.ts) constructs concrete dependencies and injects them into controllers and use cases through [`createApplication.ts`](src/app/createApplication.ts).

## Example flow: Job Submission

![JobKaki frontend job submission sequence](docs/images/job-submission-sequence.png)

[View the sequence in Figma](https://www.figma.com/design/TlqNS7H8eS6y3poiiImCV9/Java-System-Architecture?node-id=331-170)

1. The user supplies job text or a LinkedIn URL and selects a candidate profile.
2. The React hook forwards the input to `JobController`, which validates it and invokes the application use case.
3. The use case calls `JobRepositoryContract`. Its `HttpJobRepository` implementation sends the request through the authenticated Axios transport.
4. The use case passes the response to `JobPresenter`, which prepares display data returned through the controller to React Query.
5. On the results page, `useJob` polls while the status is `PENDING` or `PROCESSING`. When `COMPLETED`, `useAnalysis` retrieves the report using its analysis ID.
6. A `FAILED` submission stops polling and displays recovery guidance. Request failures remain React Query errors; CV issues prompt a profile update, while job-source issues prompt pasted job text.

## Routing

Routes are defined in [`src/adapters/views/routes/index.tsx`](src/adapters/views/routes/index.tsx) using React Router.

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

## Setup

Install Node.js and npm, and start the [backend and its dependencies](../Backend/README.md#setup-and-running-locally).

Configure a public Keycloak client for Authorization Code with PKCE S256, redirect URIs of `http://localhost:5173/*`, and Web Origins of `http://localhost:5173`.

Create `.env.local` in the frontend root:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_KEYCLOAK_URL=http://localhost:8084
VITE_KEYCLOAK_REALM=jobkaki-oauth2
VITE_KEYCLOAK_CLIENT_ID=oauth2-pkce-client
```

This file is excluded from Git. `VITE_*` values are embedded in the browser bundle and must not contain secrets.

From the repository root:

```sh
cd Frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Restart Vite after changing environment values.
