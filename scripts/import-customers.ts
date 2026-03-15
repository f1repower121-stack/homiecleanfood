import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  Contact: string;
  Package: string;
  PB: string;
  Place: string;
  'Order from': string;
  'Delivery Time': string;
  Preferences: string;
  Spicy: string;
  Calorie: string;
  Serious: string;
  Address: string;
  'Phone number': string;
  Completed: string;
  Assignee: string;
  'Due Date': string;
}

interface CustomerProfile {
  name: string;
  phone: string;
  location: 'BKK' | 'PT' | 'HuaHin' | 'Phangna' | 'Other';
  address: string;
  deliveryTime: string;
  orderChannel: string;
  status: 'active' | 'inactive' | 'completed' | 'paused';
  preferences: {
    meatPreference: string[];
    spicyLevel: number;
    targetCalories: number;
    allergies: string[];
    specialNotes: string;
  };
  package: {
    mealsConsumed: number;
    mealsTotal: number;
    pb?: number;
  };
}

function parsePackage(packageStr: string): { consumed: number; total: number } {
  const match = packageStr.match(/(\d+)\s*\/\s*(\d+|XX)/);
  if (!match) return { consumed: 0, total: 0 };
  return {
    consumed: parseInt(match[1]) || 0,
    total: match[2] === 'XX' ? 0 : parseInt(match[2]) || 0
  };
}

function parseCalories(calorieStr: string): number {
  const match = calorieStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function parseSpicy(spicyStr: string): number {
  const level = parseInt(spicyStr);
  return isNaN(level) ? 0 : Math.min(level, 3);
}

function parsePreferences(prefsStr: string): {
  meatPreference: string[];
  allergies: string[];
  specialNotes: string;
} {
  const prefs: string[] = [];
  const allergies: string[] = [];
  const lines = (prefsStr || '').split('\n').map(l => l.trim());

  const allergyKeywords = ['no nut', 'shrimp', 'pork', 'egg', 'dairy', 'seaweed', 'shellfish'];
  const meatKeywords = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'seabass', 'seafood', 'tofu', 'shrimp'];

  for (const line of lines) {
    if (!line) continue;

    const lower = line.toLowerCase();
    let isAllergy = false;

    for (const keyword of allergyKeywords) {
      if (lower.includes(keyword)) {
        allergies.push(line);
        isAllergy = true;
        break;
      }
    }

    if (!isAllergy && line.length > 0) {
      prefs.push(line);
    }
  }

  return {
    meatPreference: prefs.filter(p => meatKeywords.some(m => p.toLowerCase().includes(m))),
    allergies,
    specialNotes: prefs.join('; ')
  };
}

async function importCustomers() {
  try {
    console.log('🚀 Starting Customer Import\n');

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'CUSTOMER_DATABASE.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records: CSVRow[] = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`📊 Found ${records.length} customer records\n`);

    // Parse and prepare customer data
    const customers: CustomerProfile[] = records
      .filter(r => r.Contact && r.Contact.trim())
      .map((row: CSVRow) => {
        const pkg = parsePackage(row.Package);
        const prefs = parsePreferences(row.Preferences);

        return {
          name: row.Contact.trim(),
          phone: row['Phone number']?.trim() || '',
          location: (row.Place?.trim() || 'BKK') as any,
          address: row.Address?.trim() || '',
          deliveryTime: row['Delivery Time']?.trim() || '',
          orderChannel: row['Order from']?.trim() || 'Unknown',
          status: row.Completed === 'true' ? 'completed' : 'active',
          preferences: {
            meatPreference: prefs.meatPreference,
            spicyLevel: parseSpicy(row.Spicy),
            targetCalories: parseCalories(row.Calorie),
            allergies: prefs.allergies,
            specialNotes: prefs.specialNotes
          },
          package: {
            mealsConsumed: pkg.consumed,
            mealsTotal: pkg.total,
            pb: row.PB ? parseInt(row.PB.split('/')[0]) : undefined
          }
        };
      });

    console.log('📝 Sample customer:');
    console.log(JSON.stringify(customers[0], null, 2));
    console.log('\n');

    // Save to JSON file
    const outputPath = path.join(process.cwd(), 'customers-parsed.json');
    fs.writeFileSync(outputPath, JSON.stringify(customers, null, 2));
    console.log(`✅ Parsed data saved to: ${outputPath}\n`);

    // Create tables in Supabase (optional - depends on schema)
    console.log('🗄️  Preparing to import to Supabase...\n');

    // Show summary
    const locations = customers.reduce((acc, c) => {
      acc[c.location] = (acc[c.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const channels = customers.reduce((acc, c) => {
      acc[c.orderChannel] = (acc[c.orderChannel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Summary:');
    console.log(`   Total Customers: ${customers.length}`);
    console.log(`   Locations: ${JSON.stringify(locations)}`);
    console.log(`   Order Channels: ${JSON.stringify(channels)}`);
    console.log(`   Active: ${customers.filter(c => c.status === 'active').length}`);
    console.log(`   Completed: ${customers.filter(c => c.status === 'completed').length}\n`);

    console.log('✅ Import preparation complete!');
    console.log('📋 Next steps:');
    console.log('   1. Review customers-parsed.json');
    console.log('   2. Create Supabase tables for custom meal programs');
    console.log('   3. Run import to database');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importCustomers();
