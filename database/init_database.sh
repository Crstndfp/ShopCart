#!/usr/bin/env bash
# ============================================================================
# Database Migration & Initialization Script
# Runs all 5 versioned SQL scripts in strict sequential order
# ============================================================================

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-1433}"
DB_USER="${DB_USER:-sa}"
DB_PASSWORD="${DB_PASSWORD:-PentandraShopCart2026!}"

echo "=========================================================="
echo "Initializing ShopCart Database on ${DB_HOST}:${DB_PORT}..."
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find sqlcmd or use docker exec fallback
SQLCMD_BIN=""
if command -v sqlcmd &> /dev/null; then
    SQLCMD_BIN="sqlcmd"
elif [ -f "/opt/mssql-tools18/bin/sqlcmd" ]; then
    SQLCMD_BIN="/opt/mssql-tools18/bin/sqlcmd"
elif [ -f "/opt/mssql-tools/bin/sqlcmd" ]; then
    SQLCMD_BIN="/opt/mssql-tools/bin/sqlcmd"
fi

execute_sql_file() {
    local file_path="$1"
    local file_name="$(basename "$file_path")"
    echo ">> Executing: ${file_name}..."

    if [ -n "$SQLCMD_BIN" ]; then
        "$SQLCMD_BIN" -S "${DB_HOST},${DB_PORT}" -U "${DB_USER}" -P "${DB_PASSWORD}" -C -i "$file_path"
    else
        # Try running inside docker container if local sqlcmd not installed
        docker exec -i shopcart-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U "${DB_USER}" -P "${DB_PASSWORD}" -C < "$file_path"
    fi
}

execute_sql_file "${SCRIPT_DIR}/01_create_database_and_tables.sql"
execute_sql_file "${SCRIPT_DIR}/02_views.sql"
execute_sql_file "${SCRIPT_DIR}/03_functions.sql"
execute_sql_file "${SCRIPT_DIR}/04_stored_procedures.sql"
execute_sql_file "${SCRIPT_DIR}/05_seed_data.sql"

echo "=========================================================="
echo "ShopCart Database successfully initialized and seeded!"
echo "=========================================================="
