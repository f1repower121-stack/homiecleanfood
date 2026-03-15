import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SLACK_TOKEN = process.env.SLACK_TOKEN;

if (!SLACK_TOKEN) {
  console.error('❌ SLACK_TOKEN not found in .env.local');
  process.exit(1);
}

interface SlackCustomer {
  id: string;
  name: string;
  package: string;
  packageConsumed: number;
  packageTotal: number;
  pb: string | null;
  place: 'BKK' | 'PT';
  orderFrom: 'Messenger' | 'Whatsapp' | string;
}

interface DatabaseRecord {
  id: string;
  created_by: string;
  created_ts: number;
  last_updated_ts: number;
  fields: Record<string, any>;
}

async function fetchChannelId(channelName: string): Promise<string> {
  try {
    console.log(`🔍 Finding channel: ${channelName}`);
    const response = await axios.post(
      'https://slack.com/api/conversations.list',
      { types: 'public_channel,private_channel', limit: 100 },
      { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } }
    );

    if (!response.data.ok) {
      throw new Error(`Slack API error: ${response.data.error}`);
    }

    const channel = response.data.channels.find(
      (ch: any) => ch.name === channelName || ch.name === channelName.replace('#', '')
    );

    if (!channel) {
      throw new Error(`Channel #${channelName} not found`);
    }

    console.log(`✅ Found channel: ${channel.id}`);
    return channel.id;
  } catch (error: any) {
    console.error('❌ Error fetching channel:', error.message);
    throw error;
  }
}

async function fetchDatabaseRecords(channelId: string): Promise<DatabaseRecord[]> {
  try {
    console.log('📊 Fetching database records...');
    const response = await axios.post(
      'https://slack.com/api/database.views.list',
      { database_id: channelId },
      { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } }
    );

    if (!response.data.ok) {
      console.warn(`⚠️  Database API not available: ${response.data.error}`);
      console.log('Trying alternative method: fetching channel messages...');
      return [];
    }

    return response.data.records || [];
  } catch (error: any) {
    console.warn('⚠️  Database view fetch failed, trying message history...');
    return [];
  }
}

async function fetchChannelMessages(channelId: string): Promise<any[]> {
  try {
    console.log('📨 Fetching channel messages...');
    const response = await axios.post(
      'https://slack.com/api/conversations.history',
      { channel: channelId, limit: 1000 },
      { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } }
    );

    if (!response.data.ok) {
      throw new Error(`Slack API error: ${response.data.error}`);
    }

    console.log(`✅ Found ${response.data.messages.length} messages`);
    return response.data.messages;
  } catch (error: any) {
    console.error('❌ Error fetching messages:', error.message);
    throw error;
  }
}

function parseCustomerFromMessage(message: any): SlackCustomer | null {
  try {
    // Check if message has blocks (formatted data)
    if (message.blocks) {
      const blocks = message.blocks;
      let name = '';
      let packageInfo = '';
      let pb = '';
      let place = '';
      let orderFrom = '';

      for (const block of blocks) {
        if (block.type === 'section' && block.text?.text) {
          const text = block.text.text;
          if (text.includes('Package')) {
            packageInfo = text;
          } else if (!name && text.trim().length > 0) {
            name = text.trim();
          }
        }
        if (block.type === 'context' && block.elements) {
          for (const el of block.elements) {
            if (el.type === 'mrkdwn' || el.type === 'plain_text') {
              const text = el.text;
              if (text.includes('BKK') || text.includes('PT')) place = text;
              if (text.includes('Messenger') || text.includes('Whatsapp')) orderFrom = text;
              if (text.match(/\d+\/\d+/)) pb = text;
            }
          }
        }
      }

      if (name && packageInfo) {
        const packageMatch = packageInfo.match(/(\d+)\/(\d+)/);
        if (packageMatch) {
          return {
            id: message.ts,
            name,
            package: packageInfo,
            packageConsumed: parseInt(packageMatch[1]),
            packageTotal: parseInt(packageMatch[2]),
            pb: pb || null,
            place: (place.includes('BKK') ? 'BKK' : 'PT') as 'BKK' | 'PT',
            orderFrom: orderFrom || 'Unknown'
          };
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Slack Customer Data Export\n');

    // Step 1: Find channel
    const channelId = await fetchChannelId('delivery-schedule');

    // Step 2: Try database first, fall back to messages
    let records = await fetchDatabaseRecords(channelId);

    let customers: SlackCustomer[] = [];

    if (records.length > 0) {
      console.log(`📦 Processing ${records.length} database records...\n`);
      customers = records
        .map((record: any) => {
          const fields = record.fields || {};
          return {
            id: record.id,
            name: fields['name'] || 'Unknown',
            package: `${fields['package_consumed'] || 0}/${fields['package_total'] || 0}`,
            packageConsumed: fields['package_consumed'] || 0,
            packageTotal: fields['package_total'] || 0,
            pb: fields['pb'] || null,
            place: fields['place'] || 'BKK',
            orderFrom: fields['order_from'] || 'Unknown'
          };
        })
        .filter((c: SlackCustomer) => c.name !== 'Unknown');
    } else {
      // Fallback: fetch messages
      const messages = await fetchChannelMessages(channelId);
      console.log(`📦 Processing ${messages.length} messages...\n`);

      customers = messages
        .map(msg => parseCustomerFromMessage(msg))
        .filter((c): c is SlackCustomer => c !== null);
    }

    if (customers.length === 0) {
      console.warn('⚠️  No customer records found!');
      console.log('\nTrying direct API call to see raw data...');
      const rawResponse = await axios.post(
        'https://slack.com/api/conversations.info',
        { channel: channelId },
        { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } }
      );
      console.log(JSON.stringify(rawResponse.data, null, 2));
      return;
    }

    // Step 3: Save to JSON
    const outputPath = path.join(process.cwd(), 'slack-customers.json');
    fs.writeFileSync(outputPath, JSON.stringify(customers, null, 2));

    console.log(`\n✅ Export completed!\n`);
    console.log(`📊 Total customers: ${customers.length}`);
    console.log(`💾 Saved to: ${outputPath}\n`);
    console.log('Sample data:');
    console.log(JSON.stringify(customers.slice(0, 3), null, 2));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
