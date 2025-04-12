-- Database
-- CREATE DATABASE "crss_api";

-- Enums
CREATE TYPE link AS ENUM('website', 'bluesky', 'mastodon', 'github', 'twitch', 'youtube', 'other');

-- Tables
CREATE TABLE "roles" (
  "id" BIGINT PRIMARY KEY,
  "name" VARCHAR(64) NOT NULL UNIQUE,
  "permissions" BIGINT NOT NULL,
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
  "id" BIGINT PRIMARY KEY,
  "discord_id" BIGINT NOT NULL UNIQUE,
  "username" VARCHAR(32) NOT NULL UNIQUE,
  "display_name" VARCHAR(64) NOT NULL,
  "email" VARCHAR(320) NOT NULL UNIQUE,
  "avatar" CHAR(40),
  "banner" CHAR(40),
  "accent_color" INT,
  "role" BIGINT NOT NULL REFERENCES roles(id),
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "sessions" (
  "id" BIGINT PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES users(id),
  "access_token" VARCHAR(512) NOT NULL UNIQUE,
  "refresh_token" VARCHAR(512) NOT NULL UNIQUE,
  "user_agent" VARCHAR(256) NOT NULL,
  "expires" TIMESTAMP NOT NULL,
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Team Tables
CREATE TABLE "team_members" (
  "id" BIGINT PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES users(id),
  "bio" TEXT,
  "role" VARCHAR(32) NOT NULL,
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "team_links" (
  "id" BIGINT PRIMARY KEY,
  "member_id" BIGINT NOT NULL REFERENCES users(id),
  "type" LINK NOT NULL,
  "url" TEXT NOT NULL,
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Special Tables
CREATE TABLE "config" (
  "key" VARCHAR(64) NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "servers" (
  "id" BIGINT PRIMARY KEY,
  "key" VARCHAR(64) NOT NULL UNIQUE, -- No reused keys!
  "ip" TEXT NOT NULL,
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Functions
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER "update_roles_timestamp" BEFORE UPDATE ON "roles" FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER "update_users_timestamp" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER "update_sessions_timestamp" BEFORE UPDATE ON "sessions" FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER "update_team_members_timestamp" BEFORE UPDATE ON "team_members" FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER "update_team_links_timestamp" BEFORE UPDATE ON "team_links" FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER "update_config_timestamp" BEFORE UPDATE ON "config" FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER "update_servers_timestamp" BEFORE UPDATE ON "servers" FOR EACH ROW EXECUTE FUNCTION update_timestamp();