-- CreateTable
CREATE TABLE "listing_profiles" (
    "profile_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "commercial" JSONB NOT NULL,
    "logistics" JSONB NOT NULL,
    "media" JSONB NOT NULL,
    "description_document" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "listing_profile_versions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_profile_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listing_profiles_sku_key" ON "listing_profiles"("sku");

-- CreateIndex
CREATE INDEX "listing_profile_versions_profile_id_created_at_idx" ON "listing_profile_versions"("profile_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "listing_profile_versions_profile_id_revision_key" ON "listing_profile_versions"("profile_id", "revision");

-- AddForeignKey
ALTER TABLE "listing_profile_versions" ADD CONSTRAINT "listing_profile_versions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "listing_profiles"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "listing_profiles" ADD CONSTRAINT "listing_profiles_revision_positive" CHECK ("revision" >= 1);
ALTER TABLE "listing_profile_versions" ADD CONSTRAINT "listing_profile_versions_revision_positive" CHECK ("revision" >= 1);
