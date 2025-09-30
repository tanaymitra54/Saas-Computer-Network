import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";
import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Download, Upload, Clock, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeedTestResult {
  downloadSpeed: number; // in Mbps
  uploadSpeed: number; // in Mbps
  ping: number; // in ms
  timestamp: Date;
  isp?: string;
  serverLocation?: string;
}

export function SpeedTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const testStartTime = useRef<number>(0);
  const progressInterval = useRef<NodeJS.Timeout>();

  // Reset test state
  const resetTest = useCallback(() => {
    setResult(null);
    setProgress(0);
    setStatus('');
    setError('');
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = undefined;
    }
  }, []);

  // Mock speed test function - replace with actual implementation
  const runSpeedTest = useCallback(async () => {
    resetTest();
    setIsTesting(true);
    setStatus('Initializing speed test...');
    testStartTime.current = Date.now();
    
    try {
      // Simulate finding nearby server
      setStatus('Finding optimal server...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate ping test
      setStatus('Measuring ping...');
      await new Promise(resolve => setTimeout(resolve, 800));
      const ping = Math.floor(Math.random() * 50) + 10; // Random ping between 10-60ms
      
      // Simulate download test
      setStatus('Testing download speed...');
      let downloadSpeed = 0;
      let downloadProgress = 0;
      
      await new Promise<void>((resolve) => {
        progressInterval.current = setInterval(() => {
          downloadSpeed += Math.random() * 15 + 5; // More realistic speed increments
          downloadProgress += 10;
          setProgress(Math.min(downloadProgress, 50));
          
          if (downloadProgress >= 50) {
            clearInterval(progressInterval.current);
            resolve();
          }
        }, 200);
      });
      
      // Simulate upload test
      setStatus('Testing upload speed...');
      let uploadSpeed = 0;
      let uploadProgress = 0;
      
      await new Promise<void>((resolve) => {
        progressInterval.current = setInterval(() => {
          uploadSpeed += Math.random() * 8 + 2; // Upload is typically slower than download
          uploadProgress += 10;
          setProgress(50 + Math.min(uploadProgress, 40));
          
          if (uploadProgress >= 40) {
            clearInterval(progressInterval.current);
            resolve();
          }
        }, 200);
      });
      
      // Final processing
      setStatus('Processing results...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Set final result with more realistic values
      const finalDownloadSpeed = Math.min(downloadSpeed, 500); // Cap at 500 Mbps
      const finalUploadSpeed = Math.min(uploadSpeed, 100); // Cap at 100 Mbps
      
      setResult({
        downloadSpeed: parseFloat(finalDownloadSpeed.toFixed(2)),
        uploadSpeed: parseFloat(finalUploadSpeed.toFixed(2)),
        ping,
        timestamp: new Date(),
        isp: 'Example ISP',
        serverLocation: 'New York, US'
      });
      
      setProgress(100);
      setStatus('Test completed!');
    } catch (error) {
      console.error('Speed test failed:', error);
      setError('Test failed. Please check your connection and try again.');
      setStatus('Test failed');
    } finally {
      setIsTesting(false);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      // Auto-clear status after delay if test completed successfully
      if (!error) {
        setTimeout(() => setStatus(''), 5000);
      }
    }
  }, []);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Get connection quality based on ping and speeds
  const getConnectionQuality = useCallback((ping: number, download: number, upload: number) => {
    if (ping > 100 || download < 5 || upload < 1) return 'Poor';
    if (ping > 50 || download < 25 || upload < 5) return 'Average';
    if (download > 100 && upload > 10) return 'Excellent';
    return 'Good';
  }, []);

  return (
    <div className="space-y-4 text-white bg-black/90 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium flex items-center">
            <Zap className="h-4 w-4 mr-2 text-yellow-500" />
            Internet Speed Test
          </h3>
          <p className="text-xs text-gray-300 mt-1">
            {result ? `Last test: ${result.timestamp.toLocaleTimeString()}` : 'Test your internet connection speed'}
          </p>
        </div>
        <Button 
          onClick={runSpeedTest} 
          disabled={isTesting}
          size="sm"
          variant={isTesting ? 'outline' : 'default'}
          className={cn(
            'transition-all duration-200',
            isTesting ? 'bg-transparent' : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {status.split('...')[0] || 'Testing...'}
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Run Test
            </>
          )}
        </Button>
      </div>
      {/* Progress bar */}
      {(isTesting || status) && (
        <div className="space-y-2">
          <div className="h-2 bg-black rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500/80 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white text-right">
            {status}
          </p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-900/30 text-red-300 text-sm rounded-md flex items-start border border-red-800/50">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {result && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Download Speed */}
            <div className="bg-black/80 p-3 rounded-lg text-center text-white border border-gray-700">
              <div className="flex flex-col items-center">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
                <span className="text-xs text-gray-300">Download</span>
                <span className="text-lg font-bold text-white">{result.downloadSpeed} Mbps</span>
              </div>
            </div>
            
            {/* Upload Speed */}
            <div className="bg-black/80 p-3 rounded-lg text-center text-white border border-gray-700">
              <div className="flex flex-col items-center">
                <Upload className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
                <span className="text-xs text-gray-300">Upload</span>
                <span className="text-lg font-bold text-white">{result.uploadSpeed} Mbps</span>
              </div>
            </div>
            
            {/* Ping */}
            <div className="bg-black/80 p-3 rounded-lg text-center text-white border border-gray-700">
              <div className="flex flex-col items-center">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
                <span className="text-xs text-gray-300">Ping</span>
                <span className="text-lg font-bold text-white">{result.ping} ms</span>
              </div>
            </div>
          </div>
          
          {/* Connection Quality */}
          <div className="bg-black/80 p-3 rounded-lg text-white border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-white">Connection Quality</h4>
                <p className="text-xs text-gray-300">Based on your speed test results</p>
              </div>
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                getConnectionQuality(result.ping, result.downloadSpeed, result.uploadSpeed) === 'Excellent' 
                  ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                  : getConnectionQuality(result.ping, result.downloadSpeed, result.uploadSpeed) === 'Good'
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                  : getConnectionQuality(result.ping, result.downloadSpeed, result.uploadSpeed) === 'Average'
                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50'
                  : 'bg-red-900/30 text-red-400 border border-red-800/50'
              )}>
                {getConnectionQuality(result.ping, result.downloadSpeed, result.uploadSpeed)}
              </span>
            </div>
            
            {/* Additional info */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-300">ISP:</span>
                  <span className="text-white">{result.isp || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Server:</span>
                  <span className="text-white">{result.serverLocation || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Test again button */}
          <Button 
            onClick={runSpeedTest}
            variant="outline"
            size="sm"
            className="w-full mt-2"
            disabled={isTesting}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Test Again
          </Button>
        </div>
      )}
    </div>
  );
}
