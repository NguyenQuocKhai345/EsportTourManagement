-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationType" AS ENUM ('TEAM', 'SOLO');

-- CreateEnum
CREATE TYPE "TournamentRefereeStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'DISBANDED');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('CAPTAIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TeamJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AIReviewRecommendation" AS ENUM ('APPROVE', 'REVIEW', 'REJECT');

-- CreateEnum
CREATE TYPE "StageFormat" AS ENUM ('GROUP', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "MatchSlot" AS ENUM ('TEAM_ONE', 'TEAM_TWO');

-- CreateEnum
CREATE TYPE "AdvancementOutcome" AS ENUM ('WINNER', 'LOSER');

-- CreateEnum
CREATE TYPE "MatchRefereeStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'DECLINED', 'COMPLETED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ResultSubmissionStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ResultConfirmationStatus" AS ENUM ('CONFIRMED', 'DISPUTED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DisputeEventType" AS ENUM ('CREATED', 'EVIDENCE_ADDED', 'STATUS_CHANGED', 'COMMENT_ADDED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RatingSource" AS ENUM ('USER_PROVIDED', 'MATCH_RESULT', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SeedingRunStatus" AS ENUM ('DRAFT', 'FINALIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TOURNAMENT', 'REGISTRATION', 'TEAM', 'MATCH', 'RESULT', 'DISPUTE', 'SYSTEM');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" SERIAL NOT NULL,
    "organizerId" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "resultConfirmationHours" INTEGER NOT NULL DEFAULT 4,
    "generalRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "participationType" "ParticipationType" NOT NULL,
    "minPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxTeams" INTEGER,
    "eligibilityNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_referees" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "TournamentRefereeStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_eligibility_rules" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_documents" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" VARCHAR(100),
    "checksum" VARCHAR(128),
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_chunks" (
    "id" SERIAL NOT NULL,
    "ruleDocumentId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "captainId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tag" VARCHAR(20),
    "logoUrl" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_join_requests" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT,
    "status" "TeamJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "submittedById" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "application" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "rosterLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_roster_changes" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "change" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "registration_roster_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_ai_reviews" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "recommendation" "AIReviewRecommendation" NOT NULL,
    "summary" TEXT NOT NULL,
    "findings" JSONB,
    "modelName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_ai_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_candidate_ranking_runs" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "modelName" VARCHAR(100),
    "input" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_candidate_ranking_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_candidate_ranking_items" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "joinRequestId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_candidate_ranking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "format" "StageFormat" NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PLANNED',
    "config" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_groups" (
    "id" SERIAL NOT NULL,
    "stageId" INTEGER NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_standings" (
    "id" SERIAL NOT NULL,
    "stageId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "teamId" INTEGER NOT NULL,
    "rank" INTEGER,
    "played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreFor" INTEGER NOT NULL DEFAULT 0,
    "scoreAgainst" INTEGER NOT NULL DEFAULT 0,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "stageId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "round" INTEGER,
    "matchNumber" INTEGER,
    "teamOneId" INTEGER,
    "teamTwoId" INTEGER,
    "winnerTeamId" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" DATE,
    "scheduledStartAt" TIME(0),
    "scheduledEndAt" TIME(0),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "teamOneScore" INTEGER,
    "teamTwoScore" INTEGER,
    "bestOf" INTEGER,
    "resultConfirmationDeadline" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_referees" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "refereeId" INTEGER NOT NULL,
    "status" "MatchRefereeStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedById" INTEGER,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_advancements" (
    "id" SERIAL NOT NULL,
    "sourceMatchId" INTEGER NOT NULL,
    "destinationMatchId" INTEGER NOT NULL,
    "outcome" "AdvancementOutcome" NOT NULL,
    "destinationSlot" "MatchSlot" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_advancements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_games" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "teamOneScore" INTEGER,
    "teamTwoScore" INTEGER,
    "winnerTeamId" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_reschedules" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "previousDate" DATE,
    "previousStartAt" TIME(0),
    "previousEndAt" TIME(0),
    "newDate" DATE,
    "newStartAt" TIME(0),
    "newEndAt" TIME(0),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reschedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_result_submissions" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "submittedById" INTEGER NOT NULL,
    "teamOneScore" INTEGER NOT NULL,
    "teamTwoScore" INTEGER NOT NULL,
    "status" "ResultSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "note" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "match_result_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_result_confirmations" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "confirmedById" INTEGER NOT NULL,
    "status" "ResultConfirmationStatus" NOT NULL,
    "note" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_result_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "openedById" INTEGER NOT NULL,
    "resolvedById" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "decision" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" SERIAL NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" VARCHAR(255),
    "mimeType" VARCHAR(100),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_events" (
    "id" SERIAL NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "type" "DisputeEventType" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_ai_suggestions" (
    "id" SERIAL NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "modelName" VARCHAR(100),
    "summary" TEXT NOT NULL,
    "reasoning" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_ai_citations" (
    "id" SERIAL NOT NULL,
    "suggestionId" INTEGER NOT NULL,
    "ruleChunkId" INTEGER NOT NULL,
    "quote" TEXT,
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_ai_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_ratings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialRank" VARCHAR(100),
    "yearsPlaying" DOUBLE PRECISION,
    "matchesPlayed" INTEGER,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_history" (
    "id" SERIAL NOT NULL,
    "playerRatingId" INTEGER NOT NULL,
    "matchId" INTEGER,
    "previousRating" DOUBLE PRECISION,
    "newRating" DOUBLE PRECISION NOT NULL,
    "source" "RatingSource" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeding_runs" (
    "id" SERIAL NOT NULL,
    "stageId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "status" "SeedingRunStatus" NOT NULL DEFAULT 'DRAFT',
    "modelName" VARCHAR(100),
    "input" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "seeding_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeding_run_items" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "suggestedSeed" INTEGER,
    "finalSeed" INTEGER,
    "score" DOUBLE PRECISION,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seeding_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_predictions" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "predictedWinnerTeamId" INTEGER,
    "teamOneWinProbability" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "modelName" VARCHAR(100),
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "createdById" INTEGER,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "changes" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournaments_organizerId_status_idx" ON "tournaments"("organizerId", "status");

-- CreateIndex
CREATE INDEX "tournaments_startsAt_endsAt_idx" ON "tournaments"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "categories_gameId_idx" ON "categories"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tournamentId_name_key" ON "categories"("tournamentId", "name");

-- CreateIndex
CREATE INDEX "tournament_referees_userId_status_idx" ON "tournament_referees"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_referees_tournamentId_userId_key" ON "tournament_referees"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "category_eligibility_rules_categoryId_sortOrder_idx" ON "category_eligibility_rules"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "rule_documents_tournamentId_categoryId_idx" ON "rule_documents"("tournamentId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "rule_chunks_ruleDocumentId_chunkIndex_key" ON "rule_chunks"("ruleDocumentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "teams_captainId_idx" ON "teams"("captainId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_categoryId_name_key" ON "teams"("categoryId", "name");

-- CreateIndex
CREATE INDEX "team_members_userId_leftAt_idx" ON "team_members"("userId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "team_join_requests_teamId_status_idx" ON "team_join_requests"("teamId", "status");

-- CreateIndex
CREATE INDEX "team_join_requests_userId_status_idx" ON "team_join_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "registrations_status_submittedAt_idx" ON "registrations"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_teamId_key" ON "registrations"("teamId");

-- CreateIndex
CREATE INDEX "registration_roster_changes_registrationId_createdAt_idx" ON "registration_roster_changes"("registrationId", "createdAt");

-- CreateIndex
CREATE INDEX "registration_ai_reviews_registrationId_createdAt_idx" ON "registration_ai_reviews"("registrationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_candidate_ranking_runs_teamId_createdAt_idx" ON "ai_candidate_ranking_runs"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_candidate_ranking_items_runId_joinRequestId_key" ON "ai_candidate_ranking_items"("runId", "joinRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_candidate_ranking_items_runId_rank_key" ON "ai_candidate_ranking_items"("runId", "rank");

-- CreateIndex
CREATE INDEX "stages_categoryId_status_idx" ON "stages"("categoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stages_categoryId_sequence_key" ON "stages"("categoryId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "stage_groups_stageId_name_key" ON "stage_groups"("stageId", "name");

-- CreateIndex
CREATE INDEX "stage_standings_stageId_groupId_rank_idx" ON "stage_standings"("stageId", "groupId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "stage_standings_stageId_teamId_key" ON "stage_standings"("stageId", "teamId");

-- CreateIndex
CREATE INDEX "matches_stageId_status_idx" ON "matches"("stageId", "status");

-- CreateIndex
CREATE INDEX "matches_scheduledDate_idx" ON "matches"("scheduledDate");

-- CreateIndex
CREATE INDEX "matches_teamOneId_scheduledDate_idx" ON "matches"("teamOneId", "scheduledDate");

-- CreateIndex
CREATE INDEX "matches_teamTwoId_scheduledDate_idx" ON "matches"("teamTwoId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "matches_stageId_matchNumber_key" ON "matches"("stageId", "matchNumber");

-- CreateIndex
CREATE INDEX "match_referees_refereeId_status_idx" ON "match_referees"("refereeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "match_referees_matchId_refereeId_key" ON "match_referees"("matchId", "refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "match_advancements_sourceMatchId_outcome_key" ON "match_advancements"("sourceMatchId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "match_advancements_destinationMatchId_destinationSlot_key" ON "match_advancements"("destinationMatchId", "destinationSlot");

-- CreateIndex
CREATE UNIQUE INDEX "match_games_matchId_gameNumber_key" ON "match_games"("matchId", "gameNumber");

-- CreateIndex
CREATE INDEX "match_reschedules_matchId_createdAt_idx" ON "match_reschedules"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "match_result_submissions_matchId_submittedAt_idx" ON "match_result_submissions"("matchId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "match_result_confirmations_submissionId_teamId_key" ON "match_result_confirmations"("submissionId", "teamId");

-- CreateIndex
CREATE INDEX "disputes_matchId_status_idx" ON "disputes"("matchId", "status");

-- CreateIndex
CREATE INDEX "dispute_evidence_disputeId_createdAt_idx" ON "dispute_evidence"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "dispute_events_disputeId_createdAt_idx" ON "dispute_events"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "dispute_ai_suggestions_disputeId_createdAt_idx" ON "dispute_ai_suggestions"("disputeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_ai_citations_suggestionId_ruleChunkId_key" ON "dispute_ai_citations"("suggestionId", "ruleChunkId");

-- CreateIndex
CREATE INDEX "player_ratings_gameId_rating_idx" ON "player_ratings"("gameId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "player_ratings_userId_gameId_key" ON "player_ratings"("userId", "gameId");

-- CreateIndex
CREATE INDEX "rating_history_playerRatingId_createdAt_idx" ON "rating_history"("playerRatingId", "createdAt");

-- CreateIndex
CREATE INDEX "seeding_runs_stageId_createdAt_idx" ON "seeding_runs"("stageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_run_items_runId_teamId_key" ON "seeding_run_items"("runId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_run_items_runId_finalSeed_key" ON "seeding_run_items"("runId", "finalSeed");

-- CreateIndex
CREATE INDEX "match_predictions_matchId_createdAt_idx" ON "match_predictions"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt");

-- CreateIndex
CREATE INDEX "notification_recipients_userId_readAt_idx" ON "notification_recipients"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notificationId_userId_key" ON "notification_recipients"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revoked_idx" ON "refresh_tokens"("userId", "revoked");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_referees" ADD CONSTRAINT "tournament_referees_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_referees" ADD CONSTRAINT "tournament_referees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_eligibility_rules" ADD CONSTRAINT "category_eligibility_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_documents" ADD CONSTRAINT "rule_documents_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_documents" ADD CONSTRAINT "rule_documents_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_chunks" ADD CONSTRAINT "rule_chunks_ruleDocumentId_fkey" FOREIGN KEY ("ruleDocumentId") REFERENCES "rule_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_roster_changes" ADD CONSTRAINT "registration_roster_changes_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_roster_changes" ADD CONSTRAINT "registration_roster_changes_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_roster_changes" ADD CONSTRAINT "registration_roster_changes_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_ai_reviews" ADD CONSTRAINT "registration_ai_reviews_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_ai_reviews" ADD CONSTRAINT "registration_ai_reviews_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_ranking_runs" ADD CONSTRAINT "ai_candidate_ranking_runs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_ranking_runs" ADD CONSTRAINT "ai_candidate_ranking_runs_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_ranking_items" ADD CONSTRAINT "ai_candidate_ranking_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ai_candidate_ranking_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_ranking_items" ADD CONSTRAINT "ai_candidate_ranking_items_joinRequestId_fkey" FOREIGN KEY ("joinRequestId") REFERENCES "team_join_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_ranking_items" ADD CONSTRAINT "ai_candidate_ranking_items_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_groups" ADD CONSTRAINT "stage_groups_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_standings" ADD CONSTRAINT "stage_standings_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_standings" ADD CONSTRAINT "stage_standings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "stage_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_standings" ADD CONSTRAINT "stage_standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "stage_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_teamOneId_fkey" FOREIGN KEY ("teamOneId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_teamTwoId_fkey" FOREIGN KEY ("teamTwoId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_referees" ADD CONSTRAINT "match_referees_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_referees" ADD CONSTRAINT "match_referees_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_referees" ADD CONSTRAINT "match_referees_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_advancements" ADD CONSTRAINT "match_advancements_sourceMatchId_fkey" FOREIGN KEY ("sourceMatchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_advancements" ADD CONSTRAINT "match_advancements_destinationMatchId_fkey" FOREIGN KEY ("destinationMatchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reschedules" ADD CONSTRAINT "match_reschedules_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reschedules" ADD CONSTRAINT "match_reschedules_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_result_submissions" ADD CONSTRAINT "match_result_submissions_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_result_submissions" ADD CONSTRAINT "match_result_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_result_confirmations" ADD CONSTRAINT "match_result_confirmations_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "match_result_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_result_confirmations" ADD CONSTRAINT "match_result_confirmations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_result_confirmations" ADD CONSTRAINT "match_result_confirmations_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_ai_suggestions" ADD CONSTRAINT "dispute_ai_suggestions_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_ai_citations" ADD CONSTRAINT "dispute_ai_citations_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "dispute_ai_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_ai_citations" ADD CONSTRAINT "dispute_ai_citations_ruleChunkId_fkey" FOREIGN KEY ("ruleChunkId") REFERENCES "rule_chunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_playerRatingId_fkey" FOREIGN KEY ("playerRatingId") REFERENCES "player_ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_runs" ADD CONSTRAINT "seeding_runs_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_runs" ADD CONSTRAINT "seeding_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_run_items" ADD CONSTRAINT "seeding_run_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "seeding_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_run_items" ADD CONSTRAINT "seeding_run_items_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_predictedWinnerTeamId_fkey" FOREIGN KEY ("predictedWinnerTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
