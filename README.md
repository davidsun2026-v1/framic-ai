# CreatorOS - Enterprise AI Creator Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)

## 🎬 Project Overview

**CreatorOS** is a subscription-based AI creator platform that enables users to generate, manage, and monetize AI-generated content from a unified workspace.

Generate creator-grade content comparable to modern AI tools while maintaining a sustainable credit-based business model.

---

## ✨ Key Features

### Phase 1 (MVP)
- 🔐 **Authentication** - Secure user signup/login with email verification
- 👤 **User Dashboard** - Real-time credits, usage analytics, generation history
- 💳 **Credits System** - Tracked, auditable credit transactions
- 🖼️ **Text-to-Image** - AI image generation via Replicate
- 🎨 **Image-to-Image** - Style transfer and image editing
- 💰 **Billing** - Subscription management with Paystack
- 📚 **Asset Library** - Organized user-owned asset storage

### Phase 2 (Planned)
- 🎥 **Text-to-Video** - AI video generation
- 📹 **Image-to-Video** - Motion synthesis
- 🎬 **Video Extensions** - Video editing tools
- 🎯 **Project Workspaces** - Collaborative project management

### Phase 3 (Future)
- 🏪 **Marketplace** - Buy/sell created assets
- 👥 **Team Collaboration** - Multi-user workspaces
- 🔄 **Shared Assets** - Library sharing & permissions

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Build Tool**: Turbo (monorepo)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Supabase Auth
- **API**: Next.js API Routes

### AI & Integrations
- **AI Provider**: Replicate (image/video generation)
- **Payments**: Paystack (Nigerian Naira support)
- **Monitoring**: Sentry (error tracking)
- **File Storage**: AWS S3 / MinIO (local dev)

### DevOps & Deployment
- **Hosting**: Vercel
- **Containerization**: Docker & Docker Compose
- **Code Quality**: Biome (linter/formatter)
- **Package Manager**: Bun / npm

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun runtime
- Docker & Docker Compose (for local services)
- Git

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/davidsun2026-v1/framic-ai.git
cd framic-ai
```

2. **Install dependencies**
```bash
bun install
# or
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. **Start local services** (Supabase, MinIO, etc.)
```bash
docker-compose up -d
```

5. **Run database migrations**
```bash
bun run db:migrate
# or
npm run db:migrate
```

6. **Start development server**
```bash
bun run dev
# or
npm run dev
```

The app will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
framic-ai/
├── apps/                      # Application directories
│   ├── web/                  # Next.js frontend
│   └── api/                  # API routes & backend logic
├── packages/                  # Shared packages
│   ├── ui/                   # Shared UI components
│   ├── core/                 # Core business logic
│   ├── types/                # TypeScript types & interfaces
│   └── utils/                # Utility functions
├── docs/                      # Documentation
│   ├── 00-FOUNDATION/        # Project charter & specs
│   ├── 01-GETTING_STARTED/   # Setup guides
│   ├── 02-MODULES/           # Module documentation
│   ├── 03-OPERATIONS/        # DevOps & monitoring
│   ├── 04-TESTING/           # Testing guides
│   └── 05-ADVANCED/          # Advanced topics
├── scripts/                   # Build & deploy scripts
├── .github/                   # GitHub Actions workflows
├── docker-compose.yml         # Local services config
├── turbo.json                # Monorepo configuration
├── package.json              # Project metadata
├── biome.jsonc               # Linter/formatter config
└── .env.example              # Environment template
```

---

## 🔐 Non-Negotiable Rules

These rules are enforced throughout the codebase:

1. ✅ **No mock payment flows** - All payments go through Paystack
2. ✅ **No credit bypass** - Credits deducted before generation
3. ✅ **Full generation tracking** - Every generation logged
4. ✅ **Complete API logging** - Every API call recorded
5. ✅ **User asset ownership** - Every asset belongs to a user
6. ✅ **Subscription auditability** - All changes tracked
7. ✅ **Production-ready code only** - No throwaway code

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [SETUP.md](./SETUP.md) | Detailed environment & dependency setup |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code standards & PR guidelines |
| [SECURITY.md](./SECURITY.md) | Security policies & vulnerability reporting |
| [docs/00-FOUNDATION/01-PROJECT_CHARTER.md](./docs/00-FOUNDATION/01-PROJECT_CHARTER.md) | Project vision & business model |
| [docs/00-FOUNDATION/02-TECHNICAL_SPECIFICATIONS.md](./docs/00-FOUNDATION/02-TECHNICAL_SPECIFICATIONS.md) | Technical architecture & APIs |
| [docs/00-FOUNDATION/03-API_REFERENCE.md](./docs/00-FOUNDATION/03-API_REFERENCE.md) | API endpoints & contracts |
| [docs/01-GETTING_STARTED/01-LOCAL_SETUP.md](./docs/01-GETTING_STARTED/01-LOCAL_SETUP.md) | Step-by-step local dev setup |
| [docs/02-MODULES/](./docs/02-MODULES/) | Individual module documentation |

---

## 🔄 Available Commands

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run start            # Start production server

# Code Quality
bun run lint             # Run Biome linter
bun run format           # Format code with Biome
bun run type-check       # TypeScript type checking

# Testing
bun run test             # Run all tests
bun run test:unit        # Unit tests only
bun run test:integration # Integration tests only
bun run test:e2e         # End-to-end tests

# Database
bun run db:migrate       # Run pending migrations
bun run db:seed          # Seed database with test data
bun run db:reset         # Reset database (dev only)

# Monorepo
bun run turbo:build      # Build all packages
bun run turbo:lint       # Lint all packages
bun run turbo:test       # Test all packages
```

---

## 🧪 Testing

We maintain high test coverage across all modules:

- **Unit Tests**: Individual function/component testing
- **Integration Tests**: Module interaction testing
- **E2E Tests**: Full user flow testing
- **Performance Tests**: Load testing & benchmarks

See [docs/04-TESTING/](./docs/04-TESTING/) for detailed testing guides.

---

## 📊 API Overview

### Authentication
```
POST /api/auth/signup          - Create new account
POST /api/auth/login           - Login user
POST /api/auth/logout          - Logout user
POST /api/auth/refresh         - Refresh JWT token
```

### Credits
```
GET  /api/credits/balance      - Get user credit balance
POST /api/credits/deduct       - Deduct credits (internal only)
GET  /api/credits/history      - Get transaction history
```

### Generation
```
POST /api/generations/text-to-image  - Generate image from text
GET  /api/generations/:id            - Get generation status
GET  /api/generations/history        - Get user's generations
```

### Subscriptions
```
GET  /api/subscriptions/plans        - List subscription plans
POST /api/subscriptions/create       - Create subscription
POST /api/subscriptions/cancel       - Cancel subscription
```

See [docs/00-FOUNDATION/03-API_REFERENCE.md](./docs/00-FOUNDATION/03-API_REFERENCE.md) for complete API documentation.

---

## 🚀 Deployment

### Production Deployment (Vercel)

1. Push to `main` branch
2. Vercel automatically deploys
3. Database migrations run automatically
4. Environment variables configured in Vercel dashboard

### Manual Deployment

```bash
# Build production bundle
bun run build

# Deploy to Vercel
vercel deploy --prod
```

See [docs/00-FOUNDATION/05-DEPLOYMENT.md](./docs/00-FOUNDATION/05-DEPLOYMENT.md) for detailed deployment guide.

---

## 📋 MVP Success Criteria

- ✅ Sign up works
- ✅ Subscription purchase works
- ✅ Credits deduction works
- ✅ Image generation works
- ✅ Assets save correctly
- ✅ Billing accurately tracked
- ✅ Errors monitored in Sentry

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guidelines
- Git workflow & branching
- Pull request process
- Issue reporting

### Quick PR Checklist
- [ ] Branch from `develop`
- [ ] Follow code style (Biome)
- [ ] Add/update tests
- [ ] Update documentation
- [ ] Request review
- [ ] Squash commits before merge

---

## 🐛 Reporting Issues

Found a bug or security issue?

- **General Issues**: [GitHub Issues](https://github.com/davidsun2026-v1/framic-ai/issues)
- **Security Issues**: See [SECURITY.md](./SECURITY.md) for responsible disclosure

---

## 📈 Roadmap

### Q4 2026 (MVP - Phase 1)
- User authentication & profiles
- Credits system (working)
- Text-to-Image generation
- Image-to-Image editing
- Subscription management with Paystack
- Asset library

### Q1 2027 (Phase 2)
- Text-to-Video generation
- Image-to-Video synthesis
- Video extensions (trim, extend, etc.)
- Project workspaces

### Q2+ 2027 (Phase 3)
- Marketplace for assets
- Team collaboration
- Shared asset libraries

Full roadmap: [ROADMAP.md](./ROADMAP.md)

---

## 📞 Support

- 📖 **Docs**: [Read the documentation](./docs/)
- 💬 **GitHub Discussions**: [Ask questions](https://github.com/davidsun2026-v1/framic-ai/discussions)
- 🐛 **Issues**: [Report bugs](https://github.com/davidsun2026-v1/framic-ai/issues)
- 🔒 **Security**: See [SECURITY.md](./SECURITY.md)

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 👨‍💻 Author

**David Sun** - [@davidsun2026-v1](https://github.com/davidsun2026-v1)

---

## 🙏 Acknowledgments

- Replicate for AI generation APIs
- Supabase for backend infrastructure
- Paystack for payment processing
- Vercel for hosting
- shadcn/ui for component library

---

**Last Updated**: September 2026  
**Status**: Active Development (Phase 1)

