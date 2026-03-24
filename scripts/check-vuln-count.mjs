import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const total = await prisma.vulnerability.count();
const latest = await prisma.vulnerability.findMany({
  orderBy: { submittedAt: 'desc' },
  take: 5,
  select: { vulnCode: true, title: true, status: true, submittedAt: true },
});

console.log(JSON.stringify({ total, latest }, null, 2));
await prisma['$disconnect']();
