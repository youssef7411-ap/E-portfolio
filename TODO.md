# Vercel Build Fix TODO

## Steps:

- [x] Fix App.js ESLint/JSX error: Added BrowserRouter import and wrapped AppBody
- [ ] Test local build: cd frontend && npm run build (expect no warnings)
- [ ] Fix npm vulnerabilities: cd frontend && npm audit fix
- [ ] Optimize for Vercel
  - Create vercel.json
  - Skip API fetches during build
  - Add build command overrides if needed
- [ ] Get full Vercel build log
- [ ] Deploy test
