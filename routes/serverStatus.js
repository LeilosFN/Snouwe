const express = require("express");
const app = express.Router();
const os = require("os");

// Ruta para obtener el estado del servidor, usuarios y estadísticas del sistema
app.get("/api/v1/server/status", (req, res) => {
    try {
        const activeUsers = global.accessTokens || [];
        const users = activeUsers.map(token => ({
            displayName: token.displayName || "Usuario",
            accountId: token.accountId.substring(0, 8) + "..."
        }));

        // Información del sistema
        const totalRAM = os.totalmem();
        const freeRAM = os.freemem();
        const usedRAM = totalRAM - freeRAM;
        const ramUsagePercent = ((usedRAM / totalRAM) * 100).toFixed(2);

        // Uso de CPU (Carga promedio en los últimos 1 min)
        const cpuLoad = os.loadavg()[0].toFixed(2);
        
        // Tiempo de actividad
        const uptimeSeconds = os.uptime();
        const uptimeDays = Math.floor(uptimeSeconds / (24 * 3600));
        const uptimeHours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

        res.json({
            status: "online",
            onlineCount: users.length,
            users: users,
            system: {
                ram: {
                    total: (totalRAM / (1024 * 1024 * 1024)).toFixed(2) + " GB",
                    used: (usedRAM / (1024 * 1024 * 1024)).toFixed(2) + " GB",
                    percent: ramUsagePercent + "%"
                },
                cpu: {
                    load: cpuLoad + "%",
                    cores: os.cpus().length,
                    model: os.cpus()[0].model
                },
                uptime: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`,
                platform: os.platform(),
                arch: os.arch()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error in status API:", error);
        res.status(500).json({ error: "Error al obtener el estado del servidor" });
    }
});

module.exports = app;
