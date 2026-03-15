import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

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
}

function parsePackage(packageStr: string) {
  const match = packageStr.match(/(\d+)\s*\/\s*(\d+|XX)/);
  if (!match) return { consumed: 0, total: 0 };
  return {
    consumed: parseInt(match[1]) || 0,
    total: match[2] === 'XX' ? 0 : parseInt(match[2]) || 0
  };
}

function parsePreferences(prefsStr: string) {
  const allergies = [];
  const preferences = [];
  
  const allergyKeywords = ['no nut', 'shrimp', 'pork', 'egg', 'dairy', 'seaweed', 'shellfish', 'no pork', 'no seabass', 'no beef', 'no seafood', 'no fish', 'no diary'];
  
  const lines = (prefsStr || '').split('\n').map(l => l.trim()).filter(l => l);
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    let isAllergy = false;
    
    for (const keyword of allergyKeywords) {
      if (lower.includes(keyword)) {
        allergies.push(line);
        isAllergy = true;
        break;
      }
    }
    
    if (!isAllergy) {
      preferences.push(line);
    }
  }
  
  return { preferences, allergies };
}

const csvPath = path.join(process.cwd(), 'CUSTOMER_DATABASE.csv');
const fileContent = fs.readFileSync(csvPath, 'utf-8');
const records: CSVRow[] = csv.parse(fileContent, {
  columns: true,
  skip_empty_lines: true
});

const customers = records
  .filter(r => r.Contact && r.Contact.trim())
  .map(row => {
    const pkg = parsePackage(row.Package);
    const prefs = parsePreferences(row.Preferences);
    
    return {
      name: row.Contact.trim(),
      phone: row['Phone number']?.trim() || '',
      location: row.Place?.trim() || 'BKK',
      address: row.Address?.trim() || '',
      deliveryTime: row['Delivery Time']?.trim() || '',
      orderChannel: row['Order from']?.trim() || 'Unknown',
      mealsConsumed: pkg.consumed,
      mealsTotal: pkg.total,
      targetCalories: parseInt(row.Calorie) || 0,
      spicyLevel: parseInt(row.Spicy) || 0,
      preferences: prefs.preferences,
      allergies: prefs.allergies,
      status: row.Completed === 'true' ? 'completed' : 'active'
    };
  });

fs.writeFileSync('customers-data.json', JSON.stringify(customers, null, 2));

console.log('✅ Parsed ' + customers.length + ' customers');
console.log('💾 Saved to: customers-data.json');
console.log('\n📊 Summary:');
console.log('   Total: ' + customers.length);
console.log('   BKK: ' + customers.filter(c => c.location === 'BKK').length);
console.log('   PT: ' + customers.filter(c => c.location === 'PT').length);
console.log('   Other: ' + customers.filter(c => c.location !== 'BKK' && c.location !== 'PT').length);
console.log('   Active: ' + customers.filter(c => c.status === 'active').length);
console.log('\n✨ Sample customer:');
console.log(JSON.stringify(customers[0], null, 2));
