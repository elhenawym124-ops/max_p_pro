---
name: database_management
description: Expert instructions for managing the Prisma database schema in this modular project.
---

# Database Management Skill

This project uses a **modular Prisma schema** architecture. You must follow these strict rules to avoid overwriting changes or breaking the schema.

## 1. Schema Location and Editing
- **DO NOT** edit `backend/prisma/schema.prisma` directly. This file is **auto-generated**. Any changes made here will be lost.
- **DO SOURCE** your changes in `backend/prisma/schema/*.prisma`.
    - `main.prisma`: Contains `datasource` and `generator` blocks.
    - Other `.prisma` files (e.g., `user.prisma`, `chat.prisma`): Contain model definitions.

## 2. Applying Changes
After modifying any file in `backend/prisma/schema/`:
1.  Run the build and generate command:
    ```bash
    cd backend
    npm run schema:generate
    ```
    *This runs `node build-schema.js` to merge files, then `prisma generate` to update the client.*

2.  If you need to create a migration:
    ```bash
    cd backend
    npx prisma migrate dev --name <descriptive_name>
    ```

## 3. Schema Auditing and Repair
When asked to review or fix the schema:
1.  **Detect Duplicates:** Scan across all modules in `backend/prisma/schema/*.prisma` for identical model names or models that represent the same business entity with slightly different names.
2.  **Relation Consistency:** Ensure that if a model (e.g., `User`) has a relationship to another (e.g., `Post`), the inverse relation exists and both use consistent field types.
3.  **Cross-Module Integrity:** Check if models are referencing Enums defined in `enums.prisma`. If an enum is missing, it must be added to `enums.prisma` rather than defined locally in a module.

## 4. Consistent Naming and Mapping
- **Database Mapping:** Every model **MUST** have an `@@map("table_name")` attribute using snake_case to ensure the database table names remain consistent and lowercase.
- **PascalCase Models:** All model names in Prisma should use `PascalCase`.
- **SnakeCase Fields:** All field names should use `camelCase` for the Prisma Client, but can be mapped to `snake_case` in the DB if necessary.

## 5. Workflow
1.  Identify the correct module file in `backend/prisma/schema/` for your model.
2.  If creating a new model, create a new `.prisma` file in that directory (e.g., `new_feature.prisma`) unless it strictly belongs to an existing module.
3.  Edit the file.
4.  Run `npm run schema:generate` to verify the merge works and the client updates.
5.  If DB changes are needed, run `npx prisma migrate dev`.
