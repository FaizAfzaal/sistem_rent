const cron = require('node-cron');
const { runDailyChecklistProcess } = require('./dailyChecklistHelper');

/**
 * Initializes cron jobs for automated system background processes.
 * Ensures routine checks run at 07:00 WIB (Asia/Jakarta) every day.
 */
const initCronScheduler = () => {
  // Run daily at 07:00 WIB (Asia/Jakarta timezone)
  cron.schedule('0 7 * * *', async () => {
    console.log('⏰ [CRON 07:00 WIB] Initiating automated daily equipment availability checklist...');
    try {
      const summary = await runDailyChecklistProcess(null, 'OTOMATIS');
      console.log(`✅ [CRON 07:00 WIB] Daily checklist process finished for date ${summary.tanggal_pemeriksaan}. Total active tools verified: ${summary.total_alat_diperiksa}`);
    } catch (err) {
      console.error('❌ [CRON 07:00 WIB] Error running daily equipment checklist:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Jakarta',
  });

  console.log('⏱️ [SCHEDULER] Daily Equipment Checklist Scheduler registered (Target: 07:00 WIB Asia/Jakarta).');
};

module.exports = {
  initCronScheduler,
};
