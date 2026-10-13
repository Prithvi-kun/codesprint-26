const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  await supabase.from('teams').update({
    is_logged_in: false,
    wallet_balance: 1000,
    stamps: {},
    round_2_bet: null,
    in_round_2: false,
    current_locked_table: null
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  const { data, error } = await supabase.from('teams').select('id, access_code, avatar_id, wallet_balance, is_logged_in').order('avatar_id', { ascending: true });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total teams in DB:', data.length);
    console.log('All teams reset to is_logged_in: false');
    console.log('First 5 teams:', data.slice(0, 5));
    console.log('Last 4 teams:', data.slice(-4));
  }
}
check();
