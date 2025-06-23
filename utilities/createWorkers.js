// ==========================================================================================
// file: utilities/createWorkers.js
// ==========================================================================================
const os = require('os'); const mediasoup = require('mediasoup'); const config = require('../config/config');
module.exports = async () => {
    const num = os.cpus().length; console.log(`[Workers] Creating ${num} workers.`); const workers = [];
    for (let i = 0; i < num; i++) {
        const worker = await mediasoup.createWorker({ ...config.workerSettings });
        worker.on('died', () => { console.error(`[FATAL] Worker ${worker.pid} died.`); setTimeout(() => process.exit(1), 1000); });
        workers.push(worker);
    } return workers;
};