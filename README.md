# JobKaki

## User Journey Demo

> **Video coming soon.**
>
> A walkthrough of signing in, creating a candidate profile, uploading a CV, submitting a job, and reviewing the analysis.

<!-- Replace this placeholder with the user-journey recording or a link to the video. -->

JobKaki helps candidates compare a job opportunity with their CV, target roles, work preferences, and deal-breakers. It turns a repetitive manual evaluation process into a reusable workflow, producing requirement matches, potential concerns, and questions to clarify before applying.

## Personal Motivation

- Broaden my development experience beyond iOS through Java, Spring Boot, and React.
- Apply system design concepts in a practical, public project.
- Showcase my engineering work, as most of my professional projects are covered by NDAs.

## Project Context

- During my job hunt, I used ChatGPT to evaluate how well job postings matched my experience and career priorities.
- Each evaluation considered my CV, preferred roles, work preferences, and deal-breakers.

## Problem Statement

- Evaluating each new posting meant manually resubmitting the same prompt, CV, and career preferences.
- Existing tools on the market had usage limits, costs, or features I did not need.
- I needed a way to reuse this information and evaluate more jobs with less manual effort.

## Core Features

- Sign in and complete account onboarding.
- Create candidate profiles containing a CV, target roles, preferences, and red flags.
- Submit a public LinkedIn job URL or paste a job description.
- Compare concrete job requirements with evidence from the attached CV.
- View analysis progress, completed reports, and submission history.
- Receive actionable failure messages when the job content or CV cannot be used.

## System Architecture

The [system architecture in Figma](https://www.figma.com/design/TlqNS7H8eS6y3poiiImCV9/Java-System-Architecture?node-id=41-30) is the visual reference for services and infrastructure.

For low-level design, read the [frontend README](Frontend/README.md) and [backend README](Backend/README.md).

## Key Architectural Decisions and Tradeoffs

| Architectural Decision | Rationale | Tradeoffs |
| --- | --- | --- |
| **Microservices with service-owned data** | • Clear ownership of users, job submissions, and AI analysis.<br>• Flexibility to deploy and scale services independently. | • More configuration, network dependencies, and operational overhead.<br>• A modular monolith would be simpler at this scale. |
| **Feature-based Clean Architecture frontend** | • Experiment with explicit boundaries between UI, application logic, business models, and networking.<br>• Support future frontend expansion. | • Additional boilerplate and learning curve.<br>• Simple changes span multiple files.<br>• Limited benefit from some abstractions at the current scale. |
| **Asynchronous analysis through RabbitMQ** | • Let users continue using the application while analysis runs in the background.<br>• Decouple analysis requests from a specific application instance.<br>• Support expansion into multiple AI workers sharing a workload or specialised agents consuming separate queues.<br>• Buffer bursts of submissions when workers are busy. | • Additional infrastructure to configure and maintain.<br>• Queue backlogs increase waiting times.<br>• Processing capacity remains constrained by workers and external API limits.<br>• Database writes and message publication can fail separately. |
| **Authentication delegated to Keycloak** | • Delegate login and token issuance to a dedicated identity provider.<br>• Use Authorization Code + PKCE for browser login.<br>• Validate JWTs at the gateway. | • Additional infrastructure and configuration.<br>• Application users must remain aligned with identity records.<br>• Resource ownership requires separate authorization checks. |
| **API Gateway as a single entry point** | • Give the frontend one API endpoint.<br>• Centralise routing, token validation, and user synchronisation.<br>• Support future scaling through multiple gateway instances behind a load balancer. | • The current single gateway instance is a potential bottleneck and single point of failure.<br>• Gateway replication, rate limiting, and load testing remain future work.<br>• Additional network hop.<br>• User synchronisation couples requests to the User Service. |
| **PostgreSQL and MongoDB persistence** | • Use PostgreSQL for relational user records.<br>• Use MongoDB for job submissions and nested analysis documents. | • Multiple database technologies to operate and maintain.<br>• A single database technology could meet the MVP’s needs. |
| **Eureka service discovery** | • Route using service names rather than fixed instance addresses.<br>• Support changing service locations and adding replicas. | • Additional infrastructure and discovery complexity.<br>• Static addresses would be simpler for local deployment. |
| **Centralised configuration with Config Server** | • Manage service configuration in one place.<br>• Reduce configuration scattered across applications. | • Introduce a startup dependency.<br>• Configuration changes can affect multiple services.<br>• Secret management requires separate consideration. |
