import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatAttachment, runChatCleanup } from '../supabase/functions/_shared/chatCleanup.js';

const origin = 'https://example.supabase.co';
const url = `${origin}/storage/v1/object/public/chat-images/123_photo.png`;

function fake({ snapshots = [], objects = [], claim = true, storageError = null, failUpsert = false, busy = false, failBatch = false } = {}) {
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'chat_cleanup_worker') return { data: args?.p_token || busy ? null : 'worker-token' };
      if (name === 'chat_cleanup_claim') return { data: claim };
      if (failBatch) return { error: { message: 'private information' } };
      return { data: args.p_dry_run ? { dry_run: true, candidates: [] } : { dry_run: false, messages_removed: snapshots.length } };
    },
    from(table) {
      const query = { table, operation: 'select' };
      const chain = {
        select() { return chain; }, order() { return chain; }, limit() { return chain; }, neq() { return chain; }, lte() { return chain; },
        eq() { return chain; },
        upsert(value) { query.operation='upsert'; query.value=value; return chain; },
        update(value) { query.operation='update'; query.value=value; return chain; },
        delete() { query.operation='delete'; return chain; },
        then(resolve, reject) {
          calls.push(query);
          return Promise.resolve(query.operation === 'upsert' && failUpsert ? { error: {} } : {
            data: query.operation === 'select' ? (table === 'chat_cleanup_queue' ? snapshots : objects) : null,
          }).then(resolve, reject);
        },
      };
      return chain;
    },
    storage: { from(bucket) { return { async remove(paths) { calls.push({ name:'storage', bucket, paths }); return { error: storageError }; } }; } },
  };
  return { client, calls };
}

test('only same-project, unambiguous chat object paths can be deleted', () => {
  assert.deepEqual(parseChatAttachment(url, origin), { bucket:'chat-images', object_name:'123_photo.png' });
  for (const raw of [url.replace(origin, 'https://other.supabase.co'), url.replace('chat-images', 'reports'),
    `${url}?token=secret`, `${origin}/storage/v1/object/public/chat-images/a%2F..%2Fb`,
    url.replace('123_photo.png', 'space%20name.png'), 'not a URL']) {
    assert.throws(() => parseChatAttachment(raw, origin));
  }
});

test('dry run never starts a worker or touches tables or storage', async () => {
  const { client, calls } = fake();
  assert.equal((await runChatCleanup(client, origin)).dry_run, true);
  assert.deepEqual(calls.map(c => c.name), ['chat_cleanup_batch']);
});

test('an overlapping worker exits without running a batch', async () => {
  const { client, calls } = fake({ busy:true });
  assert.equal((await runChatCleanup(client, origin, false)).skipped, 'worker_busy');
  assert.equal(calls.length, 1);
});

test('unknown attachment formats retain the durable snapshot', async () => {
  const { client, calls } = fake({ snapshots:[{ message_id:'m', image_url:'https://external.test/image.png' }] });
  assert.equal((await runChatCleanup(client, origin, false)).errors, 1);
  assert.ok(!calls.some(c => c.operation === 'delete' || c.name === 'storage'));
});

test('failed object queue write retains the original retry reference', async () => {
  const { client, calls } = fake({ failUpsert:true, snapshots:[{ message_id:'m', image_url:url }] });
  assert.equal((await runChatCleanup(client, origin, false)).errors, 1);
  assert.ok(!calls.some(c => c.operation === 'delete'));
});

test('shared/unapproved media is deferred without a Storage call', async () => {
  const { client, calls } = fake({ claim:false, objects:[{ bucket:'chat-images', object_name:'123_photo.png' }] });
  assert.equal((await runChatCleanup(client, origin, false)).deferred, 1);
  assert.ok(!calls.some(c => c.name === 'storage'));
});

test('Storage failure records a sanitized error and never marks deleted', async () => {
  const { client, calls } = fake({ storageError:{ statusCode:503, message:'private URL' }, objects:[{ bucket:'chat-images', object_name:'123_photo.png' }] });
  assert.equal((await runChatCleanup(client, origin, false)).errors, 1);
  assert.ok(calls.some(c => c.value?.error_code === 'STORAGE_DELETE_FAILED'));
  assert.ok(!calls.some(c => c.value?.state === 'deleted'));
});

test('successful and already-missing objects complete idempotently', async () => {
  for (const storageError of [null, { statusCode:404 }]) {
    const { client, calls } = fake({ storageError, objects:[{ bucket:'chat-images', object_name:'123_photo.png' }] });
    assert.equal((await runChatCleanup(client, origin, false)).media_removed, 1);
    assert.ok(calls.some(c => c.value?.state === 'deleted'));
  }
});

test('database failure still releases the worker, without exposing its error text', async () => {
  const { client, calls } = fake({ failBatch:true });
  await assert.rejects(runChatCleanup(client, origin, false), /DATABASE_OPERATION_FAILED/);
  assert.equal(calls.at(-1).args.p_token, 'worker-token');
});
