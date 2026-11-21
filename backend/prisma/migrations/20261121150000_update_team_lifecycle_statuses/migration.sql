ALTER TYPE "TeamStatus" RENAME TO "TeamStatus_old";

CREATE TYPE "TeamStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'DISBANDED'
);

ALTER TABLE "teams"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "teams"
  ALTER COLUMN "status" TYPE "TeamStatus"
  USING (
    CASE "status"::text
      WHEN 'ACTIVE' THEN 'ACCEPTED'
      WHEN 'DISBANDED' THEN 'DISBANDED'
    END
  )::"TeamStatus";

ALTER TABLE "teams"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "TeamStatus_old";
