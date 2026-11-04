import React from 'react';
import { 
  X, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  BarChart3, 
  Users, 
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { GOVERNANCE_ANALYTICS } from '../../data/brandVault';

export default function GovernanceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#090e1a] border border-slate-800 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0a101f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Governance Insights & Violation Trends
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Identify Repeated Brand Violations and Track Employee/Agency Compliance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="p-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Monthly Scans</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {GOVERNANCE_ANALYTICS.monthlyAudits}
            </div>
            <span className="text-[11px] font-mono text-cyan-400 mt-1 block">+22% month-over-month</span>
          </div>

          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Pre-Publication Intercept Rate</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
              {GOVERNANCE_ANALYTICS.preventionRate}
            </div>
            <span className="text-[11px] font-mono text-emerald-400/80 mt-1 block">Zero public brand leaks</span>
          </div>

          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Average Verification Latency</span>
            <div className="text-2xl font-extrabold text-cyan-300 mt-1 font-mono">
              {GOVERNANCE_ANALYTICS.avgLatency}
            </div>
            <span className="text-[11px] font-mono text-slate-400 mt-1 block">GPU Tensor Core vector lookup</span>
          </div>
        </div>

        {/* Main Body: Top Violations & Department Risk Matrix */}
        <div className="p-6 space-y-6">
          {/* Top Repeated Violations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Top Repeated Brand & Factual Violations (Last 30 Days)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">Auto-aggregated across 14,820 audits</span>
            </div>

            <div className="space-y-2.5">
              {GOVERNANCE_ANALYTICS.topViolations.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#080d19] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        v.risk === 'Critical' 
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40' 
                          : v.risk === 'High'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {v.risk}
                      </span>
                      <span className="text-white font-semibold">{v.category}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Primary Source: <span className="text-slate-300">{v.department}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-start sm:self-center">
                    <div className="text-right">
                      <span className="text-white font-bold">{v.occurrences} flags</span>
                      <span className="text-[10px] text-rose-400 block">{v.trend}</span>
                    </div>
                    <button
                      onClick={() => alert(`Brand Policy Training assigned for: ${v.department}`)}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700"
                    >
                      Remediate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Department & Agency Risk Index</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080d19]">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-[#0a101f] text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Team / Entity</th>
                    <th className="p-3">Audits Processed</th>
                    <th className="p-3">Compliance Score</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {GOVERNANCE_ANALYTICS.departmentBreakdown.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-3 font-semibold text-white">{dept.name}</td>
                      <td className="p-3 text-slate-400">{dept.audits}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={dept.complianceScore >= 90 ? 'text-emerald-400' : dept.complianceScore >= 75 ? 'text-amber-400' : 'text-rose-400'}>
                            {dept.complianceScore}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${dept.complianceScore >= 90 ? 'bg-emerald-400' : dept.complianceScore >= 75 ? 'bg-amber-400' : 'bg-rose-400'}`}
                              style={{ width: `${dept.complianceScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dept.riskLevel === 'High Risk'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            : dept.riskLevel === 'Moderate'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {dept.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a101f] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Real-time Telemetry Engine Active</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
