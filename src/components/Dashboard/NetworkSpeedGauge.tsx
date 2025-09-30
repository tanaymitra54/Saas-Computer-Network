import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "@/components/ui/gauge";
import { SpeedTest } from "./SpeedTest";
import { useEffect, useState } from "react";
import { Activity, Wifi, Zap } from "lucide-react";

interface NetworkSpeedGaugeProps {
  networkStats: any[];
  loading: boolean;
}

export function NetworkSpeedGauge({ networkStats, loading }: NetworkSpeedGaugeProps) {
  const [speedMbps, setSpeedMbps] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(100); // Default max speed in Mbps

  useEffect(() => {
    if (networkStats.length < 2) return;
    
    // Get the two most recent stats
    const [prev, current] = networkStats.slice(-2);
    
    // Calculate time difference in seconds
    const timeDiff = (new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
    
    if (timeDiff <= 0) return;
    
    // Calculate speed in bytes per second
    const bytesDiff = (current.bytes_in + current.bytes_out) - (prev.bytes_in + prev.bytes_out);
    const bytesPerSecond = bytesDiff / timeDiff;
    
    // Convert to Mbps (1 byte = 8 bits, 1 Mbps = 1,000,000 bits per second)
    const speed = (bytesPerSecond * 8) / 1000000;
    
    setSpeedMbps(prevSpeed => {
      // Smooth the speed value
      const smoothedSpeed = prevSpeed * 0.7 + speed * 0.3;
      // Auto-adjust max speed if needed
      if (smoothedSpeed > maxSpeed * 0.8) {
        setMaxSpeed(Math.ceil(smoothedSpeed / 50) * 50 + 50); // Round up to next 50Mbps
      }
      return smoothedSpeed;
    });
  }, [networkStats]);

  // Calculate percentage for the gauge
  const percentage = Math.min(100, Math.max(0, (speedMbps / maxSpeed) * 100));
  
  // Determine color based on speed
  let color = "#10b981"; // Green
  if (speedMbps > maxSpeed * 0.7) color = "#f59e0b"; // Yellow
  if (speedMbps > maxSpeed * 0.9) color = "#ef4444"; // Red

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Network Speed
          </CardTitle>
          <div className="flex items-center text-xs text-muted-foreground">
            <Wifi className="h-3 w-3 mr-1" />
            {speedMbps.toFixed(1)} Mbps
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center mb-4">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading network data...</div>
          ) : networkStats.length < 2 ? (
            <div className="text-muted-foreground text-sm text-center">
              <div>Insufficient data</div>
              <div className="text-xs mt-1">Connect devices to see speed</div>
            </div>
          ) : (
            <div className="text-center space-y-2 w-full">
              <div className="relative w-full max-w-[200px] mx-auto">
                <Gauge 
                  value={percentage} 
                  size="xl"
                  showValue={false}
                  color={color}
                  className="w-full h-auto aspect-square"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold">{speedMbps.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Mbps</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Max: {maxSpeed} Mbps
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t pt-4">
          <SpeedTest />
        </div>
      </CardContent>
    </Card>
  );
}
