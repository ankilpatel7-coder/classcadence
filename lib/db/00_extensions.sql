-- Run FIRST, before the table migration: the schema uses citext columns and
-- gen_random_uuid() defaults, both of which need these extensions present.
create extension if not exists "pgcrypto";
create extension if not exists "citext";
