import { createRoot } from 'react-dom/client'
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryProvider>
      <App />
      <PWAInstallPrompt />
      <Toaster />
    </QueryProvider>
  </ErrorBoundary>
);
