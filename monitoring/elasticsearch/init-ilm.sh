#!/bin/sh
set -eu

ES_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
RETENTION_DAYS="${LOG_RETENTION_DAYS:-15}"

echo "Aguardando Elasticsearch em ${ES_URL}..."
until curl -fsS "${ES_URL}/_cluster/health" >/dev/null; do
  sleep 2
done

echo "Criando/atualizando ILM policy zaccess-logs-policy (${RETENTION_DAYS} dias)..."
curl -fsS -X PUT "${ES_URL}/_ilm/policy/zaccess-logs-policy" \
  -H "Content-Type: application/json" \
  -d "{
    \"policy\": {
      \"phases\": {
        \"hot\": {
          \"actions\": {}
        },
        \"delete\": {
          \"min_age\": \"${RETENTION_DAYS}d\",
          \"actions\": {
            \"delete\": {}
          }
        }
      }
    }
  }"

echo "ILM configurado com sucesso."
