import fs from 'fs/promises';

const getArg = (name) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return undefined;
  return value;
};

const hasFlag = (name) => process.argv.includes(name);

const nowIso = () => new Date().toISOString();

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
};

const writeLogLine = async (logPath, obj) => {
  if (!logPath) return;
  await fs.appendFile(logPath, `${JSON.stringify(obj)}\n`);
};

const login = async (baseUrl, username, password) => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await safeJson(res);
  if (!res.ok || !data?.token) {
    const message = data?.message || `Login failed (${res.status})`;
    throw new Error(message);
  }
  return data.token;
};

const listPosts = async (baseUrl, token) => {
  const res = await fetch(`${baseUrl}/api/posts/admin/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await safeJson(res);
  if (!res.ok) {
    const message = data?.message || `List failed (${res.status})`;
    throw new Error(message);
  }
  return Array.isArray(data) ? data : [];
};

const deletePost = async (baseUrl, token, id) => {
  const res = await fetch(`${baseUrl}/api/posts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await safeJson(res);
  return { ok: res.ok, status: res.status, data };
};

const summarize = (results) => {
  const out = { deleted: 0, notFound: 0, failed: 0 };
  for (const r of results) {
    if (r.result === 'deleted') out.deleted += 1;
    else if (r.result === 'not_found') out.notFound += 1;
    else out.failed += 1;
  }
  return out;
};

const parseIds = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const main = async () => {
  const localApi = getArg('--local-api');
  const remoteApi = getArg('--remote-api');
  const ids = parseIds(getArg('--ids'));
  const deleteAll = hasFlag('--all');
  const dryRun = hasFlag('--dry-run');
  const confirm = getArg('--confirm');
  const logPath = getArg('--log') || process.env.DELETION_LOG_PATH;

  const username = getArg('--username') || process.env.ADMIN_USERNAME;
  const password = getArg('--password') || process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Missing admin credentials (set ADMIN_USERNAME and ADMIN_PASSWORD or pass --username/--password).');
    process.exit(1);
  }

  const targets = [
    localApi ? { name: 'local', baseUrl: localApi.replace(/\/$/, '') } : null,
    remoteApi ? { name: 'remote', baseUrl: remoteApi.replace(/\/$/, '') } : null,
  ].filter(Boolean);

  if (targets.length === 0) {
    console.error('Provide at least one target: --local-api and/or --remote-api');
    process.exit(1);
  }

  if (!deleteAll && ids.length === 0) {
    console.error('Provide --all or --ids id1,id2,...');
    process.exit(1);
  }

  const willDelete = confirm === 'DELETE' && !dryRun;

  const report = { ok: true, at: nowIso(), options: { deleteAll, dryRun, willDelete, targets: targets.map(t => t.name) }, targets: {} };

  for (const target of targets) {
    const tReport = { baseUrl: target.baseUrl, ok: false, scanned: 0, selected: 0, results: [] };
    report.targets[target.name] = tReport;

    try {
      const token = await login(target.baseUrl, username, password);
      const posts = await listPosts(target.baseUrl, token);
      tReport.scanned = posts.length;

      const selectedIds = deleteAll ? posts.map((p) => p?._id).filter(Boolean) : ids;
      tReport.selected = selectedIds.length;

      const byId = new Map(posts.map((p) => [String(p._id), p]));

      if (!willDelete) {
        tReport.results = selectedIds.map((id) => {
          const post = byId.get(String(id));
          return { id, result: post ? 'would_delete' : 'missing_in_target', title: post?.title || '' };
        });
        tReport.ok = true;
        continue;
      }

      for (const id of selectedIds) {
        const post = byId.get(String(id));
        const startedAt = nowIso();
        const res = await deletePost(target.baseUrl, token, id);
        const result =
          res.ok ? 'deleted'
            : res.status === 404 ? 'not_found'
              : 'failed';

        const entry = {
          at: startedAt,
          target: target.name,
          baseUrl: target.baseUrl,
          id,
          title: post?.title || '',
          result,
          status: res.status,
          message: res.data?.message || '',
        };
        tReport.results.push(entry);
        await writeLogLine(logPath, entry);
      }

      tReport.summary = summarize(tReport.results);
      tReport.ok = true;
    } catch (err) {
      tReport.error = String(err?.message || err);
      await writeLogLine(logPath, { at: nowIso(), target: target.name, baseUrl: target.baseUrl, result: 'target_failed', error: tReport.error });
      report.ok = false;
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (!willDelete) {
    console.log('No deletions executed. Use --confirm DELETE to perform deletions (and remove --dry-run if set).');
  }
};

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
