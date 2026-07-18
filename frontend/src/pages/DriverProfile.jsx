import React, { useEffect, useState } from 'react';

export default function DriverProfile({ user }) {
  const [driver, setDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Password change modal state
  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editLicenseCategory, setEditLicenseCategory] = useState('');
  const [editLicenseExpiry, setEditLicenseExpiry] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [driversRes, tripsRes] = await Promise.all([
        fetch('/api/drivers', { headers }).then(r => r.json()),
        fetch('/api/trips', { headers }).then(r => r.json()),
      ]);

      const myDriver = (driversRes.data || []).find(d =>
        d.user_id === user.id
      );
      setDriver(myDriver || null);
      setTrips(tripsRes.data || []);
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const openEdit = () => {
    if (!driver) return;
    setEditName(driver.name);
    setEditContact(driver.contact_number);
    setEditLicenseNumber(driver.license_number);
    setEditLicenseCategory(driver.license_category);
    setEditLicenseExpiry(driver.license_expiry_date?.split('T')[0]);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`/api/drivers/${driver.id}/self`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          contact_number: editContact,
          license_number: editLicenseNumber,
          license_category: editLicenseCategory,
          license_expiry_date: editLicenseExpiry,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setActionMsg({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditOpen(false);
      fetchProfile();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveFromFleet = async () => {
    if (!driver) return;
    try {
      const res = await fetch(`/api/drivers/${driver.id}/offduty`, {
        method: 'PATCH',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setActionMsg({ type: 'success', text: 'You have been set to Off Duty and removed from active assignment.' });
      setShowRemoveConfirm(false);
      fetchProfile();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
      setShowRemoveConfirm(false);
    }
  };

  const openChangePassword = () => {
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    setPwdError('');
    setIsPwdOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdNew !== pwdConfirm) {
      setPwdError('New passwords do not match');
      return;
    }
    if (pwdNew.length < 6) {
      setPwdError('New password must be at least 6 characters');
      return;
    }
    setPwdLoading(true);
    setPwdError('');
    try {
      const res = await fetch(`/api/drivers/${driver.id}/password`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwdCurrent, new_password: pwdNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed');
      setIsPwdOpen(false);
      setActionMsg({ type: 'success', text: 'Password changed successfully! Use your new password next time you log in.' });
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const getLicenseStatus = (expiry) => {
    const today = new Date();
    const expiryDate = new Date(expiry);
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', color: 'red', days: Math.abs(diffDays), icon: 'cancel' };
    if (diffDays <= 30) return { label: 'Expiring Soon', color: 'amber', days: diffDays, icon: 'schedule' };
    return { label: 'Valid', color: 'emerald', days: diffDays, icon: 'verified' };
  };

  const getScoreStyle = (score) => {
    if (score >= 90) return { ring: 'text-emerald-500', grad: 'from-emerald-400 to-teal-500', label: 'Excellent', bar: 'bg-emerald-500' };
    if (score >= 75) return { ring: 'text-amber-500', grad: 'from-amber-400 to-orange-500', label: 'Good', bar: 'bg-amber-500' };
    return { ring: 'text-red-500', grad: 'from-red-400 to-rose-600', label: 'Needs Improvement', bar: 'bg-red-500' };
  };

  const getStatusBadge = (status) => {
    const map = {
      'Available': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'On Trip': 'bg-blue-100 text-blue-700 border-blue-200',
      'Off Duty': 'bg-slate-100 text-slate-600 border-slate-200',
      'Suspended': 'bg-red-100 text-red-700 border-red-200',
    };
    return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getTripStatusClass = (status) => {
    const map = {
      'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
      'Dispatched': 'bg-blue-100 text-blue-700 border-blue-200',
      'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Cancelled': 'bg-red-100 text-red-700 border-red-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const completedTrips = trips.filter(t => t.status === 'Completed');
  const totalDistanceKm = completedTrips.reduce((sum, t) => sum + Number(t.planned_distance || 0), 0);
  const totalRevenue = completedTrips.reduce((sum, t) => sum + Number(t.revenue || 0), 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <span className="material-symbols-outlined animate-spin text-4xl text-teal-600">sync</span>
      <span className="text-slate-500 font-medium">Loading your profile…</span>
    </div>
  );

  if (error || !driver) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4">
      <span className="material-symbols-outlined text-6xl text-slate-200 block">badge</span>
      <p className="text-slate-600 text-lg font-semibold">No driver profile found</p>
      <p className="text-slate-400 text-sm max-w-xs mx-auto">Your account hasn't been linked to a driver record yet. Contact your fleet admin to register your profile.</p>
    </div>
  );

  const licStatus = getLicenseStatus(driver.license_expiry_date);
  const scoreStyle = getScoreStyle(driver.safety_score);

  return (
    <div className="space-y-6">

      {/* Feedback Banner */}
      {actionMsg.text && (
        <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-sm font-medium transition-all ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              {actionMsg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {actionMsg.text}
          </div>
          <button onClick={() => setActionMsg({ type: '', text: '' })} className="hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* ─── Profile Hero Card ─── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-8 text-white overflow-hidden shadow-2xl">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none translate-x-20 -translate-y-20" />
        <div className="absolute bottom-0 left-48 w-64 h-64 bg-blue-500/8 rounded-full blur-2xl pointer-events-none translate-y-12" />
        <div className="absolute top-8 right-64 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${scoreStyle.grad} flex items-center justify-center text-white text-3xl font-black shadow-2xl flex-shrink-0 ring-4 ring-white/10`}>
            {initials}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(driver.status)} flex items-center gap-1`}>
                {driver.status === 'Available' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                )}
                {driver.status}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Commercial Driver
              </span>
              {licStatus.color !== 'emerald' && (
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  licStatus.color === 'amber' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  <span className="material-symbols-outlined text-xs">{licStatus.icon}</span>
                  Licence {licStatus.label}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight truncate">{driver.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-teal-400">call</span>
                {driver.contact_number}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-blue-400">id_card</span>
                {driver.license_number}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-purple-400">local_shipping</span>
                {driver.license_category}
              </span>
            </div>
          </div>

          {/* Safety Score Panel */}
          <div className="flex-shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center min-w-[130px]">
            <div className={`text-5xl font-black ${scoreStyle.ring} leading-none`}>
              {driver.safety_score}
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
              <div
                className={`h-1.5 rounded-full ${scoreStyle.bar} transition-all duration-1000`}
                style={{ width: `${driver.safety_score}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Safety Score</div>
            <div className={`text-[11px] font-bold mt-0.5 ${scoreStyle.ring}`}>{scoreStyle.label}</div>
          </div>

          {/* Edit + Change Password Buttons */}
          <div className="flex-shrink-0 self-start md:self-center flex flex-col sm:flex-row gap-2">
            <button
              onClick={openEdit}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all group"
            >
              <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">edit</span>
              Edit Profile
            </button>
            <button
              onClick={openChangePassword}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all group"
            >
              <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">lock_reset</span>
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* ─── Details Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Driving Licence Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-600">id_card</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Driving Licence</h3>
              <p className="text-xs text-slate-400">Official registration details</p>
            </div>
            <span className={`ml-auto text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${
              licStatus.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              licStatus.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className="material-symbols-outlined text-xs">{licStatus.icon}</span>
              {licStatus.label}
            </span>
          </div>
          <div className="p-6 space-y-5">
            {/* Licence Number */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Licence Number</p>
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-white font-mono text-lg font-bold tracking-[0.2em]">{driver.license_number}</span>
                <span className="material-symbols-outlined text-teal-400 text-base">verified_user</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category</p>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <span className="material-symbols-outlined text-blue-600 text-base">local_shipping</span>
                  <span className="font-bold text-blue-800 text-sm">{driver.license_category}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Expiry</p>
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${
                  licStatus.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                  licStatus.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                }`}>
                  <span className={`material-symbols-outlined text-base ${
                    licStatus.color === 'emerald' ? 'text-emerald-600' :
                    licStatus.color === 'amber' ? 'text-amber-600' : 'text-red-600'
                  }`}>calendar_month</span>
                  <span className={`font-bold text-sm ${
                    licStatus.color === 'emerald' ? 'text-emerald-800' :
                    licStatus.color === 'amber' ? 'text-amber-800' : 'text-red-800'
                  }`}>
                    {new Date(driver.license_expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-3 text-sm font-medium flex items-start gap-2 ${
              licStatus.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              licStatus.color === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
              'bg-red-50 text-red-700 border border-red-100'
            }`}>
              <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">{licStatus.icon}</span>
              <span>
                {licStatus.color === 'red'
                  ? `Your licence expired ${licStatus.days} days ago. Please renew immediately and contact your admin.`
                  : licStatus.color === 'amber'
                  ? `Your licence expires in ${licStatus.days} days. Renew soon to continue driving!`
                  : `Your licence is valid for ${licStatus.days} more days.`}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Stats Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">analytics</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Operational Stats</h3>
              <p className="text-xs text-slate-400">Your performance at a glance</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-3xl font-black text-emerald-700">{completedTrips.length}</p>
                <p className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-wider mt-1">Completed Trips</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                <p className="text-3xl font-black text-blue-700">{trips.filter(t => t.status === 'Dispatched').length}</p>
                <p className="text-[11px] font-bold text-blue-600/70 uppercase tracking-wider mt-1">Active Now</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-4">
                <p className="text-2xl font-black text-teal-700">{totalDistanceKm.toLocaleString()}<span className="text-base font-bold ml-1">km</span></p>
                <p className="text-[11px] font-bold text-teal-600/70 uppercase tracking-wider mt-1">Total Distance</p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-100 rounded-xl p-4">
                <p className="text-3xl font-black text-slate-700">{trips.filter(t => t.status === 'Draft').length}</p>
                <p className="text-[11px] font-bold text-slate-500/70 uppercase tracking-wider mt-1">Pending Trips</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Details</p>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-teal-500 text-lg">call</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Phone Number</p>
                  <p className="font-bold text-slate-800">{driver.contact_number}</p>
                </div>
              </div>
              {totalRevenue > 0 && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">payments</span>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">Total Revenue Generated</p>
                    <p className="font-bold text-slate-800">₹{totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Trip History ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-600">history</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Trip History</h3>
            <p className="text-xs text-slate-400">All trips assigned to you</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{trips.length} total</span>
          </div>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="material-symbols-outlined text-5xl text-slate-200 block">route</span>
            <p className="text-slate-500 font-medium">No trips assigned yet</p>
            <p className="text-slate-400 text-sm">Your trip history will appear here once assigned.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trip ID</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Route</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distance</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargo</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {trips.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold text-slate-400">#{t.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{t.source}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        {t.destination}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700 text-xs">{t.vehicle_name || '—'}</p>
                      <p className="text-xs font-mono text-slate-400">{t.registration_number || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">{t.planned_distance?.toLocaleString() || '—'}</span>
                      <span className="text-xs text-slate-400 ml-1">km</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">{t.cargo_weight?.toLocaleString() || '—'}</span>
                      <span className="text-xs text-slate-400 ml-1">kg</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getTripStatusClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {t.revenue ? `₹${Number(t.revenue).toLocaleString()}` : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ─── Edit Profile Modal ─── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setIsEditOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-teal-600">edit</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Edit My Profile</h2>
                  <p className="text-xs text-slate-400">Update your driving licence and contact details</p>
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                  {editError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Full Name</label>
                <input
                  value={editName} onChange={e => setEditName(e.target.value)} required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Contact Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">call</span>
                  <input
                    value={editContact} onChange={e => setEditContact(e.target.value)} required
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Licence Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Licence Number</label>
                  <input
                    value={editLicenseNumber} onChange={e => setEditLicenseNumber(e.target.value)} required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono tracking-wider focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    placeholder="DL-XXXXXXXXXX"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Category</label>
                  <select
                    value={editLicenseCategory} onChange={e => setEditLicenseCategory(e.target.value)} required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white"
                  >
                    <option>Class A</option>
                    <option>Class B</option>
                    <option>Class C</option>
                    <option>HMV</option>
                    <option>LMV</option>
                  </select>
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Licence Expiry Date</label>
                <input
                  type="date" value={editLicenseExpiry} onChange={e => setEditLicenseExpiry(e.target.value)} required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setIsEditOpen(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={editLoading}
                  className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editLoading ? (
                    <><span className="material-symbols-outlined animate-spin text-base">sync</span> Saving…</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">save</span> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── Change Password Modal ─── */}
      {isPwdOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setIsPwdOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-violet-600">lock_reset</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                  <p className="text-xs text-slate-400">Enter your current password to set a new one</p>
                </div>
              </div>
              <button onClick={() => setIsPwdOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {pwdError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                  {pwdError}
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Current Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">lock</span>
                  <input
                    type="password" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} required
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">lock_open</span>
                  <input
                    type="password" value={pwdNew} onChange={e => setPwdNew(e.target.value)} required minLength={6}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                    placeholder="Min. 6 characters"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">key</span>
                  <input
                    type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} required
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all ${
                      pwdConfirm && pwdNew !== pwdConfirm
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/30'
                        : 'border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                    }`}
                    placeholder="Re-enter new password"
                  />
                  {pwdConfirm && pwdNew === pwdConfirm && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                  )}
                </div>
                {pwdConfirm && pwdNew !== pwdConfirm && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setIsPwdOpen(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={pwdLoading || (pwdConfirm !== '' && pwdNew !== pwdConfirm)}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pwdLoading ? (
                    <><span className="material-symbols-outlined animate-spin text-base">sync</span> Updating…</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">lock_reset</span> Change Password</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
