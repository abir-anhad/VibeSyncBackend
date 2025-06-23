// ==========================================================================================
// file: server.js
// ==========================================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const socketio = require('socket.io');

const config = require('./config/config');
const createWorkers = require('./utilities/createWorkers');
const getWorker = require('./utilities/getWorker');
const Client = require('./classes/Client');
const Room = require('./classes/Room');

const app = express();
let httpsServer;

// Gracefully handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err.message);
    console.error(err.stack);
});

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    console.log('Running in secure mode (HTTPS)');
    try {
        const key = fs.readFileSync(path.join(__dirname, './config/cert.key'));
        const cert = fs.readFileSync(path.join(__dirname, './config/cert.crt'));
        httpsServer = https.createServer({ key, cert }, app);
    } catch (e) {
        console.error("SSL Certificate error: Make sure cert.key and cert.crt are present in ./config", e);
        process.exit(1);
    }
} else {
    console.log('Running in development mode (HTTP)');
    httpsServer = http.createServer(app);
}

console.log(`http://${config.webRtcTransport.listenIps[0].announcedIp}:${config.corsPort}`)
const io = socketio(httpsServer, {
    cors: {
        origin: [
            `http://localhost:${config.corsPort}`,
            `https://localhost:${config.corsPort}`,
            `http://192.168.1.102:${config.corsPort}`,
            `http://${config.webRtcTransport.listenIps[0].announcedIp}:${config.corsPort}`
        ],
        methods: ["GET", "POST"]
    }
});

let workers = null;
const rooms = {};

const init = async () => {
    try {
        workers = await createWorkers();
        console.log(`Mediasoup initialized with ${workers.length} workers.`);
        httpsServer.listen(config.port, () => {
            console.log(`Server is listening on port ${config.port} in ${process.env.NODE_ENV || 'development'} mode.`);
        });
    } catch (error) {
        console.error("Failed to initialize server:", error);
        process.exit(1);
    }
};

init();

io.on('connect', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('joinRoom', (data) => {
        console.log(`[Handler:joinRoom] Received from ${socket.id}`);
        const { userName, roomName } = data;
        const client = new Client(userName, socket);
        socket.appClient = client;

        let room = rooms[roomName];
        if (!room) {
            const worker = getWorker(workers);
            room = new Room(roomName, worker, io);
            rooms[roomName] = room;
            room.createRouter().then(() => {
                finishJoin(room, client, socket);
            });
        } else {
            finishJoin(room, client, socket);
        }
    });

    const finishJoin = (room, client, socket) => {
        client.room = room;
        room.addClient(client);
        socket.join(room.roomName);
        const producersToConsume = room.getProducerListForClient(socket.id);
        console.log(`[Handler:joinRoom] Success for ${socket.id}. Sending joinRoom-success.`);
        socket.emit('joinRoom-success', {
            routerRtpCapabilities: room.router.rtpCapabilities,
            producersToConsume,
        });
    };

    socket.on('createTransport', async (data) => {
        console.log(`[Handler:createTransport] Received from ${socket.id}`);
        const transportParams = await socket.appClient.createTransport(data.type);
        socket.emit('createTransport-success', transportParams);
    });

    socket.on('connectTransport', async (data) => {
        console.log(`[Handler:connectTransport] Received from ${socket.id}`);
        await socket.appClient.connectTransport(data.transportId, data.dtlsParameters);
        socket.emit('connectTransport-success', { connected: true });
    });

    socket.on('produce', async (data) => {
        console.log(`[Handler:produce] Received from ${socket.id}`);
        const producer = await socket.appClient.produce(data.transportId, data.kind, data.rtpParameters);
        socket.appClient.room.broadcast(socket.id, 'new-producer', {
            producerId: producer.id,
            userName: socket.appClient.userName,
            socketId: socket.id,
        });
        socket.emit('produce-success', { id: producer.id });
    });

    socket.on('consume', async (data) => {
        console.log(`[Handler:consume] Received from ${socket.id}`);
        const consumerParams = await socket.appClient.consume(data.transportId, data.producerId, data.rtpCapabilities);
        socket.emit('consume-success', consumerParams);
    });

    socket.on('resumeConsumer', async (data) => {
        console.log(`[Handler:resumeConsumer] Received from ${socket.id}`);
        await socket.appClient.resumeConsumer(data.consumerId);
        socket.emit('resumeConsumer-success', { resumed: true });
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        const client = socket.appClient;
        if (client && client.room) {
            const room = client.room;
            room.removeClient(socket.id);
            if (room.clients.size === 0) {
                room.close();
                delete rooms[room.roomName];
            } else {
                room.broadcast(null, 'client-disconnected', { socketId: socket.id });
            }
        }
    });
});
