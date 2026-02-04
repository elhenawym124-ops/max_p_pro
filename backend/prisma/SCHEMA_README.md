# Prisma Schema Organization

This project uses a **modular schema structure** for easier maintenance and collaboration.

## Structure

```
prisma/
├── schema/                    # Modular schema files
│   ├── main.prisma           # Generator and datasource config
│   ├── core.prisma           # Core models (User, Company, etc.)
│   ├── common.prisma         # Common/shared models
│   ├── ecommerce.prisma      # E-commerce models
│   ├── hr.prisma             # HR management models
│   ├── marketing.prisma      # Marketing and ads models
│   ├── ai_analytics.prisma   # AI and analytics models
│   ├── affiliate.prisma      # Affiliate system models
│   ├── assets.prisma         # Asset management models
│   ├── support.prisma        # Support ticket models
│   ├── telegram_userbot.prisma # Telegram integration
│   └── enums.prisma          # Shared enums
├── schema.prisma             # Generated merged schema (DO NOT EDIT)
└── generated/                # Generated Prisma Client

```

## Why Modular?

- **Easier Maintenance**: Each domain has its own file
- **Better Collaboration**: Multiple developers can work on different modules
- **Clearer Organization**: Related models are grouped together
- **Reduced Conflicts**: Fewer merge conflicts in version control

## Build Process

The modular schema files are automatically merged into a single `schema.prisma` before Prisma Client generation.

### Automatic Build

The schema is automatically built during:
- `npm install` (via postinstall script)
- `npm run schema:generate`

### Manual Build

To manually rebuild the schema:

```bash
npm run schema:build
```

### Generate Prisma Client

To rebuild schema and generate client:

```bash
npm run schema:generate
```

## Important Notes

⚠️ **DO NOT EDIT `prisma/schema.prisma` directly!**

This file is auto-generated. All changes should be made in the modular files under `prisma/schema/`.

### Making Changes

1. Edit the appropriate file in `prisma/schema/`
2. Run `npm run schema:build` to merge files
3. Run `prisma generate` to update the client
4. Restart your server

Or simply run: `npm run schema:generate`

## Why Not Use `prismaSchemaFolder`?

Prisma's `prismaSchemaFolder` preview feature is currently unreliable and can result in:
- Empty Prisma Client generation
- Missing models at runtime
- Validation errors

Our build script approach is more reliable and gives us full control over the merge process.

## Troubleshooting

### Schema Build Fails

```bash
# Check for syntax errors in individual files
npx prisma validate --schema=prisma/schema/main.prisma
```

### Client Generation Fails

```bash
# Rebuild schema and regenerate
npm run schema:generate
```

### Models Missing at Runtime

```bash
# Ensure schema is built and client is regenerated
npm run schema:generate

# Restart your server
npm run dev
```
