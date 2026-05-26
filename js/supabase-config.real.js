// احتفظ بهذا الملف محلياً ولا ترفعه على GitHub!
// أضفه لـ .gitignore

const SUPABASE_URL = 'https://vpxdoozjmmiqnoneydmd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGRvb3pqbW1pcW5vbmV5ZG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDk2NDcsImV4cCI6MjA5NTE4NTY0N30.ruGym3zlxt9CgBH5PG4KhJBCMWoiDgtEySbBqykoG4M';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
