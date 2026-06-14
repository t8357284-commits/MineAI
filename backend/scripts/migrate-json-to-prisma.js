require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const prisma = require('../utils/prisma');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'socialpulse-db.json');

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('No JSON database found. Nothing to migrate.');
    return;
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  for (const user of db.users || []) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        plan: user.plan || 'free',
        role: user.role || 'user',
        isActive: user.isActive !== false,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        plan: user.plan || 'free',
        role: user.role || 'user',
        isActive: user.isActive !== false,
        createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
      },
    });
  }

  for (const project of db.projects || []) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        title: project.title,
        platform: project.platform || 'tiktok',
        description: project.description || '',
        status: project.status || 'active',
      },
      create: {
        id: project.id,
        userId: project.userId,
        title: project.title,
        platform: project.platform || 'tiktok',
        description: project.description || '',
        status: project.status || 'active',
        createdAt: project.createdAt ? new Date(project.createdAt) : undefined,
      },
    });
  }

  for (const script of db.scripts || []) {
    await prisma.script.upsert({
      where: { id: script.id },
      update: {
        title: script.title,
        platform: script.platform || 'tiktok',
        content: script.content || '',
        projectId: script.projectId || null,
      },
      create: {
        id: script.id,
        userId: script.userId,
        projectId: script.projectId || null,
        title: script.title,
        platform: script.platform || 'tiktok',
        content: script.content || '',
        createdAt: script.createdAt ? new Date(script.createdAt) : undefined,
      },
    });
  }

  for (const item of db.usage || []) {
    await prisma.usage.upsert({
      where: { userId_day: { userId: item.userId, day: item.day } },
      update: { aiRequests: item.aiRequests || 0 },
      create: { userId: item.userId, day: item.day, aiRequests: item.aiRequests || 0 },
    });
  }

  console.log('JSON data migrated to PostgreSQL successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
