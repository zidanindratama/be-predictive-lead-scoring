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
  'unknown',
] as const;

const MARITAL = ['single', 'married', 'divorced', 'unknown'] as const;

const EDUCATION = [
  'basic.4y',
  'basic.6y',
  'basic.9y',
  'high.school',
  'illiterate',
  'professional.course',
  'university.degree',
  'unknown',
] as const;

const CREDIT_DEFAULTS = ['yes', 'no', 'unknown'] as const;
const HOUSING_LOAN = ['yes', 'no', 'unknown'] as const;
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
  console.log(`Seeding ${count} customers...`);
  const customers = [];

  for (let i = 0; i < count; i++) {
    const age = faker.number.int({ min: 18, max: 85 });

    const row = {
      name: faker.person.fullName(),
      extId: faker.string.alphanumeric({ length: 8 }),
      age,
      job: rand(JOBS),
      marital: rand(MARITAL),
      education: rand(EDUCATION),

      creditDefault: rand(CREDIT_DEFAULTS),

      housing: rand(HOUSING_LOAN),
      loan: rand(HOUSING_LOAN),
      contact: rand(CONTACT),
      month: rand(MONTHS),
      day_of_week: rand(DAYS),

      duration: faker.number.int({ min: 0, max: 4900 }),

      campaign: faker.number.int({ min: 1, max: 20 }),
      pdays: faker.helpers.arrayElement([
        999,
        faker.number.int({ min: 0, max: 30 }),
      ]),
      previous: faker.number.int({ min: 0, max: 7 }),
      poutcome: rand(POUTCOME),

      emp_var_rate: f(-3.4, 1.4, 1),
      cons_price_idx: f(92.0, 95.0, 3),
      cons_conf_idx: f(-50.0, -20.0, 1),
      euribor3m: f(0.6, 5.0, 3),
      nr_employed: f(4900, 5228, 1),

      createdAt: faker.date.between({
        from: '2024-01-01T00:00:00.000Z',
        to: new Date(),
      }),
    };
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
      name: 'Tech Workers < 35',
      criteria: {
        job: { in: ['technician', 'management', 'services'] },
        age: { lt: 35 },
      },
    },
    {
      name: 'Retired Prospects',
      criteria: { job: 'retired', age: { gte: 55 } },
    },
    {
      name: 'University Graduates',
      criteria: { education: 'university.degree' },
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

async function seedPredictions(customerIds: string[]) {
  console.log('Seeding predictions...');
  const N = Math.floor(customerIds.length * 0.8);
  const data = [];

  for (let i = 0; i < N; i++) {
    const customerId = rand(customerIds);
    const yesBias = faker.number.float({ min: 0.1, max: 0.9 });
    const { py, pn } = prob(yesBias);
    const predictedClass = py >= pn ? 'YES' : 'NO';
    const ts = faker.date.between({
      from: faker.date.recent({ days: 60 }),
      to: new Date(),
    });

    data.push({
      customerId,
      predictedClass,
      probabilityYes: py,
      probabilityNo: pn,
      source: faker.helpers.arrayElement([
        'model_v1',
        'manual_upload',
        'campaign:gen_z',
      ]),
      timestamp: ts,
    });
  }

  await prisma.prediction.createMany({ data });
}

async function recomputeCampaignCounters() {
  console.log('Recomputing campaign counters...');
  const camps = await prisma.campaign.findMany();

  for (const c of camps) {
    const customers = await prisma.customer.findMany();

    const filtered = customers.filter((cust) => {
      const cr: any = c.criteria ?? {};
      let ok = true;

      if (cr.job) {
        if (typeof cr.job === 'string') ok &&= cust.job === cr.job;
        else if (cr.job.in) ok &&= cr.job.in.includes(cust.job as any);
      }
      if (cr.age) {
        if (cr.age.lt !== undefined) ok &&= cust.age < cr.age.lt;
        if (cr.age.lte !== undefined) ok &&= cust.age <= cr.age.lte;
        if (cr.age.gt !== undefined) ok &&= cust.age > cr.age.gt;
        if (cr.age.gte !== undefined) ok &&= cust.age >= cr.age.gte;
      }
      if (cr.education) {
        if (typeof cr.education === 'string')
          ok &&= cust.education === cr.education;
      }

      return ok;
    });

    const preds = await prisma.prediction.findMany({
      where: { customerId: { in: filtered.map((f) => f.id) } },
    });
    const yes = preds.filter((p) => p.predictedClass === 'YES').length;
    const no = preds.filter((p) => p.predictedClass === 'NO').length;

    await prisma.campaign.update({
      where: { id: c.id },
      data: { totalTargets: filtered.length, yesCount: yes, noCount: no },
    });
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
  await seedPredictions(customers.map((c) => c.id));
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
