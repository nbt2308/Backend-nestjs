import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const role = await prisma.role.findFirst({
    where: { name: 'INSTRUCTOR' },
    include: { permissions: { include: { permission: true } } }
  });
  console.log('Instructor permissions count:', role.permissions.length);
  const hasInteract = role.permissions.some(rp => rp.permission.name === 'interaction.react');
  console.log('Has interaction.react:', hasInteract);
  
  const instructorUser = await prisma.user.findFirst({
    where: { email: 'instructor@example.com' },
    include: { roles: { include: { role: true } } }
  });
  console.log('Instructor user roles:', instructorUser?.roles.map(ur => ur.role.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
