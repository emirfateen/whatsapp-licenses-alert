const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const yaml = require('js-yaml');
const csv = require('csv-parser');
const path = require('path');
const qrcode = require('qrcode');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const GROUP_NAME = process.env.GROUP_NAME;
const LICENSE_DIR = path.resolve(__dirname, process.env.DATA_FILE || '../licenses');
const INTERVAL_MINUTES = Math.max(5, parseInt(process.env.INTERVAL_MINUTES || '60')); // minimal 5 menit

// Client dengan session tersimpan
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-extensions",
            "--disable-gpu",
            "--no-zygote",
            "--single-process",
            "--window-size=1280,800",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding"
        ],
    }
});

let qrGenerated = false;
client.on('qr', (qr) => {
    if (!qrGenerated) {
        console.log('🟡 QR code disimpan ke qr.png (scan sekali saja, session akan tersimpan)');
        qrcode.toFile('/app/qr/qr.png', qr, { width: 250 }, (err) => {
            if (err) console.error(err);
        });
        qrGenerated = true;
    }
});

client.on('ready', async () => {
    console.log('✅ WhatsApp bot standby...');

    const chats = await client.getChats();
    const group = chats.find(c => c.isGroup && c.name === GROUP_NAME);

    if (!group) {
        console.error("❌ Grup tidak ditemukan:", GROUP_NAME);
        return;
    }

    const runCheck = async () => {
        try {
            const today = new Date();
            const licenses = await loadAllLicenses(LICENSE_DIR);
            const expiring = getExpiringLicenses(licenses, today);

            if (expiring.length === 0) {
                console.log(`[${today.toISOString()}] ✅ Tidak ada license expired.`);
            } else {
                for (const entry of expiring) {
                    const expDate = new Date(entry.expired_date);
                    const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                    const msg = buildMessage(entry, daysLeft);
                    await client.sendMessage(group.id._serialized, msg);
                    console.log(`📨 Alert terkirim untuk: ${entry.nama_bank}`);
                }
            }
        } catch (err) {
            console.error(`⚠️ Error saat cek license: ${err.message}`);
        }
    };

    await runCheck();
    setInterval(runCheck, INTERVAL_MINUTES * 60 * 1000);
});

client.initialize();

function getExpiringLicenses(data, today) {
    const targetDays = [90, 60, 30];
    const todayDate = new Date(today.toISOString().split('T')[0]);

    return data.filter(entry => {
        if (!entry.expired_date) return false;

        const exp = new Date(entry.expired_date);
        const expDate = new Date(exp.toISOString().split('T')[0]);

        const diff = Math.ceil((expDate - todayDate) / (1000 * 60 * 60 * 24));

        return targetDays.includes(diff);
    });
}

function buildMessage(entry, daysLeft) {
    return `🔔 *License Expiring Alert*\n` +
        `🏦 Bank: *${entry.nama_bank || 'Unknown'}*\n` +
        `🔐 License: *${entry.license || 'Unknown'}*\n` +
        `📅 Expired: ${entry.expired_date || 'N/A'} (H-${daysLeft})\n` +
        `🕓 Last Renewed: ${entry.last_license || 'N/A'}`;
}

async function loadAllLicenses(dirPath) {
    const files = fs.readdirSync(dirPath);
    const allLicenses = [];

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isFile()) {
            try {
                const data = await loadSingleLicenseFile(fullPath);
                if (Array.isArray(data)) {
                    allLicenses.push(...data);
                } else {
                    allLicenses.push(data);
                }
            } catch (err) {
                console.warn(`⚠️ Gagal memuat file ${file}: ${err.message}`);
            }
        }
    }
    if (process.env.SHEET_ID && process.env.SHEET_RANGE) {
        const sheetData = await loadFromGoogleSheets(process.env.SHEET_ID, process.env.SHEET_RANGE);
        allLicenses.push(...sheetData);
    }
    return allLicenses;
}

function loadSingleLicenseFile(filename) {
    return new Promise((resolve, reject) => {
        const ext = path.extname(filename).toLowerCase();
        if (ext === '.yaml' || ext === '.yml') {
            try {
                const raw = fs.readFileSync(filename, 'utf8');
                const data = yaml.load(raw);
                resolve(data);
            } catch (err) {
                reject(err);
            }
        } else if (ext === '.csv') {
            const results = [];
            fs.createReadStream(filename)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (err) => reject(err));
        } else {
            reject(new Error(`Unsupported file format: ${filename}`));
        }
    });
}
