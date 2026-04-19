require('dotenv').config({ path: '../auth-service/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_AUTH_URI = 'mongodb+srv://hassanzaheer200547_db_user:hassan123@cluster0.mj7lfl5.mongodb.net/fairgig_auth?appName=Cluster0';
const MONGODB_EARNINGS_URI = 'mongodb+srv://hassanzaheer200547_db_user:hassan123@cluster0.mj7lfl5.mongodb.net/fairgig_earnings?appName=Cluster0';
const MONGODB_GRIEVANCE_URI = 'mongodb+srv://hassanzaheer200547_db_user:hassan123@cluster0.mj7lfl5.mongodb.net/fairgig_grievance?appName=Cluster0';

const cities = ['Lahore', 'Karachi', 'Islamabad'];
const platforms = ['Uber', 'Foodpanda', 'Fiverr'];

const USERS = [
  { name: 'Ahmed Khan', email: 'ahmed@fairgig.pk', password: 'password123', role: 'worker', city: 'Lahore', platform: 'Uber' },
  { name: 'Sara Ali', email: 'sara@fairgig.pk', password: 'password123', role: 'worker', city: 'Karachi', platform: 'Foodpanda' },
  { name: 'Bilal Hassan', email: 'bilal@fairgig.pk', password: 'password123', role: 'worker', city: 'Islamabad', platform: 'Fiverr' },
  { name: 'Fatima Malik', email: 'fatima@fairgig.pk', password: 'password123', role: 'worker', city: 'Lahore', platform: 'Foodpanda' },
  { name: 'Omar Sheikh', email: 'omar@fairgig.pk', password: 'password123', role: 'worker', city: 'Karachi', platform: 'Uber' },
  { name: 'Zara Qureshi', email: 'zara@fairgig.pk', password: 'password123', role: 'verifier', city: 'Lahore', platform: 'Multiple' },
  { name: 'Hassan Raza', email: 'hassan@fairgig.pk', password: 'password123', role: 'advocate', city: 'Islamabad', platform: 'Multiple' },
  { name: 'Demo Worker', email: 'worker@demo.com', password: 'demo1234', role: 'worker', city: 'Lahore', platform: 'Uber' },
  { name: 'Demo Advocate', email: 'advocate@demo.com', password: 'demo1234', role: 'advocate', city: 'Karachi', platform: 'Multiple' },
  { name: 'Demo Verifier', email: 'verifier@demo.com', password: 'demo1234', role: 'verifier', city: 'Islamabad', platform: 'Multiple' },
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max));
}

function generateEarnings(workerId, city, platform, count = 30) {
  const earnings = [];
  const baseNet = platform === 'Fiverr' ? 25000 : platform === 'Uber' ? 18000 : 15000;

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i * 3);
    const dateStr = date.toISOString().split('T')[0];

    const variance = randomBetween(0.6, 1.4);
    const gross = Math.round(baseNet * variance * randomBetween(1.15, 1.35));
    const deductionRatio = randomBetween(0.08, 0.35);
    const deductions = Math.round(gross * deductionRatio);
    const net = gross - deductions;
    const hours = randomBetween(4, 12);
    const isAnomaly = deductionRatio > 0.28 || variance < 0.7;

    earnings.push({
      worker_id: workerId,
      date: dateStr,
      platform,
      city,
      gross_amount: gross,
      deductions,
      net_amount: net,
      hours_worked: parseFloat(hours.toFixed(1)),
      hourly_rate: parseFloat((net / hours).toFixed(2)),
      trips_or_orders: platform !== 'Fiverr' ? randomInt(8, 35) : null,
      notes: isAnomaly ? 'High deduction week' : null,
      screenshot_url: null,
      verification_status: i < 8 ? 'verified' : i < 20 ? 'pending' : 'pending',
      anomaly: isAnomaly ? {
        is_anomaly: true,
        score: parseFloat(randomBetween(0.3, 0.85).toFixed(3)),
        type: deductionRatio > 0.28 ? 'high_deduction' : 'income_drop',
        explanation: deductionRatio > 0.28
          ? `⚠️ Deductions are ${Math.round(deductionRatio * 100)}% of gross earnings — above 30% threshold`
          : '⚠️ Income dropped significantly below your recent average'
      } : {
        is_anomaly: false,
        score: 0,
        type: 'none',
        explanation: 'No anomalies detected. Earnings are within expected range.'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return earnings;
}

const COMPLAINT_TEMPLATES = [
  { title: 'Unjustified Account Suspension', description: 'My Uber account was suspended without any explanation or warning. I have been driving for 3 years with a 4.8 rating. This is affecting my livelihood.', platform: 'Uber', category: 'account_suspension', severity: 'critical' },
  { title: 'Excessive Commission Deductions', description: 'Foodpanda has increased commission from 20% to 35% without any notification. This is wage theft and unsustainable.', platform: 'Foodpanda', category: 'unfair_deduction', severity: 'high' },
  { title: 'Client Payment Withheld on Fiverr', description: 'Client cancelled order after receiving deliverables. Fiverr sided with client without reviewing evidence. Lost 15 days of work.', platform: 'Fiverr', category: 'wage_theft', severity: 'critical' },
  { title: 'GPS Manipulation Causing Income Loss', description: 'The app GPS keeps showing wrong location causing order cancellations. Customer service ignores my complaints.', platform: 'Foodpanda', category: 'other', severity: 'high' },
  { title: 'Discriminatory Rating System', description: 'My ratings dropped after I refused to work during heavy rain for safety. The algorithm penalizes workers who prioritize safety.', platform: 'Uber', category: 'discrimination', severity: 'high' },
  { title: 'No Insurance Coverage for Accident', description: 'I had an accident while on delivery and the platform refused to provide any insurance coverage despite promising it during onboarding.', platform: 'Foodpanda', category: 'safety', severity: 'critical' },
  { title: 'Fiverr Removing 5-Star Reviews', description: 'My 5-star reviews are being removed without explanation, damaging my profile and reducing orders by 60%.', platform: 'Fiverr', category: 'discrimination', severity: 'high' },
  { title: 'Late Night Safety Concerns', description: 'No safety protocols for late night deliveries. No emergency button works. I was robbed and the company took no responsibility.', platform: 'Uber', category: 'safety', severity: 'critical' },
  { title: 'Algorithm Reduces Orders After Complaint', description: 'Every time I file a complaint, my order frequency drops significantly for weeks. This is retaliation.', platform: 'Foodpanda', category: 'discrimination', severity: 'high' },
  { title: 'Missing Payment for Completed Orders', description: 'Three completed orders from last month still show as unpaid. Support is unresponsive. Total missing: PKR 4,500.', platform: 'Uber', category: 'wage_theft', severity: 'high' },
  { title: 'Sudden Drop in Order Assignment', description: 'My orders dropped 70% overnight with no explanation. I have maintained 4.9 rating for 2 years.', platform: 'Foodpanda', category: 'other', severity: 'medium' },
  { title: 'Forced to Accept Low-Paying Orders', description: 'The platform threatens deactivation if acceptance rate falls below 80%, forcing us to take unprofitable orders.', platform: 'Uber', category: 'unfair_deduction', severity: 'high' },
];

async function seedComplaints(grievanceDb, userIds) {
  const complaints = [];
  COMPLAINT_TEMPLATES.forEach((template, i) => {
    const workerId = userIds[i % Math.min(5, userIds.length)];
    const cityIndex = i % cities.length;
    complaints.push({
      worker_id: workerId,
      worker_name: ['Ahmed Khan', 'Sara Ali', 'Bilal Hassan', 'Fatima Malik', 'Omar Sheikh'][i % 5],
      title: template.title,
      description: template.description,
      platform: template.platform,
      city: cities[cityIndex],
      category: template.category,
      tags: [template.platform.toLowerCase(), template.category.replace('_', ' '), cities[cityIndex].toLowerCase()],
      status: i % 4 === 0 ? 'resolved' : i % 4 === 1 ? 'escalated' : 'open',
      cluster: getCluster(template.category),
      severity: template.severity,
      upvotes: randomInt(2, 45),
      upvoted_by: [],
      is_public: true,
      resolution_note: i % 4 === 0 ? 'Reviewed and resolved by advocate team.' : null,
      resolved_at: i % 4 === 0 ? new Date() : null,
      createdAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });
  });

  await grievanceDb.collection('complaints').deleteMany({});
  await grievanceDb.collection('complaints').insertMany(complaints);
  console.log(`✅ Seeded ${complaints.length} complaints`);
}

function getCluster(category) {
  const map = {
    'wage_theft': 'Wage Issues',
    'unfair_deduction': 'Unfair Deductions',
    'account_suspension': 'Account & Suspension',
    'discrimination': 'Algorithm Fairness',
    'safety': 'Safety Concerns',
    'other': 'App & Technical'
  };
  return map[category] || 'General';
}

async function main() {
  console.log('🌱 Starting FairGig database seed...\n');

  // Connect to auth DB
  const authConn = await mongoose.createConnection(MONGODB_AUTH_URI).asPromise();
  const earningsConn = await mongoose.createConnection(MONGODB_EARNINGS_URI).asPromise();
  const grievanceConn = await mongoose.createConnection(MONGODB_GRIEVANCE_URI).asPromise();

  // Seed users
  const usersDb = authConn.db;
  await usersDb.collection('users').deleteMany({});

  const seededUsers = [];
  for (const user of USERS) {
    const hashed = await bcrypt.hash(user.password, 12);
    const result = await usersDb.collection('users').insertOne({
      name: user.name,
      email: user.email,
      password: hashed,
      role: user.role,
      city: user.city,
      platform: user.platform,
      isActive: true,
      joinedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    seededUsers.push({ id: result.insertedId.toString(), ...user });
    console.log(`  👤 Created ${user.role}: ${user.email}`);
  }

  console.log(`\n✅ Seeded ${seededUsers.length} users\n`);

  // Seed earnings for workers
  const earningsDb = earningsConn.db;
  await earningsDb.collection('earnings').deleteMany({});

  const workers = seededUsers.filter(u => u.role === 'worker');
  let totalEarnings = 0;

  for (const worker of workers) {
    const count = randomInt(20, 35);
    const earnings = generateEarnings(worker.id, worker.city, worker.platform, count);
    await earningsDb.collection('earnings').insertMany(earnings);
    totalEarnings += earnings.length;
    console.log(`  💰 Seeded ${earnings.length} earnings for ${worker.name}`);
  }

  // Create indexes
  await earningsDb.collection('earnings').createIndex({ worker_id: 1 });
  await earningsDb.collection('earnings').createIndex({ date: -1 });
  await earningsDb.collection('earnings').createIndex({ platform: 1 });
  await earningsDb.collection('earnings').createIndex({ city: 1 });
  await earningsDb.collection('earnings').createIndex({ verification_status: 1 });

  console.log(`\n✅ Seeded ${totalEarnings} earnings records\n`);

  // Seed complaints
  const workerIds = workers.map(w => w.id);
  await seedComplaints(grievanceConn.db, workerIds);

  console.log('\n🎉 Database seeding complete!');
  console.log('\n📋 Demo Accounts:');
  console.log('  Worker:   worker@demo.com   / demo1234');
  console.log('  Advocate: advocate@demo.com / demo1234');
  console.log('  Verifier: verifier@demo.com / demo1234\n');

  await authConn.close();
  await earningsConn.close();
  await grievanceConn.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
