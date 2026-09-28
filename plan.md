# Fitness Activity Recommendation Direction

## Problem

The current application accepts a broad activity enum and an unstructured `Map<String, Object>` metrics field, then sends only the current activity to the AI service. The desired product direction is a focused fitness progression assistant for running and weight training that recommends what the user should try next week using today's activity and historical activity data.

## Proposed approach

1. Narrow the domain to `RUNNING` and `WEIGHT_TRAINING`.
2. Replace the loosely named `additionalMetrics` contract with a consistently named `metrics` contract.
3. Define typed, validated request models:
   - Running: distance in kilometres, pace, and optional elevation.
   - Weight training: exercises containing exercise name and ordered sets, with reps and weight in kilograms, plus derived total volume per exercise where appropriate.
4. Decide whether persistence uses a polymorphic Mongo document, a normalized metric subdocument, or a controlled JSON representation while preserving compatibility with existing records.
5. Update activity request/response models, persistence mapping, RabbitMQ payloads, and the AI service’s activity model together so serialization remains compatible across services.
6. Redesign the AI prompt to:
   - distinguish running progression from weight-training progression;
   - summarize today’s activity and relevant history;
   - request a concrete, safe next-week target;
   - separate recommendation, rationale, suggested target, and safety/uncertainty notes.
7. Add a history-data design gate before implementation:
   - compare AI-service API lookup, RabbitMQ message enrichment, and direct shared-database access;
   - assess coupling, freshness, message size, failure behavior, ownership, and security;
   - select one approach after review.
8. Persist the generated recommendation in the existing recommendation flow and add focused tests for validation, serialization, prompt construction, and recommendation retrieval.

## Scope

### In scope

- Activity type reduction to running and weight training.
- Typed input contracts and validation.
- Running and weight-training metric schemas.
- Metric naming and API/database/message consistency.
- AI prompt and recommendation shape for next-week progression.
- History integration design comparison and a follow-up implementation seam.
- Migration/compatibility handling for existing activity documents.
- Unit/integration tests for the changed surfaces.

### Out of scope until the history decision

- Choosing and implementing the production transport for historical activities.
- Frontend form design and client-side workout logging UX.
- Coaching features beyond recommendations based on recorded activity.
- Replacing the existing messaging infrastructure.

## Key files/components to change

- `activityservice`:
  - `model/ActivityType.java`
  - `model/Activity.java`
  - `dto/ActivityRequest.java`
  - `dto/ActivityResponse.java`
  - new typed metric DTOs and validators
  - `service/ActivityService.java`
  - `controller/ActivityController.java`
  - `repository/ActivityRepository.java` if history queries need date/type/limit support
- `aiservice`:
  - `model/Activity.java`
  - `service/ActivityAIService.java`
  - `service/ActivityMessageListener.java`
  - `service/RecommendationService.java` and `model/Recommendation.java` as needed for the new response shape
  - a history client or enriched message contract after the decision gate
- Tests:
  - activity request validation and mapping
  - RabbitMQ serialization/deserialization
  - prompt construction for both activity types
  - history selection and recommendation persistence

## Decisions and considerations

- Use `metrics` consistently instead of `additionalMetrics`; avoid the capitalized `Metrics` property name.
- Prefer immutable/typed nested DTOs for exercise sets and running metrics, with Bean Validation constraints such as positive duration, distance, reps, and non-negative weight/elevation.
- Treat total weight-training volume as a derived value (`sum(reps * weightKg)`) rather than trusting a client-supplied total; decide whether to expose it in responses and prompts.
- Define how pace is represented (for example, seconds per kilometre or a normalized duration/distance value) before implementing validation.
- Define the history window and ordering for “today + history” before implementing the AI prompt.
- Preserve old Mongo records through a compatibility/migration strategy rather than silently dropping fields.
- Ensure AI failures and malformed responses are logged and surfaced according to existing service conventions; do not silently fall back to an empty recommendation.

## Next step

Review the history transport comparison and decide:

1. AI service calls activity service for recent history.
2. Activity service enriches the RabbitMQ event with history.
3. AI service reads the activity database directly.

After that decision, implement the contracts and prompt end to end, then validate with targeted tests and a service build.
