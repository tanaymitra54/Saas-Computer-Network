# SaaS Zero Network Monitor - Windows Agent
# Copyright © github.com/odaysec

param(
    [string]$ServerUrl = "https://unksgpuqownlysedeoyi.supabase.co",
    [string]$AgentToken = $null
)

# Configuration
$Config = @{
    ServerUrl = $ServerUrl
    AgentToken = $AgentToken
    UpdateInterval = 60  # seconds
    Hostname = $env:COMPUTERNAME
}

Write-Host "SaaS Zero Network Monitor - Windows Agent" -ForegroundColor Green
Write-Host "Copyright © github.com/odaysec" -ForegroundColor Gray
Write-Host ""

# Function to get network connections with process info
function Get-NetworkConnections {
    try {
        $connections = @()
        $tcpConnections = Get-NetTCPConnection | Where-Object { $_.State -eq 'Established' -or $_.State -eq 'Listen' }
        
        foreach ($conn in $tcpConnections) {
            try {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    $connectionInfo = @{
                        ProcessId = $conn.OwningProcess
                        ProcessName = $process.ProcessName
                        ProcessPath = $process.Path
                        LocalAddress = $conn.LocalAddress
                        LocalPort = $conn.LocalPort
                        RemoteAddress = $conn.RemoteAddress
                        RemotePort = $conn.RemotePort
                        State = $conn.State
                        Protocol = "TCP"
                        CreationTime = $conn.CreationTime
                    }
                    $connections += $connectionInfo
                }
            }
            catch {
                # Skip processes we can't access
                continue
            }
        }
        
        return $connections
    }
    catch {
        Write-Warning "Failed to get network connections: $($_.Exception.Message)"
        return @()
    }
}

# Function to get process information
function Get-ProcessInfo {
    try {
        $processes = Get-Process | Where-Object { $_.Id -gt 0 }
        $processInfo = @()
        
        foreach ($proc in $processes) {
            try {
                $cpu = Get-Counter "\Process($($proc.ProcessName))\% Processor Time" -ErrorAction SilentlyContinue
                $processData = @{
                    Id = $proc.Id
                    Name = $proc.ProcessName
                    Path = $proc.Path
                    StartTime = $proc.StartTime
                    CPUPercent = if ($cpu) { [math]::Round($cpu.CounterSamples[0].CookedValue, 2) } else { 0 }
                    MemoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
                    UserName = $proc.UserName
                    Status = if ($proc.Responding) { "running" } else { "not_responding" }
                }
                $processInfo += $processData
            }
            catch {
                # Skip processes we can't access
                continue
            }
        }
        
        return $processInfo
    }
    catch {
        Write-Warning "Failed to get process information: $($_.Exception.Message)"
        return @()
    }
}

# Function to send data to server
function Send-DataToServer {
    param(
        [string]$Endpoint,
        [hashtable]$Data
    )
    
    try {
        $url = "$($Config.ServerUrl)/functions/v1/$Endpoint"
        $headers = @{
            'Content-Type' = 'application/json'
            'Authorization' = "Bearer $($Config.AgentToken)"
        }
        
        $jsonData = $Data | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri $url -Method POST -Body $jsonData -Headers $headers
        
        return $response
    }
    catch {
        Write-Warning "Failed to send data to server: $($_.Exception.Message)"
        return $null
    }
}

# Function to register host
function Register-Host {
    $hostData = @{
        hostname = $Config.Hostname
        os_type = "Windows"
        os_version = (Get-CimInstance Win32_OperatingSystem).Version
        ip_address = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" | Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress
        mac_address = (Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Select-Object -First 1).MacAddress
        agent_version = "1.0.0"
    }
    
    Write-Host "Registering host: $($hostData.hostname)" -ForegroundColor Yellow
    $result = Send-DataToServer -Endpoint "agent-register" -Data $hostData
    
    if ($result) {
        Write-Host "Host registered successfully!" -ForegroundColor Green
        return $result.host_id
    } else {
        Write-Host "Failed to register host!" -ForegroundColor Red
        return $null
    }
}

# Main monitoring loop
function Start-Monitoring {
    param([string]$HostId)
    
    Write-Host "Starting network monitoring for host: $HostId" -ForegroundColor Green
    Write-Host "Update interval: $($Config.UpdateInterval) seconds" -ForegroundColor Gray
    Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
    Write-Host ""
    
    while ($true) {
        try {
            Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Collecting data..." -ForegroundColor Cyan
            
            # Get current data
            $processes = Get-ProcessInfo
            $connections = Get-NetworkConnections
            
            # Prepare data payload
            $payload = @{
                host_id = $HostId
                timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                processes = $processes
                connections = $connections
                system_info = @{
                    cpu_count = (Get-CimInstance Win32_ComputerSystem).NumberOfProcessors
                    total_memory = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
                    uptime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
                }
            }
            
            # Send data to server
            $result = Send-DataToServer -Endpoint "network-data" -Data $payload
            
            if ($result) {
                Write-Host "  ✓ Data sent successfully - Processes: $($processes.Count), Connections: $($connections.Count)" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to send data" -ForegroundColor Red
            }
            
            # Wait for next update
            Start-Sleep -Seconds $Config.UpdateInterval
        }
        catch {
            Write-Host "  ✗ Error during monitoring: $($_.Exception.Message)" -ForegroundColor Red
            Start-Sleep -Seconds 10
        }
    }
}

# Main execution
if (-not $Config.AgentToken) {
    Write-Host "Error: Agent token required!" -ForegroundColor Red
    Write-Host "Usage: .\windows-agent.ps1 -AgentToken 'your-token-here'" -ForegroundColor Yellow
    exit 1
}

# Register host and start monitoring
$hostId = Register-Host
if ($hostId) {
    Start-Monitoring -HostId $hostId
} else {
    Write-Host "Failed to register host. Exiting." -ForegroundColor Red
    exit 1
}