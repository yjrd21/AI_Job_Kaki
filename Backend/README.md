# JobKaki Backend

## LLD Architecture

> **Figma link coming soon.** Backend low-level design covering service layers and component interactions.

<!-- Replace this placeholder with the backend LLD Figma link. -->

## Job Analysis Processing

```mermaid
---
config:
  theme: base
  themeCSS: |
    rect.actor[name="JS"], rect.actor[name="US"], rect.actor[name="AS"] {
      fill: #dbeafe !important;
      stroke: #2563eb !important;
    }
    rect.actor[name="MQ"] {
      fill: #fef3c7 !important;
      stroke: #d97706 !important;
    }
    rect.actor[name="JDB"], rect.actor[name="PG"], rect.actor[name="ADB"] {
      fill: #dcfce7 !important;
      stroke: #16a34a !important;
    }
---
sequenceDiagram
    participant UI as Frontend via Gateway
    participant JS as Job Service
    participant JDB as Job MongoDB
    participant US as User Service
    participant PG as PostgreSQL
    participant MQ as RabbitMQ
    participant AS as AI Service
    participant ADB as AI MongoDB

    UI->>JS: Submit job and candidate profile ID
    JS->>JDB: Save Status [PENDING]
    JS->>US: Retrieve profile and CV
    US->>PG: Read candidate profile and CV
    PG-->>US: Candidate data
    US-->>JS: Candidate snapshot or retrieval error

    alt Preparation fails
        JS->>JDB: Save Status [FAILED] and error details
        JS-->>UI: Return Status [FAILED] and error details
    else Preparation succeeds
        JS->>MQ: Publish analysis request
        JS-->>UI: Return submission ID and Status [PENDING]

        MQ-->>AS: Deliver analysis request
        AS->>MQ: Publish Status [PROCESSING]
        MQ-->>JS: Consume Status [PROCESSING]
        JS->>JDB: Save Status [PROCESSING]
        AS->>AS: Resolve job content and evaluate with OpenAI

        alt Evaluation succeeds and passes validation
            AS->>ADB: Save evaluation
            AS->>MQ: Publish Status [COMPLETED] and analysis ID
            MQ-->>JS: Consume Status [COMPLETED] and analysis ID
            JS->>JDB: Save Status [COMPLETED] and analysis ID
        else Retrieval, AI, or validation fails
            AS->>ADB: Save failure receipt
            AS->>MQ: Publish Status [FAILED] and error details
            MQ-->>JS: Consume Status [FAILED] and error details
            JS->>JDB: Save Status [FAILED] and error details
        end

        UI->>JS: Poll submission status
        JS->>JDB: Read submission
        JDB-->>JS: Current status and outcome
        JS-->>UI: Status [COMPLETED] with analysis ID, or Status [FAILED] with message
    end
```




## Service Responsibilities and Data Ownership

| Service                        | Default port | Responsibility                                                                                  |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------- |
| API Gateway (`gateway`)        | 8080         | Authenticate browser API traffic, route requests through discovery, and synchronize local users |
| User Service (`userservice`)   | 8081         | Manage local users, onboarding state, candidate profiles, and original CV files                 |
| Job Service (`jobservice`)     | 8082         | Own submissions and statuses; assemble candidate/CV snapshots and publish analysis requests     |
| AI Service (`aiservice`)       | 8083         | Resolve job content, call the provider, validate results, and serve saved evaluations           |
| Config Server (`configserver`) | 8888         | Serve configuration from its `classpath:/config` native repository                              |
| Eureka (`eureka`)              | 8761         | Register application services for gateway discovery                                             |

Keycloak runs separately on port 8084 in the local launcher. PostgreSQL, MongoDB, and RabbitMQ are infrastructure dependencies, not application services.

| Owner        | Store                | Data                                                                                                                  |
| ------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| User Service | PostgreSQL           | Users, onboarding completion, candidate contexts, preference collections, and CV bytes in `bytea`                     |
| Job Service  | MongoDB job database | `job_submissions`: original job input, selected profile ID, lifecycle status, analysis ID, and public failure details |
| AI Service   | MongoDB AI database  | `job_analyses`: completed evaluations; `job_analysis_failures`: failure receipts keyed by submission ID               |

- Each service accesses only its own database.
- Local development can share one MongoDB server, with separate databases for Job Service and AI Service.

## Setup and Running Locally

The steps below describe how I run JobKaki locally. Secrets are stored in local `.env` files, which are excluded from Git and are not included in this repository.

### Prerequisites

- Java 20
- Docker
- Node.js and npm
- `curl`

Use the checked-in Maven Wrappers; a separate Maven installation is not required.

### 1. Start external dependencies

Ensure the following are running before starting the backend:

- **Keycloak and RabbitMQ:** Run through Docker.
- **PostgreSQL and MongoDB:** Run locally or through Docker.

### 2. Start the backend services

The services are located under `Backend/`:

| Group | Service directories |
|---|---|
| Configuration and discovery | `configserver/`, `eureka/` |
| API Gateway | `gateway/` |
| Application services | `userservice/`, `jobservice/`, `aiservice/` |

Open a separate terminal for each service and run the following command from its directory:

```sh
./mvnw spring-boot:run
```

Start Config Server and Eureka first. Once both are ready, start the gateway and application services.

### 3. Start the frontend

From the repository root:

```sh
cd Frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

| File                   | Configuration                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All four service files | `CONFIG_SERVER_URL=http://localhost:8888`, `EUREKA_SERVER_URL=http://localhost:8761/eureka/`                                                                                                               |
| `gateway/.env`         | `KEYCLOAK_ISSUER_URI=http://localhost:8084/realms/jobkaki-oauth2`, `CORS_ALLOWED_ORIGINS=http://localhost:5173`                                                                                            |
| `userservice/.env`     | `DATABASE_URL=jdbc:postgresql://localhost:5432/jobkaki_user_db`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`                                                                                                  |
| `jobservice/.env`      | `MONGODB_JOB_URI=mongodb://localhost:27017/jobkaki_jobs`, `MONGODB_JOB_DATABASE=jobkaki_jobs`, `USER_SERVICE_BASE_URL=http://localhost:8081`, plus RabbitMQ values below                                   |
| `aiservice/.env`       | `MONGODB_AI_URI=mongodb://localhost:27017/jobkaki_ai`, `MONGODB_AI_DATABASE=jobkaki_ai`, `OPENAI_API_KEY`, `OPENAI_API_BASE_URL=https://api.openai.com/v1`, `OPENAI_API_MODEL`, plus RabbitMQ values below |

Set these RabbitMQ values identically in Job Service and AI Service. They are an example local topology; names are configurable through Config Server.

```dotenv
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_EXCHANGE_NAME=jobkaki.exchange
RABBITMQ_ANALYSIS_QUEUE_NAME=jobkaki.analysis
RABBITMQ_STATUS_QUEUE_NAME=jobkaki.status
RABBITMQ_ANALYSIS_ROUTING_KEY=job.analysis
RABBITMQ_STATUS_ROUTING_KEY=job.status
```

`OPENAI_API_MODEL` must support the document-input and structured-output request used by `OpenAIService`. Do not place the provider key in frontend configuration. The broker must accept messages up to the application's 8 MiB limit.

