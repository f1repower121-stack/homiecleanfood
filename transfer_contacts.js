const fs = require('fs');

// Read the raw output file
let fileContent = fs.readFileSync('/Users/emre/.claude/projects/-Users-emre/7d515673-a54d-4148-b17c-0776b3928408/tool-results/toolu_0199U5G7wdNehPt5a5BkFpUo.txt', 'utf8');

// Find the position of the actual API response
const marker = '"text": "Wix Site API call successful: ';
const startIdx = fileContent.indexOf(marker);

if (startIdx === -1) {
  console.error('Could not find marker');
  process.exit(1);
}

// Find the JSON start (after the marker)
let jsonStart = fileContent.indexOf('{', startIdx + marker.length);
let braceCount = 0;
let jsonEnd = jsonStart;

// Find matching closing brace
for (let i = jsonStart; i < fileContent.length; i++) {
  if (fileContent[i] === '{') braceCount++;
  if (fileContent[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
}

const jsonStr = fileContent.substring(jsonStart, jsonEnd);

try {
  // Replace escaped quotes
  const unescaped = jsonStr.replace(/\\"/g, '"');
  const apiResponse = JSON.parse(unescaped);
  
  const contacts = apiResponse.contacts || [];
  console.log(`✅ Found ${contacts.length} contacts from Wix\n`);
  
  const simplified = contacts.map(c => {
    const name = `${c.info?.name?.first || ''} ${c.info?.name?.last || ''}`.trim();
    const phones = c.info?.phones?.items || [];
    const phone = phones.length > 0 ? phones[0].phone : c.primaryInfo?.phone || '';
    const addresses = c.info?.addresses?.items || [];
    const address = addresses.length > 0 ? addresses[0].address?.addressLine || '' : '';
    
    return {
      wixId: c.id,
      name,
      phone,
      address
    };
  });
  
  console.log('Sample contacts:');
  simplified.forEach((c, i) => {
    console.log(`${i+1}. Name: ${c.name || '(no name)'}`);
    console.log(`   Phone: ${c.phone}`);
    console.log(`   Address: ${c.address || '(no address)'}\n`);
  });
  
  fs.writeFileSync('/tmp/wix_contacts.json', JSON.stringify(simplified, null, 2));
  console.log(`✅ Saved ${simplified.length} contacts`);
  
} catch(e) {
  console.error('Error:', e.message);
}
