import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminId = "11111111-1111-1111-1111-111111111111";
  const auditorId = "22222222-2222-2222-2222-222222222222";
  const userId = "33333333-3333-3333-3333-333333333333";
  const adminPasswordHash = await bcrypt.hash("admin", 10);
  const auditorPasswordHash = await bcrypt.hash("shenhe", 10);
  const userPasswordHash = await bcrypt.hash("temp", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      role: "admin",
      status: "active",
      points: 9999,
      hasSignedAgreement: true,
    },
    create: {
      id: adminId,
      username: "admin",
      authCode: "000001",
      email: "admin@cqupt.edu.cn",
      passwordHash: adminPasswordHash,
      role: "admin",
      points: 9999,
      status: "active",
      hasSignedAgreement: true,
      agreementSignedAt: new Date("2023-01-01T00:00:00.000Z"),
      lastLoginAt: new Date("2026-03-19T00:00:00.000Z"),
    },
  });

  await prisma.user.upsert({
    where: { username: "shenhe" },
    update: {
      role: "auditor",
      status: "active",
      points: 5000,
      hasSignedAgreement: true,
    },
    create: {
      id: auditorId,
      username: "shenhe",
      authCode: "000002",
      email: "shenhe@cqupt.edu.cn",
      passwordHash: auditorPasswordHash,
      role: "auditor",
      points: 5000,
      status: "active",
      hasSignedAgreement: true,
      agreementSignedAt: new Date("2023-06-15T00:00:00.000Z"),
      lastLoginAt: new Date("2026-03-19T00:00:00.000Z"),
    },
  });

  await prisma.user.upsert({
    where: { username: "temp" },
    update: {
      role: "user",
      status: "active",
      points: 1200,
      hasSignedAgreement: false,
    },
    create: {
      id: userId,
      username: "temp",
      authCode: "2024001",
      email: "temp@cqupt.edu.cn",
      passwordHash: userPasswordHash,
      role: "user",
      points: 1200,
      status: "active",
      hasSignedAgreement: false,
      lastLoginAt: new Date("2026-03-19T00:00:00.000Z"),
    },
  });

  const vuln1 = await prisma.vulnerability.upsert({
    where: { vulnCode: "VU-2024-001" },
    update: {
      title: "核心教务系统SQL注入漏洞",
      status: "fixing",
      severity: "critical",
      currentAuditorId: auditorId,
      rewardPoints: 300,
    },
    create: {
      id: "44444444-4444-4444-4444-444444444441",
      vulnCode: "VU-2024-001",
      title: "核心教务系统SQL注入漏洞",
      targetUrl: "https://jwzx.cqupt.edu.cn",
      vulnType: "sql_injection",
      severity: "critical",
      status: "fixing",
      description: "存在明显的 SQL 注入风险。",
      reproductionSteps: "在查询参数拼接 SQL 时可注入。",
      impactScope: "教务系统数据读写风险。",
      submitterId: userId,
      currentAuditorId: auditorId,
      rewardPoints: 300,
      submittedAt: new Date("2024-03-24T00:00:00.000Z"),
      approvedAt: new Date("2024-03-25T00:00:00.000Z"),
    },
  });

  const vuln2 = await prisma.vulnerability.upsert({
    where: { vulnCode: "VU-2024-002" },
    update: {
      title: "图书管理系统未授权访问",
      status: "approved",
      severity: "high",
      currentAuditorId: auditorId,
      rewardPoints: 200,
    },
    create: {
      id: "44444444-4444-4444-4444-444444444442",
      vulnCode: "VU-2024-002",
      title: "图书管理系统未授权访问",
      targetUrl: "https://lib.cqupt.edu.cn",
      vulnType: "auth_bypass",
      severity: "high",
      status: "approved",
      description: "未授权即可访问敏感数据。",
      reproductionSteps: "直接访问未鉴权接口。",
      impactScope: "用户信息泄露。",
      submitterId: userId,
      currentAuditorId: auditorId,
      rewardPoints: 200,
      submittedAt: new Date("2024-03-22T00:00:00.000Z"),
      approvedAt: new Date("2024-03-23T00:00:00.000Z"),
    },
  });

  await prisma.vulnerabilityAudit.upsert({
    where: { id: "55555555-5555-5555-5555-555555555551" },
    update: {},
    create: {
      id: "55555555-5555-5555-5555-555555555551",
      vulnerabilityId: vuln1.id,
      auditorId,
      action: "fixing",
      fromStatus: "approved",
      toStatus: "fixing",
      note: "厂商已开始修复。",
      createdAt: new Date("2024-03-25T00:00:00.000Z"),
    },
  });

  await prisma.vulnerabilityAudit.upsert({
    where: { id: "55555555-5555-5555-5555-555555555552" },
    update: {},
    create: {
      id: "55555555-5555-5555-5555-555555555552",
      vulnerabilityId: vuln2.id,
      auditorId,
      action: "approve",
      fromStatus: "reviewing",
      toStatus: "approved",
      note: "复现通过，审核通过。",
      createdAt: new Date("2024-03-23T00:00:00.000Z"),
    },
  });

  await prisma.userPointLog.upsert({
    where: { id: "66666666-6666-6666-6666-666666666661" },
    update: {},
    create: {
      id: "66666666-6666-6666-6666-666666666661",
      userId,
      changeType: "vuln_reward",
      delta: 200,
      balanceAfter: 1200,
      referenceType: "vulnerability",
      referenceId: vuln2.id,
      note: "漏洞奖励积分发放",
      createdById: adminId,
      createdAt: new Date("2024-03-23T00:00:00.000Z"),
    },
  });

  await prisma.announcement.upsert({
    where: { id: "77777777-7777-7777-7777-777777777771" },
    update: {},
    create: {
      id: "77777777-7777-7777-7777-777777777771",
      title: "关于开展2024年春季网络安全专项检查的通知",
      content: "为了进一步加强校园网络安全，定于本月开展专项检查。",
      type: "security",
      isPinned: true,
      status: "published",
      authorId: adminId,
      publishedAt: new Date("2024-03-15T00:00:00.000Z"),
      createdAt: new Date("2024-03-15T00:00:00.000Z"),
    },
  });

  await prisma.certificate.upsert({
    where: { certCode: "CERT-2024-001" },
    update: {},
    create: {
      id: "88888888-8888-8888-8888-888888888881",
      certCode: "CERT-2024-001",
      userId,
      vulnerabilityId: vuln2.id,
      title: "图书管理系统未授权访问 - 荣誉证书",
      certType: "honorary",
      status: "active",
      issuedById: adminId,
      issuedAt: new Date("2024-03-23T00:00:00.000Z"),
      createdAt: new Date("2024-03-23T00:00:00.000Z"),
    },
  });

  await prisma.product.upsert({
    where: { productCode: "P001" },
    update: {},
    create: {
      id: "99999999-9999-9999-9999-999999999991",
      productCode: "P001",
      name: "CQUPT 极客卫衣",
      category: "wear",
      imageUrl: "https://picsum.photos/seed/hoodie/200",
      pointsCost: 5000,
      stock: 45,
      status: "active",
      description: "SRC 定制卫衣。",
      createdAt: new Date("2024-03-10T00:00:00.000Z"),
    },
  });

  await prisma.product.upsert({
    where: { productCode: "P003" },
    update: {},
    create: {
      id: "99999999-9999-9999-9999-999999999993",
      productCode: "P003",
      name: "SRC 专属徽章",
      category: "peripheral",
      imageUrl: "https://picsum.photos/seed/badge/200",
      pointsCost: 500,
      stock: 200,
      status: "active",
      description: "SRC 徽章周边。",
      createdAt: new Date("2024-03-10T00:00:00.000Z"),
    },
  });

  await prisma.redemption.upsert({
    where: { redemptionCode: "R001" },
    update: {},
    create: {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      redemptionCode: "R001",
      userId,
      productId: "99999999-9999-9999-9999-999999999993",
      pointsCost: 500,
      quantity: 1,
      status: "issued",
      issuedById: adminId,
      issuedAt: new Date("2024-03-10T00:00:00.000Z"),
      note: "首批兑换记录",
      createdAt: new Date("2024-03-10T00:00:00.000Z"),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
