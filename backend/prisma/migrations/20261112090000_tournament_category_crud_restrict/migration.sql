-- Preserve teams and stages if a category or tournament is removed.
ALTER TABLE "categories" DROP CONSTRAINT "categories_tournamentId_fkey";
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teams" DROP CONSTRAINT "teams_categoryId_fkey";
ALTER TABLE "teams"
  ADD CONSTRAINT "teams_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stages" DROP CONSTRAINT "stages_categoryId_fkey";
ALTER TABLE "stages"
  ADD CONSTRAINT "stages_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rule documents are owned by the rules module and must not be cascaded away.
ALTER TABLE "rule_documents" DROP CONSTRAINT "rule_documents_tournamentId_fkey";
ALTER TABLE "rule_documents"
  ADD CONSTRAINT "rule_documents_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rule_documents" DROP CONSTRAINT "rule_documents_categoryId_fkey";
ALTER TABLE "rule_documents"
  ADD CONSTRAINT "rule_documents_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
