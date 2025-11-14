import React, { useEffect, useState } from "react";

import type { AppConfig } from "../../../common/types";

type LogLevel = "error" | "warn" | "info" | "debug";

type ElectronAPI = {
  loadAppConfig: () => Promise<AppConfig>;
  saveAppConfig: (cfg: AppConfig) => Promise<void>;
  getLoggingConfig: () => Promise<{ logLevel: string; logsDir: string }>;
  updateLoggingConfig: (
    logLevel: string,
    logsDir: string
  ) => Promise<{ success: boolean; logLevel: string; logsDir: string }>;
  openLogsFolder: () => Promise<{ success: boolean }>;
};

export default function AppSettings(): JSX.Element {
  const [appConfig, setAppConfig] = useState<AppConfig>({
    autoStartCapture: false,
    startMinimized: false,
    autoStartApp: false,
  });
  const [logLevel, setLogLevel] = useState<LogLevel>("info");
  const [logsDir, setLogsDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [openingLogs, setOpeningLogs] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
        const [cfg, loggingCfg] = await Promise.all([api.loadAppConfig(), api.getLoggingConfig()]);
        if (mounted) {
          setAppConfig(cfg);
          setLogLevel(loggingCfg.logLevel as LogLevel);
          setLogsDir(loggingCfg.logsDir);
        }
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

  const toggleAutoStartApp = async () => {
    try {
      const updated: AppConfig = { ...appConfig, autoStartApp: !appConfig.autoStartApp };
      setAppConfig(updated);
      const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
      await api.saveAppConfig(updated);
    } catch (err) {
      console.error("Failed to save app config", err);
    }
  };

  const handleLogLevelChange = async (newLevel: LogLevel) => {
    try {
      setLogLevel(newLevel);
      const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
      await api.updateLoggingConfig(newLevel, logsDir);
    } catch (err) {
      console.error("Failed to update log level", err);
      setLogLevel(logLevel);
    }
  };

  const handleOpenLogsFolder = async () => {
    try {
      setOpeningLogs(true);
      const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
      await api.openLogsFolder();
    } catch (err) {
      console.error("Failed to open logs folder", err);
    } finally {
      setOpeningLogs(false);
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
      <div className="flex items-center justify-between mt-4">
        <div>
          <div className="text-sm font-medium text-slate-800">Auto-start app</div>
          <div className="text-xs text-slate-500">
            Start the application automatically when you log in
          </div>
        </div>
        <div>
          <label className="switch" aria-label="Auto-start app toggle">
            <input
              type="checkbox"
              checked={appConfig.autoStartApp}
              onChange={toggleAutoStartApp}
              disabled={loading}
              aria-checked={appConfig.autoStartApp}
            />
            <span className="slider" />
          </label>
        </div>
      </div>
      <hr className="my-4 border-slate-200" />
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Logging</h3>
      <div className="mb-4">
        <div className="text-sm font-medium text-slate-800 mb-2">Log Level</div>
        <div className="text-xs text-slate-500 mb-3">
          Set the verbosity level for application logs
        </div>
        <select
          value={logLevel}
          onChange={(e) => handleLogLevelChange(e.target.value as LogLevel)}
          disabled={loading}
          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="error">Error (most critical only)</option>
          <option value="warn">Warning (errors and warnings)</option>
          <option value="info">Info (default - all important messages)</option>
          <option value="debug">Debug (verbose - all details)</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-800">Logs Directory</div>
          <div className="text-xs text-slate-500 truncate">{logsDir}</div>
        </div>
        <button
          onClick={handleOpenLogsFolder}
          disabled={openingLogs || loading}
          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white text-xs font-medium rounded-md transition-colors"
          aria-label="Open logs folder"
        >
          {openingLogs ? "Opening..." : "Open Folder"}
        </button>
      </div>
    </div>
  );
}
