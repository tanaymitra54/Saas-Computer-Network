#!/bin/bash

# SaaS Zero Network Monitor - Linux Agent
# Copyright © github.com/odaysec

# Configuration
SERVER_URL="https://unksgpuqownlysedeoyi.supabase.co"
AGENT_TOKEN=""
UPDATE_INTERVAL=60
HOSTNAME=$(hostname)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${GREEN}SaaS Zero Network Monitor - Linux Agent${NC}"
echo -e "${GRAY}Copyright © github.com/odaysec${NC}"
echo ""

# Function to show usage
show_usage() {
    echo "Usage: $0 -t <agent-token> [-s <server-url>] [-i <interval>]"
    echo "  -t, --token     Agent token (required)"
    echo "  -s, --server    Server URL (default: $SERVER_URL)"
    echo "  -i, --interval  Update interval in seconds (default: $UPDATE_INTERVAL)"
    echo "  -h, --help      Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--token)
            AGENT_TOKEN="$2"
            shift 2
            ;;
        -s|--server)
            SERVER_URL="$2"
            shift 2
            ;;
        -i|--interval)
            UPDATE_INTERVAL="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            ;;
    esac
done

# Check if token is provided
if [ -z "$AGENT_TOKEN" ]; then
    echo -e "${RED}Error: Agent token is required!${NC}"
    show_usage
fi

# Check required commands
for cmd in curl jq ss ps netstat; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}Error: $cmd is required but not installed${NC}"
        exit 1
    fi
done

# Function to get network connections
get_network_connections() {
    local connections='[]'
    
    # Use ss command to get network connections
    while IFS= read -r line; do
        # Parse ss output: State Recv-Q Send-Q Local-Address:Port Peer-Address:Port Process
        if [[ $line =~ ^(ESTAB|LISTEN) ]]; then
            local state=$(echo "$line" | awk '{print $1}')
            local local_addr=$(echo "$line" | awk '{print $4}' | cut -d':' -f1)
            local local_port=$(echo "$line" | awk '{print $4}' | cut -d':' -f2)
            local remote_addr=$(echo "$line" | awk '{print $5}' | cut -d':' -f1)
            local remote_port=$(echo "$line" | awk '{print $5}' | cut -d':' -f2)
            local process_info=$(echo "$line" | grep -o 'users:(([^)]*))' | head -1)
            
            if [ ! -z "$process_info" ]; then
                local pid=$(echo "$process_info" | grep -o 'pid=[0-9]*' | cut -d'=' -f2)
                local process_name=$(ps -p "$pid" -o comm= 2>/dev/null)
                
                if [ ! -z "$pid" ] && [ ! -z "$process_name" ]; then
                    local conn_json=$(jq -n \
                        --arg pid "$pid" \
                        --arg name "$process_name" \
                        --arg local_addr "$local_addr" \
                        --arg local_port "$local_port" \
                        --arg remote_addr "$remote_addr" \
                        --arg remote_port "$remote_port" \
                        --arg state "$state" \
                        '{
                            process_id: $pid,
                            process_name: $name,
                            local_address: $local_addr,
                            local_port: ($local_port | tonumber),
                            remote_address: $remote_addr,
                            remote_port: ($remote_port | tonumber),
                            state: $state,
                            protocol: "TCP"
                        }')
                    
                    connections=$(echo "$connections" | jq ". += [$conn_json]")
                fi
            fi
        fi
    done < <(ss -tuln)
    
    echo "$connections"
}

# Function to get process information
get_process_info() {
    local processes='[]'
    
    # Get process information using ps
    while IFS= read -r line; do
        local pid=$(echo "$line" | awk '{print $1}')
        local cpu=$(echo "$line" | awk '{print $2}')
        local mem=$(echo "$line" | awk '{print $3}')
        local name=$(echo "$line" | awk '{print $4}')
        local user=$(echo "$line" | awk '{print $5}')
        
        # Skip header and invalid entries
        if [ "$pid" != "PID" ] && [ ! -z "$pid" ] && [[ "$pid" =~ ^[0-9]+$ ]]; then
            # Get memory in MB
            local mem_kb=$(ps -p "$pid" -o rss= 2>/dev/null | tr -d ' ')
            local mem_mb=0
            if [ ! -z "$mem_kb" ]; then
                mem_mb=$((mem_kb / 1024))
            fi
            
            local proc_json=$(jq -n \
                --arg pid "$pid" \
                --arg name "$name" \
                --arg cpu "$cpu" \
                --arg mem "$mem_mb" \
                --arg user "$user" \
                '{
                    id: ($pid | tonumber),
                    name: $name,
                    cpu_percent: ($cpu | tonumber),
                    memory_mb: ($mem | tonumber),
                    user_name: $user,
                    status: "running"
                }')
            
            processes=$(echo "$processes" | jq ". += [$proc_json]")
        fi
    done < <(ps aux --no-headers | head -50)  # Limit to first 50 processes
    
    echo "$processes"
}

# Function to send data to server
send_data_to_server() {
    local endpoint="$1"
    local data="$2"
    
    local url="${SERVER_URL}/functions/v1/${endpoint}"
    
    local response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT_TOKEN" \
        -d "$data" \
        -w "%{http_code}")
    
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        echo "$body"
        return 0
    else
        echo -e "${RED}HTTP Error $http_code: $body${NC}" >&2
        return 1
    fi
}

# Function to register host
register_host() {
    local os_info=$(cat /etc/os-release 2>/dev/null | grep "PRETTY_NAME" | cut -d'"' -f2)
    local ip_addr=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+')
    local mac_addr=$(ip link show $(ip route show default | awk '/default/ {print $5}') 2>/dev/null | grep -oP 'link/ether \K\S+')
    
    local host_data=$(jq -n \
        --arg hostname "$HOSTNAME" \
        --arg os_type "Linux" \
        --arg os_version "$os_info" \
        --arg ip_address "$ip_addr" \
        --arg mac_address "$mac_addr" \
        --arg agent_version "1.0.0" \
        '{
            hostname: $hostname,
            os_type: $os_type,
            os_version: $os_version,
            ip_address: $ip_address,
            mac_address: $mac_address,
            agent_version: $agent_version
        }')
    
    echo -e "${YELLOW}Registering host: $HOSTNAME${NC}"
    local result=$(send_data_to_server "agent-register" "$host_data")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Host registered successfully!${NC}"
        local host_id=$(echo "$result" | jq -r '.host_id')
        echo "$host_id"
        return 0
    else
        echo -e "${RED}Failed to register host!${NC}"
        return 1
    fi
}

# Function to start monitoring
start_monitoring() {
    local host_id="$1"
    
    echo -e "${GREEN}Starting network monitoring for host: $host_id${NC}"
    echo -e "${GRAY}Update interval: $UPDATE_INTERVAL seconds${NC}"
    echo -e "${GRAY}Press Ctrl+C to stop monitoring${NC}"
    echo ""
    
    while true; do
        echo -e "${CYAN}$(date '+%Y-%m-%d %H:%M:%S') - Collecting data...${NC}"
        
        # Get current data
        local processes=$(get_process_info)
        local connections=$(get_network_connections)
        
        # Prepare data payload
        local payload=$(jq -n \
            --arg host_id "$host_id" \
            --arg timestamp "$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')" \
            --argjson processes "$processes" \
            --argjson connections "$connections" \
            '{
                host_id: $host_id,
                timestamp: $timestamp,
                processes: $processes,
                connections: $connections,
                system_info: {
                    cpu_count: 4,
                    total_memory: 8,
                    uptime: "unknown"
                }
            }')
        
        # Send data to server
        local result=$(send_data_to_server "network-data" "$payload")
        
        if [ $? -eq 0 ]; then
            local proc_count=$(echo "$processes" | jq '. | length')
            local conn_count=$(echo "$connections" | jq '. | length')
            echo -e "  ${GREEN}✓ Data sent successfully - Processes: $proc_count, Connections: $conn_count${NC}"
        else
            echo -e "  ${RED}✗ Failed to send data${NC}"
        fi
        
        # Wait for next update
        sleep $UPDATE_INTERVAL
    done
}

# Main execution
echo -e "${CYAN}Starting SaaS Zero Network Monitor Agent...${NC}"

# Register host and start monitoring
host_id=$(register_host)
if [ $? -eq 0 ] && [ ! -z "$host_id" ]; then
    start_monitoring "$host_id"
else
    echo -e "${RED}Failed to register host. Exiting.${NC}"
    exit 1
fi