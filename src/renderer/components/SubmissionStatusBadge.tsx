import React from "react";

interface SubmissionStatusBadgeProps {
  status?: string;
  attempts?: number;
  submittedAt?: number;
}

const SubmissionStatusBadge: React.FC<SubmissionStatusBadgeProps> = ({
  status,
  attempts = 0,
  submittedAt,
}) => {
  const getBadgeColor = (): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-900";
      case "submitted":
        return "bg-green-100 text-green-900";
      case "failed":
        return "bg-red-100 text-red-900";
      case "ignored":
        return "bg-gray-100 text-gray-900";
      default:
        return "bg-slate-100 text-slate-900";
    }
  };

  const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return "";
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  if (!status) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor()}`}
      >
        {status}
      </span>
      {status !== "pending" && submittedAt && (
        <span className="text-xs text-slate-500">{formatRelativeTime(submittedAt)}</span>
      )}
      {attempts > 0 && status === "failed" && (
        <span className="text-xs text-slate-500">({attempts}x)</span>
      )}
    </div>
  );
};

export default SubmissionStatusBadge;
