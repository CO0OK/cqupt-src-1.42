/**
 * 创建 30 个测试账号
 * 用户名: 真实中文姓名
 * 统一认证码: 2025001 ~ 2025030
 * 密码规则: tmp + 统一认证码 (例如 tmp2025001)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const NAMES = [
  "张伟", "王芳", "李娜", "刘洋", "陈静",
  "杨磊", "赵敏", "黄浩", "周婷", "吴鑫",
  "徐超", "孙倩", "马龙", "朱慧", "胡杰",
  "郭燕", "何强", "林晨", "罗雪", "梁飞",
  "宋涛", "谢婷", "韩冰", "唐勇", "曹丽",
  "邓旭", "冯琳", "程浩", "蒋雨", "沈晨",
];

async function main() {
  const users = NAMES.map((name, i) => {
    const authCode = `2025${String(i + 1).padStart(3, "0")}`; // 2025001 ~ 2025030
    const password = `tmp${authCode}`;
    return { name, authCode, password };
  });

  console.log("开始创建测试账号...\n");
  console.log("用户名\t统一认证码\t密码");
  console.log("─".repeat(50));

  for (const { name, authCode, password } of users) {
    const username = name;
    const pinyin_index = NAMES.indexOf(name) + 1;
    const email = `testuser${String(pinyin_index).padStart(2,"0")}@cqupt.edu.cn`;
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { username },
      update: { authCode, passwordHash, status: "active", hasSignedAgreement: true },
      create: {
        username,
        authCode,
        email,
        passwordHash,
        role: "user",
        points: 0,
        status: "active",
        hasSignedAgreement: true,
        agreementSignedAt: new Date(),
      },
    });

    console.log(`${name}\t${authCode}\t\t${password}`);
  }

  console.log("\n✓ 30 个测试账号创建完成");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
