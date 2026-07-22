import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Reports() {
  const { user } = useOutletContext();
  const [kpis, setKpis] = useState(null);
  const [fuelEfficiency, setFuelEfficiency] = useState([]);
  const [roi, setRoi] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/reports/kpis', { headers }).then(r => r.json()),
      fetch('/api/reports/fuel-efficiency', { headers }).then(r => r.json()),
      fetch('/api/reports/roi', { headers }).then(r => r.json()),
    ]).then(([kpisData, fuelData, roiData]) => {
      setKpis(kpisData.data);
      setFuelEfficiency(fuelData.data);
      setRoi(roiData.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-3xl text-accent glow-text">sync</span>
          <span className="text-slate-450 font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  // Fuel Efficiency chart data
  const fuelChartData = {
    labels: fuelEfficiency.filter(v => Number(v.total_fuel) > 0).map(v => v.registration_number),
    datasets: [{
      label: 'Km per Liter',
      data: fuelEfficiency.filter(v => Number(v.total_fuel) > 0).map(v => Number(v.fuel_efficiency).toFixed(2)),
      backgroundColor: 'rgba(45, 212, 191, 0.65)',
      borderColor: '#2dd4bf',
      borderWidth: 1.5,
      borderRadius: 6,
    }]
  };

  // Cost breakdown doughnut data (summed across all vehicles)
  const totalFuel = roi.reduce((s, v) => s + Number(v.total_fuel), 0);
  const totalMaint = roi.reduce((s, v) => s + Number(v.total_maintenance), 0);
  const costBreakdownData = {
    labels: ['Fuel', 'Maintenance'],
    datasets: [{
      data: [totalFuel, totalMaint],
      backgroundColor: ['rgba(45, 212, 191, 0.7)', 'rgba(251, 146, 60, 0.7)'],
      borderColor: ['rgba(45, 212, 191, 1)', 'rgba(251, 146, 60, 1)'],
      borderWidth: 1.5,
    }]
  };

  const exportROItoCSV = () => {
    if (roi.length === 0) return;
    const headers = ['Vehicle Model', 'Registration Number', 'Acquisition Cost ($)', 'Revenue Earned ($)', 'Total Cost ($)', 'Net Profit ($)', 'ROI (%)'];
    const rows = roi.map(v => {
      const net = Number(v.total_revenue) - Number(v.total_fuel) - Number(v.total_maintenance);
      const roiPercent = (Number(v.roi) * 100).toFixed(1);
      return [
        `"${v.name_model.replace(/"/g, '""')}"`,
        `"${v.registration_number.replace(/"/g, '""')}"`,
        v.acquisition_cost,
        v.total_revenue,
        Number(v.total_fuel) + Number(v.total_maintenance),
        net,
        `${roiPercent}%`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TransitOps_Vehicle_ROI_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-450">Operational analytics, fleet performance metrics, and financial ROI indicators.</p>

      {/* KPI Row */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Fleet Utilization', value: `${kpis.utilization.toFixed(1)}%`, icon: 'donut_large', color: 'accent' },
            { label: 'Active Dispatches', value: kpis.activeTrips, icon: 'route', color: 'blue-500' },
            { label: 'Available Vehicles', value: kpis.availableVehicles, icon: 'check_circle', color: 'emerald-500' },
            { label: 'In Maintenance', value: kpis.inMaintenance, icon: 'build', color: 'amber-500' },
          ].map((k, i) => (
            <div key={i} className="glass-card border border-slate-800/80 p-5 shadow-lg rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-450">{k.label}</span>
                <div className={`w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-lg ${k.color === 'accent' ? 'text-accent glow-text' : 'text-' + k.color}`}>{k.icon}</span>
                </div>
              </div>
              <span className="text-3xl font-bold text-white tracking-tight">{k.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel Efficiency Bar */}
        <div className="lg:col-span-2 glass-card border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-accent text-lg">local_gas_station</span>
            Fuel Efficiency by Vehicle (km/L)
          </h3>
          {fuelEfficiency.filter(v => Number(v.total_fuel) > 0).length > 0 ? (
            <Bar
              data={fuelChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { font: { size: 11 }, color: '#94a3b8' }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 }, color: '#94a3b8' }
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">No completed trips with fuel data yet.</div>
          )}
        </div>

        {/* Cost Breakdown Donut */}
        <div className="glass-card border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-orange-400 text-lg">account_balance</span>
            Cost Breakdown
          </h3>
          {totalFuel + totalMaint > 0 ? (
            <Doughnut
              data={costBreakdownData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 12, color: '#94a3b8' }
                  }
                },
                cutout: '60%'
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">No cost data yet.</div>
          )}
        </div>
      </div>

      {/* ROI Table */}
      <div className="glass-panel border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-accent text-lg">trending_up</span>
            <h3 className="font-bold text-white text-sm">Vehicle ROI Report</h3>
          </div>
          <button
            onClick={exportROItoCSV}
            className="flex items-center gap-1 bg-accent hover:bg-accent-hover text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-[1.02] shadow-md shadow-accent/15"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
        </div>
        {roi.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm font-medium">No vehicles registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Acquisition</th>
                  <th className="p-4">Revenue Earned</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4">Net Profit</th>
                  <th className="p-4">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {roi.map(v => {
                  const net = Number(v.total_revenue) - Number(v.total_fuel) - Number(v.total_maintenance);
                  const roiPercent = (Number(v.roi) * 100).toFixed(1);
                  const roiPositive = net >= 0;
                  return (
                    <tr key={v.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{v.name_model}</div>
                        <div className="text-xs font-mono text-slate-500">{v.registration_number}</div>
                      </td>
                      <td className="p-4 text-slate-300">₹{Number(v.acquisition_cost).toLocaleString()}</td>
                      <td className="p-4 text-emerald-400 font-semibold">₹{Number(v.total_revenue).toLocaleString()}</td>
                      <td className="p-4 text-amber-400 font-semibold">₹{(Number(v.total_fuel) + Number(v.total_maintenance)).toLocaleString()}</td>
                      <td className={`p-4 font-bold ${roiPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {roiPositive ? '+' : ''}₹{net.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${roiPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {roiPercent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
