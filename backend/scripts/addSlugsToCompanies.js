/**
 * Script to add slugs to existing companies
 * Run: node backend/scripts/addSlugsToCompanies.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate a URL-safe slug from company name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    // Replace Arabic characters with English equivalents
    .replace(/ا/g, 'a')
    .replace(/ب/g, 'b')
    .replace(/ت/g, 't')
    .replace(/ث/g, 'th')
    .replace(/ج/g, 'j')
    .replace(/ح/g, 'h')
    .replace(/خ/g, 'kh')
    .replace(/د/g, 'd')
    .replace(/ذ/g, 'th')
    .replace(/ر/g, 'r')
    .replace(/ز/g, 'z')
    .replace(/س/g, 's')
    .replace(/ش/g, 'sh')
    .replace(/ص/g, 's')
    .replace(/ض/g, 'd')
    .replace(/ط/g, 't')
    .replace(/ظ/g, 'z')
    .replace(/ع/g, 'a')
    .replace(/غ/g, 'gh')
    .replace(/ف/g, 'f')
    .replace(/ق/g, 'q')
    .replace(/ك/g, 'k')
    .replace(/ل/g, 'l')
    .replace(/م/g, 'm')
    .replace(/ن/g, 'n')
    .replace(/ه/g, 'h')
    .replace(/و/g, 'w')
    .replace(/ي/g, 'y')
    .replace(/ة/g, 'a')
    .replace(/ى/g, 'a')
    .replace(/ء/g, '')
    .replace(/أ/g, 'a')
    .replace(/إ/g, 'i')
    .replace(/آ/g, 'a')
    .replace(/ؤ/g, 'o')
    .replace(/ئ/g, 'e')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Trim hyphens from start and end
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Check if slug already exists
 */
async function slugExists(slug) {
  const company = await prisma.company.findUnique({
    where: { slug }
  });
  return !!company;
}

/**
 * Generate unique slug for a company
 */
async function generateUniqueSlug(name) {
  let slug = generateSlug(name);
  let counter = 1;

  // If slug is empty or too short, use a default
  if (!slug || slug.length < 2) {
    slug = `store-${Date.now()}`;
  }

  // Check if slug exists and add counter if needed
  while (await slugExists(slug)) {
    slug = `${generateSlug(name)}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Main function to add slugs to companies
 */
async function addSlugsToCompanies() {
  try {
    console.log('🚀 Starting to add slugs to companies...\n');

    // Find all companies without slugs
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: '' }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    if (companies.length === 0) {
      console.log('✅ All companies already have slugs!');
      return;
    }

    console.log(`📊 Found ${companies.length} companies without slugs\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const company of companies) {
      try {
        const slug = await generateUniqueSlug(company.name);

        await prisma.company.update({
          where: { id: company.id },
          data: { slug }
        });

        console.log(`✅ Company: "${company.name}"`);
        console.log(`   Slug: "${slug}"`);
        console.log(`   URL: https://${slug}.maxp-ai.pro\n`);

        successCount++;
      } catch (error) {
        console.error(`❌ Error updating company "${company.name}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${companies.length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  addSlugsToCompanies()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
  addSlugsToCompanies
};
