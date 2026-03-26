import cron from "node-cron";
import { expireStaleRides } from "../services/ride.service.js";
import { logger } from "../utils/logger.js";

export function startExpireRidesJob(): cron.ScheduledTask {
  return cron.schedule("*/2 * * * *", async () => {
    try {
      const n = await expireStaleRides();
      if (n > 0) {
        logger.info({ expired: n }, "Истёкшие поездки помечены как EXPIRED");
      }
    } catch (e) {
      logger.error({ err: e }, "Ошибка фоновой задачи истечения поездок");
    }
  });
}
