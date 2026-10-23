import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

// Optional integration suite: point REVIEW_TEST_PGLITE_MODULE at an installed
// @electric-sql/pglite entry point. No production database or credentials used.
test('database enforces review identity, validation and one vote per account', {
  skip: !process.env.REVIEW_TEST_PGLITE_MODULE,
}, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.REVIEW_TEST_PGLITE_MODULE).href)
  const db = new PGlite()
  const first = '00000000-0000-0000-0000-000000000001'
  const second = '00000000-0000-0000-0000-000000000002'
  const unverified = '00000000-0000-0000-0000-000000000003'
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email_confirmed_at timestamptz, is_anonymous boolean default false);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      insert into auth.users values ('${first}', now(), false), ('${second}', now(), false), ('${unverified}', null, false);
    `)
    await db.exec(await readFile(new URL('../supabase/migrations/20261015000000_station_reviews.sql', import.meta.url), 'utf8'))
    await db.exec(`insert into public.station_ratings (station_id, user_id, cleanliness, created_at) values
      ('baker-street', '${first}', 1, now() - interval '2 days'),
      ('baker-street', '${first}', 3, now() - interval '1 day');`)
    await db.exec(await readFile(new URL('../supabase/migrations/20261023000000_strict_station_reviews.sql', import.meta.url), 'utf8'))
    const asUser = async (id) => {
      await db.exec('reset role; set role authenticated;')
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
    }
    const save = (station, ratings, text = null) => db.query('select public.save_station_review($1, $2::jsonb, $3) as id', [station, JSON.stringify(ratings), text])

    await db.exec('set role anon')
    assert.equal((await db.query('select count(*)::int as count from public.station_ratings')).rows[0].count, 1)
    await assert.rejects(save('baker-street', { cleanliness: 4 }), /permission denied/)
    await assert.rejects(db.exec("insert into public.station_ratings(station_id) values ('baker-street')"), /permission denied/)

    await asUser(unverified)
    await assert.rejects(save('baker-street', { cleanliness: 4 }), /Verify your email/)
    await asUser(first)
    await assert.rejects(db.exec("insert into public.station_ratings(station_id) values ('baker-street')"), /permission denied/)
    await assert.rejects(db.exec('update public.station_ratings set cleanliness = 5'), /permission denied/)
    await assert.rejects(db.exec('delete from public.station_ratings'), /permission denied/)
    for (const [ratings, text] of [[{}, null], [{ cleanliness: 0 }, null], [{ facilities: 6 }, null], [{ accessibility: 1.5 }, null], [{ cleanliness: '5' }, null], [{ user_id: second }, 'Text'], [{}, 'x'.repeat(501)], [{}, ' \n\t ']]) {
      await assert.rejects(save('baker-street', ratings, text))
    }
    await assert.rejects(save('', { cleanliness: 4 }))
    const initialId = (await save('baker-street', { cleanliness: 4 }, 'Clean station')).rows[0].id
    assert.equal((await save('baker-street', { facilities: 5 }, 'Updated experience')).rows[0].id, initialId)
    assert.equal((await db.query('select count(*)::int as count from public.station_ratings')).rows[0].count, 1)
    assert.equal((await db.query('select cleanliness from public.station_ratings')).rows[0].cleanliness, null)
    await asUser(second)
    await save('baker-street', { facilities: 1 })
    const score = (await db.query("select rating_count::int, overall_score::float from public.station_review_scores where station_id = 'baker-street'")).rows[0]
    assert.deepEqual(score, { rating_count: 2, overall_score: 3 })
    await save('another-station', {}, 'Description only')
    await db.exec('reset role')
    assert.equal((await db.query('select count(*)::int as count from public.station_ratings where superseded_at is not null')).rows[0].count, 1)
    await assert.rejects(db.exec(`insert into public.station_ratings (station_id, user_id, cleanliness) values ('baker-street', '${first}', 5)`), /duplicate key/)

    // Upgrade the strict migration to the account-free guest flow.
    await db.exec(await readFile(new URL('../supabase/migrations/20261023000001_guest_station_reviews.sql', import.meta.url), 'utf8'))
    await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false)")
    const guest = '10000000-0000-0000-0000-000000000001'
    const otherGuest = '10000000-0000-0000-0000-000000000002'
    const guestSave = (token, ratings, text = null) => db.query('select public.save_station_review($1, $2::jsonb, $3, $4::uuid) as id', ['guest-station', JSON.stringify(ratings), text, token])
    const mine = (token) => db.query('select * from public.get_my_station_review($1, $2::uuid)', ['guest-station', token])
    const guestId = (await guestSave(guest, { cleanliness: 5 })).rows[0].id
    assert.equal((await guestSave(guest, { cleanliness: 3 }, 'Edited guest review')).rows[0].id, guestId)
    assert.equal((await mine(guest)).rows[0].review_text, 'Edited guest review')
    assert.equal((await mine(otherGuest)).rows.length, 0)
    await assert.rejects(guestSave(null, { cleanliness: 5 }), /token is required/)
    for (const [ratings, text] of [[{}, ' \n\t '], [{ cleanliness: 6 }, null], [{ cleanliness: 1.5 }, null], [{ user_id: first }, 'Text'], [{}, 'x'.repeat(501)]]) {
      await assert.rejects(guestSave(guest, ratings, text))
    }
    await assert.rejects(db.exec('select * from public.station_review_guest_keys'), /permission denied/)
    await assert.rejects(db.exec('update public.station_ratings set cleanliness = 1'), /permission denied/)
    await guestSave(otherGuest, { cleanliness: 1 })
    assert.equal((await mine(guest)).rows[0].cleanliness, 3)
    const guestScore = (await db.query("select rating_count::int, overall_score::float from public.station_review_scores where station_id = 'guest-station'")).rows[0]
    assert.deepEqual(guestScore, { rating_count: 2, overall_score: 2 })
    await asUser(unverified)
    const accountReview = (await guestSave(guest, { cleanliness: 4 })).rows[0].id
    assert.notEqual(accountReview, guestId)
    assert.equal((await guestSave(otherGuest, { cleanliness: 2 })).rows[0].id, accountReview)
    await db.exec('reset role')
    assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count, 3)
    assert.equal((await db.query('select count(*)::int as count from public.station_review_guest_keys')).rows[0].count, 2)
  } finally { await db.close() }
})

test('guest migration works directly on the base schema and can be rerun', {
  skip: !process.env.REVIEW_TEST_PGLITE_MODULE,
}, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.REVIEW_TEST_PGLITE_MODULE).href)
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    `)
    await db.exec(await readFile(new URL('../supabase/migrations/20261015000000_station_reviews.sql', import.meta.url), 'utf8'))
    const migration = await readFile(new URL('../supabase/migrations/20261023000001_guest_station_reviews.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    const token = '10000000-0000-0000-0000-000000000003'
    const save = () => db.query('select public.save_station_review($1, $2::jsonb, $3, $4::uuid) as id', ['baker-street', '{"cleanliness":4}', 'Guest feedback', token])
    await db.exec('set role anon')
    const id = (await save()).rows[0].id
    await db.exec('reset role')
    await db.exec(migration)
    await db.exec('set role anon')
    assert.equal((await save()).rows[0].id, id)
    assert.equal((await db.query('select * from public.get_my_station_review($1, $2::uuid)', ['baker-street', token])).rows[0].id, id)
    assert.equal((await db.query('select rating_count::int as count from public.station_review_scores')).rows[0].count, 1)
    await assert.rejects(db.exec("insert into public.station_ratings (station_id) values ('baker-street')"), /permission denied/)
  } finally { await db.close() }
})
