-- Одна активная поездка на пользователя (защита от гонок и дублей)
CREATE UNIQUE INDEX "RideSession_one_active_per_user_idx" ON "RideSession" ("userId") WHERE "status" = 'ACTIVE';
