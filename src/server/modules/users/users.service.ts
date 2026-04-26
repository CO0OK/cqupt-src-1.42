import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateStrongTemporaryPassword } from "../../validators/password.ts";

type UserRole = "admin" | "auditor" | "user";
type UserStatus = "active" | "banned" | "pending";

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function normalizeStatus(status?: string): UserStatus {
  const normalized = status?.toLowerCase();
  if (normalized === "banned") return "banned";
  if (normalized === "pending") return "pending";
  return "active";
}

function normalizeRole(role?: string): UserRole {
  const normalized = role?.toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "auditor") return "auditor";
  return "user";
}

function normalizeAuthCode(authCode: string): string {
  const normalized = authCode.trim();
  if (!/^\d{7}$/.test(normalized)) {
    throw new Error("INVALID_AUTH_CODE");
  }
  return normalized;
}

function toDisplayStatus(status: UserStatus): string {
  if (status === "banned") return "Banned";
  if (status === "pending") return "Pending";
  return "Active";
}

function toUserApi(user: {
  id: string;
  username: string;
  role: UserRole;
  email: string;
  authCode: string;
  points: number;
  avatarUrl?: string | null;
  createdAt: Date;
  status: UserStatus;
  hasSignedAgreement: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    authCode: user.authCode,
    points: user.points,
    avatar: user.avatarUrl ?? undefined,
    registrationDate: toDateString(user.createdAt),
    status: toDisplayStatus(user.status),
    hasSignedAgreement: user.hasSignedAgreement,
  };
}

export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  private maskUsername(username: string): string {
    if (username.length <= 1) return "*";
    if (username.length === 2) return `${username[0]}*`;
    const hidden = "*".repeat(Math.min(4, username.length - 2));
    return `${username[0]}${hidden}${username[username.length - 1]}`;
  }

  async listUsers() {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) =>
      toUserApi({
        id: row.id,
        username: row.username,
        role: row.role,
        email: row.email,
        authCode: row.authCode,
        points: row.points,
        avatarUrl: row.avatarUrl,
        createdAt: row.createdAt,
        status: row.status,
        hasSignedAgreement: row.hasSignedAgreement,
      }),
    );
  }

  async listLeaderboard(authUserId: string, limit = 50) {
    const users = await this.prisma.user.findMany({
      where: {
        role: "user",
        status: "active",
      },
      orderBy: [{ points: "desc" }, { createdAt: "asc" }],
      take: Math.max(1, Math.min(100, limit)),
      select: {
        id: true,
        username: true,
        points: true,
        avatarUrl: true,
      },
    });

    const userIds = users.map((u) => u.id);
    const vulnCounts =
      userIds.length > 0
        ? await this.prisma.vulnerability.groupBy({
            by: ["submitterId"],
            where: { submitterId: { in: userIds } },
            _count: { _all: true },
          })
        : [];

    const vulnCountMap = new Map<string, number>();
    vulnCounts.forEach((row) => {
      vulnCountMap.set(row.submitterId, row._count._all);
    });

    return users.map((u, idx) => ({
      rank: idx + 1,
      displayName: this.maskUsername(u.username),
      points: u.points,
      vulnCount: vulnCountMap.get(u.id) ?? 0,
      isMe: u.id === authUserId,
      avatar: u.avatarUrl ?? undefined,
    }));
  }

  async createUser(input: {
    username: string;
    email: string;
    role?: string;
    authCode: string;
    points?: unknown;
    status?: string;
  }) {
    const initialPassword = generateStrongTemporaryPassword(12);
    const created = await this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        authCode: normalizeAuthCode(input.authCode),
        role: normalizeRole(input.role),
        points: Number(input.points) || 0,
        status: normalizeStatus(input.status),
        passwordHash: await bcrypt.hash(initialPassword, 10),
        hasSignedAgreement: false,
      },
    });

    return {
      user: toUserApi({
        id: created.id,
        username: created.username,
        role: created.role,
        email: created.email,
        authCode: created.authCode,
        points: created.points,
        avatarUrl: created.avatarUrl,
        createdAt: created.createdAt,
        status: created.status,
        hasSignedAgreement: created.hasSignedAgreement,
      }),
      initialPassword,
    };
  }

  async updateUser(id: string, updates: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    if (typeof updates.username === "string") data.username = updates.username;
    if (typeof updates.email === "string") data.email = updates.email;
    if (typeof updates.authCode === "string") data.authCode = normalizeAuthCode(updates.authCode);
    if (typeof updates.avatar === "string" || updates.avatar === null) data.avatarUrl = updates.avatar;
    if (typeof updates.role === "string") data.role = normalizeRole(updates.role);
    if (typeof updates.status === "string") data.status = normalizeStatus(updates.status);
    if (updates.points !== undefined) data.points = Number(updates.points);
    if (typeof updates.hasSignedAgreement === "boolean") data.hasSignedAgreement = updates.hasSignedAgreement;

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return toUserApi({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      email: updated.email,
      authCode: updated.authCode,
      points: updated.points,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt,
      status: updated.status,
      hasSignedAgreement: updated.hasSignedAgreement,
    });
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
  }

  async signAgreement(id: string) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        hasSignedAgreement: true,
        agreementSignedAt: new Date(),
      },
    });

    return toUserApi({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      email: updated.email,
      authCode: updated.authCode,
      points: updated.points,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt,
      status: updated.status,
      hasSignedAgreement: updated.hasSignedAgreement,
    });
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id }, { username: id }] },
    });
    if (!user) throw new Error("NOT_FOUND");
    return toUserApi({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      authCode: user.authCode,
      points: user.points,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      status: user.status,
      hasSignedAgreement: user.hasSignedAgreement,
    });
  }

  async updateSelfProfile(id: string, updates: { username?: string; email?: string; avatar?: string; role?: string }) {
    const data: Record<string, unknown> = {};
    if (typeof updates.username === "string") data.username = updates.username.trim();
    if (typeof updates.email === "string") data.email = updates.email.trim();
    if (typeof updates.avatar === "string") data.avatarUrl = updates.avatar;
    if (typeof updates.role === "string") data.role = normalizeRole(updates.role);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return toUserApi({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      email: updated.email,
      authCode: updated.authCode,
      points: updated.points,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt,
      status: updated.status,
      hasSignedAgreement: updated.hasSignedAgreement,
    });
  }

  async changeSelfPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new Error("NOT_FOUND");

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });
  }

  async getMyPointLogs(userId: string, limit = 30) {
    const logs = await this.prisma.userPointLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        changeType: true,
        delta: true,
        balanceAfter: true,
        note: true,
        referenceType: true,
        createdAt: true,
      },
    });
    return logs.map((l) => ({
      id: l.id,
      changeType: l.changeType,
      delta: l.delta,
      balanceAfter: l.balanceAfter,
      note: l.note ?? "",
      referenceType: l.referenceType ?? "",
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
