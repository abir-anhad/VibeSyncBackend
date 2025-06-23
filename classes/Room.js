// ==========================================================================================
// file: classes/Room.js
// ==========================================================================================
const roomConfig = require('../config/config');
class Room {
    constructor(name, worker, io) { this.roomName = name; this.worker = worker; this.io = io; this.router = null; this.clients = new Map(); console.log(`[Room] Created: ${name}`); }
    async createRouter() { this.router = await this.worker.createRouter({ mediaCodecs: roomConfig.routerMediaCodecs }); console.log(`[Room:${this.roomName}] Router created.`); }
    addClient(client) { this.clients.set(client.socket.id, client); client.room = this; console.log(`[Room:${this.roomName}] Client added: ${client.socket.id}`); }
    removeClient(id) { this.clients.get(id)?.close(); this.clients.delete(id); console.log(`[Room:${this.roomName}] Client removed: ${id}`); }
    getProducerListForClient(id) { const list = []; for (const c of this.clients.values()) { if (c.socket.id !== id) { for (const p of c.producers.values()) list.push({ producerId: p.id, userName: c.userName, socketId: c.socket.id }); } } return list; }
    broadcast(id, event, data) { for (const [clientId, client] of this.clients) { if (clientId !== id) client.socket.emit(event, data); } }
    close() { console.log(`[Room:${this.roomName}] Closing room.`); this.router.close(); }
}
module.exports = Room;