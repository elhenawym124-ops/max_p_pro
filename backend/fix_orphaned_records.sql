-- Fix orphaned records before applying Prisma schema changes

-- Delete orphaned store_visits records
DELETE FROM store_visits WHERE companyId NOT IN (SELECT id FROM companies);

-- Delete orphaned conversion_events records
DELETE FROM conversion_events WHERE companyId NOT IN (SELECT id FROM companies);

-- Check for other potential orphaned records
-- You can add more DELETE statements here if needed

SELECT 'Orphaned records cleaned successfully' as status;
