# 📚 Psychometric Trainer (אימון פסיכומטרי)

A Progressive Web App (PWA) for practicing the Israeli Psychometric Entrance Test (PET/מבחן פסיכומטרי). Built with React, TypeScript, and deployed on AWS CloudFront.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)

## ✨ Features

- **📱 Progressive Web App** - Install on any device, works offline
- **🇮🇱 Full RTL Support** - Native Hebrew interface
- **📊 3 Official Exams** - Spring, Summer, Fall 2025 with 390+ questions
- **🎯 Smart Training** - Filter by section and question type
- **⏱️ Simulation Mode** - Full exam experience with timer
- **📈 Progress Tracking** - Statistics, streaks, and performance analytics
- **🔄 Offline Support** - Practice anywhere without internet
- **🛡️ Error Monitoring** - Sentry integration for production stability

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- AWS CLI (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/See-137/psychometric-trainer.git
cd psychometric-trainer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Sentry Error Monitoring (optional)
VITE_SENTRY_DSN=your-sentry-dsn

# Google Analytics 4 (optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🧪 Testing

```bash
# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests once
npm run test:run
```

## 🏗️ Building

```bash
# Production build
npm run build

# Preview production build locally
npm run preview
```

## 🚀 Deployment

### AWS S3 + CloudFront

```bash
# Deploy with cache invalidation
npm run deploy

# Quick deploy (skip build)
npm run deploy:quick
```

### Manual Deployment

```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 📁 Project Structure

```
psychometric-trainer/
├── public/
│   └── content/
│       └── exams/          # Parsed exam JSON files
├── src/
│   ├── components/
│   │   ├── common/         # Reusable UI components
│   │   └── question/       # Question display components
│   ├── pages/              # Route pages
│   ├── services/           # API, analytics, error tracking
│   ├── stores/             # Zustand state management
│   ├── types/              # TypeScript types
│   └── test/               # Test files
├── scripts/                # PDF parsing scripts
├── infra/                  # AWS infrastructure configs
├── content-pipeline/       # Python PDF parsing pipeline
│   ├── scripts/            # Parser and extraction scripts
│   └── schemas/            # JSON validation schemas
└── DEVELOPMENT.md          # Development guide
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| State | Zustand + Dexie (IndexedDB) |
| Routing | React Router 7 |
| PWA | Vite PWA + Workbox |
| Testing | Vitest + Testing Library |
| Monitoring | Sentry |
| Analytics | Google Analytics 4 |
| Hosting | AWS S3 + CloudFront |

## 📊 Question Types

### Verbal (חשיבה מילולית)
- Analogies (אנלוגיות)
- Sentence Completion (השלמת משפטים)
- Reading Comprehension (הבנת הנקרא)
- Logic (היגיון)

### Quantitative (חשיבה כמותית)
- Algebra (אלגברה)
- Geometry (גיאומטריה)
- Data Interpretation (פרשנות נתונים)
- Word Problems (בעיות מילוליות)

### English (אנגלית)
- Sentence Completion
- Restatements
- Reading Comprehension

## 🔒 Security

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NITE (National Institute for Testing and Evaluation) for official practice exams
- The Israeli education community

---

**Live Demo:** [https://di20bc9opj8ns.cloudfront.net](https://di20bc9opj8ns.cloudfront.net)
