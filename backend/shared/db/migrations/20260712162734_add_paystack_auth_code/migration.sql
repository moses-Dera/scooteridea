-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RIDER', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "BikeStatus" AS ENUM ('available', 'in_use', 'charging', 'maintenance', 'offline');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('RESERVED', 'ACTIVE', 'COMPLETING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('operational', 'slow', 'no_ride', 'dock');

-- CreateEnum
CREATE TYPE "TransitionType" AS ENUM ('ENTER', 'EXIT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "push_token" TEXT,
    "role" "Role" NOT NULL DEFAULT 'RIDER',
    "wallet_cents" INTEGER NOT NULL DEFAULT 0,
    "paystack_auth_code" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bikes" (
    "id" TEXT NOT NULL,
    "status" "BikeStatus" NOT NULL DEFAULT 'available',
    "battery_pct" INTEGER NOT NULL,
    "current_pin" TEXT,
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "dock_id" TEXT,
    "last_seen" TIMESTAMPTZ,

    CONSTRAINT "bikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location_lat" DOUBLE PRECISION NOT NULL,
    "location_lng" DOUBLE PRECISION NOT NULL,
    "total_slots" INTEGER NOT NULL DEFAULT 0,
    "available_slots" INTEGER NOT NULL DEFAULT 0,
    "base_fare_override" INTEGER,
    "per_minute_override" INTEGER,
    "per_km_override" INTEGER,

    CONSTRAINT "docks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "bike_id" TEXT NOT NULL,
    "start_dock_id" TEXT,
    "end_dock_id" TEXT,
    "status" "RideStatus" NOT NULL DEFAULT 'RESERVED',
    "start_lat" DOUBLE PRECISION,
    "start_lng" DOUBLE PRECISION,
    "end_lat" DOUBLE PRECISION,
    "end_lng" DOUBLE PRECISION,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "fare_cents" INTEGER,
    "distance_km" DECIMAL(6,2),
    "battery_start_pct" INTEGER,
    "battery_used_pct" INTEGER,
    "route_geometry" JSONB,
    "surge_mult" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "locked_base_fare_cents" INTEGER,
    "locked_per_min_cents" INTEGER,
    "locked_per_km_cents" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ride_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "ZoneType" NOT NULL,
    "speed_cap" INTEGER,
    "boundary" JSONB NOT NULL,
    "base_fare_override" INTEGER,
    "per_minute_override" INTEGER,
    "per_km_override" INTEGER,

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_transitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bike_id" TEXT NOT NULL,
    "zone_id" UUID NOT NULL,
    "type" "TransitionType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "unlock_fee_cents" INTEGER NOT NULL DEFAULT 5000,
    "per_minute_cents" INTEGER NOT NULL DEFAULT 2000,
    "per_km_cents" INTEGER NOT NULL DEFAULT 3000,
    "max_surge_mult" DECIMAL(3,2) NOT NULL DEFAULT 2.5,
    "out_of_dock_fee_cents" INTEGER NOT NULL DEFAULT 50000,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserAssignedZones" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_UserAssignedZones_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "_UserAssignedZones_B_index" ON "_UserAssignedZones"("B");

-- AddForeignKey
ALTER TABLE "bikes" ADD CONSTRAINT "bikes_dock_id_fkey" FOREIGN KEY ("dock_id") REFERENCES "docks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_start_dock_id_fkey" FOREIGN KEY ("start_dock_id") REFERENCES "docks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_end_dock_id_fkey" FOREIGN KEY ("end_dock_id") REFERENCES "docks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_transitions" ADD CONSTRAINT "zone_transitions_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_transitions" ADD CONSTRAINT "zone_transitions_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "geofences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAssignedZones" ADD CONSTRAINT "_UserAssignedZones_A_fkey" FOREIGN KEY ("A") REFERENCES "geofences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAssignedZones" ADD CONSTRAINT "_UserAssignedZones_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
