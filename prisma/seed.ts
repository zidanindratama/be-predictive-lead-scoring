import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = ['ADMIN', 'STAFF', 'USER'] as const;

const JOBS = [
  'admin.',
  'blue-collar',
  'entrepreneur',
  'housemaid',
  'management',
  'retired',
  'self-employed',
  'services',
  'student',
  'technician',
  'unemployed',
] as const;

const MARITAL = ['single', 'married', 'divorced'] as const;

const EDUCATION = [
  'basic.4y',
  'basic.6y',
  'basic.9y',
  'high.school',
  'illiterate',
  'professional.course',
  'university.degree',
] as const;

const CREDIT_DEFAULTS = ['yes', 'no'] as const;
const HOUSING_LOAN = ['yes', 'no'] as const;
const CONTACT = ['cellular', 'telephone'] as const;
const POUTCOME = ['failure', 'nonexistent', 'success'] as const;

const MONTHS = [
  'jan',
  'feb',
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
  const py = Math.max(
    0,
    Math.min(
      1,
      faker.number.float({ min: yesChance - 0.15, max: yesChance + 0.15 }),
    ),
  );
  const pn = 1 - py;
  return { py: Number(py.toFixed(3)), pn: Number(pn.toFixed(3)) };
}

async function seedUsers() {
  console.log('Seeding users...');
  const users = [
    { email: 'admin@example.com', name: 'Admin One', role: 'ADMIN' as const },
    { email: 'staff@example.com', name: 'Staff One', role: 'STAFF' as const },
    { email: 'user@example.com', name: 'User One', role: 'USER' as const },
  ];
  const hashed = await bcrypt.hash('changeme123', 10);

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
}

async function seedCustomers(count = 100) {
  console.log(`Seeding ${count} customers (Target: 75% Likely Success)...`);
  const customers = [];

  for (let i = 0; i < count; i++) {
    const isSuccessProfile = Math.random() < 0.75;

    let row: any = {};

    const common = {
      name: faker.person.fullName(),
      extId: faker.string.alphanumeric({ length: 8 }),
      age: faker.number.int({ min: 18, max: 85 }),
      creditDefault: 'no',
      day_of_week: rand(DAYS),
      campaign: faker.number.int({ min: 1, max: 5 }),
      createdAt: faker.date.between({
        from: '2024-01-01T00:00:00.000Z',
        to: new Date(),
      }),
    };

    if (isSuccessProfile) {
      row = {
        ...common,
        job: rand(['admin.', 'retired', 'student', 'technician']),
        marital: rand(['single', 'married']),
        education: rand(['university.degree', 'professional.course']),
        housing: rand(['yes', 'yes', 'no']),
        loan: 'no',
        contact: 'cellular',
        month: rand(['oct', 'sep', 'mar', 'dec', 'apr']),

        duration: faker.number.int({ min: 350, max: 1500 }),

        pdays: faker.number.int({ min: 0, max: 15 }),
        previous: faker.number.int({ min: 1, max: 5 }),
        poutcome: 'success',

        emp_var_rate: f(-3.0, -1.0, 1),
        cons_price_idx: f(92.0, 94.0, 3),
        cons_conf_idx: f(-50.0, -35.0, 1),
        euribor3m: f(0.6, 1.5, 3),
        nr_employed: f(4900, 5100, 1),
      };
    } else {
      row = {
        ...common,
        job: rand(JOBS),
        marital: rand(MARITAL),
        education: rand(EDUCATION),
        housing: rand(HOUSING_LOAN),
        loan: rand(HOUSING_LOAN),
        contact: 'telephone',
        month: rand(['may', 'jul', 'nov']),

        duration: faker.number.int({ min: 0, max: 180 }),

        pdays: 999,
        previous: 0,
        poutcome: rand(['nonexistent', 'failure']),

        emp_var_rate: f(1.1, 1.4, 1),
        cons_price_idx: f(93.0, 95.0, 3),
        cons_conf_idx: f(-42.0, -30.0, 1),
        euribor3m: f(3.5, 5.0, 3),
        nr_employed: f(5100, 5228, 1),
      };
    }

    customers.push(row);
  }

  await prisma.customer.createMany({ data: customers });

  return prisma.customer.findMany({
    take: count,
    orderBy: { createdAt: 'desc' },
  });
}

async function seedCampaigns(createdById?: string) {
  console.log('Seeding campaigns...');
  const camps = [
    {
      name: 'High Value Targets (Success Oriented)',
      criteria: {
        job: { in: ['admin.', 'retired', 'student'] },
        contact: 'cellular',
      },
    },
    {
      name: 'Previous Success Campaign',
      criteria: { poutcome: 'success' },
    },
    {
      name: 'General Audience',
      criteria: { housing: 'yes' },
    },
  ];

  const created = [];
  for (const c of camps) {
    const camp = await prisma.campaign.create({
      data: {
        name: c.name,
        criteria: c.criteria as any,
        totalTargets: 0,
        yesCount: 0,
        noCount: 0,
        ...(createdById ? { createdById } : {}),
      },
      select: { id: true, name: true },
    });
    created.push(camp);
  }
  return created;
}

async function seedPredictions(customers: any[]) {
  console.log('Seeding predictions (Matching customer profile)...');
  const data = [];

  for (const cust of customers) {
    // 🔍 DEBUG: Pastikan duration terbaca
    if (cust.duration === undefined) {
      console.warn(
        `⚠️ Warning: Duration is undefined for ${cust.name}. Did you run 'npx prisma generate'?`,
      );
    }

    // Logika Simulasi AI Lebih Agresif:
    let yesChance = 0.05; // Base chance sangat kecil

    // Jika durasi telepon lama (> 5 menit), peluang closing SANGAT TINGGI
    if (cust.duration > 300) yesChance += 0.85;

    // Faktor pendukung lain
    if (cust.poutcome === 'success') yesChance += 0.1;
    if (cust.contact === 'cellular') yesChance += 0.05;
    if (cust.month === 'oct' || cust.month === 'mar') yesChance += 0.1;

    // Cap max 0.99 dan min 0.01
    yesChance = Math.min(0.99, Math.max(0.01, yesChance));

    const { py, pn } = prob(yesChance);

    // TENTUKAN KELAS:
    // Pastikan string 'YES' konsisten (Huruf Besar)
    const predictedClass = py >= 0.5 ? 'YES' : 'NO';

    const ts = faker.date.between({
      from: faker.date.recent({ days: 60 }),
      to: new Date(),
    });

    data.push({
      customerId: cust.id,
      predictedClass,
      probabilityYes: py,
      probabilityNo: pn,
      source: 'seed_script',
      timestamp: ts,
    });
  }

  await prisma.prediction.createMany({ data });
  console.log(`✅ Created ${data.length} predictions.`);
}

async function recomputeCampaignCounters() {
  console.log('Recomputing campaign counters...');
  const camps = await prisma.campaign.findMany();
  const allCustomers = await prisma.customer.findMany();

  const allPredictions = await prisma.prediction.findMany();

  for (const c of camps) {
    const filtered = allCustomers.filter((cust) => {
      const cr: any = c.criteria ?? {};
      let ok = true;

      if (cr.job && cr.job.in) ok &&= cr.job.in.includes(cust.job as any);
      if (cr.contact) ok &&= cust.contact === cr.contact;
      if (cr.poutcome) ok &&= cust.poutcome === cr.poutcome;
      if (cr.housing) ok &&= cust.housing === cr.housing;

      return ok;
    });

    const targetIds = filtered.map((f) => f.id);
    const campaignPreds = allPredictions.filter((p) =>
      targetIds.includes(p.customerId),
    );

    const yes = campaignPreds.filter(
      (p) => p.predictedClass === 'YES' || p.probabilityYes >= 0.5,
    ).length;

    const no = campaignPreds.length - yes;

    await prisma.campaign.update({
      where: { id: c.id },
      data: { totalTargets: filtered.length, yesCount: yes, noCount: no },
    });

    console.log(
      `Campaign: ${c.name} -> Targets: ${filtered.length}, YES: ${yes}, NO: ${no}`,
    );
  }
}

async function main() {
  console.log('🧹 Clearing old data...');
  try {
    await prisma.prediction.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (e) {
    console.log('Error clearing tables (might be empty), continuing...');
  }

  await seedUsers();

  const createdBy = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  const customers = await seedCustomers(100);

  await seedCampaigns(createdBy?.id);

  await seedPredictions(customers);

  await recomputeCampaignCounters();

  console.log('✅ Seeding done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
