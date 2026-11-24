CREATE UNIQUE INDEX "team_members_one_active_captain_per_team"
  ON "team_members" ("teamId")
  WHERE "role" = 'CAPTAIN' AND "leftAt" IS NULL;
