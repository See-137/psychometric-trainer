# Development Guide

## Project Structure

This project has been cleaned up to use a single, unified structure. **Always work from the root directory**, not from the `app/` subdirectory.

### Directory Layout

```
psychometric-trainer/               # <- WORK FROM HERE (root)
├── .git/                          # Main git repository
├── src/                           # React source code
├── public/                        # Public assets and exam data
├── scripts/                       # Build and parsing scripts
├── infra/                         # AWS infrastructure configs
├── content-pipeline/              # PDF parsing pipeline (Python)
│   ├── scripts/                   # Parser scripts
│   ├── schemas/                   # JSON schemas
│   └── README.md                  # Pipeline documentation
├── package.json                   # Dependencies and scripts
├── vite.config.ts                 # Vite configuration
└── README.md                      # Main project documentation
```

### Important Notes

- **Root Directory**: All development should be done from the root (`psychometric-trainer/`)
- **app/ Directory**: This is now ignored by git. It was a duplicate structure and has been deprecated.
- **Commands**: Run all npm commands from the root:
  ```bash
  npm run dev
  npm run build
  npm run test
  npm run clean:temp
  ```

## Git Workflow

```bash
# Work from root
cd psychometric-trainer

# Check status
git status

# Make changes, then commit
git add .
git commit -m "Your message"

# Push to GitHub
git push origin master
```

## Recent Fixes

1. **clean:temp script** - Fixed path from `scripts/temp/*` to `temp/*`
2. **Project structure** - Consolidated to single root-level structure
3. **content-pipeline** - Added Python PDF parsing pipeline
