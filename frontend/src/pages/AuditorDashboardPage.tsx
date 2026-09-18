import React, { useState, useEffect } from "react";
import { Search, History, ShieldCheck, Filter, RefreshCw, FileText } from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { fetchAuditEvents } from "../services/assets/assetService";
import { AuditEvent } from "../types";
import { formatAddress, formatDate } from "../utils/formatters";

export const AuditorDashboardPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAuditData = async () => {
    setLoading(true);
    const data = await fetchAuditEvents();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesFilter = filterType === "ALL" || e.eventType === filterType;
    const matchesSearch =
      searchQuery === "" ||
      e.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.initiator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Immutable Blockchain Audit Trail</h1>
          <p className="text-xs text-slate-400">
            Chronological audit log of all identity registrations, status transitions, role grants, and NFT custody transfers.
          </p>
        </div>
        <button
          onClick={loadAuditData}
          className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition self-start"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by details, transaction hash, or initiator address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Event Types</option>
            <option value="IDENTITY_REGISTERED">Identity Registrations</option>
            <option value="ASSET_MINTED">Asset Mint Events</option>
            <option value="ASSET_ALLOCATED">Asset Allocations</option>
            <option value="ASSET_TRANSFERRED">Custody Transfers</option>
            <option value="ASSET_STATUS_UPDATED">Status Updates</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card title="Chronological Event History" subtitle={`Displaying ${filteredEvents.length} verified events`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Event Type</th>
                <th className="pb-3 font-semibold">Event Details</th>
                <th className="pb-3 font-semibold">Block / Time</th>
                <th className="pb-3 font-semibold">Initiator Address</th>
                <th className="pb-3 font-semibold text-right">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {evt.eventType}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-200 font-sans max-w-xs">{evt.details}</td>
                  <td className="py-3.5 text-slate-400 text-[11px]">
                    <div>Block #{evt.blockNumber}</div>
                    <div className="text-[10px] text-slate-600">{formatDate(evt.timestamp)}</div>
                  </td>
                  <td className="py-3.5 text-slate-400 text-[11px]">{formatAddress(evt.initiator)}</td>
                  <td className="py-3.5 text-right text-emerald-400 text-[11px]">
                    <span title={evt.txHash}>{formatAddress(evt.txHash)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
