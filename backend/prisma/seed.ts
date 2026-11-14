import 'dotenv/config';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DEMO_ID = 900_000;
const id = (value: number) => DEMO_ID + value;
const at = (value: string) => new Date(value);
const sqlDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const sqlTime = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);
const now = at('2026-11-01T08:00:00.000Z');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run the Prisma seed.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo seed must not be run in production.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const password = await argon2.hash('Demo@123456');
    const tokenHash = createHash('sha256')
      .update('demo-refresh-token-not-valid-for-login')
      .digest('hex');

    await prisma.$transaction(
      async (tx) => {
        await tx.user.createMany({
          data: [
            {
              id: id(1),
              name: 'Quản trị hệ thống',
              email: 'admin@etm.demo',
              phone: '0900000001',
              password,
              role: 'ADMIN',
              status: 'ACTIVE',
              createdAt: at('2026-09-01T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(2),
              name: 'Ban tổ chức',
              email: 'organizer@etm.demo',
              phone: '0900000002',
              password,
              role: 'BTC',
              status: 'ACTIVE',
              createdAt: at('2026-09-02T08:00:00.000Z'),
              updatedAt: now,
            },
            ...Array.from({ length: 9 }, (_, index) => ({
              id: id(index + 3),
              name: `Người chơi ${index + 1}`,
              email: `player${index + 1}@etm.demo`,
              phone: `09000000${String(index + 3).padStart(2, '0')}`,
              password,
              role: 'PLAYER' as const,
              status: 'ACTIVE' as const,
              createdAt: at(
                `2026-09-${String(index + 3).padStart(2, '0')}T08:00:00.000Z`,
              ),
              updatedAt: now,
            })),
            {
              id: id(12),
              name: 'Trọng tài chính',
              email: 'referee1@etm.demo',
              phone: '0900000012',
              password,
              role: 'REFEREE',
              status: 'ACTIVE',
              createdAt: at('2026-09-12T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(13),
              name: 'Trọng tài dự bị',
              email: 'referee2@etm.demo',
              phone: '0900000013',
              password,
              role: 'REFEREE',
              status: 'ACTIVE',
              createdAt: at('2026-09-13T08:00:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.refreshToken.createMany({
          data: [
            {
              id: id(101),
              userId: id(3),
              deviceId: 'demo-web-device',
              tokenHash,
              isCurrent: true,
              revoked: false,
              revokedAt: null,
              revokedReason: null,
              lastUsedAt: now,
              absoluteExpiredAt: at('2026-12-01T08:00:00.000Z'),
              createdAt: now,
              updatedAt: now,
            },
            {
              id: id(102),
              userId: id(4),
              deviceId: 'demo-old-device',
              tokenHash: createHash('sha256')
                .update('revoked-demo-token')
                .digest('hex'),
              isCurrent: false,
              revoked: true,
              revokedAt: at('2026-10-10T10:00:00.000Z'),
              revokedReason: 'LOGOUT',
              lastUsedAt: at('2026-10-10T09:00:00.000Z'),
              absoluteExpiredAt: at('2026-11-10T09:00:00.000Z'),
              createdAt: at('2026-09-10T09:00:00.000Z'),
              updatedAt: at('2026-10-10T10:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.tournament.createMany({
          data: [
            {
              id: id(201),
              organizerId: id(2),
              name: 'ETM Open Cup 2026',
              description:
                'Giải đấu mẫu nhiều hạng mục dành cho cộng đồng sinh viên.',
              status: 'IN_PROGRESS',
              startsAt: at('2026-10-01T00:00:00.000Z'),
              endsAt: at('2026-11-30T23:59:59.000Z'),
              registrationOpensAt: at('2026-09-01T00:00:00.000Z'),
              registrationClosesAt: at('2026-09-25T23:59:59.000Z'),
              resultConfirmationHours: 4,
              generalRules:
                'Thi đấu trung thực; quyết định cuối cùng thuộc ban tổ chức.',
              createdAt: at('2026-08-20T08:00:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.game.createMany({
          data: [
            {
              id: id(301),
              name: 'League of Legends',
              slug: 'league-of-legends',
              description: 'Trò chơi MOBA thi đấu theo đội.',
              isActive: true,
              createdAt: at('2026-08-01T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(302),
              name: 'Valorant',
              slug: 'valorant',
              description: 'Trò chơi bắn súng chiến thuật 5 đấu 5.',
              isActive: true,
              createdAt: at('2026-08-01T08:00:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.category.createMany({
          data: [
            {
              id: id(401),
              tournamentId: id(201),
              gameId: id(301),
              name: 'League of Legends - Đồng đội',
              description: 'Hạng mục đội hình 5 người, có tối đa 8 đội.',
              participationType: 'TEAM',
              minPlayers: 2,
              maxPlayers: 7,
              maxTeams: 8,
              eligibilityNotes:
                'Sinh viên đang theo học tại trường đại học hoặc cao đẳng.',
              createdAt: at('2026-08-21T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(402),
              tournamentId: id(201),
              gameId: id(302),
              name: 'Valorant - Solo showcase',
              description: 'Hạng mục mẫu SOLO sử dụng chung mô hình TEAMS.',
              participationType: 'SOLO',
              minPlayers: 1,
              maxPlayers: 1,
              maxTeams: 16,
              eligibilityNotes: 'Mỗi người chơi đăng ký một suất thi đấu.',
              createdAt: at('2026-08-21T08:10:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.tournamentReferee.createMany({
          data: [
            {
              id: id(501),
              tournamentId: id(201),
              userId: id(12),
              status: 'ACTIVE',
              assignedAt: at('2026-09-20T08:00:00.000Z'),
              createdAt: at('2026-09-20T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(502),
              tournamentId: id(201),
              userId: id(13),
              status: 'INVITED',
              assignedAt: at('2026-09-20T08:10:00.000Z'),
              createdAt: at('2026-09-20T08:10:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.categoryEligibilityRule.createMany({
          data: [
            {
              id: id(601),
              categoryId: id(401),
              name: 'Tư cách sinh viên',
              description:
                'Các thành viên cung cấp thẻ sinh viên còn hiệu lực.',
              isRequired: true,
              sortOrder: 1,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: id(602),
              categoryId: id(401),
              name: 'Cỡ roster',
              description: 'Đội có tối thiểu 5 và tối đa 7 thành viên.',
              isRequired: true,
              sortOrder: 2,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: id(603),
              categoryId: id(402),
              name: 'Tài khoản game',
              description:
                'Người chơi tự chịu trách nhiệm về tài khoản thi đấu.',
              isRequired: false,
              sortOrder: 1,
              createdAt: now,
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.ruleDocument.createMany({
          data: [
            {
              id: id(701),
              tournamentId: id(201),
              categoryId: null,
              title: 'Điều lệ chung ETM Open Cup 2026',
              fileUrl: 'https://example.invalid/rules/general.pdf',
              mimeType: 'application/pdf',
              checksum: 'demo-general-rules-sha256',
              isProcessed: true,
              createdAt: at('2026-08-22T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(702),
              tournamentId: id(201),
              categoryId: id(401),
              title: 'Điều lệ League of Legends',
              fileUrl: 'https://example.invalid/rules/lol.pdf',
              mimeType: 'application/pdf',
              checksum: 'demo-lol-rules-sha256',
              isProcessed: true,
              createdAt: at('2026-08-22T08:10:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.ruleChunk.createMany({
          data: [
            {
              id: id(801),
              ruleDocumentId: id(701),
              chunkIndex: 0,
              content:
                'Đội phải có mặt đúng giờ và tuân thủ hướng dẫn của trọng tài.',
              pageNumber: 1,
              metadata: { section: 'general', language: 'vi' },
              createdAt: now,
            },
            {
              id: id(802),
              ruleDocumentId: id(702),
              chunkIndex: 0,
              content:
                'Đội trưởng xác nhận kết quả trong vòng bốn giờ sau trận.',
              pageNumber: 3,
              metadata: { section: 'result-confirmation', language: 'vi' },
              createdAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.team.createMany({
          data: [
            {
              id: id(901),
              categoryId: id(401),
              captainId: id(3),
              name: 'Saigon Phoenix',
              tag: 'SGP',
              logoUrl: 'https://example.invalid/teams/sgp.png',
              status: 'ACTIVE',
              createdAt: at('2026-09-05T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(902),
              categoryId: id(401),
              captainId: id(5),
              name: 'Hanoi Dragons',
              tag: 'HND',
              logoUrl: 'https://example.invalid/teams/hnd.png',
              status: 'ACTIVE',
              createdAt: at('2026-09-05T08:10:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(903),
              categoryId: id(401),
              captainId: id(7),
              name: 'Central Tigers',
              tag: 'CTG',
              logoUrl: 'https://example.invalid/teams/ctg.png',
              status: 'ACTIVE',
              createdAt: at('2026-09-05T08:20:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(904),
              categoryId: id(401),
              captainId: id(9),
              name: 'Mekong Wolves',
              tag: 'MKW',
              logoUrl: 'https://example.invalid/teams/mkw.png',
              status: 'ACTIVE',
              createdAt: at('2026-09-05T08:30:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(905),
              categoryId: id(402),
              captainId: id(11),
              name: 'Solo Ace',
              tag: 'ACE',
              logoUrl: 'https://example.invalid/teams/ace.png',
              status: 'ACTIVE',
              createdAt: at('2026-09-05T08:40:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.teamMember.createMany({
          data: [
            {
              id: id(1001),
              teamId: id(901),
              userId: id(3),
              role: 'CAPTAIN',
              joinedAt: at('2026-09-05T08:00:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1002),
              teamId: id(901),
              userId: id(4),
              role: 'MEMBER',
              joinedAt: at('2026-09-05T08:05:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:05:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1003),
              teamId: id(902),
              userId: id(5),
              role: 'CAPTAIN',
              joinedAt: at('2026-09-05T08:10:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:10:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1004),
              teamId: id(902),
              userId: id(6),
              role: 'MEMBER',
              joinedAt: at('2026-09-05T08:15:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:15:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1005),
              teamId: id(903),
              userId: id(7),
              role: 'CAPTAIN',
              joinedAt: at('2026-09-05T08:20:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:20:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1006),
              teamId: id(903),
              userId: id(8),
              role: 'MEMBER',
              joinedAt: at('2026-09-05T08:25:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:25:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1007),
              teamId: id(904),
              userId: id(9),
              role: 'CAPTAIN',
              joinedAt: at('2026-09-05T08:30:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:30:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1008),
              teamId: id(904),
              userId: id(10),
              role: 'MEMBER',
              joinedAt: at('2026-09-05T08:35:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:35:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1009),
              teamId: id(905),
              userId: id(11),
              role: 'CAPTAIN',
              joinedAt: at('2026-09-05T08:40:00.000Z'),
              leftAt: null,
              createdAt: at('2026-09-05T08:40:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.teamJoinRequest.createMany({
          data: [
            {
              id: id(1101),
              teamId: id(901),
              userId: id(11),
              message: 'Tôi muốn tham gia đội và có thể chơi vị trí hỗ trợ.',
              status: 'PENDING',
              decidedAt: null,
              decidedById: null,
              createdAt: at('2026-10-10T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1102),
              teamId: id(902),
              userId: id(13),
              message: 'Đề nghị gia nhập đội với vai trò dự bị.',
              status: 'REJECTED',
              decidedAt: at('2026-10-11T08:00:00.000Z'),
              decidedById: id(5),
              createdAt: at('2026-10-10T09:00:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.registration.createMany({
          data: [
            {
              id: id(1201),
              teamId: id(901),
              submittedById: id(3),
              reviewedById: id(2),
              status: 'APPROVED',
              application: {
                school: 'Đại học Sài Gòn',
                studentCardVerified: true,
              },
              submittedAt: at('2026-09-10T08:00:00.000Z'),
              reviewedAt: at('2026-09-12T08:00:00.000Z'),
              reviewNote: 'Hồ sơ hợp lệ.',
              rosterLockedAt: at('2026-09-12T08:00:00.000Z'),
              createdAt: at('2026-09-10T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1202),
              teamId: id(902),
              submittedById: id(5),
              reviewedById: id(2),
              status: 'APPROVED',
              application: {
                school: 'Đại học Hà Nội',
                studentCardVerified: true,
              },
              submittedAt: at('2026-09-10T09:00:00.000Z'),
              reviewedAt: at('2026-09-12T09:00:00.000Z'),
              reviewNote: 'Đã xác minh đội hình.',
              rosterLockedAt: at('2026-09-12T09:00:00.000Z'),
              createdAt: at('2026-09-10T09:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1203),
              teamId: id(903),
              submittedById: id(7),
              reviewedById: id(2),
              status: 'APPROVED',
              application: {
                school: 'Đại học Đà Nẵng',
                studentCardVerified: true,
              },
              submittedAt: at('2026-09-10T10:00:00.000Z'),
              reviewedAt: at('2026-09-12T10:00:00.000Z'),
              reviewNote: 'Đạt điều kiện tham gia.',
              rosterLockedAt: at('2026-09-12T10:00:00.000Z'),
              createdAt: at('2026-09-10T10:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1204),
              teamId: id(904),
              submittedById: id(9),
              reviewedById: id(2),
              status: 'APPROVED',
              application: {
                school: 'Đại học Cần Thơ',
                studentCardVerified: true,
              },
              submittedAt: at('2026-09-10T11:00:00.000Z'),
              reviewedAt: at('2026-09-12T11:00:00.000Z'),
              reviewNote: 'Đạt điều kiện tham gia.',
              rosterLockedAt: at('2026-09-12T11:00:00.000Z'),
              createdAt: at('2026-09-10T11:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1205),
              teamId: id(905),
              submittedById: id(11),
              reviewedById: id(2),
              status: 'APPROVED',
              application: { region: 'Hồ Chí Minh', accountVerified: true },
              submittedAt: at('2026-09-10T12:00:00.000Z'),
              reviewedAt: at('2026-09-12T12:00:00.000Z'),
              reviewNote: 'Đủ điều kiện SOLO.',
              rosterLockedAt: at('2026-09-12T12:00:00.000Z'),
              createdAt: at('2026-09-10T12:00:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.registrationRosterChange.createMany({
          data: [
            {
              id: id(1301),
              registrationId: id(1201),
              changedById: id(3),
              change: {
                action: 'ADD_MEMBER',
                userId: id(11),
                reason: 'Bổ sung thành viên dự bị.',
              },
              approved: false,
              approvedById: null,
              createdAt: at('2026-09-15T08:00:00.000Z'),
              approvedAt: null,
            },
          ],
          skipDuplicates: true,
        });

        await tx.registrationAIReview.createMany({
          data: [
            {
              id: id(1401),
              registrationId: id(1201),
              requestedById: id(2),
              recommendation: 'APPROVE',
              summary: 'Hồ sơ đáp ứng các điều kiện được cung cấp.',
              findings: {
                verifiedMembers: 2,
                warnings: [],
                decisionMaker: 'organizer',
              },
              modelName: 'demo-review-model',
              createdAt: at('2026-09-11T08:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.aICandidateRankingRun.createMany({
          data: [
            {
              id: id(1501),
              teamId: id(901),
              requestedById: id(3),
              modelName: 'demo-ranking-model',
              input: {
                criteria: ['game-rank', 'role-fit', 'eligibility'],
                triggeredByCaptain: true,
              },
              createdAt: at('2026-10-09T08:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.aICandidateRankingItem.createMany({
          data: [
            {
              id: id(1601),
              runId: id(1501),
              joinRequestId: id(1101),
              candidateId: id(11),
              rank: 1,
              score: 0.87,
              reason: 'Đủ điều kiện; kỹ năng hỗ trợ phù hợp với nhu cầu đội.',
              createdAt: at('2026-10-09T08:01:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.stage.createMany({
          data: [
            {
              id: id(1701),
              categoryId: id(401),
              name: 'Vòng bảng',
              sequence: 1,
              format: 'GROUP',
              status: 'COMPLETED',
              config: {
                groups: 2,
                advancePerGroup: 1,
                scoring: { win: 3, draw: 1, loss: 0 },
              },
              startsAt: at('2026-10-01T00:00:00.000Z'),
              endsAt: at('2026-10-20T23:59:59.000Z'),
              createdAt: at('2026-09-20T08:00:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1702),
              categoryId: id(401),
              name: 'Chung kết',
              sequence: 2,
              format: 'SINGLE_ELIMINATION',
              status: 'IN_PROGRESS',
              config: { finalMatchBestOf: 5, bronzeMatch: true },
              startsAt: at('2026-10-21T00:00:00.000Z'),
              endsAt: at('2026-11-15T23:59:59.000Z'),
              createdAt: at('2026-09-20T08:10:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(1703),
              categoryId: id(402),
              name: 'Solo ladder',
              sequence: 1,
              format: 'SWISS',
              status: 'PLANNED',
              config: { rounds: 4, pairing: 'swiss' },
              startsAt: at('2026-11-20T00:00:00.000Z'),
              endsAt: at('2026-11-30T23:59:59.000Z'),
              createdAt: at('2026-09-20T08:20:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.stageGroup.createMany({
          data: [
            { id: id(1801), stageId: id(1701), name: 'Bảng A', createdAt: now },
            { id: id(1802), stageId: id(1701), name: 'Bảng B', createdAt: now },
          ],
          skipDuplicates: true,
        });

        await tx.stageStanding.createMany({
          data: [
            {
              id: id(1901),
              stageId: id(1701),
              groupId: id(1801),
              teamId: id(901),
              rank: 1,
              played: 1,
              wins: 1,
              losses: 0,
              draws: 0,
              points: 3,
              scoreFor: 2,
              scoreAgainst: 1,
              qualified: true,
              updatedAt: now,
            },
            {
              id: id(1902),
              stageId: id(1701),
              groupId: id(1801),
              teamId: id(902),
              rank: 2,
              played: 1,
              wins: 0,
              losses: 1,
              draws: 0,
              points: 0,
              scoreFor: 1,
              scoreAgainst: 2,
              qualified: false,
              updatedAt: now,
            },
            {
              id: id(1903),
              stageId: id(1701),
              groupId: id(1802),
              teamId: id(903),
              rank: 1,
              played: 1,
              wins: 1,
              losses: 0,
              draws: 0,
              points: 3,
              scoreFor: 2,
              scoreAgainst: 0,
              qualified: true,
              updatedAt: now,
            },
            {
              id: id(1904),
              stageId: id(1701),
              groupId: id(1802),
              teamId: id(904),
              rank: 2,
              played: 1,
              wins: 0,
              losses: 1,
              draws: 0,
              points: 0,
              scoreFor: 0,
              scoreAgainst: 2,
              qualified: false,
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.match.createMany({
          data: [
            {
              id: id(2001),
              stageId: id(1701),
              groupId: id(1801),
              round: 1,
              matchNumber: 1,
              teamOneId: id(901),
              teamTwoId: id(902),
              winnerTeamId: id(901),
              status: 'COMPLETED',
              scheduledDate: sqlDate('2026-10-10'),
              scheduledStartAt: sqlTime('09:00'),
              scheduledEndAt: sqlTime('12:00'),
              startedAt: at('2026-10-10T09:02:00.000Z'),
              completedAt: at('2026-10-10T11:40:00.000Z'),
              teamOneScore: 2,
              teamTwoScore: 1,
              bestOf: 3,
              resultConfirmationDeadline: at('2026-10-10T15:40:00.000Z'),
              notes: 'Trận vòng bảng A1.',
              createdAt: at('2026-10-01T08:00:00.000Z'),
              updatedAt: at('2026-10-10T11:40:00.000Z'),
            },
            {
              id: id(2002),
              stageId: id(1701),
              groupId: id(1802),
              round: 1,
              matchNumber: 2,
              teamOneId: id(903),
              teamTwoId: id(904),
              winnerTeamId: id(903),
              status: 'COMPLETED',
              scheduledDate: sqlDate('2026-10-11'),
              scheduledStartAt: sqlTime('13:00'),
              scheduledEndAt: sqlTime('16:00'),
              startedAt: at('2026-10-11T13:00:00.000Z'),
              completedAt: at('2026-10-11T15:30:00.000Z'),
              teamOneScore: 2,
              teamTwoScore: 0,
              bestOf: 3,
              resultConfirmationDeadline: at('2026-10-11T19:30:00.000Z'),
              notes: 'Trận vòng bảng B1.',
              createdAt: at('2026-10-01T08:10:00.000Z'),
              updatedAt: at('2026-10-11T15:30:00.000Z'),
            },
            {
              id: id(2003),
              stageId: id(1702),
              groupId: null,
              round: 2,
              matchNumber: 1,
              teamOneId: null,
              teamTwoId: null,
              winnerTeamId: null,
              status: 'SCHEDULED',
              scheduledDate: sqlDate('2026-11-10'),
              scheduledStartAt: sqlTime('10:00'),
              scheduledEndAt: sqlTime('14:00'),
              startedAt: null,
              completedAt: null,
              teamOneScore: null,
              teamTwoScore: null,
              bestOf: 5,
              resultConfirmationDeadline: at('2026-11-10T18:00:00.000Z'),
              notes: 'Chung kết; đội được xác định qua luồng đi tiếp.',
              createdAt: at('2026-10-20T08:00:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.matchReferee.createMany({
          data: [
            {
              id: id(2101),
              matchId: id(2001),
              refereeId: id(12),
              status: 'COMPLETED',
              assignedById: id(2),
              assignedAt: at('2026-10-01T09:00:00.000Z'),
              respondedAt: at('2026-10-02T09:00:00.000Z'),
              createdAt: at('2026-10-01T09:00:00.000Z'),
              updatedAt: at('2026-10-10T11:40:00.000Z'),
            },
            {
              id: id(2102),
              matchId: id(2003),
              refereeId: id(13),
              status: 'CONFIRMED',
              assignedById: id(2),
              assignedAt: at('2026-10-20T09:00:00.000Z'),
              respondedAt: at('2026-10-21T09:00:00.000Z'),
              createdAt: at('2026-10-20T09:00:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.matchAdvancement.createMany({
          data: [
            {
              id: id(2201),
              sourceMatchId: id(2001),
              destinationMatchId: id(2003),
              outcome: 'WINNER',
              destinationSlot: 'TEAM_ONE',
              createdAt: now,
            },
            {
              id: id(2202),
              sourceMatchId: id(2002),
              destinationMatchId: id(2003),
              outcome: 'WINNER',
              destinationSlot: 'TEAM_TWO',
              createdAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.matchGame.createMany({
          data: [
            {
              id: id(2301),
              matchId: id(2001),
              gameNumber: 1,
              teamOneScore: 15,
              teamTwoScore: 10,
              winnerTeamId: id(901),
              startedAt: at('2026-10-10T09:02:00.000Z'),
              completedAt: at('2026-10-10T09:55:00.000Z'),
              createdAt: at('2026-10-10T09:02:00.000Z'),
            },
            {
              id: id(2302),
              matchId: id(2001),
              gameNumber: 2,
              teamOneScore: 8,
              teamTwoScore: 15,
              winnerTeamId: id(902),
              startedAt: at('2026-10-10T10:00:00.000Z'),
              completedAt: at('2026-10-10T10:50:00.000Z'),
              createdAt: at('2026-10-10T10:00:00.000Z'),
            },
            {
              id: id(2303),
              matchId: id(2001),
              gameNumber: 3,
              teamOneScore: 15,
              teamTwoScore: 12,
              winnerTeamId: id(901),
              startedAt: at('2026-10-10T10:55:00.000Z'),
              completedAt: at('2026-10-10T11:40:00.000Z'),
              createdAt: at('2026-10-10T10:55:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.matchReschedule.createMany({
          data: [
            {
              id: id(2401),
              matchId: id(2003),
              changedById: id(2),
              previousDate: sqlDate('2026-11-09'),
              previousStartAt: sqlTime('09:00'),
              previousEndAt: sqlTime('13:00'),
              newDate: sqlDate('2026-11-10'),
              newStartAt: sqlTime('10:00'),
              newEndAt: sqlTime('14:00'),
              reason: 'Điều chỉnh lịch theo yêu cầu địa điểm thi đấu.',
              createdAt: at('2026-10-25T08:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.matchResultSubmission.createMany({
          data: [
            {
              id: id(2501),
              matchId: id(2001),
              submittedById: id(12),
              teamOneScore: 2,
              teamTwoScore: 1,
              status: 'ACCEPTED',
              note: 'Kết quả được trọng tài xác minh.',
              submittedAt: at('2026-10-10T11:45:00.000Z'),
              processedAt: at('2026-10-10T11:50:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.matchResultConfirmation.createMany({
          data: [
            {
              id: id(2601),
              submissionId: id(2501),
              teamId: id(901),
              confirmedById: id(3),
              status: 'CONFIRMED',
              note: 'Đã đối chiếu kết quả.',
              respondedAt: at('2026-10-10T12:00:00.000Z'),
              createdAt: at('2026-10-10T11:55:00.000Z'),
            },
            {
              id: id(2602),
              submissionId: id(2501),
              teamId: id(902),
              confirmedById: id(5),
              status: 'CONFIRMED',
              note: 'Xác nhận kết quả trận.',
              respondedAt: at('2026-10-10T12:05:00.000Z'),
              createdAt: at('2026-10-10T11:55:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.dispute.createMany({
          data: [
            {
              id: id(2701),
              matchId: id(2001),
              teamId: id(902),
              openedById: id(5),
              resolvedById: id(2),
              title: 'Yêu cầu xem lại tình huống cuối trận',
              description:
                'Đội đề nghị ban tổ chức xem lại video ở ván thứ ba.',
              status: 'RESOLVED',
              decision:
                'Giữ nguyên kết quả sau khi đối chiếu video và điều lệ.',
              openedAt: at('2026-10-10T12:10:00.000Z'),
              resolvedAt: at('2026-10-10T16:00:00.000Z'),
              createdAt: at('2026-10-10T12:10:00.000Z'),
              updatedAt: at('2026-10-10T16:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.disputeEvidence.createMany({
          data: [
            {
              id: id(2801),
              disputeId: id(2701),
              uploadedById: id(5),
              fileUrl: 'https://example.invalid/evidence/match-clip.mp4',
              fileName: 'match-clip.mp4',
              mimeType: 'video/mp4',
              description: 'Video tình huống cuối ván.',
              createdAt: at('2026-10-10T12:15:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.disputeEvent.createMany({
          data: [
            {
              id: id(2901),
              disputeId: id(2701),
              actorId: id(5),
              type: 'CREATED',
              message: 'Đội gửi khiếu nại.',
              metadata: { source: 'team-portal' },
              createdAt: at('2026-10-10T12:10:00.000Z'),
            },
            {
              id: id(2902),
              disputeId: id(2701),
              actorId: id(2),
              type: 'STATUS_CHANGED',
              message: 'Ban tổ chức bắt đầu xem xét.',
              metadata: { from: 'OPEN', to: 'UNDER_REVIEW' },
              createdAt: at('2026-10-10T13:00:00.000Z'),
            },
            {
              id: id(2903),
              disputeId: id(2701),
              actorId: id(2),
              type: 'RESOLVED',
              message: 'Kết quả được giữ nguyên.',
              metadata: { from: 'UNDER_REVIEW', to: 'RESOLVED' },
              createdAt: at('2026-10-10T16:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.disputeAISuggestion.createMany({
          data: [
            {
              id: id(3001),
              disputeId: id(2701),
              modelName: 'demo-rag-model',
              summary:
                'Điều lệ yêu cầu đội gửi bằng chứng và ban tổ chức xem xét trước khi ra quyết định.',
              reasoning:
                'Đối chiếu mô tả khiếu nại, video và đoạn điều lệ liên quan.',
              confidence: 0.82,
              createdAt: at('2026-10-10T14:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.disputeAICitation.createMany({
          data: [
            {
              id: id(3101),
              suggestionId: id(3001),
              ruleChunkId: id(802),
              quote: 'Đội trưởng xác nhận kết quả trong vòng bốn giờ sau trận.',
              relevance: 0.91,
              createdAt: at('2026-10-10T14:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.playerRating.createMany({
          data: [
            {
              id: id(3201),
              userId: id(3),
              gameId: id(301),
              rating: 1560.5,
              initialRank: 'Diamond II',
              yearsPlaying: 4,
              matchesPlayed: 850,
              lastCalculatedAt: at('2026-10-10T17:00:00.000Z'),
              createdAt: at('2026-09-01T08:00:00.000Z'),
              updatedAt: at('2026-10-10T17:00:00.000Z'),
            },
            {
              id: id(3202),
              userId: id(5),
              gameId: id(301),
              rating: 1492.25,
              initialRank: 'Diamond III',
              yearsPlaying: 3,
              matchesPlayed: 620,
              lastCalculatedAt: at('2026-10-10T17:00:00.000Z'),
              createdAt: at('2026-09-01T08:10:00.000Z'),
              updatedAt: at('2026-10-10T17:00:00.000Z'),
            },
            {
              id: id(3203),
              userId: id(11),
              gameId: id(302),
              rating: 1210,
              initialRank: 'Platinum I',
              yearsPlaying: 2,
              matchesPlayed: 300,
              lastCalculatedAt: null,
              createdAt: at('2026-09-01T08:20:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.ratingHistory.createMany({
          data: [
            {
              id: id(3301),
              playerRatingId: id(3201),
              matchId: id(2001),
              previousRating: 1542,
              newRating: 1560.5,
              source: 'MATCH_RESULT',
              reason: 'Thắng trận vòng bảng.',
              createdAt: at('2026-10-10T17:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.seedingRun.createMany({
          data: [
            {
              id: id(3401),
              stageId: id(1701),
              createdById: id(2),
              status: 'FINALIZED',
              modelName: 'demo-seeding-model',
              input: { source: 'player-ratings', humanApprovalRequired: true },
              createdAt: at('2026-09-26T08:00:00.000Z'),
              finalizedAt: at('2026-09-27T08:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.seedingRunItem.createMany({
          data: [
            {
              id: id(3501),
              runId: id(3401),
              teamId: id(901),
              suggestedSeed: 1,
              finalSeed: 1,
              score: 1580,
              reason: 'Rating đội hình cao nhất.',
              createdAt: at('2026-09-26T08:01:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(3502),
              runId: id(3401),
              teamId: id(903),
              suggestedSeed: 2,
              finalSeed: 2,
              score: 1510,
              reason: 'Đội hình có thành tích ổn định.',
              createdAt: at('2026-09-26T08:01:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(3503),
              runId: id(3401),
              teamId: id(902),
              suggestedSeed: 3,
              finalSeed: 3,
              score: 1490,
              reason: 'Xếp hạt giống theo rating.',
              createdAt: at('2026-09-26T08:01:00.000Z'),
              updatedAt: now,
            },
            {
              id: id(3504),
              runId: id(3401),
              teamId: id(904),
              suggestedSeed: 4,
              finalSeed: 4,
              score: 1420,
              reason: 'Được BTC xác nhận.',
              createdAt: at('2026-09-26T08:01:00.000Z'),
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        });

        await tx.matchPrediction.createMany({
          data: [
            {
              id: id(3601),
              matchId: id(2003),
              predictedWinnerTeamId: id(901),
              teamOneWinProbability: 0.56,
              confidence: 0.64,
              modelName: 'demo-match-predictor',
              explanation:
                'Dự đoán minh họa dựa trên rating; không phải kết quả chính thức.',
              createdAt: at('2026-10-22T08:00:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.notification.createMany({
          data: [
            {
              id: id(3701),
              createdById: id(2),
              type: 'MATCH',
              title: 'Lịch chung kết đã được cập nhật',
              body: 'Trận chung kết dự kiến diễn ra ngày 10/11/2026.',
              data: { tournamentId: id(201), matchId: id(2003) },
              createdAt: at('2026-10-25T09:00:00.000Z'),
            },
            {
              id: id(3702),
              createdById: null,
              type: 'SYSTEM',
              title: 'Chào mừng đến ETM',
              body: 'Đây là thông báo hệ thống mẫu.',
              data: { source: 'seed' },
              createdAt: at('2026-10-25T09:05:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.notificationRecipient.createMany({
          data: [
            {
              id: id(3801),
              notificationId: id(3701),
              userId: id(3),
              readAt: at('2026-10-26T08:00:00.000Z'),
              deliveredAt: at('2026-10-25T09:00:01.000Z'),
              createdAt: at('2026-10-25T09:00:00.000Z'),
            },
            {
              id: id(3802),
              notificationId: id(3701),
              userId: id(5),
              readAt: null,
              deliveredAt: at('2026-10-25T09:00:01.000Z'),
              createdAt: at('2026-10-25T09:00:00.000Z'),
            },
            {
              id: id(3803),
              notificationId: id(3702),
              userId: id(1),
              readAt: null,
              deliveredAt: at('2026-10-25T09:05:01.000Z'),
              createdAt: at('2026-10-25T09:05:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.auditLog.createMany({
          data: [
            {
              id: id(3901),
              actorId: id(2),
              action: 'REGISTRATION_APPROVED',
              entityType: 'Registration',
              entityId: String(id(1201)),
              changes: { status: { from: 'PENDING', to: 'APPROVED' } },
              ipAddress: '192.0.2.10',
              userAgent: 'ETM demo seed',
              createdAt: at('2026-09-12T08:00:00.000Z'),
            },
            {
              id: id(3902),
              actorId: null,
              action: 'MATCH_RESULT_CONFIRMED',
              entityType: 'Match',
              entityId: String(id(2001)),
              changes: { status: 'COMPLETED', score: [2, 1] },
              ipAddress: null,
              userAgent: null,
              createdAt: at('2026-10-10T12:05:00.000Z'),
            },
          ],
          skipDuplicates: true,
        });

        await tx.$executeRaw`
        DO $$
        DECLARE table_name TEXT;
        BEGIN
          FOREACH table_name IN ARRAY ARRAY[
            'users', 'refresh_tokens', 'tournaments', 'games', 'categories',
            'tournament_referees', 'category_eligibility_rules', 'rule_documents',
            'rule_chunks', 'teams', 'team_members', 'team_join_requests',
            'registrations', 'registration_roster_changes', 'registration_ai_reviews',
            'ai_candidate_ranking_runs', 'ai_candidate_ranking_items', 'stages',
            'stage_groups', 'stage_standings', 'matches', 'match_referees',
            'match_advancements', 'match_games', 'match_reschedules',
            'match_result_submissions', 'match_result_confirmations', 'disputes',
            'dispute_evidence', 'dispute_events', 'dispute_ai_suggestions',
            'dispute_ai_citations', 'player_ratings', 'rating_history',
            'seeding_runs', 'seeding_run_items', 'match_predictions',
            'notifications', 'notification_recipients', 'audit_logs'
          ] LOOP
            EXECUTE format(
              'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX(id) FROM %I), 1), true)',
              table_name,
              'id',
              table_name
            );
          END LOOP;
        END
        $$;
      `;
      },
      { maxWait: 10_000, timeout: 60_000 },
    );

    console.info('Demo seed completed. Demo account password: Demo@123456');
    console.info('Demo account emails use the @etm.demo domain.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Prisma demo seed failed:', error);
  process.exitCode = 1;
});
