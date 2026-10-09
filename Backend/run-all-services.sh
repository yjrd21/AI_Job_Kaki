#!/usr/bin/env bash

set -u

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
pids=()
started_containers=()
rabbitmq_container="jobkaki-rabbitmq"
keycloak_container="jobkaki-keycloak"
postgres_container="jobkaki-postgres"
mongodb_container="jobkaki-mongodb"

read_env_value() {
    local env_file="$1"
    local key="$2"

    [ -r "$env_file" ] || return 0
    awk -v key="$key" '
        index($0, "=") {
            separator = index($0, "=")
            name = substr($0, 1, separator - 1)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
            if (name == key) {
                value = substr($0, separator + 1)
                sub(/\r$/, "", value)
                gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
                if ((substr(value, 1, 1) == "\"" && substr(value, length(value), 1) == "\"") ||
                    (substr(value, 1, 1) == "\047" && substr(value, length(value), 1) == "\047")) {
                    value = substr(value, 2, length(value) - 2)
                }
                print value
                exit
            }
        }
    ' "$env_file"
}

rabbitmq_username="${RABBITMQ_USERNAME:-$(read_env_value "$ROOT/jobservice/.env" RABBITMQ_USERNAME)}"
rabbitmq_username="${rabbitmq_username:-guest}"
rabbitmq_password="${RABBITMQ_PASSWORD:-$(read_env_value "$ROOT/jobservice/.env" RABBITMQ_PASSWORD)}"
rabbitmq_password="${rabbitmq_password:-guest}"
rabbitmq_port="${RABBITMQ_PORT:-$(read_env_value "$ROOT/jobservice/.env" RABBITMQ_PORT)}"
rabbitmq_port="${rabbitmq_port:-5672}"
rabbitmq_host="${RABBITMQ_HOST:-$(read_env_value "$ROOT/jobservice/.env" RABBITMQ_HOST)}"
rabbitmq_host="${rabbitmq_host:-localhost}"

port_in_use() {
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

cleanup() {
    trap - TERM INT EXIT
    for pid in ${pids[@]+"${pids[@]}"}; do
        kill "$pid" 2>/dev/null || true
    done
    for container in ${started_containers[@]+"${started_containers[@]}"}; do
        docker stop "$container" >/dev/null 2>&1 || true
    done
}

trap cleanup TERM INT EXIT

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required to run the infrastructure containers." >&2
    exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required to check service readiness." >&2
    exit 1
fi

postgres_db="${POSTGRES_DB:-jobkaki_user_db}"
postgres_user="${DATABASE_USERNAME:-$(read_env_value "$ROOT/userservice/.env" DATABASE_USERNAME)}"
postgres_user="${postgres_user:-${POSTGRES_USER:-postgres}}"
postgres_password="${DATABASE_PASSWORD:-$(read_env_value "$ROOT/userservice/.env" DATABASE_PASSWORD)}"
postgres_password="${postgres_password:-${POSTGRES_PASSWORD:-postgres}}"
database_url="${DATABASE_URL:-$(read_env_value "$ROOT/userservice/.env" DATABASE_URL)}"
database_url="${database_url:-jdbc:postgresql://localhost:${POSTGRES_PORT:-5432}/${postgres_db}}"
database_url_path="${database_url#jdbc:postgresql://}"
database_authority="${database_url_path%%/*}"
database_host="${database_authority%%:*}"
if [[ "$database_authority" == *:* ]]; then
    database_port="${database_authority##*:}"
else
    database_port="${POSTGRES_PORT:-5432}"
fi
database_name="${database_url_path#*/}"
database_name="${database_name%%\?*}"

if { [ "$database_host" = "localhost" ] || [ "$database_host" = "127.0.0.1" ]; } &&
   [ "$(docker container inspect -f '{{.State.Running}}' "$postgres_container" 2>/dev/null || true)" != "true" ] &&
   port_in_use "$database_port"; then
    echo "Port $database_port is already in use; assuming a local PostgreSQL is running and skipping the container."
elif [ "$database_host" = "localhost" ] || [ "$database_host" = "127.0.0.1" ]; then
    postgres_db="${database_name:-$postgres_db}"
    if docker container inspect "$postgres_container" >/dev/null 2>&1; then
        if [ "$(docker container inspect -f '{{.State.Running}}' "$postgres_container")" != "true" ]; then
            docker start "$postgres_container" >/dev/null || {
                echo "Failed to start PostgreSQL container '$postgres_container'." >&2
                exit 1
            }
            started_containers+=("$postgres_container")
        fi
    else
        docker run --detach \
            --name "$postgres_container" \
            --publish "${database_port}:5432" \
            --env POSTGRES_DB="$postgres_db" \
            --env POSTGRES_USER="$postgres_user" \
            --env POSTGRES_PASSWORD="$postgres_password" \
            postgres:17-alpine >/dev/null || {
                echo "Failed to start PostgreSQL container '$postgres_container'." >&2
                exit 1
            }
        started_containers+=("$postgres_container")
    fi
    export DATABASE_URL="$database_url"
    export DATABASE_USERNAME="$postgres_user"
    export DATABASE_PASSWORD="$postgres_password"
fi

job_mongodb_uri="${MONGODB_JOB_URI:-$(read_env_value "$ROOT/jobservice/.env" MONGODB_JOB_URI)}"
job_mongodb_uri="${job_mongodb_uri:-mongodb://localhost:${MONGODB_PORT:-27017}/jobkaki_jobs}"
ai_mongodb_uri="${MONGODB_AI_URI:-$(read_env_value "$ROOT/aiservice/.env" MONGODB_AI_URI)}"
ai_mongodb_uri="${ai_mongodb_uri:-mongodb://localhost:${MONGODB_PORT:-27017}/jobkaki_ai}"

if [[ "$job_mongodb_uri" == mongodb://localhost:* || "$job_mongodb_uri" == mongodb://127.0.0.1:* ||
      "$ai_mongodb_uri" == mongodb://localhost:* || "$ai_mongodb_uri" == mongodb://127.0.0.1:* ]]; then
    mongodb_port="${MONGODB_PORT:-27017}"
    mongodb_uri_to_serve="$job_mongodb_uri"
    if [[ "$mongodb_uri_to_serve" != mongodb://localhost:* && "$mongodb_uri_to_serve" != mongodb://127.0.0.1:* ]]; then
        mongodb_uri_to_serve="$ai_mongodb_uri"
    fi
    mongodb_authority="${mongodb_uri_to_serve#mongodb://}"
    mongodb_authority="${mongodb_authority#*@}"
    mongodb_authority="${mongodb_authority%%/*}"
    if [[ "$mongodb_authority" == *:* ]]; then
        mongodb_port="${mongodb_authority##*:}"
    fi
    if docker container inspect "$mongodb_container" >/dev/null 2>&1; then
        if [ "$(docker container inspect -f '{{.State.Running}}' "$mongodb_container")" != "true" ]; then
            docker start "$mongodb_container" >/dev/null || {
                echo "Failed to start MongoDB container '$mongodb_container'." >&2
                exit 1
            }
            started_containers+=("$mongodb_container")
        fi
    else
        docker run --detach \
            --name "$mongodb_container" \
            --publish "${mongodb_port}:27017" \
            mongo:8 --bind_ip_all >/dev/null || {
                echo "Failed to start MongoDB container '$mongodb_container'." >&2
                exit 1
            }
        started_containers+=("$mongodb_container")
    fi
fi

if docker container inspect "$rabbitmq_container" >/dev/null 2>&1; then
    if [ "$(docker container inspect -f '{{.State.Running}}' "$rabbitmq_container")" != "true" ]; then
        docker start "$rabbitmq_container" >/dev/null || {
            echo "Failed to start RabbitMQ container '$rabbitmq_container'." >&2
            exit 1
        }
        started_containers+=("$rabbitmq_container")
    fi
else
    docker run --detach \
        --name "$rabbitmq_container" \
        --publish "${rabbitmq_port}:5672" \
        --publish 15672:15672 \
        --env RABBITMQ_DEFAULT_USER="$rabbitmq_username" \
        --env RABBITMQ_DEFAULT_PASS="$rabbitmq_password" \
        rabbitmq:4-management >/dev/null || {
            echo "Failed to start RabbitMQ container '$rabbitmq_container'." >&2
            exit 1
        }
    started_containers+=("$rabbitmq_container")
fi

if docker container inspect "$keycloak_container" >/dev/null 2>&1; then
    if [ "$(docker container inspect -f '{{.State.Running}}' "$keycloak_container")" != "true" ]; then
        docker start "$keycloak_container" >/dev/null || {
            echo "Failed to start Keycloak container '$keycloak_container'." >&2
            exit 1
        }
        started_containers+=("$keycloak_container")
    fi
else
    docker run --detach \
        --name "$keycloak_container" \
        -p 127.0.0.1:8084:8080 \
        -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
        -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
        quay.io/keycloak/keycloak:26.7.4 start-dev >/dev/null || {
            echo "Failed to start Keycloak container '$keycloak_container'." >&2
            exit 1
        }
    started_containers+=("$keycloak_container")
fi

export MONGODB_JOB_URI="$job_mongodb_uri"
export MONGODB_AI_URI="$ai_mongodb_uri"
export RABBITMQ_HOST="$rabbitmq_host"
export RABBITMQ_PORT="$rabbitmq_port"
export RABBITMQ_USERNAME="$rabbitmq_username"
export RABBITMQ_PASSWORD="$rabbitmq_password"
export EUREKA_SERVER_URL="${EUREKA_SERVER_URL:-http://localhost:8761/eureka/}"
export CONFIG_SERVER_URL="${CONFIG_SERVER_URL:-http://localhost:8888}"

wait_for_container() {
    local container="$1"
    local ready=false

    for _ in $(seq 1 60); do
        case "$container" in
            "$postgres_container")
                if docker exec "$container" pg_isready -q -U "$postgres_user" -d "$postgres_db"; then
                    ready=true
                fi
                ;;
            "$mongodb_container")
                if docker exec "$container" mongosh --quiet --eval 'db.adminCommand("ping").ok' 2>/dev/null | grep -q '^1$'; then
                    ready=true
                fi
                ;;
            "$rabbitmq_container")
                if docker exec "$container" rabbitmq-diagnostics -q ping >/dev/null 2>&1; then
                    ready=true
                fi
                ;;
        esac
        if [ "$ready" = true ]; then
            echo "$container is ready."
            return 0
        fi
        sleep 1
    done

    echo "Infrastructure container '$container' did not become ready within 60 seconds." >&2
    return 1
}

if [ "$(docker container inspect -f '{{.State.Running}}' "$postgres_container" 2>/dev/null || true)" = "true" ]; then
    wait_for_container "$postgres_container" || exit 1
fi
if [ "$(docker container inspect -f '{{.State.Running}}' "$mongodb_container" 2>/dev/null || true)" = "true" ]; then
    wait_for_container "$mongodb_container" || exit 1
fi
wait_for_container "$rabbitmq_container" || exit 1
echo "Waiting for Keycloak to become available on http://localhost:8084 ..."
keycloak_ready=false
for _ in $(seq 1 60); do
    if curl --silent --fail --output /dev/null \
        "http://localhost:8084/realms/master/.well-known/openid-configuration"; then
        keycloak_ready=true
        break
    fi
    sleep 1
done

if [ "$keycloak_ready" = true ]; then
    echo "Keycloak is up."
else
    echo "Keycloak did not become ready within 60 seconds; stopping." >&2
    exit 1
fi

# Infrastructure: Config server. All other services pull their externalized
# configuration from this service, so it must be serving config before they start.
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
    echo "Config server did not become ready within 60 seconds; stopping." >&2
    exit 1
fi

# Infrastructure: Eureka service registry.
(
    cd "$ROOT/eureka" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

echo "Waiting for Eureka to become available on http://localhost:8761 ..."
eureka_ready=false
for _ in $(seq 1 60); do
    if curl --silent --fail --output /dev/null -H "Accept: application/json" "http://localhost:8761/eureka/apps"; then
        eureka_ready=true
        break
    fi
    sleep 1
done

if [ "$eureka_ready" = true ]; then
    echo "Eureka is up."
else
    echo "Eureka did not become ready within 60 seconds; stopping." >&2
    exit 1
fi

# Infrastructure: API gateway routes traffic to backend services via Eureka.
(
    cd "$ROOT/gateway" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Microservice: User service.
(
    cd "$ROOT/userservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Microservice: Job service.
(
    cd "$ROOT/jobservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

# Microservice: AI service.
(
    cd "$ROOT/aiservice" || exit 1
    exec ./mvnw spring-boot:run
) &
pids+=("$!")

wait
