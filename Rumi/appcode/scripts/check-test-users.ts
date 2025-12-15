import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function checkUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('tiktok_handle, email, email_verified')
    .like('tiktok_handle', 'test%');

  console.log('Test users:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

checkUsers();
