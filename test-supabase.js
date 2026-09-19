require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function test() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.storage.from('securemax-vault').list();
  if (error) {
    console.error("Error accessing bucket:", error.message);
  } else {
    console.log("Bucket access successful. Files:", data.length);
  }
}
test();
