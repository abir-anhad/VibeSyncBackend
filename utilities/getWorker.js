// ==========================================================================================
// file: utilities/getWorker.js
// ==========================================================================================
let nextIdx = 0;
module.exports = (workers) => {
    if (!workers || workers.length === 0) throw new Error('No workers available');
    const worker = workers[nextIdx]; nextIdx = (nextIdx + 1) % workers.length;
    console.log(`[Workers] Assigning to worker ${worker.pid}`);
    return worker;
};
