const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const users = [
  { name: '李晨宇', code: '1603101' },
  { name: '王思远', code: '1603102' },
  { name: '张奕轩', code: '1603103' },
  { name: '陈浩南', code: '1603104' },
  { name: '徐嘉怡', code: '1603105' },
  { name: '黄梓墨', code: '1603106' },
  { name: '赵欣怡', code: '1603107' },
  { name: '吴景睿', code: '1603108' },
  { name: '孙昊月', code: '1603109' },
  { name: '周铭泽', code: '1603110' },
  { name: '钱雨桐', code: '1603111' },
  { name: '邓宇昕', code: '1603112' },
  { name: '高子涵', code: '1603113' },
  { name: '唐嘉瑞', code: '1603114' },
  { name: '何清扬', code: '1603115' },
  { name: '林依诺', code: '1603116' },
  { name: '马会宇', code: '1603117' },
  { name: '郭天一', code: '1603118' },
  { name: '罗佳慧', code: '1603119' },
  { name: '蔡雨辰', code: '1603120' },
  { name: '樊馨予', code: '1603121' },
  { name: '彭逸飞', code: '1603122' },
  { name: '谢俊豪', code: '1603123' },
  { name: '姚晨曦', code: '1603124' },
  { name: '任书涵', code: '1603125' },
  { name: '潘昊天', code: '1603126' },
  { name: '宋文琪', code: '1603127' },
  { name: '严子豪', code: '1603128' },
  { name: '董若溪', code: '1603129' },
  { name: '蒋宇泽', code: '1603130' }
];

async function main() {
  console.log(`Starting upserting ${users.length} users...`);
  let count = 0;
  for (const user of users) {
    const passwordHash = await bcrypt.hash(`cqupt${user.code}`, 10);
    const email = `u${user.code}@cqupt.edu.cn`;
    
    await prisma.user.upsert({
      where: { authCode: user.code },
      update: {
        username: user.name,
        email: email,
        passwordHash: passwordHash,
        role: 'user',
        status: 'active',
        hasSignedAgreement: true,
        agreementSignedAt: new Date(),
      },
      create: {
        username: user.name,
        authCode: user.code,
        email: email,
        passwordHash: passwordHash,
        role: 'user',
        status: 'active',
        points: 0,
        hasSignedAgreement: true,
        agreementSignedAt: new Date(),
      },
    });
    count++;
    if (count % 5 === 0) console.log(`Upserted ${count} users...`);
  }
  console.log('Successfully completed upsert.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
