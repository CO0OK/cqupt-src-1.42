import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const VULN_TYPES = [
  'SQL注入',
  'XSS跨站脚本',
  '权限绕过',
  '信息泄露',
  '逻辑漏洞',
  '未授权访问',
  '文件上传',
  'SSRF',
  'CSRF',
  '任意文件读取',
];

const TARGETS = [
  'jwzx.cqupt.edu.cn',
  'lib.cqupt.edu.cn',
  'net.cqupt.edu.cn',
  'ecard.cqupt.edu.cn',
  'yjs.cqupt.edu.cn',
  'mail.cqupt.edu.cn',
  'vpn.cqupt.edu.cn',
  'oa.cqupt.edu.cn',
  'ids.cqupt.edu.cn',
  'course.cqupt.edu.cn',
];

const MODULES = ['登录', '查询', '导出', '审批', '上传', '检索', '统计', '详情'];

const STATUS_POOL = [
  'pending',
  'reviewing',
  'approved',
  'fixing',
  'fixed',
  'rejected',
  'hidden',
];

const SEVERITY_POOL = ['critical', 'high', 'medium', 'low', 'info'];

function pick(arr, idx) {
  return arr[idx % arr.length];
}

function buildDescription(type, target, moduleName) {
  return `${target} 的 ${moduleName} 功能存在 ${type} 风险，攻击者可在未授权或低权限场景下触发异常访问路径，可能导致业务数据泄露或篡改。`;
}

async function main() {
  const [submitters, auditors, maxCodeRow] = await Promise.all([
    prisma.user.findMany({ where: { role: 'user', status: 'active' }, select: { id: true, username: true } }),
    prisma.user.findMany({ where: { role: { in: ['admin', 'auditor'] }, status: 'active' }, select: { id: true } }),
    prisma.vulnerability.findFirst({
      where: { vulnCode: { startsWith: `VU-${new Date().getFullYear()}-` } },
      orderBy: { vulnCode: 'desc' },
      select: { vulnCode: true },
    }),
  ]);

  if (submitters.length === 0) throw new Error('No active user submitters found');
  if (auditors.length === 0) throw new Error('No active auditors/admins found');

  const year = new Date().getFullYear();
  let serial = 0;
  if (maxCodeRow?.vulnCode) {
    const raw = Number(maxCodeRow.vulnCode.split('-')[2]);
    serial = Number.isFinite(raw) ? raw : 0;
  }

  let created = 0;

  for (let i = 0; i < 80; i += 1) {
    serial += 1;
    const vulnCode = `VU-${year}-${String(serial).padStart(4, '0')}`;
    const type = pick(VULN_TYPES, i);
    const target = pick(TARGETS, i * 3 + 1);
    const moduleName = pick(MODULES, i * 5 + 2);
    const status = pick(STATUS_POOL, i * 7 + 3);
    const severity = pick(SEVERITY_POOL, i * 11 + 4);
    const submitter = pick(submitters, i * 13 + 5);
    const auditor = pick(auditors, i * 17 + 6);

    const submittedAt = new Date(Date.now() - (i + 1) * 6 * 60 * 60 * 1000);
    const approvedAt = ['approved', 'fixing', 'fixed', 'hidden'].includes(status)
      ? new Date(submittedAt.getTime() + 2 * 60 * 60 * 1000)
      : null;
    const fixedAt = status === 'fixed' ? new Date(submittedAt.getTime() + 8 * 60 * 60 * 1000) : null;

    const createdVuln = await prisma.vulnerability.create({
      data: {
        vulnCode,
        title: `${type}风险（${moduleName}模块）`,
        targetUrl: `https://${target}`,
        vulnType: type,
        severity,
        status,
        description: buildDescription(type, target, moduleName),
        reproductionSteps: JSON.stringify({
          attachmentName: `evidence-${vulnCode}.txt`,
          attachmentType: 'text/plain',
          attachmentData: `data:text/plain;base64,${Buffer.from(`POC for ${vulnCode}`).toString('base64')}`,
        }),
        impactScope: '可能影响师生账号、业务流程或敏感信息安全。',
        submitterId: submitter.id,
        currentAuditorId: ['pending'].includes(status) ? null : auditor.id,
        rewardPoints: status === 'fixed' ? 300 : status === 'approved' || status === 'fixing' ? 180 : 0,
        submittedAt,
        approvedAt,
        fixedAt,
      },
    });

    await prisma.vulnerabilityAudit.create({
      data: {
        vulnerabilityId: createdVuln.id,
        auditorId: ['pending'].includes(status) ? submitter.id : auditor.id,
        action:
          status === 'pending'
            ? 'submit'
            : status === 'reviewing'
              ? 'claim'
              : status === 'approved'
                ? 'approve'
                : status === 'fixing'
                  ? 'fixing'
                  : status === 'fixed'
                    ? 'fixed'
                    : status === 'hidden'
                      ? 'hide'
                      : 'reject',
        toStatus: status,
        note: `批量初始化数据：${vulnCode}`,
        createdAt: submittedAt,
      },
    });

    created += 1;
  }

  console.log(`[ADD_VULNS] Created ${created} vulnerabilities`);
}

main()
  .catch((err) => {
    console.error('[ADD_VULNS] FAIL', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
