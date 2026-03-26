import mongoose from 'mongoose';

const getArg = (name) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return undefined;
  return value;
};

const hasFlag = (name) => process.argv.includes(name);

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const sourceUri = getArg('--source') || process.env.MONGODB_SOURCE_URI;
const destUri = getArg('--dest') || process.env.MONGODB_DEST_URI;
const wipeDestination = hasFlag('--wipe-destination');
const mirror = hasFlag('--mirror');

if (!sourceUri || !destUri) {
  console.error('Missing --source/--dest (or MONGODB_SOURCE_URI/MONGODB_DEST_URI).');
  process.exit(1);
}

const connect = async (uri) => {
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  return conn;
};

const upsertMany = async (collection, docs) => {
  if (docs.length === 0) return { matched: 0, modified: 0, upserted: 0 };
  const batches = chunk(docs, 500);
  let matched = 0;
  let modified = 0;
  let upserted = 0;
  for (const batch of batches) {
    const res = await collection.bulkWrite(
      batch.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      })),
      { ordered: false }
    );
    matched += res.matchedCount || 0;
    modified += res.modifiedCount || 0;
    upserted += res.upsertedCount || 0;
  }
  return { matched, modified, upserted };
};

const main = async () => {
  const source = await connect(sourceUri);
  const dest = await connect(destUri);

  try {
    const sourceSubjects = await source.db.collection('subjects').find({}).toArray();
    const sourcePosts = await source.db.collection('posts').find({}).toArray();

    const subjectIds = new Set(sourceSubjects.map((s) => String(s._id)));
    const missing = sourcePosts
      .filter((p) => !p?.subject_id || !subjectIds.has(String(p.subject_id)))
      .slice(0, 20);

    if (missing.length > 0) {
      throw new Error('Found posts with missing/invalid subject_id. Fix local data before syncing.');
    }

    if (wipeDestination) {
      await dest.db.collection('posts').deleteMany({});
      await dest.db.collection('subjects').deleteMany({});
    }

    const subjectsResult = await upsertMany(dest.db.collection('subjects'), sourceSubjects);
    const postsResult = await upsertMany(dest.db.collection('posts'), sourcePosts);

    if (mirror) {
      const subjectIdList = sourceSubjects.map((s) => s._id);
      const postIdList = sourcePosts.map((p) => p._id);
      await dest.db.collection('posts').deleteMany({ _id: { $nin: postIdList } });
      await dest.db.collection('subjects').deleteMany({ _id: { $nin: subjectIdList } });
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          source: { subjects: sourceSubjects.length, posts: sourcePosts.length },
          destination: { subjects: subjectsResult, posts: postsResult },
          options: { wipeDestination, mirror },
        },
        null,
        2
      )
    );
  } finally {
    await source.close();
    await dest.close();
  }
};

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
