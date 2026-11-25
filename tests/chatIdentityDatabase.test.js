import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const pgliteModule = process.env.CHAT_TEST_PGLITE_MODULE

test('database protects chat identity and makes sends idempotent', {
  skip: !pgliteModule,
}, async () => {
  const { PGlite } = await import(pathToFileURL(pgliteModule).href)
  const db = new PGlite()
  const firstUser = '00000000-0000-0000-0000-000000000001'
  const secondUser = '00000000-0000-0000-0000-000000000002'
  const thirdUser = '00000000-0000-0000-0000-000000000003'
  const legacyMessage = '10000000-0000-0000-0000-000000000001'
  const migration = await readFile(
    new URL('../supabase/migrations/20261125000000_chatter_anonymous_identity.sql', import.meta.url),
    'utf8'
  )

  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.chat_messages (
        id uuid primary key default gen_random_uuid(),
        username text not null default 'TrainLive User',
        message text not null,
        line text not null,
        channel_id text not null,
        image_url text,
        video_url text,
        created_at timestamptz not null default now()
      );
      create table public.chat_message_reactions (
        id uuid primary key default gen_random_uuid(),
        message_id uuid not null references public.chat_messages(id) on delete cascade,
        user_id uuid references auth.users(id) on delete cascade,
        visitor_id uuid,
        reaction text not null,
        created_at timestamptz not null default now(),
        check ((user_id is not null)::integer + (visitor_id is not null)::integer = 1)
      );
      alter table public.chat_message_reactions enable row level security;
      grant select, insert, update, delete on public.chat_message_reactions to anon, authenticated;
      create policy "Chat participants can add reactions"
        on public.chat_message_reactions for insert to anon, authenticated
        with check (user_id = auth.uid() or (user_id is null and visitor_id is not null));
      create policy "Chat participants can change reactions"
        on public.chat_message_reactions for update to anon, authenticated
        using (user_id = auth.uid() or (user_id is null and visitor_id is not null))
        with check (user_id = auth.uid() or (user_id is null and visitor_id is not null));
      create policy "Chat participants can remove reactions"
        on public.chat_message_reactions for delete to anon, authenticated
        using (user_id = auth.uid() or (user_id is null and visitor_id is not null));
      insert into public.chat_messages (id, username, message, line, channel_id)
      values ('${legacyMessage}', 'Old label', 'Old message', 'central', 'underground_central');
    `)
    await db.exec(migration)
    await db.exec(`insert into auth.users (id) values ('${firstUser}'), ('${secondUser}')`)

    const profiles = await db.query('select user_id, handle, display_name from public.chat_profiles order by user_id')
    assert.equal(profiles.rows.length, 2)
    assert.notEqual(profiles.rows[0].handle, profiles.rows[1].handle)
    assert.match(profiles.rows[0].handle, /^guest[0-9a-f]{12}$/)
    assert.equal(profiles.rows[0].display_name, `Guest ${profiles.rows[0].handle.slice(-4).toUpperCase()}`)
    await db.exec(`insert into auth.users (id) values ('${thirdUser}')`)
    await assert.rejects(db.exec(
      `update public.chat_profiles set handle = '${profiles.rows[0].handle}' where user_id = '${thirdUser}'`
    ), /duplicate key/)

    const legacy = await db.query('select username, author_id, author_handle from public.chat_messages where id = $1', [legacyMessage])
    assert.deepEqual(legacy.rows[0], { username: 'Old label', author_id: null, author_handle: null })

    const asUser = async (id) => {
      await db.exec('reset role; set role authenticated')
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
    }
    const updateName = (name) => db.query('select * from public.set_chat_display_name($1)', [name])
    const send = (clientId, content) => db.query(
      'select * from public.send_chat_message($1::uuid, $2, $3, $4, $5, $6)',
      [clientId, content, 'central', 'underground_central', null, null]
    )

    await asUser(firstUser)
    const originalHandle = profiles.rows[0].handle
    await updateName('London Commuter')
    await assert.rejects(db.query('update public.chat_profiles set handle = $1', [originalHandle]), /permission denied/)
    await assert.rejects(db.exec('select user_id from public.chat_profiles'), /permission denied/)
    await assert.rejects(db.exec(`
      insert into public.chat_messages (username, message, line, channel_id, author_id, author_handle, client_message_id)
      values ('Spoofed', 'forged', 'underground_central', 'underground_central',
        '${secondUser}', 'guest000000000000', gen_random_uuid())
    `), /permission denied/)

    const clientMessageId = '20000000-0000-0000-0000-000000000001'
    const firstSend = (await send(clientMessageId, 'hello')).rows[0]
    const retry = (await send(clientMessageId, 'hello')).rows[0]
    assert.equal(firstSend.id, retry.id)
    assert.equal(firstSend.author_id, firstUser)
    assert.equal(firstSend.username, 'London Commuter')
    assert.equal(firstSend.line, 'central')
    assert.equal(firstSend.channel_id, 'underground_central')
    assert.equal(firstSend.author_handle, originalHandle)
    for (let index = 2; index <= 10; index += 1) {
      await send(`20000000-0000-0000-0000-${String(index).padStart(12, '0')}`, `message ${index}`)
    }
    await assert.rejects(
      send('20000000-0000-0000-0000-000000000011', 'rate limited'),
      /CHAT_RATE_LIMITED/
    )

    await asUser(secondUser)
    await updateName('London Commuter')
    const secondSend = (await send('20000000-0000-0000-0000-000000000002', 'hello')).rows[0]
    assert.equal(secondSend.username, 'London Commuter')
    assert.notEqual(secondSend.author_handle, firstSend.author_handle)
    await assert.rejects(db.exec(
      "select * from public.set_chat_display_name('admin')"
    ), /CHAT_DISPLAY_NAME_INVALID/)
    await assert.rejects(db.exec(`
      insert into public.chat_message_reactions (message_id, user_id, reaction)
      values ('${firstSend.id}', '${firstUser}', '❤️')
    `), /row-level security/)
  } finally {
    await db.close()
  }
})
