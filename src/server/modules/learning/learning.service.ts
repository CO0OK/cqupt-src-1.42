import { PrismaClient } from "@prisma/client";

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export class LearningService {
  constructor(private readonly prisma: PrismaClient) {}

  async listLabs() {
    const rows = await this.prisma.learningLab.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((lab) => ({
      id: lab.id,
      title: lab.title,
      description: lab.description,
      difficulty: lab.difficulty,
      category: lab.category,
      points: lab.pointsReward,
      url: lab.url,
      image: lab.imageUrl ?? "",
    }));
  }

  async listMaterials() {
    const rows = await this.prisma.learningMaterial.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((material) => ({
      id: material.id,
      title: material.title,
      author: material.authorName,
      date: toDateString(material.createdAt),
      type: material.materialType,
      url: material.url,
      image: material.imageUrl ?? "",
      description: material.description ?? "",
    }));
  }

  async listDiscussions() {
    const rows = await this.prisma.discussion.findMany({
      where: { status: "published" },
      include: { author: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((discussion) => ({
      id: discussion.id,
      title: discussion.title,
      author: discussion.author.username,
      date: toDateString(discussion.createdAt),
      replies: discussion.replyCount,
      category: discussion.category,
    }));
  }

  async createLab(input: {
    title?: unknown;
    description?: unknown;
    difficulty?: unknown;
    category?: unknown;
    points?: unknown;
    url?: unknown;
    image?: unknown;
  }) {
    const created = await this.prisma.learningLab.create({
      data: {
        title: String(input.title ?? ""),
        description: String(input.description ?? ""),
        difficulty: String(input.difficulty ?? "简单"),
        category: String(input.category ?? "其他"),
        pointsReward: Math.max(0, Number(input.points) || 0),
        url: String(input.url ?? ""),
        imageUrl: typeof input.image === "string" ? input.image : null,
        status: "published",
      },
    });

    return {
      id: created.id,
      title: created.title,
      description: created.description,
      difficulty: created.difficulty,
      category: created.category,
      points: created.pointsReward,
      url: created.url,
      image: created.imageUrl ?? "",
    };
  }

  async updateLab(
    id: string,
    input: {
      title?: unknown;
      description?: unknown;
      difficulty?: unknown;
      category?: unknown;
      points?: unknown;
      url?: unknown;
      image?: unknown;
    },
  ) {
    const updated = await this.prisma.learningLab.update({
      where: { id },
      data: {
        title: typeof input.title === "string" ? input.title : undefined,
        description: typeof input.description === "string" ? input.description : undefined,
        difficulty: typeof input.difficulty === "string" ? input.difficulty : undefined,
        category: typeof input.category === "string" ? input.category : undefined,
        pointsReward: input.points !== undefined ? Math.max(0, Number(input.points) || 0) : undefined,
        url: typeof input.url === "string" ? input.url : undefined,
        imageUrl: typeof input.image === "string" ? input.image : undefined,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      difficulty: updated.difficulty,
      category: updated.category,
      points: updated.pointsReward,
      url: updated.url,
      image: updated.imageUrl ?? "",
    };
  }

  async archiveLab(id: string) {
    await this.prisma.learningLab.update({
      where: { id },
      data: { status: "archived" },
    });
  }

  async createMaterial(input: {
    title?: unknown;
    author?: unknown;
    type?: unknown;
    url?: unknown;
    image?: unknown;
    description?: unknown;
  }) {
    const created = await this.prisma.learningMaterial.create({
      data: {
        title: String(input.title ?? ""),
        authorName: String(input.author ?? "admin"),
        materialType: String(input.type ?? "其他"),
        url: String(input.url ?? ""),
        imageUrl: typeof input.image === "string" ? input.image : null,
        description: typeof input.description === "string" ? input.description : null,
        status: "published",
      },
    });

    return {
      id: created.id,
      title: created.title,
      author: created.authorName,
      date: toDateString(created.createdAt),
      type: created.materialType,
      url: created.url,
      image: created.imageUrl ?? "",
      description: created.description ?? "",
    };
  }

  async updateMaterial(
    id: string,
    input: { title?: unknown; author?: unknown; type?: unknown; url?: unknown; image?: unknown; description?: unknown },
  ) {
    const updated = await this.prisma.learningMaterial.update({
      where: { id },
      data: {
        title: typeof input.title === "string" ? input.title : undefined,
        authorName: typeof input.author === "string" ? input.author : undefined,
        materialType: typeof input.type === "string" ? input.type : undefined,
        url: typeof input.url === "string" ? input.url : undefined,
        imageUrl: typeof input.image === "string" ? input.image : undefined,
        description: typeof input.description === "string" ? input.description : undefined,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      author: updated.authorName,
      date: toDateString(updated.createdAt),
      type: updated.materialType,
      url: updated.url,
      image: updated.imageUrl ?? "",
      description: updated.description ?? "",
    };
  }

  async archiveMaterial(id: string) {
    await this.prisma.learningMaterial.update({
      where: { id },
      data: { status: "archived" },
    });
  }

  async createDiscussion(authorId: string, input: { title?: unknown; category?: unknown; content?: unknown }) {
    const created = await this.prisma.discussion.create({
      data: {
        title: String(input.title ?? ""),
        authorId,
        category: String(input.category ?? "其他"),
        content: typeof input.content === "string" ? input.content : null,
        replyCount: 0,
        status: "published",
      },
      include: {
        author: { select: { username: true } },
      },
    });

    return {
      id: created.id,
      title: created.title,
      author: created.author.username,
      date: toDateString(created.createdAt),
      replies: created.replyCount,
      category: created.category,
    };
  }

  async archiveDiscussion(id: string) {
    await this.prisma.discussion.update({
      where: { id },
      data: { status: "archived" },
    });
  }
}
