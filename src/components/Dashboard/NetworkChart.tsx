import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { NetworkStats } from '@/lib/supabase';

interface NetworkChartProps {
  data?: NetworkStats[];
  loading?: boolean;
  selectedHostId?: string | null;
}

export function NetworkChart({ data = [], loading = false }: NetworkChartProps) {
  // Convert network stats to chart format (using KB for better resolution)
  const chartData = data.slice(0, 24).reverse().map((stat) => ({
    time: new Date(stat.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    upload: Math.round(stat.bytes_out / 1024), // Convert to KB
    download: Math.round(stat.bytes_in / 1024)  // Convert to KB
  }));

  // Calculate max value for Y-axis domain with some padding
  const allValues = chartData.flatMap(d => [d.upload, d.download]);
  const maxValue = Math.max(...allValues, 100); // Ensure minimum scale of 100KB
  const yDomain = [0, maxValue * 1.2]; // Add 20% padding to the top

  // Fallback demo data if no real data (in KB)
  const fallbackData = [
    { time: '00:00', upload: 240, download: 800 },
    { time: '04:00', upload: 320, download: 950 },
    { time: '08:00', upload: 450, download: 1200 },
    { time: '12:00', upload: 780, download: 1800 },
    { time: '16:00', upload: 650, download: 1650 },
    { time: '20:00', upload: 520, download: 1400 },
    { time: '24:00', upload: 380, download: 1100 },
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
                <LineChart 
                  data={displayData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
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
                domain={yDomain}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(value) => `${value}KB`}
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
                <span className="text-sm text-muted-foreground">Download (KB)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary-bright"></div>
                <span className="text-sm text-muted-foreground">Upload (KB)</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}