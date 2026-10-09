# History transport seam

The MVP deliberately does not implement a production history transport. Job
Service depends on `CandidateContextClient`, so the User Service boundary is
explicit and no service reads another service's database. The default adapter
uses HTTP (`GET /users/{userId}/candidate-contexts/{contextId}`), which keeps
ownership and failure handling visible while retaining a replaceable seam.

Before production, compare this adapter with enriched RabbitMQ messages for
freshness, message size, retry behavior, and security. A shared database is
explicitly deferred because it creates ownership and deployment coupling.
