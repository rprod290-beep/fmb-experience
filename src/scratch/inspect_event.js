const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://vicybokohpsmcuzvgbfi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpY3lib2tvaHBzbWN1enZnYmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTI0OTEsImV4cCI6MjEwMjc2ODQ5MX0.dR4Oo6PaplxZXBVPEl37ajJ0Tm8bDOtmImXeC-0OCzU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const email = 'fmb.experience.admin@gmail.com';
const password = 'FmbAdmin2026!';

async function inspect() {
  console.log('Logging in...');
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    console.error('Login error:', loginError);
    return;
  }
  
  console.log('Login successful. Querying events table...');
  const { data, error } = await supabase
    .from('events')
    .select('*');
  
  if (error) {
    console.error('Error fetching events:', error);
  } else {
    console.log('All events from table:', data);
  }
}
inspect();
