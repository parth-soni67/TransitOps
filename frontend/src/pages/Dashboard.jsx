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
      Dispatched: 'bg-blue-100 text-blue-800 border-blue-200',
      Draft: 'bg-amber-100 text-amber-800 border-amber-200',
      Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-3xl text-teal-600">sync</span>
          <span className="text-slate-500 font-medium">Loading operations center...</span>
        </div>
      </div>
    );
  }

  const utilization = kpis ? kpis.utilization : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none translate-x-20 -translate-y-20" />
        <div className="absolute right-24 bottom-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-teal-400/20 text-teal-300 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span>
              {user.role} · Live
            </span>
            <h2 className="text-2xl font-bold mt-2">Welcome Back, {user.name.split(' ')[0]}!</h2>
            <p className="text-slate-400 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(user.role === 'Admin' || user.role === 'Driver') && (
              <Link to="/dashboard/trips" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-teal-500/20 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg">add</span> New Trip
              </Link>
            )}
            {user.role === 'Admin' && (
              <Link to="/dashboard/drivers" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-teal-500/20 flex items-center gap-1.5">
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
            <Link key={i} to={a.link} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${a.type === 'critical' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
              <span className="material-symbols-outlined text-base">{a.icon}</span>
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
            bgClass: 'bg-teal-50 text-teal-600',
          },
          {
            label: 'Active Trips',
            value: kpis?.activeTrips || 0,
            sub: `${kpis?.pendingTrips || 0} in Draft`,
            icon: 'route',
            color: 'blue',
            bgClass: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Available Vehicles',
            value: kpis?.availableVehicles || 0,
            sub: 'Ready for dispatch',
            icon: 'local_shipping',
            color: 'emerald',
            bgClass: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Active Drivers',
            value: kpis?.activeDrivers || 0,
            sub: `${kpis?.inMaintenance || 0} in maintenance`,
            icon: 'badge',
            color: 'violet',
            bgClass: 'bg-violet-50 text-violet-600',
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.bgClass} group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-lg">{kpi.icon}</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{kpi.value}</div>
            <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Fleet Utilization Bar + Recent Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Utilization Gauge */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-teal-600 text-lg">speed</span>
            Operational Status
          </h3>
          <p className="text-xs text-slate-400 mb-4">Live fleet readiness breakdown</p>

          {[
            { label: 'Available', value: kpis?.availableVehicles || 0, total: (kpis?.availableVehicles || 0) + (kpis?.activeVehicles || 0) + (kpis?.inMaintenance || 0), color: 'bg-emerald-500' },
            { label: 'On Trip', value: kpis?.activeVehicles || 0, total: (kpis?.availableVehicles || 0) + (kpis?.activeVehicles || 0) + (kpis?.inMaintenance || 0), color: 'bg-blue-500' },
            { label: 'In Shop', value: kpis?.inMaintenance || 0, total: (kpis?.availableVehicles || 0) + (kpis?.activeVehicles || 0) + (kpis?.inMaintenance || 0), color: 'bg-amber-500' },
          ].map((bar, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>{bar.label}</span>
                <span className="font-bold">{bar.value} <span className="text-slate-400 font-normal">/ {bar.total}</span></span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                  style={{ width: bar.total > 0 ? `${(bar.value / bar.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}

          <div className="mt-auto pt-4 border-t border-slate-100">
            <div className="text-center">
              <span className="text-4xl font-bold text-slate-900">{utilization.toFixed(0)}%</span>
              <p className="text-xs text-slate-400 mt-1">Fleet Utilization Rate</p>
            </div>
          </div>
        </div>

        {/* Recent Trips */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-teal-600 text-lg">route</span>
              Live Trip Board
            </h3>
            <Link to="/dashboard/trips" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5">
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          {recentTrips.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No trips yet — create one to get started.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTrips.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <span className="material-symbols-outlined text-base">
                      {t.status === 'Dispatched' ? 'local_shipping' : t.status === 'Completed' ? 'check_circle' : t.status === 'Cancelled' ? 'cancel' : 'edit_note'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{t.source} → {t.destination}</div>
                    <div className="text-xs text-slate-400 truncate">{t.vehicle_name || '—'} · {t.driver_name || '—'}</div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(t.status)}`}>
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
          { label: 'Fleet', icon: 'local_shipping', to: '/dashboard/vehicles', color: 'hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700' },
          { label: 'Drivers', icon: 'badge', to: '/dashboard/drivers', color: 'hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700' },
          { label: 'Trips', icon: 'route', to: '/dashboard/trips', color: 'hover:border-violet-200 hover:bg-violet-50/50 hover:text-violet-700' },
          { label: 'Maintenance', icon: 'build', to: '/dashboard/maintenance', color: 'hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-700' },
          { label: 'Expenses', icon: 'payments', to: '/dashboard/expenses', color: 'hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-700' },
          { label: 'Reports', icon: 'analytics', to: '/dashboard/reports', color: 'hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700' },
        ].map(nav => (
          <Link
            key={nav.to}
            to={nav.to}
            className={`bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 transition-all shadow-sm ${nav.color} group`}
          >
            <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:scale-110 transition-transform">{nav.icon}</span>
            <span className="text-xs font-semibold text-slate-600">{nav.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
