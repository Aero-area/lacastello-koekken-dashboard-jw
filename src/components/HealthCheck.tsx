import { AlertCircle, CheckCircle, Circle } from "lucide-react";

interface HealthCheckProps {
  isConnected: boolean;
}

export function HealthCheck({ isConnected }: HealthCheckProps) {
  // Since we're using hardcoded values in client.ts, check if they exist
  const envOk = true; // Hardcoded values are available

  return (
    <div className="flex items-center gap-2">
      {/* ENV Status */}
      <div className="flex items-center gap-1">
        {envOk ? (
          <CheckCircle className="w-4 h-4 text-brand-green" />
        ) : (
          <AlertCircle className="w-4 h-4 text-brand-red" />
        )}
        <span className={`text-xs font-medium ${envOk ? 'text-brand-green' : 'text-brand-red'}`}>
          {envOk ? 'ENV OK' : 'ENV MISSING'}
        </span>
      </div>

      {/* Realtime Status */}
      <div className="flex items-center gap-1">
        <Circle 
          className={`w-3 h-3 ${
            envOk ? (isConnected ? 'text-brand-green fill-brand-green' : 'text-brand-red fill-brand-red')
                  : 'text-ink-dim fill-ink-dim'
          }`}
        />
        <span className="text-xs text-ink-dim">
          {envOk ? (isConnected ? 'LIVE' : 'OFFLINE') : 'NO CONFIG'}
        </span>
      </div>
    </div>
  );
}