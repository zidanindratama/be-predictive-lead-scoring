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
const EDUC = ['primary', 'secondary', 'tertiary', 'unknown'] as const;
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

async function seedCustomers(minCount = 20) {
  console.log('Seeding customers...');
  const customers = [];
  for (let i = 0; i < minCount; i++) {
    const age = faker.number.int({ min: 18, max: 85 });
    const job = rand(JOBS);
    const marital = rand(MARITAL);
    const education = rand(EDUC);
    const contact = rand(CONTACT);
    const month = rand(MONTHS);
    const day = rand(DAYS);

    const row = {
      name: faker.person.fullName(),
      extId: faker.string.alphanumeric({ length: 8 }),
      age,
      job,
      marital,
      education,
      contact,
      housing: faker.helpers.arrayElement(['yes', 'no']),
      loan: faker.helpers.arrayElement(['yes', 'no']),
      month,
      day_of_week: day,
      campaign: faker.number.int({ min: 0, max: 30 }),
      pdays: faker.number.int({ min: -1, max: 999 }),
      previous: faker.number.int({ min: 0, max: 10 }),
      poutcome: rand(POUTCOME),
      emp_var_rate: f(-3.4, 1.4, 1),
      cons_price_idx: f(92.0, 95.0, 1),
      cons_conf_idx: f(-50.0, -20.0, 1),
      euribor3m: f(0.5, 5.0, 3),
      nr_employed: f(4800, 5220, 1),
      createdAt: faker.date.between({
        from: '2024-11-01T00:00:00.000Z',
        to: new Date(),
      }),
    };
    customers.push(row);
  }

  await prisma.customer.createMany({ data: customers });
  return prisma.customer.findMany({
    take: minCount,
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
      name: 'Students & Singles',
      criteria: { OR: [{ job: 'student' }, { marital: 'single' }] },
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
  const N = Math.max(10, Math.min(30, Math.floor(customerIds.length * 1.5)));
  const data = [];

  for (let i = 0; i < N; i++) {
    const customerId = rand(customerIds);
    const yesBias = faker.number.float({ min: 0.2, max: 0.6 });
    const { py, pn } = prob(yesBias);
    const predictedClass = py >= pn ? 'YES' : 'NO';
    const ts = faker.date.between({
      from: faker.date.recent({ days: 120 }),
      to: new Date(),
    });

    data.push({
      customerId,
      predictedClass,
      probabilityYes: py,
      probabilityNo: pn,
      source: faker.helpers.arrayElement(['single', 'seed', 'campaign:demo']),
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
      if (cr.marital) {
        if (typeof cr.marital === 'string') ok &&= cust.marital === cr.marital;
        else if (cr.marital.in)
          ok &&= cr.marital.in.includes(cust.marital as any);
      }
      if (cr.OR && Array.isArray(cr.OR)) {
        const orOk = cr.OR.some((sub: any) => {
          if (sub.job) return cust.job === sub.job;
          if (sub.marital) return cust.marital === sub.marital;
          return false;
        });
        ok &&= orOk;
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
  await prisma.prediction.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  await seedUsers();

  const createdBy = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const customers = await seedCustomers(20);
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
