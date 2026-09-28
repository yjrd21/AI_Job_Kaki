#!/usr/bin/env bash

set -u

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
pids=()
rabbitmq_container="fitness-rabbitmq"
rabbitmq_started_by_script=false

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required to run RabbitMQ." >&2
    exit 1
fi

if docker container inspect "$rabbitmq_container" >/dev/null 2>&1; then
    if [ "$(docker container inspect -f '{{.State.Running}}' "$rabbitmq_container")" != "true" ]; then
        docker start "$rabbitmq_container" >/dev/null || {
            echo "Failed to start RabbitMQ container '$rabbitmq_container'." >&2
            exit 1
        }
        rabbitmq_started_by_script=true
    fi
else
    docker run --detach \
        --name "$rabbitmq_container" \
        --publish 5672:5672 \
        --publish 15672:15672 \
        rabbitmq:4-management >/dev/null || {
            echo "Failed to start RabbitMQ container '$rabbitmq_container'." >&2
            exit 1
        }
    rabbitmq_started_by_script=true
fi

cleanup() {
    trap - TERM INT EXIT
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    if [ "$rabbitmq_started_by_script" = true ]; then
        docker stop "$rabbitmq_container" >/dev/null 2>&1 || true
    fi
}

trap cleanup TERM INT EXIT

# Microservice #1: Eureka Infrastructure registry service.
(
    cd "$ROOT/eureka" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Microservice #2: User micro service.
(
    cd "$ROOT/userservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Microservice #3: Job micro service.
(
    cd "$ROOT/jobservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Infrastructure service #4: RabbitMQ infrastructure service in Docker container.

# Microservice #5: AI microservice service.
(
    cd "$ROOT/aiservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

wait
