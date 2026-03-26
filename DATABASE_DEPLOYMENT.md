# Online Database Deployment (MongoDB Atlas)

This project uses MongoDB + Mongoose. `Post.subject_id` references `Subject` by ObjectId, so preserving `_id` values is required to keep relationships identical.

## 1) Provision a hosted MongoDB (Atlas)

1. Create a MongoDB Atlas project and cluster.
2. Create a database user (use a strong password).
3. Configure Network Access:
   - Allow only your backend hosting provider egress IPs when possible.
   - If your host uses dynamic egress IPs, use the most restrictive option the host supports, or temporarily allow `0.0.0.0/0` only while testing, then tighten it.
4. Copy the Atlas connection string (SRV) and store it as `MONGODB_URI`.

## 2) Make the backend always use the hosted DB in production

The backend reads `MONGO_URI` (preferred) or `MONGODB_URI` (or `MONGO_URL`). In production, if the URI is missing, the server fails fast instead of silently falling back to an in-memory database.

Set these environment variables on your hosting platform (Railway/Render/etc.):
- `NODE_ENV=production`
- `MONGO_URI=<your Atlas URI>`
- `ALLOW_MEMORY_FALLBACK=false`
- `JWT_SECRET=<strong random secret>`
- `ADMIN_USERNAME=<your admin user>`
- `ADMIN_PASSWORD=<strong password>`

## 3) One-time migration: move your current local data to Atlas

Recommended: start with an empty destination database.

From `backend/`, run:

```bash
npm run db:sync -- --source "mongodb://localhost:27017/eportfolio" --dest "<your Atlas URI>" --wipe-destination
```

This copies `subjects` then `posts` while keeping `_id` values (so `subject_id` relationships remain identical).

## 4) Automated “sync” going forward

The simplest reliable way to keep the online database updated is to make it the single source of truth:
- Point your local backend to the same `MONGODB_URI` as production while you create/edit posts and subjects.
- Any changes you make locally through the admin UI/API are written directly to the hosted database (no separate replication step required).

If you still want a “local → remote” push, use the sync script:

```bash
npm run db:sync -- --source "<local Mongo URI>" --dest "<Atlas URI>"
```

Optional:
- `--mirror` deletes destination posts/subjects not present in the source.

## 5) Backups and restore

Prefer Atlas automated backups/point-in-time recovery if your plan supports it.

Additionally, this repo includes an export backup:

```bash
npm run db:backup
```

It writes a gzipped JSON backup into `backend/backups/` (ignored by git).

Restore:

```bash
npm run db:restore -- "/absolute/path/to/mongo-backup-posts-subjects-*.json.gz" --wipe
```

## 6) Verify hosted behavior matches local

Run the verification script against any database URI:

```bash
npm run db:verify
```

It checks:
- Counts are readable
- `Post.populate('subject_id')` works for sampled posts
- Subject sorting queries behave normally
