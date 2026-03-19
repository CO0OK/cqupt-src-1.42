-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'auditor', 'user');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'banned', 'pending');

-- CreateEnum
CREATE TYPE "VulnerabilitySeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "VulnerabilityStatus" AS ENUM ('pending', 'reviewing', 'approved', 'fixing', 'fixed', 'rejected', 'hidden');

-- CreateEnum
CREATE TYPE "VulnerabilityAuditAction" AS ENUM ('submit', 'claim', 'approve', 'reject', 'fixing', 'fixed', 'hide', 'reopen');

-- CreateEnum
CREATE TYPE "PointChangeType" AS ENUM ('vuln_reward', 'mall_redeem', 'manual_adjust', 'certificate_bonus');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('general', 'security', 'mall', 'maintenance');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('honorary', 'outstanding', 'special');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'inactive', 'out_of_stock');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('pending', 'issued', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "auth_code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "has_signed_agreement" BOOLEAN NOT NULL DEFAULT false,
    "agreement_signed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilities" (
    "id" UUID NOT NULL,
    "vuln_code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "target_url" TEXT NOT NULL,
    "vuln_type" VARCHAR(50) NOT NULL,
    "severity" "VulnerabilitySeverity" NOT NULL,
    "status" "VulnerabilityStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "reproduction_steps" TEXT,
    "impact_scope" TEXT,
    "submitter_id" UUID NOT NULL,
    "current_auditor_id" UUID,
    "reward_points" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL,
    "approved_at" TIMESTAMPTZ(6),
    "fixed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_audits" (
    "id" UUID NOT NULL,
    "vulnerability_id" UUID NOT NULL,
    "auditor_id" UUID NOT NULL,
    "action" "VulnerabilityAuditAction" NOT NULL,
    "from_status" "VulnerabilityStatus",
    "to_status" "VulnerabilityStatus",
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vulnerability_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_point_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "change_type" "PointChangeType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_type" VARCHAR(30),
    "reference_id" UUID,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_point_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'published',
    "author_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "cert_code" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "vulnerability_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "cert_type" "CertificateType" NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'active',
    "issued_by" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "product_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "image_url" TEXT,
    "points_cost" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" UUID NOT NULL,
    "redemption_code" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "points_cost" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "RedemptionStatus" NOT NULL,
    "issued_by" UUID,
    "issued_at" TIMESTAMPTZ(6),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_code_key" ON "users"("auth_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerabilities_vuln_code_key" ON "vulnerabilities"("vuln_code");

-- CreateIndex
CREATE INDEX "vulnerabilities_submitter_id_idx" ON "vulnerabilities"("submitter_id");

-- CreateIndex
CREATE INDEX "vulnerabilities_current_auditor_id_idx" ON "vulnerabilities"("current_auditor_id");

-- CreateIndex
CREATE INDEX "vulnerabilities_status_idx" ON "vulnerabilities"("status");

-- CreateIndex
CREATE INDEX "vulnerabilities_severity_idx" ON "vulnerabilities"("severity");

-- CreateIndex
CREATE INDEX "vulnerabilities_submitted_at_idx" ON "vulnerabilities"("submitted_at");

-- CreateIndex
CREATE INDEX "vulnerability_audits_vulnerability_id_created_at_idx" ON "vulnerability_audits"("vulnerability_id", "created_at");

-- CreateIndex
CREATE INDEX "vulnerability_audits_auditor_id_created_at_idx" ON "vulnerability_audits"("auditor_id", "created_at");

-- CreateIndex
CREATE INDEX "user_point_logs_user_id_created_at_idx" ON "user_point_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_point_logs_reference_type_reference_id_idx" ON "user_point_logs"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_cert_code_key" ON "certificates"("cert_code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_vulnerability_id_key" ON "certificates"("vulnerability_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_redemption_code_key" ON "redemptions"("redemption_code");

-- CreateIndex
CREATE INDEX "redemptions_user_id_created_at_idx" ON "redemptions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "redemptions_product_id_idx" ON "redemptions"("product_id");

-- CreateIndex
CREATE INDEX "redemptions_status_idx" ON "redemptions"("status");

-- AddForeignKey
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_current_auditor_id_fkey" FOREIGN KEY ("current_auditor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_audits" ADD CONSTRAINT "vulnerability_audits_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_audits" ADD CONSTRAINT "vulnerability_audits_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_point_logs" ADD CONSTRAINT "user_point_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_point_logs" ADD CONSTRAINT "user_point_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
