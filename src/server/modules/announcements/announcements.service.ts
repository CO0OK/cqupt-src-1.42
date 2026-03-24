import { PrismaClient } from "@prisma/client";

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function announcementTypeToCn(type: "general" | "security" | "mall" | "maintenance"): string {
  if (type === "security") return "安全通知";
  if (type === "mall") return "商城动态";
  if (type === "maintenance") return "维护公告";
  return "常规";
}

function cnToAnnouncementType(type?: string): "general" | "security" | "mall" | "maintenance" {
  if (type === "安全通知") return "security";
  if (type === "商城动态") return "mall";
  if (type === "维护公告") return "maintenance";
  return "general";
}

export class AnnouncementsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listAnnouncements() {
    const rows = await this.prisma.announcement.findMany({
      include: {
        author: { select: { username: true } },
      },
      where: { status: { not: "archived" } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      date: toDateString(a.publishedAt ?? a.createdAt),
      author: a.author.username,
      type: announcementTypeToCn(a.type),
      isPinned: a.isPinned,
    }));
  }

  async createAnnouncement(input: {
    title?: string;
    content?: string;
    type?: string;
    isPinned?: unknown;
    authorName: string;
  }) {
    const dbAuthor = await this.prisma.user.findUnique({ where: { username: input.authorName } });
    if (!dbAuthor) throw new Error("AUTHOR_NOT_FOUND");

    const created = await this.prisma.announcement.create({
      data: {
        title: input.title ?? "",
        content: input.content ?? "",
        type: cnToAnnouncementType(input.type),
        isPinned: Boolean(input.isPinned),
        authorId: dbAuthor.id,
        status: "published",
        publishedAt: new Date(),
      },
      include: {
        author: { select: { username: true } },
      },
    });

    return {
      id: created.id,
      title: created.title,
      content: created.content,
      date: toDateString(created.publishedAt ?? created.createdAt),
      author: created.author.username,
      type: announcementTypeToCn(created.type),
      isPinned: created.isPinned,
    };
  }

  async archiveAnnouncement(id: string) {
    await this.prisma.announcement.update({
      where: { id },
      data: { status: "archived" },
    });
  }

  async updateAnnouncement(
    id: string,
    updates: { title?: unknown; content?: unknown; type?: unknown; isPinned?: unknown },
  ) {
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: typeof updates.title === "string" ? updates.title : undefined,
        content: typeof updates.content === "string" ? updates.content : undefined,
        type: typeof updates.type === "string" ? cnToAnnouncementType(updates.type) : undefined,
        isPinned: typeof updates.isPinned === "boolean" ? updates.isPinned : undefined,
      },
      include: {
        author: { select: { username: true } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      date: toDateString(updated.publishedAt ?? updated.createdAt),
      author: updated.author.username,
      type: announcementTypeToCn(updated.type),
      isPinned: updated.isPinned,
    };
  }
}
