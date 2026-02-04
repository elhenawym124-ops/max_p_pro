const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'prisma/schema');
const dest = path.join(__dirname, 'prisma/verify_schema');

try {
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });

    // Copy all files
    const files = fs.readdirSync(src);
    for (const file of files) {
        if (file === 'main.prisma') continue; // Skip main generator
        if (file === 'verify_main.prisma') continue; // Skip previous temp file

        fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }

    // Write new main
    const mainContent = `
generator client {
  provider        = "prisma-client-js"
  output          = "../../generated/verify_client"
  previewFeatures = ["prismaSchemaFolder"]
  binaryTargets   = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x", "linux-musl", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
`;
    fs.writeFileSync(path.join(dest, 'main.prisma'), mainContent);
    console.log("Setup complete");
} catch (e) {
    console.error(e);
    process.exit(1);
}
