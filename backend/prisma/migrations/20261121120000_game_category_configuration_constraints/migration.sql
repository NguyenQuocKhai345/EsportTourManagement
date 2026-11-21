ALTER TABLE "categories"
  ADD CONSTRAINT "categories_roster_size_positive_check"
  CHECK ("minPlayers" > 0 AND "maxPlayers" > 0);

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_roster_size_order_check"
  CHECK ("minPlayers" <= "maxPlayers");

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_solo_roster_size_check"
  CHECK (
    "participationType" <> 'SOLO'
    OR ("minPlayers" = 1 AND "maxPlayers" = 1)
  );

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_max_teams_positive_check"
  CHECK ("maxTeams" IS NULL OR "maxTeams" > 0);
