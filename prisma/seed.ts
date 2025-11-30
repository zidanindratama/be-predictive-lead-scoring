import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JOBS = [
  'admin',
  'blue-collar',
  'entrepreneur',
  'housemaid',
  'management',
  'self-employed',
  'services',
  'student',
  'technician',
  'unemployed',
] as const;

const MARITAL = ['married', 'single'] as const;

const EDUCATION = [
  'basic.4y',
  'basic.6y',
  'basic.9y',
  'high.school',
  'illiterate',
  'professional.course',
  'university.degree',
] as const;

const BINARY_OPTIONS = ['yes', 'no', 'unknown'] as const;
const CONTACT = ['cellular', 'telephone'] as const;

const MONTHS = [
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

function rand<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const f = (min: number, max: number, fd = 1) =>
  Number(faker.number.float({ min, max, fractionDigits: fd }).toFixed(fd));

function prob(yesChance = 0.3) {
  const target = Math.min(0.99, Math.max(0.01, yesChance));
  const variation = faker.number.float({ min: -0.1, max: 0.1 });
  let py = target + variation;
  py = Math.min(0.99, Math.max(0.01, py));
  const pn = 1 - py;
  return { py: Number(py.toFixed(4)), pn: Number(pn.toFixed(4)) };
}

async function seedUsers() {
  console.log('👤 Seeding Users...');
  const users = [
    {
      email: 'admin@smartbank.com',
      name: 'Super Admin',
      role: 'ADMIN' as const,
    },
    {
      email: 'staff@smartbank.com',
      name: 'Staff Member',
      role: 'STAFF' as const,
    },
    {
      email: 'user@smartbank.com',
      name: 'Regular User',
      role: 'USER' as const,
    },
  ];

  const hashed = await bcrypt.hash('password123', 10);

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hashed,
        avatarUrl: faker.image.avatar(),
      },
    });
  }
  console.log(`   ✅ ${users.length} users processed.`);
}

async function seedCustomers(count = 200) {
  console.log(`👥 Seeding ${count} Customers...`);
  const customers = [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 4);

  for (let i = 0; i < count; i++) {
    const isHighPotential = Math.random() < 0.3;

    const createdAt = faker.date.between({
      from: startDate,
      to: new Date(),
    });

    let row: any = {
      extId: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
      name: faker.person.fullName(),
      age: faker.number.int({ min: 20, max: 80 }),
      creditDefault: 'no',
      housing: rand(BINARY_OPTIONS),
      loan: rand(BINARY_OPTIONS),
      day_of_week: rand(DAYS),
      campaign: faker.number.int({ min: 1, max: 10 }),
      createdAt,
      updatedAt: createdAt,
    };

    if (isHighPotential) {
      row = {
        ...row,
        job: rand(['student', 'admin', 'management', 'technician']),
        marital: rand(['single', 'married']),
        education: rand(['university.degree', 'professional.course']),
        contact: 'cellular',
        month: rand(['mar', 'sep', 'oct', 'dec']),
        duration: faker.number.int({ min: 300, max: 1200 }),
        pdays: faker.number.int({ min: 0, max: 10 }),
        previous: faker.number.int({ min: 1, max: 6 }),
        poutcome: 'success',
        emp_var_rate: f(-3.4, -1.8),
        cons_price_idx: f(92.0, 93.5),
        cons_conf_idx: f(-50.0, -35.0),
        euribor3m: f(0.6, 1.5),
        nr_employed: f(4900, 5050),
      };
    } else {
      row = {
        ...row,
        job: rand(JOBS),
        marital: rand(MARITAL),
        education: rand(EDUCATION),
        contact: rand(CONTACT),
        month: rand(MONTHS),
        duration: faker.number.int({ min: 0, max: 250 }),
        pdays: 999,
        previous: 0,
        poutcome: 'nonexistent',
        emp_var_rate: f(1.1, 1.4),
        cons_price_idx: f(93.0, 94.5),
        cons_conf_idx: f(-42.0, -36.0),
        euribor3m: f(4.0, 5.0),
        nr_employed: f(5100, 5228),
      };
    }

    customers.push(row);
  }

  await prisma.customer.createMany({ data: customers });

  const results = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    take: count,
  });

  console.log(`   ✅ ${results.length} customers created.`);
  return results;
}

async function seedPredictions(customers: any[]) {
  console.log('🔮 Seeding Predictions (Simulating Past ML Results)...');
  const predictions = [];

  for (const cust of customers) {
    let score = 0.1;

    if (cust.duration > 600) score += 0.6;
    else if (cust.duration > 300) score += 0.3;
    else if (cust.duration < 60) score -= 0.05;

    if (cust.poutcome === 'success') score += 0.2;
    if (['student', 'management'].includes(cust.job)) score += 0.1;
    if (cust.contact === 'cellular') score += 0.05;

    const normalizedScore = Math.min(0.99, Math.max(0.01, score));

    const { py, pn } = prob(normalizedScore);
    const predictedClass = py >= 0.5 ? 'YES' : 'NO';

    const timestamp = new Date(cust.createdAt);
    timestamp.setMinutes(
      timestamp.getMinutes() + faker.number.int({ min: 5, max: 60 }),
    );

    predictions.push({
      customerId: cust.id,
      predictedClass,
      probabilityYes: py,
      probabilityNo: pn,
      source: 'system_seed_simulation',
      timestamp: timestamp,
    });
  }

  await prisma.prediction.createMany({ data: predictions });
  console.log(`   ✅ ${predictions.length} predictions created.`);
}

async function seedCampaigns(createdById: string) {
  console.log('📢 Seeding Campaigns...');

  const campaigns = [
    {
      name: 'Q3 Student Outreach',
      criteria: { job: 'student' },
    },
    {
      name: 'High Duration Follow-up',
      criteria: { duration: { gte: 300 } },
    },
    {
      name: 'Management & Professionals',
      criteria: { job: 'management', contact: 'cellular' },
    },
    {
      name: 'General Housing Loan',
      criteria: { housing: 'yes', loan: 'no' },
    },
  ];

  for (const c of campaigns) {
    const createdCamp = await prisma.campaign.create({
      data: {
        name: c.name,
        criteria: c.criteria,
        totalTargets: 0,
        yesCount: 0,
        noCount: 0,
        createdById,
      },
    });

    const criteria: any = c.criteria;
    const whereClause: any = {};

    for (const [key, val] of Object.entries(criteria)) {
      if (typeof val === 'object' && val !== null) {
        whereClause[key] = val;
      } else {
        whereClause[key] = val;
      }
    }

    const targets = await prisma.customer.findMany({
      where: whereClause,
      include: {
        Prediction: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    let yes = 0;
    let no = 0;

    targets.forEach((t: any) => {
      if (t.Prediction && t.Prediction.length > 0) {
        if (t.Prediction[0].predictedClass === 'YES') yes++;
        else no++;
      }
    });

    await prisma.campaign.update({
      where: { id: createdCamp.id },
      data: {
        totalTargets: targets.length,
        yesCount: yes,
        noCount: no,
      },
    });
  }

  console.log(`   ✅ ${campaigns.length} campaigns created & calculated.`);
}

async function main() {
  console.log('🚀 Starting Database Seed...');

  console.log('🧹 Cleaning existing data...');
  try {
    await prisma.prediction.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.log('   ⚠️ Cleanup skipped or partial (empty DB)');
  }

  await seedUsers();
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  const customers = await seedCustomers(300);

  await seedPredictions(customers);

  if (adminUser) {
    await seedCampaigns(adminUser.id);
  }

  console.log('✨ Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
