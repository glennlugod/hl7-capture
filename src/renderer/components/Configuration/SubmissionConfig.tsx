import React, { useEffect, useState } from "react";

type ElectronAPI = {
  getSubmissionConfig: () => Promise<{
    submissionEndpoint: string;
    submissionAuthHeader: string;
    submissionConcurrency: number;
    submissionMaxRetries: number;
    submissionIntervalMinutes: number;
  }>;
  updateSubmissionConfig: (
    endpoint: string,
    authHeader: string,
    concurrency: number,
    maxRetries: number,
    intervalMinutes: number
  ) => Promise<void>;
};

export default function SubmissionConfig(): JSX.Element {
  const [config, setConfig] = useState({
    submissionEndpoint: "",
    submissionAuthHeader: "",
    submissionConcurrency: 2,
    submissionMaxRetries: 3,
    submissionIntervalMinutes: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
        const cfg = await api.getSubmissionConfig();
        if (mounted) setConfig(cfg);
      } catch (err) {
        console.error("Failed to load submission config", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const api = (globalThis as unknown as { electron: ElectronAPI }).electron;
      await api.updateSubmissionConfig(
        config.submissionEndpoint,
        config.submissionAuthHeader,
        config.submissionConcurrency,
        config.submissionMaxRetries,
        config.submissionIntervalMinutes
      );
    } catch (err) {
      console.error("Failed to save submission config", err);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof typeof config, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="rounded-lg border border-slate-200/50 bg-white/60 backdrop-blur-sm p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Submission Settings</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="endpoint" className="block text-sm font-medium text-slate-700 mb-1">
            Endpoint URL
          </label>
          <input
            id="endpoint"
            type="url"
            value={config.submissionEndpoint}
            onChange={(e) => updateConfig("submissionEndpoint", e.target.value)}
            placeholder="https://api.example.com/submit"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            REST API endpoint for submitting HL7 sessions. Leave empty to disable submissions.
          </p>
        </div>

        <div>
          <label htmlFor="auth" className="block text-sm font-medium text-slate-700 mb-1">
            Authorization Header
          </label>
          <input
            id="auth"
            type="password"
            value={config.submissionAuthHeader}
            onChange={(e) => updateConfig("submissionAuthHeader", e.target.value)}
            placeholder="Bearer token123 or Basic dXNlcjpwYXNz"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            Optional authentication header (e.g., "Bearer token" or "Basic base64").
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="concurrency" className="block text-sm font-medium text-slate-700 mb-1">
              Concurrency
            </label>
            <input
              id="concurrency"
              type="number"
              min="1"
              max="10"
              value={config.submissionConcurrency}
              onChange={(e) =>
                updateConfig("submissionConcurrency", Number.parseInt(e.target.value) || 1)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">Concurrent submissions (1-10)</p>
          </div>

          <div>
            <label htmlFor="retries" className="block text-sm font-medium text-slate-700 mb-1">
              Max Retries
            </label>
            <input
              id="retries"
              type="number"
              min="1"
              max="10"
              value={config.submissionMaxRetries}
              onChange={(e) =>
                updateConfig("submissionMaxRetries", Number.parseInt(e.target.value) || 1)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">Retry attempts (1-10)</p>
          </div>
        </div>

        <div>
          <label htmlFor="interval" className="block text-sm font-medium text-slate-700 mb-1">
            Submission Interval (minutes)
          </label>
          <input
            id="interval"
            type="number"
            min="1"
            max="60"
            value={config.submissionIntervalMinutes}
            onChange={(e) =>
              updateConfig("submissionIntervalMinutes", Number.parseInt(e.target.value) || 1)
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            How often to check for pending submissions (1-60 minutes)
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
