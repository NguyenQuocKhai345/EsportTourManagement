ALTER TYPE "TeamJoinRequestStatus" ADD VALUE 'ADDED';

ALTER TABLE "team_join_requests"
  ADD COLUMN "removedAt" TIMESTAMP(3),
  ADD COLUMN "removedById" INTEGER,
  ADD COLUMN "removalReason" TEXT;

ALTER TABLE "team_join_requests"
  ADD CONSTRAINT "team_join_requests_removedById_fkey"
  FOREIGN KEY ("removedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "team_join_requests_teamId_status_createdAt_idx"
  ON "team_join_requests"("teamId", "status", "createdAt");

CREATE INDEX "team_join_requests_teamId_userId_removedAt_idx"
  ON "team_join_requests"("teamId", "userId", "removedAt");
