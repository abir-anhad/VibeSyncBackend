// ==========================================================================================
// file: config/config.js
// ==========================================================================================
const os = require('os');
const getLocalIp = () => { const n = os.networkInterfaces(); for (const i of Object.keys(n)) for (const net of n[i]) if (net.family === 'IPv4' && !net.internal) return net.address; return '127.0.0.1'; };
console.log(getLocalIp())
const commonConfig = {
    port: 3030, corsPort: process.env.CORS_PORT || 5173,
    routerMediaCodecs: [
        { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2, parameters: { 'useinbandfec': 1, 'stereo': 1, 'sprop-stereo': 1, 'maxplaybackrate': 48000, 'ptime': 20, 'minptime': 10 } },
        { kind: "video", mimeType: "video/H264", clockRate: 90000, parameters: { "packetization-mode": 1, "profile-level-id": "42e01f", "level-asymmetry-allowed": 1 } },
    ],
    webRtcTransport: {
        listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP || getLocalIp() }], //"192.168.1.102"}],
        enableUdp: true, enableTcp: true, preferUdp: true, maxIncomingBitrate: 5000000, initialAvailableOutgoingBitrate: 5000000,
    }
};
const environments = {
    development: { workerSettings: { rtcMinPort: 40000, rtcMaxPort: 41000, logLevel: 'debug', logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp', 'bwe'] } },
    production: { workerSettings: { rtcMinPort: 40000, rtcMaxPort: 41000, logLevel: 'error', logTags: [] } }
};
const env = process.env.NODE_ENV || 'development';
module.exports = { ...commonConfig, ...environments[env] };