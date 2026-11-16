import { createClient } from 'npm:@supabase/supabase-js@2';
import { runChatCleanup } from '../_shared/chatCleanup.js';

Deno.serve(async (request) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const secret = Deno.env.get('CHAT_CLEANUP_SECRET');
  if (!secret || request.headers.get('x-cleanup-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }
  if (request.method !== 'POST') return new Response(null, { status: 405, headers });
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const client = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const result = await runChatCleanup(client, url, body.dry_run !== false);
    // Dry runs include private candidate paths in the authenticated response only.
    if (!result.dry_run) console.log(JSON.stringify(result));
    return new Response(JSON.stringify(result), { headers });
  } catch {
    console.error('CHAT_CLEANUP_FAILED');
    return new Response(JSON.stringify({ error: 'CHAT_CLEANUP_FAILED' }), { status: 500, headers });
  }
});
