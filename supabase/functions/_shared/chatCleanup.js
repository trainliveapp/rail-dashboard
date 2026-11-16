export function parseChatAttachment(raw, projectUrl) {
  if (!raw) return null;
  const url = new URL(raw);
  if (url.origin !== new URL(projectUrl).origin || url.search || url.hash) throw new Error('UNRECOGNIZED_ATTACHMENT');
  const prefix = '/storage/v1/object/public/';
  if (!url.pathname.startsWith(prefix)) throw new Error('UNRECOGNIZED_ATTACHMENT');
  const path = decodeURIComponent(url.pathname.slice(prefix.length));
  const slash = path.indexOf('/');
  const bucket = path.slice(0, slash);
  const name = path.slice(slash + 1);
  if (!['chat-images', 'chat-videos'].includes(bucket) || !/^[a-zA-Z0-9._/-]+$/.test(name)
      || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('UNRECOGNIZED_ATTACHMENT');
  return { bucket, object_name: name };
}

function checked(result) {
  if (result.error) throw new Error('DATABASE_OPERATION_FAILED');
  return result.data;
}

export async function runChatCleanup(client, projectUrl, dryRun = true) {
  if (dryRun) return checked(await client.rpc('chat_cleanup_batch', { p_dry_run: true }));
  const token = checked(await client.rpc('chat_cleanup_worker'));
  if (!token) return { dry_run: false, skipped: 'worker_busy' };
  try {
    return await runActiveCleanup(client, projectUrl);
  } finally {
    checked(await client.rpc('chat_cleanup_worker', { p_token: token }));
  }
}

async function runActiveCleanup(client, projectUrl) {
  const dryRun = false;
  const batch = checked(await client.rpc('chat_cleanup_batch', { p_dry_run: dryRun }));
  const counts = { ...batch, media_removed: 0, errors: 0, deferred: 0 };
  const snapshots = checked(await client.from('chat_cleanup_queue').select('*')
    .lte('retry_after', new Date().toISOString()).order('queued_at').limit(100));
  for (const row of snapshots) {
    try {
      // Parse both before writing anything. Unknown formats retain the snapshot.
      const objects = [row.image_url, row.video_url].filter(Boolean).map(url => parseChatAttachment(url, projectUrl));
      for (const object of objects) {
        checked(await client.from('chat_cleanup_objects').upsert(object, { onConflict: 'bucket,object_name', ignoreDuplicates: true }));
      }
      // Every path is now durable, including shared paths awaiting the final reference.
      checked(await client.from('chat_cleanup_queue').delete().eq('message_id', row.message_id));
    } catch {
      counts.errors++;
      // Failed/legacy URLs must not starve later snapshots forever.
      checked(await client.from('chat_cleanup_queue').update({
        retry_after: new Date(Date.now() + 60 * 60 * 1000).toISOString(), error_code: 'ATTACHMENT_QUEUE_FAILED',
      }).eq('message_id', row.message_id));
    }
  }
  const objects = checked(await client.from('chat_cleanup_objects').select('*').neq('state', 'deleted')
    .lte('retry_after', new Date().toISOString()).order('retry_after').limit(100));
  for (const object of objects) {
    try {
      const claimed = checked(await client.rpc('chat_cleanup_claim', { p_bucket: object.bucket, p_name: object.object_name }));
      if (!claimed) { counts.deferred++; continue; }
      const { error } = await client.storage.from(object.bucket).remove([object.object_name]);
      // Storage remove is idempotent; a missing object is already removed.
      if (error && !['404', 'NoSuchKey', 'not_found'].includes(String(error.statusCode ?? error.code))) {
        checked(await client.from('chat_cleanup_objects').update({ error_code: 'STORAGE_DELETE_FAILED' })
          .eq('bucket', object.bucket).eq('object_name', object.object_name));
        counts.errors++;
        continue;
      }
      checked(await client.from('chat_cleanup_objects').update({ state: 'deleted', error_code: null })
        .eq('bucket', object.bucket).eq('object_name', object.object_name));
      counts.media_removed++;
    } catch { counts.errors++; }
  }
  return counts;
}
