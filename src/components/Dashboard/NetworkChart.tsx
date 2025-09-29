import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { NetworkStats } from '@/lib/supabase';

interface NetworkChartProps {
  data?: NetworkStats[];
  loading?: boolean;
  selectedHostId?: string | null;
}

export function NetworkChart({ data = [], loading = false }: NetworkChartProps) {
  // Convert network stats to chart format
  const chartData = data.slice(0, 24).reverse().map((stat, index) => ({
    time: new Date(stat.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    upload: Math.round(stat.bytes_out / (1024 * 1024)), // Convert to MB
    download: Math.round(stat.bytes_in / (1024 * 1024)) // Convert to MB
  }));

  // Fallback demo data if no real data
  const fallbackData = [
    { time: '00:00', upload: 24, download: 80 },
    { time: '04:00', upload: 32, download: 95 },
    { time: '08:00', upload: 45, download: 120 },
    { time: '12:00', upload: 78, download: 180 },
    { time: '16:00', upload: 65, download: 165 },
    { time: '20:00', upload: 52, download: 140 },
    { time: '24:00', upload: 38, download: 110 },
  ];

  const displayData = chartData.length > 0 ? chartData : fallbackData;
  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Network Traffic {data.length > 0 ? '(Real-time)' : '(Demo)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading network data...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Line
                type="monotone"
                dataKey="download"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
              <Line
                type="monotone"
                dataKey="upload"
                stroke="hsl(var(--primary-bright))"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                activeDot={{ r: 4, fill: "hsl(var(--primary-bright))" }}
              />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary"></div>
                <span className="text-sm text-muted-foreground">Download (MB)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary-bright"></div>
                <span className="text-sm text-muted-foreground">Upload (MB)</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}