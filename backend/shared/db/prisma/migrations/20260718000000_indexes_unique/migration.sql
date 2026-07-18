-- CreateIndex
CREATE INDEX "rides_user_id_idx" ON "rides"("user_id");

-- CreateIndex
CREATE INDEX "rides_bike_id_idx" ON "rides"("bike_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_ref_key" ON "payments"("provider_ref");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");
