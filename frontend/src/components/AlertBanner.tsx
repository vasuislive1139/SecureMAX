import React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

interface AlertBannerProps {
  type: "info" | "success" | "warning" | "error";
  message: string;
  onClose?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, message, onClose }) => {
  const styles = {
    info: "bg-blue-950/50 border-blue-800 text-blue-200",
    success: "bg-emerald-950/50 border-emerald-800 text-emerald-200",
    warning: "bg-amber-950/50 border-amber-800 text-amber-200",
    error: "bg-rose-950/50 border-rose-800 text-rose-200",
  };

  const icons = {
    info: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
  };

  return (
    <div className={`p-3 rounded-lg border text-sm flex items-start gap-2.5 ${styles[type]}`}>
      {icons[type]}
      <div className="flex-1">{message}</div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">
          ✕
        </button>
      )}
    </div>
  );
};
