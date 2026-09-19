require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function test() {
  const payload = JSON.parse(fs.readFileSync('.securemax_db/vault_ledger.json', 'utf8'));
  const jsonString = JSON.stringify(payload);
  const { error, data } = await supabase.storage
    .from('securemax-vault')
    .upload('vault_ledger.json', jsonString, {
      contentType: 'application/json',
      upsert: true,
    });
  console.log("Upload result:", error ? error.message : "Success");
}
test();
