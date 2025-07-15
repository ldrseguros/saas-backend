/*
  Warnings:

  - A unique constraint covering the columns `[stripePriceId]` on the table `SubscriptionPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "stripePriceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_stripePriceId_key" ON "SubscriptionPlan"("stripePriceId");
