import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HIGH_POTENTIAL_JOBS = [
  'admin',
  'management',
  'retired',
  'student',
  'technician',
] as const;
const LOW_POTENTIAL_JOBS = [
  'blue-collar',
  'housemaid',
  'services',
  'unemployed',
  'entrepreneur',
  'self-employed',
] as const;

const HIGH_EDU = ['university.degree', 'professional.course'] as const;
const LOW_EDU = [
  'basic.4y',
  'basic.6y',
  'basic.9y',
  'high.school',
  'illiterate',
] as const;

const BINARY_OPTIONS = ['yes', 'no'] as const;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

function rand<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const f = (min: number, max: number, fd = 1) =>
  Number(faker.number.float({ min, max, fractionDigits: fd }).toFixed(fd));

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

async function seedCustomers(count = 5000) {
  console.log(
    `👥 Seeding ${count} Customers with ~80% YES probability logic...`,
  );
  const customers = [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  for (let i = 0; i < count; i++) {
    const isHighPotential = Math.random() < 0.8;

    const createdAt = faker.date.between({
      from: startDate,
      to: new Date(),
    });

    let row: any = {
      extId: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
      name: faker.person.fullName(),
      createdById: null,
      createdAt,
      updatedAt: createdAt,
    };

    if (isHighPotential) {
      row = {
        ...row,
        age: faker.number.int({ min: 30, max: 55 }),
        job: rand(HIGH_POTENTIAL_JOBS),
        marital: rand(['married', 'single']),
        education: rand(HIGH_EDU),
        creditDefault: 'no',
        housing: rand(BINARY_OPTIONS),
        loan: 'no',

        contact: 'cellular',
        month: rand(['mar', 'may', 'jun', 'oct', 'sep']),
        day_of_week: rand(['tue', 'wed', 'thu']),

        duration: faker.number.int({ min: 250, max: 1500 }),

        campaign: faker.number.int({ min: 1, max: 3 }),

        pdays: faker.number.int({ min: 3, max: 14 }),
        previous: faker.number.int({ min: 1, max: 4 }),
        poutcome: 'success',

        emp_var_rate: f(-3.0, -1.0),
        cons_price_idx: f(92.5, 94.0),
        cons_conf_idx: f(-40.0, -25.0),
        euribor3m: f(0.5, 1.5),
        nr_employed: f(4950, 5050),
      };
    } else {
      row = {
        ...row,
        age:
          Math.random() < 0.5
            ? faker.number.int({ min: 18, max: 24 })
            : faker.number.int({ min: 60, max: 85 }),
        job: rand(LOW_POTENTIAL_JOBS),
        marital: rand(['married', 'divorced', 'single']),
        education: rand(LOW_EDU),
        creditDefault: Math.random() < 0.1 ? 'yes' : 'no',
        housing: rand(BINARY_OPTIONS),
        loan: 'yes',

        contact: 'telephone',
        month: rand(['nov', 'jan', 'jul', 'aug']),
        day_of_week: rand(['mon', 'fri']),

        duration: faker.number.int({ min: 0, max: 180 }),

        campaign: faker.number.int({ min: 4, max: 15 }),

        pdays: 999,
        previous: 0,
        poutcome: 'nonexistent',

        emp_var_rate: f(1.0, 1.4),
        cons_price_idx: f(93.5, 94.8),
        cons_conf_idx: f(-50.0, -40.0),
        euribor3m: f(3.5, 5.0),
        nr_employed: f(5100, 5228),
      };
    }

    customers.push(row);
  }

  await prisma.customer.createMany({ data: customers });

  console.log(`   ✅ ${customers.length} customers created.`);
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
  await seedCustomers(5000);

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
