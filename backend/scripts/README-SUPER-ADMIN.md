# Super Admin Management Scripts

## Overview
This directory contains scripts for managing super admin users in the system.

## Scripts

### 1. `create-initial-super-admin.js`
Creates the initial super admin user for the system. This should be run once during initial setup.

**Usage:**
```bash
# Use default values
node backend/scripts/create-initial-super-admin.js

# Use custom values
node backend/scripts/create-initial-super-admin.js \
  --email=admin@example.com \
  --password=SecurePass123! \
  --firstName=مدير \
  --lastName=النظام
```

**Default Values:**
- Email: `superadmin@system.com`
- Password: `SuperAdmin123!`
- First Name: `مدير`
- Last Name: `النظام`

**Features:**
- Checks if super admin already exists
- Validates email format
- Validates password (minimum 8 characters)
- Hashes password securely
- Creates super admin with proper role and permissions

### 2. `reset_super_admin_password.js`
Resets the password for an existing super admin user.

**Usage:**
```bash
node backend/reset_super_admin_password.js
```

**Note:** This script resets the password for `superadmin@system.com` to `SuperAdmin123!`

## API Endpoints

### Super Admin Users Management
All endpoints require authentication and SUPER_ADMIN role.

- `GET /api/v1/super-admin/users` - Get all super admin users
- `POST /api/v1/super-admin/users` - Create a new super admin user
- `PUT /api/v1/super-admin/users/:id` - Update a super admin user
- `DELETE /api/v1/super-admin/users/:id` - Delete a super admin user

**Access:** These endpoints are available through the Super Admin Users Management page in the frontend.

## Security Notes

⚠️ **Important:**
- The old endpoint `/api/v1/create-super-admin` has been removed for security reasons
- Always change default passwords after first login
- Use strong passwords (minimum 8 characters, mix of letters, numbers, and symbols)
- Never commit passwords to version control

## Best Practices

1. **Initial Setup:**
   - Run `create-initial-super-admin.js` once during initial setup
   - Change the default password immediately after first login

2. **Adding New Super Admins:**
   - Use the Super Admin Users Management page in the frontend
   - Or use the API endpoint `POST /api/v1/super-admin/users` (requires authentication)

3. **Password Management:**
   - Use `reset_super_admin_password.js` if you forget the password
   - Or use the Super Admin Users Management page to update passwords

4. **Troubleshooting:**
   - If you can't log in, use `reset_super_admin_password.js` to reset the password
   - Check that the user has `role: 'SUPER_ADMIN'` in the database
   - Verify that `isActive: true` in the database

