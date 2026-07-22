import React, { useEffect, useState } from 'react';
import { useOutletContext, Link, Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useOutletContext();

  // Drivers have no admin dashboard — redirect them straight to their trips
  if (user?.role === 'Driver') {
    return <Navigate to="/dashboard/trips" replace />;
  }

  const [kpis, setKpis] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/reports/kpis', { headers }).then(r => r.json()),
      fetch('/api/trips?limit=5', { headers }).then(r => r.json()),
      fetch('/api/drivers', { headers }).then(r => r.json()),
      fetch('/api/vehicles', { headers }).then(r => r.json()),
    ]).then(([kpisData, tripsData, driversData, vehiclesData]) => {
      setKpis(kpisData.data);
      // Show dispatched trips first, then draft
      const sorted = (tripsData.data || []).sort((a, b) => {
        const order = { Dispatched: 0, Draft: 1, Completed: 2, Cancelled: 3 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      }).slice(0, 6);
      setRecentTrips(sorted);

      // Build alerts
      const alertList = [];
      const today = new Date();
      (driversData.data || []).forEach(d => {
        const expiry = new Date(d.license_expiry_date);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (d.status === 'Suspended') {
          alertList.push({ type: 'critical', icon: 'block', msg: `Driver ${d.name} is Suspended`, link: '/dashboard/drivers' });
        } else if (daysLeft < 0) {
          alertList.push({ type: 'critical', icon: 'error', msg: `${d.name}'s license EXPIRED (${Math.abs(daysLeft)}d ago)`, link: '/dashboard/drivers' });
        } else if (daysLeft <= 90) {
          alertList.push({ type: 'warning', icon: 'warning', msg: `${d.name}'s license expires in ${daysLeft} days`, link: '/dashboard/drivers' });
        }
      });
      (vehiclesData.data || []).forEach(v => {
        if (v.status === 'In Shop') {
          alertList.push({ type: 'warning', icon: 'build', msg: `${v.name_model} (${v.registration_number}) is In Shop`, link: '/dashboard/maintenance' });
        }
      });
      setAlerts(alertList);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const getStatusBadge = (status) => {
    const map = {
      Dispatched: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Draft: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return map[status] || 'bg-slate-800 text-slate-300 border-slate-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-3xl text-accent glow-text">sync</span>
          <span className="text-slate-400 font-medium">Loading operations center...</span>
        </div>
      </div>
    );
  }

  const utilization = kpis ? kpis.utilization : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none translate-x-20 -translate-y-20" />
        <div className="absolute right-24 bottom-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-accent/20 text-accent text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
              {user.role} · Live
            </span>
            <h2 className="text-2xl font-bold mt-2 text-white">Welcome Back, {user.name.split(' ')[0]}!</h2>
            <p className="text-slate-400 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(user.role === 'Admin' || user.role === 'Driver') && (
              <Link to="/dashboard/trips" className="bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg shadow-accent/25 flex items-center gap-1.5 hover:scale-[1.02]">
                <span className="material-symbols-outlined text-lg">add</span> New Trip
              </Link>
            )}
            {user.role === 'Admin' && (
              <Link to="/dashboard/drivers" className="bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg shadow-accent/25 flex items-center gap-1.5 hover:scale-[1.02]">
                <span className="material-symbols-outlined text-lg">person_add</span> Add Driver
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Row */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((a, i) => (
            <Link key={i} to={a.link} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${a.type === 'critical' ? 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10' : 'bg-amber-500/5 border-amber-500/20 text-amber-400 hover:bg-amber-50/10'}`}>
              <span className="material-symbols-outlined text-base animate-pulse">{a.icon}</span>
              <span>{a.msg}</span>
              <span className="material-symbols-outlined text-base ml-auto">chevron_right</span>
            </Link>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Fleet Utilization',
            value: `${utilization.toFixed(1)}%`,
            sub: `${kpis?.activeVehicles || 0} On Trip · ${kpis?.inMaintenance || 0} In Shop`,
            icon: 'donut_large',
            color: 'teal',
            bgClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
          },
          {
            label: 'Active Trips',
            value: kpis?.activeTrips || 0,
            sub: `${kpis?.pendingTrips || 0} in Draft`,
            icon: 'route',
            color: 'blue',
            bgClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          },
          {
            label: 'Available Vehicles',
            value: kpis?.availableVehicles || 0,
            sub: 'Ready for dispatch',
            icon: 'local_shipping',
            color: 'emerald',
            bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          },
          {
            label: 'Active Drivers',
            value: kpis?.activeDrivers || 0,
            sub: `${kpis?.inMaintenance || 0} on duty`,
            icon: 'badge',
            color: 'violet',
            bgClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
          },
        ].map((kpi, i) => (
          <div key={i} className="glass-card rounded-2xl border border-slate-800/80 p-5 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400">{kpi.label}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${kpi.bgClass} group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-lg">{kpi.icon}</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white glow-text">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Fleet Utilization Bar + Recent Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Utilization Gauge */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col">
          <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-accent text-lg">speed</span>
            Operational Status
          </h3>
          <p className="text-xs text-slate-500 mb-4">Live fleet readiness breakdown</p>

          {[
            { label: 'Available', value: kpis?.availableVehicles || 0, total: (kpis?.availableVehicles || 0) + (kpis?.activeVehicles || 0) + (kpis?.inMaintenance || 0), color: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' },
            { label: 'On Trip', value: kpis?.activeVehicles || 0, total: (kpis?.availableVehicles || 0) + (kpis?.activeVehicles || 0) + (kpis?.inMaintenance || 0), color: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' },
            { label: 'In Shop', value: kpis?.inMaintenance || 0, total: (kpis?.availableVehicles || 0) + (kpis?.activeVehicles || 0) + (kpis?.inMaintenance || 0), color: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' },
          ].map((bar, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-xs font-semibold text-slate-350 mb-1">
                <span>{bar.label}</span>
                <span>{bar.value} <span className="text-slate-500 font-normal">/ {bar.total}</span></span>
              </div>
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                  style={{ width: bar.total > 0 ? `${(bar.value / bar.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}

          <div className="mt-auto pt-4 border-t border-slate-900">
            <div className="text-center">
              <span className="text-4xl font-bold text-white glow-text">{utilization.toFixed(0)}%</span>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Fleet Utilization Rate</p>
            </div>
          </div>
        </div>

        {/* Recent Trips */}
        <div className="lg:col-span-2 glass-panel border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-accent text-lg">route</span>
              Live Trip Board
            </h3>
            <Link to="/dashboard/trips" className="text-xs font-bold text-accent hover:text-accent-hover flex items-center gap-0.5 transition-colors">
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          {recentTrips.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm font-medium">No trips yet — create one to get started.</div>
          ) : (
            <div className="divide-y divide-slate-900">
              {recentTrips.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-900/40 transition-all duration-200">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-350 shrink-0">
                    <span className="material-symbols-outlined text-base">
                      {t.status === 'Dispatched' ? 'local_shipping' : t.status === 'Completed' ? 'check_circle' : t.status === 'Cancelled' ? 'cancel' : 'edit_note'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-200 truncate">{t.source} → {t.destination}</div>
                    <div className="text-xs text-slate-500 truncate">{t.vehicle_name || '—'} · {t.driver_name || '—'}</div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(t.status)}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Fleet', icon: 'local_shipping', to: '/dashboard/vehicles', color: 'hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-400' },
          { label: 'Drivers', icon: 'badge', to: '/dashboard/drivers', color: 'hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400' },
          { label: 'Trips', icon: 'route', to: '/dashboard/trips', color: 'hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-400' },
          { label: 'Maintenance', icon: 'build', to: '/dashboard/maintenance', color: 'hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400' },
          { label: 'Expenses', icon: 'payments', to: '/dashboard/expenses', color: 'hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-400' },
          { label: 'Reports', icon: 'analytics', to: '/dashboard/reports', color: 'hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400' },
        ].map(nav => (
          <Link
            key={nav.to}
            to={nav.to}
            className={`bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 shadow-md ${nav.color} group`}
          >
            <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:scale-110 transition-transform">{nav.icon}</span>
            <span className="text-xs font-bold text-slate-400">{nav.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
