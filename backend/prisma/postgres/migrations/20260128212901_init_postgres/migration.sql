-- CreateTable
CREATE TABLE "PostgresTest" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostgresTest_pkey" PRIMARY KEY ("id")
);
