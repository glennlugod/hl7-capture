import React, { useEffect, useState } from "react";

import type { AppConfig } from "../../../common/types";

type ElectronAPI = {
  loadAppConfig: () => Promise<AppConfig>;
  saveAppConfig: (cfg: AppConfig) => Promise<void>;
};

export default function AppSettings(): JSX.Element {
  const [appConfig, setAppConfig] = useState<AppConfig>({
    autoStartCapture: false,
    startMinimized: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
        const cfg = await api.loadAppConfig();
        if (mounted) setAppConfig(cfg);
      } catch (err) {
        console.error("Failed to load app config", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleAutoStart = async () => {
    try {
      const updated: AppConfig = { ...appConfig, autoStartCapture: !appConfig.autoStartCapture };
      setAppConfig(updated);
      const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
      await api.saveAppConfig(updated);
    } catch (err) {
      console.error("Failed to save app config", err);
    }
  };

  const toggleStartMinimized = async () => {
    try {
      const updated: AppConfig = { ...appConfig, startMinimized: !appConfig.startMinimized };
      setAppConfig(updated);
      const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
      await api.saveAppConfig(updated);
    } catch (err) {
      console.error("Failed to save app config", err);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200/50 bg-white/60 backdrop-blur-sm p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Application</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-800">Auto-start capture</div>
          <div className="text-xs text-slate-500">
            Start network capture automatically on app startup
          </div>
        </div>
        <div>
          <label className="switch" aria-label="Auto-start capture toggle">
            <input
              type="checkbox"
              checked={appConfig.autoStartCapture}
              onChange={toggleAutoStart}
              disabled={loading}
              aria-checked={appConfig.autoStartCapture}
            />
            <span className="slider" />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div>
          <div className="text-sm font-medium text-slate-800">Start minimized</div>
          <div className="text-xs text-slate-500">
            Start the application window minimized on launch
          </div>
        </div>
        <div>
          <label className="switch" aria-label="Start minimized toggle">
            <input
              type="checkbox"
              checked={appConfig.startMinimized}
              onChange={toggleStartMinimized}
              disabled={loading}
              aria-checked={appConfig.startMinimized}
            />
            <span className="slider" />
          </label>
        </div>
      </div>
    </div>
  );
}
