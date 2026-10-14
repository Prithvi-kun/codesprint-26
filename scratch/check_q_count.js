/* eslint-disable @typescript-eslint/no-require-imports */
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

async function checkQ() {
  const { data, error } = await supabase.from('question_bank').select('id, game_type, difficulty');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Current questions in DB count:', data ? data.length : 0);
  }
}
checkQ();
