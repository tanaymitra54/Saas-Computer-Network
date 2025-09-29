# Panduan Setup SaaS Zero Network Monitor
**Sistem monitoring WiFi rumah yang 100% fungsional**

## Setup Lengkap

### 1. Database Setup (Supabase)

1. **Login ke Supabase Dashboard**
   - Buka [supabase.com](https://supabase.com)
   - Login dengan akun Anda

2. **Execute Database Schema**
   - Buka SQL Editor di dashboard Supabase
   - Copy semua kode dari `supabase/seed.sql`
   - Execute untuk membuat tabel dan functions

3. **Enable Row Level Security**
   - Pastikan RLS enabled untuk semua tabel
   - Policies sudah auto-created via migration

### 2. Web Dashboard Setup

Dashboard sudah ready di production URL atau jalankan lokal:

```bash
npm install
npm run dev
```

**Fitur Dashboard:**
- Real-time monitoring
- Process analytics
- Network connections
- Security alerts
- Admin authentication

### 3. Setup Admin Account

1. **Buat Akun Admin**
   - Buka web dashboard
   - Klik "Create Account"
   - Masukkan email & password
   - Auto-created sebagai admin dengan full access

2. **Generate Agent Token**
   ```sql
   -- Execute di Supabase SQL Editor untuk membuat token
   INSERT INTO agent_tokens (organization_id, token, expires_at)
   SELECT 
       o.id,
       'agent_' || encode(gen_random_bytes(32), 'hex'),
       now() + interval '1 year'
   FROM organizations o
   WHERE o.owner_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```

### 4. Install Windows Agent

1. **Download Agent Script**
   ```powershell
   # Buka PowerShell sebagai Administrator
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/odaysec/agent/windows-agent.ps1" -OutFile "windows-agent.ps1"
   ```

2. **Set Execution Policy** (jika diperlukan)
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Jalankan Agent**
   ```powershell
   .\windows-agent.ps1 -AgentToken "your-generated-token"
   ```

### 5. Install Linux Agent

1. **Download & Setup**
   ```bash
   curl -o linux-agent.sh https://raw.githubusercontent.com/odaysec/agent/linux-agent.sh
   chmod +x linux-agent.sh
   ```

2. **Install Dependencies**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install curl jq net-tools

   # CentOS/RHEL
   sudo yum install curl jq net-tools
   ```

3. **Jalankan Agent**
   ```bash
   ./linux-agent.sh -t "your-generated-token"
   ```

## Monitoring Setup untuk Jaringan Rumah

### Router/Gateway Monitoring
```bash
# Setup monitoring untuk router (jika support SSH)
ssh admin@192.168.1.1
# Install agent di router jika memungkinkan
```

### Multiple Devices Setup

1. **PC/Laptop Utama** (Windows)
   - Install Windows agent
   - Running 24/7 untuk monitoring kontinyu

2. **Server/NAS** (Linux)
   - Install Linux agent
   - Setup sebagai systemd service untuk auto-start

3. **Smartphone** (via Router)
   - Monitor melalui router logs
   - Atau setup Termux dengan Linux agent

### Systemd Service Setup (Linux)

```bash
# Buat service file
sudo nano /etc/systemd/system/saas-zero-agent.service
```

```ini
[Unit]
Description=SaaS Zero Network Monitor Agent
After=network.target

[Service]
Type=simple
User=saaszero
WorkingDirectory=/opt/saas-zero
ExecStart=/opt/saas-zero/linux-agent.sh -t "your-token"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable dan start service
sudo systemctl daemon-reload
sudo systemctl enable saas-zero-agent
sudo systemctl start saas-zero-agent
```

## Data yang Akan Termonitor

### Process Information
- **Chrome/Firefox**: Koneksi browser dan tab aktif
- **Steam/Games**: Gaming traffic dan server connections
- **Spotify/Netflix**: Streaming bandwidth usage
- **Windows Update**: System update traffic
- **Antivirus**: Security scanning connections

### Network Connections
- **Established**: Koneksi aktif (streaming, browsing, gaming)
- **Listening**: Services yang berjalan (web server, SSH, dll)
- **Time_Wait**: Koneksi yang baru ditutup
- **Foreign Address**: Server/website yang diakses

### Security Monitoring
- **Unknown Processes**: Proses baru yang mencurigakan
- **Suspicious IPs**: Koneksi ke IP yang diblacklist
- **Port Scanning**: Deteksi attempt port scanning
- **High Bandwidth**: Usage anomali yang tinggi

## Konfigurasi Lanjutan

### Custom Alert Rules
```sql
-- Setup custom alert untuk bandwidth tinggi
INSERT INTO alerts (organization_id, host_id, type, severity, title, description, status)
SELECT 
    o.id,
    h.id,
    'bandwidth',
    'high',
    'High Bandwidth Usage Detected',
    'Bandwidth usage exceeded 1GB in 5 minutes',
    'active'
FROM organizations o, hosts h, network_stats ns
WHERE o.owner_id = auth.uid()
    AND h.organization_id = o.id
    AND ns.host_id = h.id
    AND ns.bytes_out > 1073741824  -- 1GB
    AND ns.timestamp > now() - interval '5 minutes';
```

### Firewall Integration
```powershell
# Windows Firewall - Block suspicious IP
New-NetFirewallRule -DisplayName "SaaS Zero Block" -Direction Outbound -RemoteAddress "suspicious-ip" -Action Block
```

```bash
# Linux iptables - Block suspicious IP
sudo iptables -A OUTPUT -d suspicious-ip -j DROP
```

## Security Best Practices

### Agent Security
1. **Least Privilege**: Agent hanya collect metadata, bukan payload
2. **Token Security**: Store token dengan aman, rotate berkala
3. **Network Security**: HTTPS/TLS untuk semua komunikasi
4. **Local Security**: Agent jalan sebagai user terbatas

### Data Privacy
1. **No Payload Capture**: Hanya metadata koneksi
2. **Local Processing**: Sebanyak mungkin proses di local
3. **Encrypted Transit**: Semua data encrypted saat dikirim
4. **Retention Policy**: Auto-delete data lama

## Monitoring Tips

### Daily Monitoring
- Cek dashboard setiap pagi untuk activities semalam
- Review security alerts yang muncul
- Monitor bandwidth usage untuk identify heavy users

### Weekly Analysis
- Review top processes berdasarkan bandwidth
- Analyze connection patterns untuk detect anomalies
- Update firewall rules berdasarkan findings

### Monthly Maintenance
- Rotate agent tokens
- Review dan cleanup old data
- Update agent software ke versi terbaru

## Troubleshooting

### Agent Tidak Konek
1. Check network connectivity
2. Verify token validity
3. Check firewall settings
4. Review agent logs

### Data Tidak Muncul
1. Verify agent registration berhasil
2. Check dashboard filters
3. Verify database permissions
4. Check real-time subscriptions

### Performance Issues
1. Reduce agent update interval
2. Limit process scanning scope
3. Optimize database queries
4. Scale Supabase tier jika perlu


