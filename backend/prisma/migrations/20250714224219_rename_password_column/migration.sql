-- migration.sql
ALTER TABLE "AuthAccount" RENAME COLUMN "password" TO "passwordHash";