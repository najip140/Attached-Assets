import app from "./app";
import { logger } from "./lib/logger";
import { createBackupFile } from "./routes/backup.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  scheduleDailyBackup();
});

function scheduleDailyBackup() {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const runAutoBackup = async () => {
    try {
      logger.info("Running scheduled daily backup");
      await createBackupFile("auto", undefined, "Automatic daily backup");
      logger.info("Scheduled daily backup completed");
    } catch (err) {
      logger.error({ err }, "Scheduled daily backup failed");
    }
  };

  const now = new Date();
  const next2am = new Date(now);
  next2am.setHours(2, 0, 0, 0);
  if (next2am <= now) next2am.setDate(next2am.getDate() + 1);
  const msUntilFirst = next2am.getTime() - now.getTime();

  setTimeout(() => {
    runAutoBackup();
    setInterval(runAutoBackup, MS_PER_DAY);
  }, msUntilFirst);

  logger.info({ nextBackupIn: `${Math.round(msUntilFirst / 3600000)}h` }, "Daily backup scheduled");
}
