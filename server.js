const express = require("express");
const fs = require("fs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const os = require("os"); // SİSTEM BİLGİLERİ İÇİN EKLENDİ
const { exec } = require("child_process");

const app = express();
const PORT = 2026;

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const ADMIN_PASSWORD = "aflciyiz";
const startTime = Date.now(); 

let data = { homeworks: [], bannedIPs: [], logs: [] };

if (fs.existsSync("data.json")) {
    try { data = JSON.parse(fs.readFileSync("data.json")); } 
    catch { console.log("data.json bozuk, sıfırlanıyor..."); saveData(); }
}

function saveData() { fs.writeFileSync("data.json", JSON.stringify(data, null, 2)); }
function logAction(msg) { data.logs.push(`[${new Date().toLocaleString('tr-TR')}] ${msg}`); saveData(); }

app.use((req, res, next) => {
    let clientIp = req.ip || req.connection.remoteAddress;
    if (data.bannedIPs.includes(clientIp)) return res.status(403).send("Erişim Engellendi.");
    next();
});

// ⛅ HAVA DURUMU API
app.get("/api/weather", async (req, res) => {
    try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=36.94&longitude=30.85&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto";
        const response = await fetch(url);
        const weatherData = await response.json();
        const current = weatherData.current;
        const code = current.weather_code;
        let status = "Açık";
        if (code > 0 && code <= 3) status = "Parçalı Bulutlu";
        else if (code >= 45 && code <= 48) status = "Sisli";
        else if (code >= 51 && code <= 67) status = "Yağmurlu";
        else if (code >= 71 && code <= 77) status = "Karlı";
        else if (code >= 80) status = "Sağanak Yağış";

        res.json({
            temp: current.temperature_2m.toFixed(1) + "°C", location: "Aksu, Antalya",
            humidity: "%" + current.relative_humidity_2m, wind: current.wind_speed_10m.toFixed(1) + " km/h",
            status: status, model: "Global Blend"
        });
    } catch (err) {
        res.json({ temp: "--°C", location: "Bağlantı Hatası", humidity: "--", wind: "--", status: "Hata", model: "Hata" });
    }
});

// 📊 YENİ GELİŞMİŞ SERVER STATUS API
let gpuInfo = "Aranıyor / Dahili Grafik...";
exec("lspci | grep -i vga", (err, stdout) => {
    if (!err && stdout) {
        let parts = stdout.split(":");
        gpuInfo = parts[parts.length - 1].trim(); // Ekran kartı ismini ayıklar
    }
});

// 📊 YENİ GELİŞMİŞ SERVER STATUS API (CPU, GPU, GHz eklendi)
app.get("/api/status", (req, res) => {
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);

    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    const memoryPercent = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    const load = os.loadavg();
    const cpuPercent = Math.round((load[0] / cpus.length) * 100) || 1;
    const cpuSpeed = (cpus[0].speed / 1000).toFixed(2); // MHz'yi GHz'ye çevirir

    res.json({
        status: "true",
        state: "Operational",
        uptime: uptimeSec,
        cpuInfo: cpus[0].model,
        cpuSpeed: cpuSpeed + " GHz",
        cpuCores: cpus.length,
        cpuUsage: cpuPercent,
        gpuInfo: gpuInfo,
        memoryUsed: usedMem,
        memoryTotal: totalMem,
        memoryPercent: memoryPercent,
        platform: os.platform() + " " + os.release(),
             nodeVersion: process.version,
             activeTasks: data.homeworks.length,
             bannedCount: data.bannedIPs.length,
             recentLogs: data.logs.slice(-6).reverse()
    });
});

app.get("/api/homeworks", (req, res) => res.json(data.homeworks));
app.post("/api/homeworks", (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Yanlış Şifre!" });
    const hw = { id: uuidv4(), subject: req.body.subject, desc: req.body.desc, day: req.body.day, date: req.body.date, createdAt: new Date() };
    data.homeworks.push(hw); logAction(`Ödev eklendi: ${req.body.subject}`); saveData();
    res.json(hw);
});
app.delete("/api/homeworks/:id", (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Yetkisiz İşlem!" });
    data.homeworks = data.homeworks.filter(h => h.id !== req.params.id); logAction("Ödev silindi."); saveData(); res.json({ success: true });
});

app.get("/api/ban", (req, res) => res.json(data.bannedIPs));
app.post("/api/ban", (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Yanlış Şifre!" });
    if (req.body.ip && !data.bannedIPs.includes(req.body.ip)) { data.bannedIPs.push(req.body.ip); logAction(`IP Banlandı: ${req.body.ip}`); saveData(); }
    res.json({ success: true });
});
app.post("/api/unban", (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Yanlış Şifre!" });
    data.bannedIPs = data.bannedIPs.filter(b => b !== req.body.ip); logAction(`Ban Kaldırıldı: ${req.body.ip}`); saveData(); res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sunucu her yönden gelen isteklere açık: http://0.0.0.0:${PORT}`);
});
