// ==========================================================================================
// file: classes/Client.js
// ==========================================================================================
const clientConfig = require('../config/config');
class Client {
    constructor(userName, socket) { this.userName = userName; this.socket = socket; this.room = null; this.transports = new Map(); this.producers = new Map(); this.consumers = new Map(); }
    async createTransport(type) { const transport = await this.room.router.createWebRtcTransport(clientConfig.webRtcTransport); this.transports.set(transport.id, transport); transport.on('dtlsstatechange', (s) => { if (s === 'closed') transport.close(); }); return { id: transport.id, iceParameters: transport.iceParameters, iceCandidates: transport.iceCandidates, dtlsParameters: transport.dtlsParameters }; }
    async connectTransport(id, dtls) { const t = this.transports.get(id); if (!t) throw new Error(`Transport ${id} not found`); await t.connect({ dtlsParameters: dtls }); }
    async produce(id, kind, rtp) { const t = this.transports.get(id); if (!t) throw new Error(`Transport ${id} not found`); const p = await t.produce({ kind, rtpParameters: rtp, appData: { socketId: this.socket.id } }); this.producers.set(p.id, p); return p; }
    async consume(id, pId, rtp) { const t = this.transports.get(id); if (!t) throw new Error(`Transport ${id} not found`); if (!this.room.router.canConsume({ producerId: pId, rtpCapabilities: rtp })) throw new Error(`Cannot consume`); const c = await t.consume({ producerId: pId, rtpCapabilities: rtp, paused: true }); this.consumers.set(c.id, c); c.on('producerclose', () => { this.socket.emit('consumer-closed', { consumerId: c.id }); }); return { id: c.id, producerId: pId, kind: c.kind, rtpParameters: c.rtpParameters }; }
    async resumeConsumer(id) { const c = this.consumers.get(id); if (!c) throw new Error(`Consumer ${id} not found`); await c.resume(); }
    close() { this.transports.forEach(t => t.close()); }
}
module.exports = Client;