const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const vulnSpecs = [
  { code: 'VU-2026-101', title: '教务查询接口SQL注入', targetUrl: 'https://jw.cqupt.edu.cn/api/query', type: 'sql_injection', severity: 'critical', status: 'fixing', submitterCode: '1603101', points: 380 },
  { code: 'VU-2026-102', title: '学工系统越权查看他人档案', targetUrl: 'https://xg.cqupt.edu.cn/profile', type: 'auth_bypass', severity: 'high', status: 'approved', submitterCode: '1603102', points: 220 },
  { code: 'VU-2026-103', title: '统一认证回调参数可篡改', targetUrl: 'https://sso.cqupt.edu.cn/callback', type: 'auth_logic', severity: 'critical', status: 'approved', submitterCode: '1603103', points: 320 },
  { code: 'VU-2026-104', title: '图书系统存储型XSS', targetUrl: 'https://lib.cqupt.edu.cn/comment', type: 'xss', severity: 'high', status: 'fixing', submitterCode: '1603101', points: 210 },
  { code: 'VU-2026-105', title: '资产管理端口信息泄露', targetUrl: 'https://asset.cqupt.edu.cn/debug', type: 'info_leak', severity: 'medium', status: 'pending', submitterCode: '1603104', points: 120 },
  { code: 'VU-2026-106', title: '校园网工单ID可枚举越权', targetUrl: 'https://netops.cqupt.edu.cn/ticket', type: 'auth_bypass', severity: 'high', status: 'approved', submitterCode: '1603105', points: 200 },
  { code: 'VU-2026-107', title: '竞赛报名接口限流绕过', targetUrl: 'https://acm.cqupt.edu.cn/register', type: 'business_logic', severity: 'medium', status: 'reviewing', submitterCode: '1603102', points: 110 },
  { code: 'VU-2026-108', title: '文件下载接口路径穿越', targetUrl: 'https://oa.cqupt.edu.cn/download', type: 'path_traversal', severity: 'high', status: 'fixing', submitterCode: '1603101', points: 240 },
  { code: 'VU-2026-109', title: '邮件重置验证码可暴力猜解', targetUrl: 'https://mail.cqupt.edu.cn/reset', type: 'weak_verification', severity: 'medium', status: 'approved', submitterCode: '1603118', points: 130 },
  { code: 'VU-2026-110', title: '实验平台命令注入风险', targetUrl: 'https://lab.cqupt.edu.cn/exec', type: 'command_injection', severity: 'critical', status: 'fixing', submitterCode: '1603123', points: 360 },
  { code: 'VU-2026-111', title: '选课系统反射型XSS', targetUrl: 'https://xk.cqupt.edu.cn/search', type: 'xss', severity: 'medium', status: 'approved', submitterCode: '1603103', points: 140 },
  { code: 'VU-2026-112', title: '公告后台CSRF可改公告', targetUrl: 'https://notice.cqupt.edu.cn/admin', type: 'csrf', severity: 'medium', status: 'pending', submitterCode: '1603129', points: 100 },
  { code: 'VU-2026-113', title: '资源平台JWT未校验alg', targetUrl: 'https://res.cqupt.edu.cn/api/auth', type: 'jwt_misconfig', severity: 'high', status: 'approved', submitterCode: '1603130', points: 230 },
  { code: 'VU-2026-114', title: '成绩查询接口缓存投毒', targetUrl: 'https://grade.cqupt.edu.cn/api', type: 'cache_poisoning', severity: 'medium', status: 'reviewing', submitterCode: '1603102', points: 120 },
  { code: 'VU-2026-115', title: '会议系统默认口令未修改', targetUrl: 'https://meet.cqupt.edu.cn/admin', type: 'weak_password', severity: 'low', status: 'rejected', submitterCode: '1603104', points: 60 },
  { code: 'VU-2026-116', title: '课程平台对象存储读权限过宽', targetUrl: 'https://course.cqupt.edu.cn/file', type: 'access_control', severity: 'high', status: 'approved', submitterCode: '1603118', points: 190 },
  { code: 'VU-2026-117', title: '迎新系统手机号明文返回', targetUrl: 'https://freshman.cqupt.edu.cn/api', type: 'privacy_leak', severity: 'medium', status: 'pending', submitterCode: '1603105', points: 90 },
  { code: 'VU-2026-118', title: '校友系统GraphQL越权查询', targetUrl: 'https://alumni.cqupt.edu.cn/graphql', type: 'auth_bypass', severity: 'high', status: 'fixing', submitterCode: '1603123', points: 210 },
  { code: 'VU-2026-119', title: 'API网关错误堆栈泄露密钥片段', targetUrl: 'https://api.cqupt.edu.cn/gateway', type: 'info_leak', severity: 'low', status: 'pending', submitterCode: '1603103', points: 50 },
  { code: 'VU-2026-120', title: '审核平台批量导出参数注入', targetUrl: 'https://audit.cqupt.edu.cn/export', type: 'injection', severity: 'critical', status: 'fixed', submitterCode: '1603101', points: 340 },
];

async function main() {
  const auditor = await prisma.user.findFirst({ where: { role: 'auditor', status: 'active' } });
  const now = new Date();

  let vulnUpserted = 0;
  let pointGranted = 0;

  for (let i = 0; i < vulnSpecs.length; i += 1) {
    const spec = vulnSpecs[i];
    const submitter = await prisma.user.findUnique({ where: { authCode: spec.submitterCode } });
    if (!submitter) throw new Error(`Submitter not found for authCode=${spec.submitterCode}`);

    const submittedAt = new Date(now.getTime() - (vulnSpecs.length - i) * 36 * 60 * 60 * 1000);
    const approvedAt = ['approved', 'fixing', 'fixed'].includes(spec.status) ? new Date(submittedAt.getTime() + 6 * 60 * 60 * 1000) : null;
    const fixedAt = spec.status === 'fixed' ? new Date(submittedAt.getTime() + 48 * 60 * 60 * 1000) : null;

    const vuln = await prisma.vulnerability.upsert({
      where: { vulnCode: spec.code },
      update: {
        title: spec.title,
        targetUrl: spec.targetUrl,
        vulnType: spec.type,
        severity: spec.severity,
        status: spec.status,
        description: `自动生成测试漏洞：${spec.title}`,
        reproductionSteps: '按平台测试流程复现。',
        impactScope: '影响对应业务模块。',
        submitterId: submitter.id,
        currentAuditorId: auditor ? auditor.id : null,
        rewardPoints: spec.points,
        submittedAt,
        approvedAt,
        fixedAt,
      },
      create: {
        vulnCode: spec.code,
        title: spec.title,
        targetUrl: spec.targetUrl,
        vulnType: spec.type,
        severity: spec.severity,
        status: spec.status,
        description: `自动生成测试漏洞：${spec.title}`,
        reproductionSteps: '按平台测试流程复现。',
        impactScope: '影响对应业务模块。',
        submitterId: submitter.id,
        currentAuditorId: auditor ? auditor.id : null,
        rewardPoints: spec.points,
        submittedAt,
        approvedAt,
        fixedAt,
      },
    });

    vulnUpserted += 1;

    // 避免重复发分：若已存在以此漏洞为 reference 的奖励日志，则跳过
    const existedLog = await prisma.userPointLog.findFirst({
      where: {
        userId: submitter.id,
        changeType: 'vuln_reward',
        referenceType: 'vulnerability',
        referenceId: vuln.id,
      },
    });

    if (!existedLog) {
      const updatedUser = await prisma.user.update({
        where: { id: submitter.id },
        data: { points: { increment: spec.points } },
        select: { points: true },
      });

      await prisma.userPointLog.create({
        data: {
          userId: submitter.id,
          changeType: 'vuln_reward',
          delta: spec.points,
          balanceAfter: updatedUser.points,
          referenceType: 'vulnerability',
          referenceId: vuln.id,
          note: `漏洞奖励：${spec.code}`,
          createdById: auditor ? auditor.id : null,
        },
      });

      pointGranted += spec.points;
    }
  }

  console.log(`VULN_UPSERTED=${vulnUpserted}`);
  console.log(`POINT_GRANTED_TOTAL=${pointGranted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
