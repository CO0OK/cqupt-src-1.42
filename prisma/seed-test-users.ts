import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('初始化测试用户...');

  // 删除现有测试用户（可选）
  // await prisma.user.deleteMany({
  //   where: {
  //     authCode: {
  //       in: ['1234567', '9999999'],
  //     },
  //   },
  // });

  // 创建测试用户 1
  const user1 = await prisma.user.upsert({
    where: { authCode: '1234567' },
    update: {},
    create: {
      username: 'testuser',
      authCode: '1234567',
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('Test@123456', 10),
      role: 'user',
      points: 0,
      status: 'active',
      hasSignedAgreement: false,
    },
  });

  console.log('✓ 测试用户 1 创建成功');
  console.log(`  统一认证码: 1234567`);
  console.log(`  密码: Test@123456`);
  console.log(`  邮箱: test@example.com`);
  console.log('');

  // 创建测试用户 2 (管理员)
  const user2 = await prisma.user.upsert({
    where: { authCode: '9999999' },
    update: {},
    create: {
      username: 'admin',
      authCode: '9999999',
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('Admin@123456', 10),
      role: 'admin',
      points: 1000,
      status: 'active',
      hasSignedAgreement: true,
    },
  });

  console.log('✓ 测试用户 2 (管理员) 创建成功');
  console.log(`  统一认证码: 9999999`);
  console.log(`  密码: Admin@123456`);
  console.log(`  邮箱: admin@example.com`);
  console.log('');

  // 创建测试用户 3
  const user3 = await prisma.user.upsert({
    where: { authCode: '5555555' },
    update: {},
    create: {
      username: 'regularuser',
      authCode: '5555555',
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('User@123456', 10),
      role: 'user',
      points: 100,
      status: 'active',
      hasSignedAgreement: true,
    },
  });

  console.log('✓ 测试用户 3 创建成功');
  console.log(`  统一认证码: 5555555`);
  console.log(`  密码: User@123456`);
  console.log(`  邮箱: user@example.com`);
  console.log('');

  console.log('========================================');
  console.log('测试用户初始化完成！');
  console.log('========================================');
  console.log('');
  console.log('你可以使用以下凭证登录：');
  console.log('');
  console.log('普通用户：');
  console.log('  统一认证码: 1234567 或 5555555');
  console.log('  密码: Test@123456 或 User@123456');
  console.log('');
  console.log('管理员：');
  console.log('  统一认证码: 9999999');
  console.log('  密码: Admin@123456');
  console.log('');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
