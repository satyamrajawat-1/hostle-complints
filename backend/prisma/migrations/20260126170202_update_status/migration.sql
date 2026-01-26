/*
  Warnings:

  - You are about to drop the column `accessToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'REOPENED';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "accessToken";
