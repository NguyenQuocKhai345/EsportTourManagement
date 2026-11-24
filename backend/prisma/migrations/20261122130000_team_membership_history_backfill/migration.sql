-- Existing roster rows predate join history. Their original join path/actor is unknown,
-- so preserve the membership interval without assigning a reviewer.
INSERT INTO "team_join_requests" (
  "teamId",
  "userId",
  "status",
  "decidedAt",
  "removedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  member."teamId",
  member."userId",
  'ADDED'::"TeamJoinRequestStatus",
  member."joinedAt",
  member."leftAt",
  member."joinedAt",
  member."updatedAt"
FROM "team_members" AS member
WHERE NOT EXISTS (
  SELECT 1
  FROM "team_join_requests" AS history
  WHERE history."teamId" = member."teamId"
    AND history."userId" = member."userId"
    AND history."status" IN ('ACCEPTED', 'ADDED')
    AND history."createdAt" = member."joinedAt"
);

CREATE UNIQUE INDEX "team_join_requests_one_pending_per_user_idx"
  ON "team_join_requests"("teamId", "userId")
  WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "team_join_requests_one_active_membership_idx"
  ON "team_join_requests"("teamId", "userId")
  WHERE "removedAt" IS NULL AND "status" IN ('ACCEPTED', 'ADDED');
