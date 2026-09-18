import React from "react";
import { IdentityStatus, AssetStatus, UserRole } from "../types";

interface StatusBadgeProps {
  status: IdentityStatus | AssetStatus | UserRole | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "sm" }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case "Active":
      case "Verified":
      case "Registered":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Allocated":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Suspended":
      case "InMaintenance":
      case "Pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Revoked":
      case "Decommissioned":
      case "Rejected":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "ADMIN":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "MANAGER":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "AUDITOR":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "USER":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${getBadgeStyle()}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {status}
    </span>
  );
};
