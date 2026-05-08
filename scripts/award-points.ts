/**
 * 根据每个测试用户已有漏洞的 rewardPoints 累计积分，
 * 为每条已审核通过(approved/fixing/fixed)的漏洞写入积分日志并更新用户 points 字段。
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// 可获得积分的状态
const REWARD_STATUSES = ["approved", "fixing", "fixed"];

async function main() {
  // 查询所有测试用户
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: "testuser" } },
    select: { id: true, username: true, points: true },
  });

  if (testUsers.length === 0) {
    console.error("未找到测试用户");
    process.exit(1);
  }

  // 查询管理员账号（作为积分日志的 createdBy）
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true },
  });

  console.log("用户名\t\t\t漏洞数\t奖励漏洞数\t总积分\t\t更新后积分");
  console.log("─".repeat(75));

  for (const user of testUsers) {
    // 查询该用户所有漏洞
    const vulns = await prisma.vulnerability.findMany({
      where: { submitterId: user.id },
      select: { id: true, vulnCode: true, status: true, rewardPoints: true, submittedAt: true },
    });

    const rewardVulns = vulns.filter(v => REWARD_STATUSES.includes(v.status));
    const totalReward = rewardVulns.reduce((sum, v) => sum + v.rewardPoints, 0);

    if (totalReward === 0) {
      console.log(`${user.username.padEnd(20)}\t${vulns.length}\t0\t\t0\t\t${user.points}（无变化）`);
      continue;
    }

    // 逐条写入积分日志（按漏洞提交时间排序，计算累计余额）
    let runningBalance = user.points;

    for (const vuln of rewardVulns.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())) {
      // 避免重复写入（检查是否已有该漏洞的积分记录）
      const existing = await prisma.userPointLog.findFirst({
        where: { userId: user.id, referenceId: vuln.id, changeType: "vuln_reward" },
      });
      if (existing) continue;

      runningBalance += vuln.rewardPoints;
      await prisma.userPointLog.create({
        data: {
          userId: user.id,
          changeType: "vuln_reward",
          delta: vuln.rewardPoints,
          balanceAfter: runningBalance,
          referenceType: "vulnerability",
          referenceId: vuln.id,
          note: `漏洞奖励: ${vuln.vulnCode}`,
          createdById: admin?.id ?? null,
          createdAt: new Date(vuln.submittedAt.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 更新用户 points 字段
    const newPoints = user.points + totalReward;
    await prisma.user.update({
      where: { id: user.id },
      data: { points: newPoints },
    });

    console.log(`${user.username.padEnd(20)}\t${vulns.length}\t${rewardVulns.length}\t\t+${totalReward}\t\t${newPoints}`);
  }

  console.log("\n✓ 积分更新完成");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
