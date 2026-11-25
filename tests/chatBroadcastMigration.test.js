import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { CHAT_CHANNELS } from '../src/data/chatChannels.js'

test('Chatter Broadcast migration publishes only message IDs to private canonical rooms', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261125120000_chatter_private_broadcast.sql', import.meta.url),
    'utf8'
  )

  assert.match(migration, /create trigger chatter_notify_insert\s+after insert on public\.chat_messages\s+for each row/)
  assert.match(migration, /realtime\.send\(\s*pg_catalog\.jsonb_build_object\('id', new\.id\),\s*'message_inserted',\s*'chatter:' \|\| new\.channel_id,\s*true/s)
  assert.match(migration, /revoke all on function public\.chatter_notify_insert\(\) from public, anon, authenticated/)
  assert.match(migration, /on realtime\.messages\s+for select\s+to authenticated/s)
  assert.doesNotMatch(migration, /on realtime\.messages\s+for insert/i)

  for (const channel of CHAT_CHANNELS) {
    assert.ok(
      migration.includes(`'chatter:${channel.id}'`),
      `Broadcast policy is missing the ${channel.id} room`
    )
  }
})
