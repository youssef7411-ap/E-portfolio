# Cloudflare R2 Setup - Remove Cloudinary References

**Goal**: Remove all Cloudinary code/logic, fully enable existing R2 backend storage, test/deploy.

**Information Gathered**:

- Backend already supports R2 (objectStorage.js uses @aws-sdk/client-s3).
- Frontend PostCard.js has Cloudinary-specific download logic to add 'fl_attachment'.
- No Cloudinary deps in backend.
- Deployment: Railway.toml (not Render).

**Plan**:

1. [x] Remove Cloudinary logic from frontend/src/components/PostCard.js (toDownloadUrl → return url).
2. [x] Create backend/.gitignore + .env.example.
3. [x] Deps confirmed (@aws-sdk/client-s3 present).
4. [ ] User provides R2 creds: ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME, PUBLIC_URL.
5. [ ] Test upload -> R2 URLs.
6. [ ] Update Railway env vars.

**Dependent Files**:

- frontend/src/components/PostCard.js
- backend/.gitignore, backend/.env.example
- TODO.md (track progress)

**Followup**:

- cd backend && npm run dev
- Upload test via admin
- railway deploy
