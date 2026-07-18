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
          <span className="material-symbols-outlined animate-spin text-3xl text-teal-600">sync</span>
          <span className="text-slate-500 font-medium">Loading analytics...</span>
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
      backgroundColor: 'rgba(20, 184, 166, 0.7)',
      borderColor: 'rgba(20, 184, 166, 1)',
      borderWidth: 1,
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
      backgroundColor: ['rgba(20, 184, 166, 0.7)', 'rgba(245, 158, 11, 0.7)'],
      borderColor: ['rgba(20, 184, 166, 1)', 'rgba(245, 158, 11, 1)'],
      borderWidth: 1,
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
      <p className="text-sm text-slate-500">Operational analytics, fleet performance metrics, and financial ROI indicators.</p>

      {/* KPI Row */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Fleet Utilization', value: `${kpis.utilization.toFixed(1)}%`, icon: 'donut_large', color: 'teal' },
            { label: 'Active Dispatches', value: kpis.activeTrips, icon: 'route', color: 'blue' },
            { label: 'Available Vehicles', value: kpis.availableVehicles, icon: 'check_circle', color: 'emerald' },
            { label: 'In Maintenance', value: kpis.inMaintenance, icon: 'build', color: 'amber' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{k.label}</span>
                <div className={`w-9 h-9 rounded-lg bg-${k.color}-50 flex items-center justify-center text-${k.color}-600`}>
                  <span className="material-symbols-outlined text-lg">{k.icon}</span>
                </div>
              </div>
              <span className="text-3xl font-bold text-slate-900">{k.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel Efficiency Bar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-teal-600 text-lg">local_gas_station</span>
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
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 11 } }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No completed trips with fuel data yet.</div>
          )}
        </div>

        {/* Cost Breakdown Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-600 text-lg">account_balance</span>
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
                    labels: { font: { size: 11 }, padding: 12 }
                  }
                },
                cutout: '60%'
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No cost data yet.</div>
          )}
        </div>
      </div>

      {/* ROI Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-teal-600 text-lg">trending_up</span>
            <h3 className="font-bold text-slate-800 text-sm">Vehicle ROI Report</h3>
          </div>
          <button
            onClick={exportROItoCSV}
            className="flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
        </div>
        {roi.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No vehicles registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Acquisition</th>
                  <th className="p-4">Revenue Earned</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4">Net Profit</th>
                  <th className="p-4">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roi.map(v => {
                  const net = Number(v.total_revenue) - Number(v.total_fuel) - Number(v.total_maintenance);
                  const roiPercent = (Number(v.roi) * 100).toFixed(1);
                  const roiPositive = net >= 0;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{v.name_model}</div>
                        <div className="text-xs font-mono text-slate-400">{v.registration_number}</div>
                      </td>
                      <td className="p-4 text-slate-600">${Number(v.acquisition_cost).toLocaleString()}</td>
                      <td className="p-4 text-emerald-600 font-semibold">${Number(v.total_revenue).toLocaleString()}</td>
                      <td className="p-4 text-amber-600 font-semibold">${(Number(v.total_fuel) + Number(v.total_maintenance)).toLocaleString()}</td>
                      <td className={`p-4 font-bold ${roiPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {roiPositive ? '+' : ''}${net.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${roiPositive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
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
