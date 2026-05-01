#!/bin/bash
# Run this to set up the database
# Usage: DB_USER=postgres DB_PASSWORD=yourpassword bash setup.sh

DB_NAME="agri_marketplace_db"
DB_USER="${DB_USER:-postgres}"

echo "Creating database $DB_NAME..."
psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist"

echo "Running schema..."
psql -U "$DB_USER" -d "$DB_NAME" -f 01_schema.sql

echo "Running indexes..."
psql -U "$DB_USER" -d "$DB_NAME" -f 02_indexes.sql

echo "Running triggers and procedures..."
psql -U "$DB_USER" -d "$DB_NAME" -f 03_triggers_procedures.sql

echo "Applying migration fixes..."
psql -U "$DB_USER" -d "$DB_NAME" -f 04_migration_fixes.sql

echo "Database setup complete."
