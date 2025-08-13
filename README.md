# 📄 README – WhatsApp License Expiring Alert Bot
## 📌 Deskripsi
Bot ini digunakan untuk mengirim alert otomatis ke grup WhatsApp jika ada lisensi yang akan habis masa berlakunya pada H-90, H-60, atau H-30 hari.
Sumber data lisensi bisa berasal dari file CSV, YAML

## Struktur Folder
```
project-root/
├── src/
│   ├── index.js                # Script utama bot
│   └── .wwebjs_auth/           # Folder session WhatsApp (terbentuk otomatis)
├── licenses/                   # Folder data lisensi (CSV/YAML)
│   ├── contoh.csv
│   └── contoh.yaml
├── qr/                         # Folder untuk menyimpan QR code
├── .env                        # Konfigurasi environment
├── package.json
└── README.md
```

## ⚙️ Instalasi
```
# Clone repository
git clone https://github.com/username/whatsapp-license-alert.git
cd whatsapp-license-alert

# Install dependencies
npm install
```

## 📝 Konfigurasi .env
Ubah file ```.env.template``` menjadi ```.env``` lalu modifikasi sesuai dengan konfigurasi grup dan yang lainnya. 

## 📊 Data Lisensi
Untuk mempermudah, diharapkan untuk mengikuti format data sebagai yang diberikan. Apabila ingin mengganti formatnya, maka diharuskan untuk mengganti juga di bagian ```index.js```.

### CSV
```
nama_bank,license,expired_date,last_license
Bank ABC,Firewall,2025-11-10,2024-11-10
Bank XYZ,SSL Certificate,2025-09-15,2024-09-15
```
### YAML
```
- nama_bank: Bank ABC
  license: Firewall
  expired_date: 2025-11-10
  last_license: 2024-11-10

- nama_bank: Bank XYZ
  license: SSL Certificate
  expired_date: 2025-09-15
  last_license: 2024-09-15
```

## 🚀 Run
### 1. Menjalankan Bot
#### Untuk menjalankan bot ini ada 2 opsi 
1. Local Terminal
    ```
    npm start
    ```
2. Docker
    ```
    docker compose up --build
    ```

### 2. Scan QR Whatsapp
- Bot akan membuat file QR code di folder qr/qr.png
- Scan QR tersebut dengan WhatsApp di HP 
- Setelah itu, session login akan tersimpan di .wwebjs_auth/, sehingga tidak perlu scan ulang.

## 🔍 Cara Kerja
Saat bot dijalankan:
- Bot login ke WhatsApp (scan QR sekali)
- Cek grup WhatsApp sesuai GROUP_NAME

Setiap interval waktu:
- Bot membaca semua file di licenses/ + data Google Sheets (jika diaktifkan)
- Bot mencari lisensi yang habis pada H-90, H-60, H-30
- Bot mengirim alert ke grup WhatsApp

Contoh pesan yang dikirim:
```
🔔 *License Expiring Alert*
🏦 Bank: Bank ABC
🔐 License: Firewall
📅 Expired: 2025-11-10 (H-90)
🕓 Last Renewed: 2024-11-10
```
