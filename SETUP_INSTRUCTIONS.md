# Network Dashboard - Setup Instructions

This dashboard monitors your actual WiFi network and displays real-time information about connected devices, processes, and network traffic.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Account** (already configured)
3. **Elevated privileges** (optional, for full network scanning)

## Setup Steps

### 1. Disable RLS (Row Level Security) for Demo

Since this is a demo app, we need to disable RLS on the tables to allow data insertion without authentication.

Go to your [Supabase SQL Editor](https://app.supabase.com/project/hrywyemuegawfneldwow/sql) and run:

```sql
-- Disable RLS for demo purposes
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE hosts DISABLE ROW LEVEL SECURITY;
ALTER TABLE processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE network_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Network Monitor (Backend)

This will scan your WiFi network and monitor devices:

```bash
npm run monitor
```

**What it does:**
- Detects your current WiFi network
- Scans for connected devices (via ARP table)
- Monitors running processes on your machine
- Tracks active network connections
- Updates Supabase database every 10 seconds

**Note:** For full network scanning, you may need to run with elevated privileges:
```bash
sudo npm run monitor
```

### 4. Start the Dashboard (Frontend)

Open a **new terminal** and run:

```bash
npm run dev
```

Then open http://localhost:5173 in your browser.

## How It Works

### Network Monitoring Flow

1. **WiFi Detection**
   - Detects your current WiFi SSID
   - Gets your local IP address and gateway

2. **Device Discovery**
   - Scans ARP table for connected devices
   - Identifies device IPs and MAC addresses
   - Updates the `hosts` table in Supabase

3. **Process Monitoring**
   - Gets top 10 processes by CPU/Memory usage
   - Updates the `processes` table

4. **Connection Tracking**
   - Monitors active network connections (ESTABLISHED state)
   - Records local and remote IP addresses, ports
   - Updates the `connections` table

5. **Real-Time Dashboard**
   - Frontend queries Supabase every few seconds
   - Displays live network data
   - Shows devices, processes, connections, and alerts

## Features

### Current Device Monitoring
- ✅ Real-time process monitoring
- ✅ CPU and memory usage tracking
- ✅ Active network connections
- ✅ Bandwidth statistics

### Network Scanning
- ✅ Discover devices on local network
- ✅ Track device status (online/offline)
- ✅ Monitor multiple devices

### Dashboard Features
- ✅ Live data updates
- ✅ Device overview
- ✅ Process management
- ✅ Connection tracking
- ✅ Network statistics

## Troubleshooting

### "Permission Denied" when scanning network
**Solution:** Run the monitor with elevated privileges:
```bash
sudo npm run monitor
```

### "RLS policy violation" error
**Solution:** Make sure you disabled RLS (see Step 1)

### No devices showing up
**Solution:** 
- Check that the monitor is running (`npm run monitor`)
- Wait 10-15 seconds for the first scan to complete
- Refresh the dashboard

### Dashboard shows "Error loading data"
**Solution:**
- Verify Supabase credentials in `src/lib/supabase.ts`
- Check that tables exist in Supabase
- Run the schema.sql file if tables are missing

## Configuration

### Update Interval
Edit `network-monitor.ts` line 27:
```typescript
private updateInterval: number = 10000; // milliseconds (10 seconds)
```

### Monitor Only Specific Processes
Edit the `getProcesses()` method in `network-monitor.ts` to filter by process name.

### Add Custom Alerts
You can manually insert alerts into the `alerts` table or modify the monitor to detect anomalies.

## Architecture

```
┌─────────────────────┐
│   Your WiFi Network │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Network Monitor    │  ← Scans network, monitors processes
│  (network-monitor.ts)│
└──────────┬──────────┘
           │
           ↓ (Updates every 10s)
┌─────────────────────┐
│   Supabase Database │
└──────────┬──────────┘
           │
           ↓ (Real-time queries)
┌─────────────────────┐
│   React Dashboard   │  ← Displays data
│   (Vite + React)    │
└─────────────────────┘
```

## Production Considerations

For production use, you should:

1. **Enable RLS** and implement proper authentication
2. **Add rate limiting** to prevent database overload
3. **Implement proper error handling** and logging
4. **Use environment variables** for sensitive data
5. **Add device naming/grouping** features
6. **Implement alerting** for suspicious activity
7. **Add historical data retention** policies

## Support

If you encounter issues:
1. Check the terminal output for error messages
2. Verify Supabase connection
3. Ensure all dependencies are installed
4. Check that you have network scanning permissions
