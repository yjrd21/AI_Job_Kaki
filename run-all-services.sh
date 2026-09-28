#!/usr/bin/env bash

set -u

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
pids=()
rabbitmq_container="jobkaki-rabbitmq"
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

# Infrastructure service #1: Config server. All other services pull their
# externalized configuration (spring.config.import: configserver:...) from
# this service, so it must be up and serving config before they start.
(
    cd "$ROOT/configserver" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

echo "Waiting for config server to become available on http://localhost:8888 ..."
config_server_ready=false
for _ in $(seq 1 60); do
    if curl --silent --fail --output /dev/null "http://localhost:8888/user-service/default"; then
        config_server_ready=true
        break
    fi
    sleep 1
done

if [ "$config_server_ready" = true ]; then
    echo "Config server is up."
else
    echo "Warning: config server did not become ready in time; continuing anyway." >&2
fi

# Microservice #2: Eureka Infrastructure registry service.
(
    cd "$ROOT/eureka" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Microservice #3: User micro service.
(
    cd "$ROOT/userservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Microservice #4: Job micro service.
(
    cd "$ROOT/jobservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Infrastructure service #5: RabbitMQ infrastructure service in Docker container.

# Microservice #6: AI microservice service.
(
    cd "$ROOT/aiservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

wait
