# Contributing to CreatorOS

Thank you for your interest in contributing to CreatorOS! We welcome contributions from everyone. This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Requirements](#testing-requirements)
6. [Commit Guidelines](#commit-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Documentation](#documentation)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

### Expected Behavior

- Be respectful and inclusive
- Welcome diverse perspectives
- Give and receive constructive feedback gracefully
- Focus on what's best for the community
- Show empathy and kindness

### Unacceptable Behavior

- Harassment, discrimination, or hate speech
- Personal attacks or insults
- Inappropriate language or content
- Unwelcome sexual attention
- Any form of abuse

---

## Getting Started

### 1. Fork & Clone

```bash
# Fork the repository on GitHub
# https://github.com/davidsun2026-v1/framic-ai/fork

# Clone your fork
git clone https://github.com/YOUR_USERNAME/framic-ai.git
cd framic-ai

# Add upstream remote
git remote add upstream https://github.com/davidsun2026-v1/framic-ai.git
```

### 2. Create Local Environment

Follow [SETUP.md](./SETUP.md) to:
- Install dependencies
- Setup environment variables
- Start local services
- Run database migrations

### 3. Create Feature Branch

```bash
# Update from upstream
git fetch upstream
git checkout develop
git reset --hard upstream/develop

# Create feature branch
git checkout -b feature/your-feature-name
# OR
git checkout -b fix/bug-description
# OR
git checkout -b docs/documentation-update
```

### Branch Naming Convention

- **Features**: `feature/description-of-feature`
- **Bug Fixes**: `fix/bug-description`
- **Documentation**: `docs/doc-topic`
- **Chores**: `chore/maintenance-task`
- **Tests**: `test/test-description`

---

## Development Workflow

### 1. Write Code

Follow the project structure:
```
apps/web/              # Next.js frontend
  ├── app/            # App router
  ├── components/     # React components
  ├── hooks/          # Custom hooks
  ├── lib/            # Utilities
  └── styles/         # Global styles

packages/
  ├── ui/             # Shared UI components
  ├── core/           # Core business logic
  ├── types/          # TypeScript types
  └── utils/          # Shared utilities
```

### 2. Start Dev Server

```bash
# Terminal 1: Start local services
docker-compose up -d

# Terminal 2: Start dev server
bun run dev
```

### 3. Make Changes

- One feature/fix per branch
- Keep commits atomic and focused
- Update related documentation

### 4. Test Your Changes

```bash
# Run all tests
bun run test

# Run specific test suite
bun run test:unit
bun run test:integration

# Run linter
bun run lint

# Check types
bun run type-check
```

---

## Code Standards

### TypeScript

- Use strict mode: `"strict": true` in `tsconfig.json`
- Define types explicitly (no `any`)
- Export types for public APIs
- Use interfaces over types for object shapes

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// ❌ Avoid
type User = {
  id: any;
  email: string;
};
```

### React Components

- Use functional components with hooks
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Use TypeScript for props

```typescript
// ✅ Good
interface CardProps {
  title: string;
  description: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, description, onClick }) => {
  return (
    <div onClick={onClick} className="card">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

// ❌ Avoid
export const Card = ({ title, description, onClick }) => {
  // No type safety
};
```

### Error Handling

- Validate all inputs
- Use explicit error types
- Log errors with context
- Never swallow errors silently

```typescript
// ✅ Good
try {
  const result = await generateImage(prompt);
  return { success: true, data: result };
} catch (error) {
  logger.error("Image generation failed", {
    error,
    prompt,
    userId,
  });
  throw new GenerationError("Failed to generate image");
}

// ❌ Avoid
try {
  const result = await generateImage(prompt);
} catch (e) {
  // Silent failure
}
```

### Naming Conventions

- **Files**: kebab-case for components, camelCase for utilities
  - `UserProfile.tsx` (component)
  - `calculateCredits.ts` (utility)
  
- **Functions**: camelCase, verb-based names
  - `getUserCredits()`
  - `validatePayment()`
  - `sendNotification()`

- **Constants**: UPPER_SNAKE_CASE
  - `MAX_FILE_SIZE = 10_000_000`
  - `GENERATION_TIMEOUT = 60_000`

- **Types/Interfaces**: PascalCase
  - `interface UserProfile {}`
  - `type GenerationRequest = {}`

### Code Formatting

We use **Biome** for consistent code style:

```bash
# Format code
bun run format

# Check formatting
bun run lint
```

**Rules**:
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in multiline
- Max line length: 100 characters

---

## Testing Requirements

### Unit Tests

Test individual functions/components in isolation.

```typescript
// utils.test.ts
import { calculateCredits } from "./calculateCredits";

describe("calculateCredits", () => {
  it("should calculate credits correctly", () => {
    const cost = calculateCredits("text-to-image", "1024x1024");
    expect(cost).toBe(20); // 5 base + 2.0 multiplier * 10
  });

  it("should handle invalid models", () => {
    expect(() => calculateCredits("invalid-model", "512x512")).toThrow();
  });
});
```

### Integration Tests

Test module interactions and data flow.

```typescript
// credits.integration.test.ts
describe("Credits System Integration", () => {
  it("should deduct credits and record transaction", async () => {
    const user = await createTestUser();
    const txn = await deductCredits(user.id, 10, "text-to-image");
    
    expect(txn.status).toBe("completed");
    expect(txn.creditsAfter).toBe(90);
    
    const history = await getTransactionHistory(user.id);
    expect(history).toContainEqual(txn);
  });
});
```

### Test Coverage Requirements

- Minimum 80% overall coverage
- 90% coverage for critical paths (auth, payments, credits)
- 100% coverage for utility functions

```bash
# Generate coverage report
bun run test -- --coverage

# View coverage
open coverage/index.html
```

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style (formatting, missing semicolons)
- **refactor**: Code refactoring without feature changes
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Build, dependencies, tooling

### Examples

```bash
# Feature
git commit -m "feat(credits): add credit refund on generation failure"

# Bug fix
git commit -m "fix(auth): handle expired JWT tokens correctly"

# Documentation
git commit -m "docs(setup): add Bun installation instructions"

# Multiple lines
git commit -m "feat(generation): implement text-to-image

- Add Replicate API integration
- Implement credit deduction
- Add error handling and retries"
```

### Commit Best Practices

- ✅ One logical change per commit
- ✅ Write clear, descriptive messages
- ✅ Reference issues: `fixes #123`
- ✅ Keep commits atomic and reversible
- ❌ Don't commit multiple unrelated changes
- ❌ Don't commit debug code or console logs

---

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. **Run all checks**
   ```bash
   bun run lint
   bun run type-check
   bun run test
   ```

3. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Related Issues
Closes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots/GIFs if relevant]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Tests pass locally
- [ ] Linter passes
```

### Review Process

1. **Wait for review** - A maintainer will review your PR
2. **Address feedback** - Push additional commits (don't rewrite)
3. **Request re-review** - After addressing comments
4. **Approval** - PR is approved for merge
5. **Squash & merge** - Commits are squashed into one

### PR Guidelines

- **Small PRs are better** - Easier to review (< 400 lines)
- **One feature per PR** - Don't mix features and refactoring
- **Link related issues** - Use "Closes #123"
- **Add tests** - Coverage should not decrease
- **Update docs** - If changing public APIs
- **Be responsive** - Reply to feedback promptly

---

## Documentation

### Code Documentation

- Add JSDoc comments to public functions
- Document complex algorithms
- Include usage examples for utilities

```typescript
/**
 * Calculate credit cost for image generation
 * @param model - The model name (e.g., "stable-diffusion-3")
 * @param dimensions - Image dimensions (e.g., "1024x1024")
 * @returns Credit cost as number
 * @throws {Error} If model or dimensions are invalid
 * @example
 * const cost = calculateCredits("stable-diffusion-3", "1024x1024");
 * // cost = 20
 */
export function calculateCredits(model: string, dimensions: string): number {
  // Implementation
}
```

### Project Documentation

- Update [README.md](./README.md) for user-facing changes
- Update [SETUP.md](./SETUP.md) for setup changes
- Update [docs/](./docs/) for architectural changes
- Add API documentation to [docs/00-FOUNDATION/03-API_REFERENCE.md](./docs/00-FOUNDATION/03-API_REFERENCE.md)

---

## Getting Help

- 📖 **Documentation**: [Read docs/](./docs/)
- 💬 **GitHub Discussions**: [Ask questions](https://github.com/davidsun2026-v1/framic-ai/discussions)
- 🐛 **Issues**: [Report bugs](https://github.com/davidsun2026-v1/framic-ai/issues)
- 📧 **Email**: Contact the maintainers

---

## Additional Resources

- [Project Charter](./docs/00-FOUNDATION/01-PROJECT_CHARTER.md)
- [Technical Specifications](./docs/00-FOUNDATION/02-TECHNICAL_SPECIFICATIONS.md)
- [Architecture](./docs/00-FOUNDATION/05-DEPLOYMENT.md)
- [API Reference](./docs/00-FOUNDATION/03-API_REFERENCE.md)

---

**Thank you for contributing to CreatorOS!** 🚀

Your contributions help make this project better for everyone.

