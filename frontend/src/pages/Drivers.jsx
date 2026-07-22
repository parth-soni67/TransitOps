import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DriverProfile from './DriverProfile';

export default function Drivers() {
  const { user } = useOutletContext();
  const isAdmin = user?.role === 'Admin';
  // Keep old variable name for compatibility with rest of file
  const isSafetyOfficer = isAdmin;

  // Drivers see their own rich profile page instead of the admin registry
  if (user?.role === 'Driver') {
    return <DriverProfile user={user} />;
  }

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [licenseFilter, setLicenseFilter] = useState(''); // '', 'valid', 'expired'

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState(null); // id to confirm removal

  // Form Fields
  const [driverId, setDriverId] = useState('');
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('Class A');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [safetyScore, setSafetyScore] = useState('100');
  const [status, setStatus] = useState('Available');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fetchDrivers = () => {
    setLoading(true);
    let url = '/api/drivers?';
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
    if (licenseFilter === 'expired') {
      // The API supports logic if we implement custom query or filter client-side.
      // Let's filter on the client or pass relevant flags. Let's do it client-side for flexibility or let's support both.
    }

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch driver registry');
        return res.json();
      })
      .then(data => {
        let result = data.data;
        // Client-side license filtering
        if (licenseFilter === 'expired') {
          result = result.filter(d => new Date(d.license_expiry_date) < new Date());
        } else if (licenseFilter === 'valid') {
          result = result.filter(d => new Date(d.license_expiry_date) >= new Date());
        }
        // Drivers only see their own profile — match by first name
        if (user?.role === 'Driver') {
          const firstName = user.name?.split(' ')[0]?.toLowerCase();
          result = result.filter(d => d.name.toLowerCase().startsWith(firstName));
        }
        setDrivers(result);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter, licenseFilter]);

  const openCreateModal = () => {
    setModalMode('create');
    setDriverId('');
    setName('');
    setLicenseNumber('');
    setLicenseCategory('Class A');
    setLicenseExpiryDate('');
    setContactNumber('');
    setSafetyScore('100');
    setStatus('Available');
    setEmail('');
    setPassword('');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (d) => {
    setModalMode('edit');
    setDriverId(d.id);
    setName(d.name);
    setLicenseNumber(d.license_number);
    setLicenseCategory(d.license_category);
    // Format date string to YYYY-MM-DD
    const dateObj = new Date(d.license_expiry_date);
    const formattedDate = dateObj.toISOString().split('T')[0];
    setLicenseExpiryDate(formattedDate);
    setContactNumber(d.contact_number);
    setSafetyScore(d.safety_score);
    setStatus(d.status);
    setEmail(d.email || '');
    setPassword('');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name || !licenseNumber || !licenseCategory || !licenseExpiryDate || !contactNumber || !email) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const payload = {
      name,
      license_number: licenseNumber,
      license_category: licenseCategory,
      license_expiry_date: licenseExpiryDate,
      contact_number: contactNumber,
      safety_score: Number(safetyScore || 100),
      status,
      email,
      password: password || undefined
    };

    const url = modalMode === 'create' ? '/api/drivers' : `/api/drivers/${driverId}`;
    const method = modalMode === 'create' ? 'POST' : 'PUT';

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Operation failed');
        return data;
      })
      .then(() => {
        setFormSuccess(`Driver account ${modalMode === 'create' ? 'created' : 'updated'} successfully!`);
        setTimeout(() => {
          setIsModalOpen(false);
          fetchDrivers();
        }, 1000);
      })
      .catch(err => {
        console.error(err);
        setFormError(err.message);
      });
  };

  const handleRemove = (id) => {
    setConfirmRemoveId(id);
  };

  const confirmRemove = () => {
    const id = confirmRemoveId;
    setConfirmRemoveId(null);
    fetch(`/api/drivers/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to remove driver');
        return data;
      })
      .then(() => {
        fetchDrivers();
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'On Trip': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Off Duty': return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'Suspended': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getSafetyScoreBadgeClass = (score) => {
    if (score >= 90) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 75) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const isLicenseExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  const isLicenseExpiringSoon = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            {user.role === 'Driver'
              ? 'Your driving license and profile details. Keep them up to date.'
              : 'Manage operator profiles, safety compliance, and license expirations.'}
          </p>
        </div>
        <div>
          {isSafetyOfficer && (
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2.5 rounded-lg text-sm transition-all duration-200 shadow-lg shadow-accent/25 flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined font-bold text-lg">person_add</span>
              Register Driver
            </button>
          )}
        </div>
      </div>


      {/* Filters Toolbar — Admin only */}
      {user.role === 'Admin' && (
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 shadow-md flex flex-wrap gap-4 items-center glass-panel">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="Off Duty">Off Duty</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Licensing</label>
            <select
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value)}
              className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
            >
              <option value="">All Licenses</option>
              <option value="valid">Valid (Unexpired)</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-3xl text-accent glow-text">sync</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">{error}</div>
      ) : drivers.length === 0 ? (
        <div className="bg-slate-950/20 border border-slate-800 text-center py-12 rounded-xl text-slate-500 font-medium">
          No driver profiles registered matching current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((d) => {
            const expired = isLicenseExpired(d.license_expiry_date);
            const expiringSoon = isLicenseExpiringSoon(d.license_expiry_date);
            return (
              <div key={d.id} className="glass-card border border-slate-800/80 shadow-lg rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300">
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-white text-base">{d.name}</h3>
                      <p className="text-xs text-accent font-semibold mt-0.5">{d.email || 'No login account'}</p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">{d.contact_number}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(d.status)}`}>
                      {d.status}
                    </span>
                  </div>

                  {/* Licensing status alerts */}
                  {expired && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-2 font-medium">
                      <span className="material-symbols-outlined text-sm font-bold animate-pulse">warning</span>
                      License Expired
                    </div>
                  )}
                  {expiringSoon && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 font-medium">
                      <span className="material-symbols-outlined text-sm font-bold animate-pulse">schedule</span>
                      License Expiring Soon
                    </div>
                  )}

                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">License Number</span>
                      <span className="font-semibold text-slate-200 font-mono">{d.license_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Category</span>
                      <span className="font-semibold text-slate-200">{d.license_category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">License Expiry</span>
                      <span className={`font-semibold ${expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-slate-200'}`}>
                        {new Date(d.license_expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Safety Score</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${getSafetyScoreBadgeClass(d.safety_score)}`}>
                        {d.safety_score} / 100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                {isSafetyOfficer && (
                  <div className="bg-slate-950/40 px-5 py-3 border-t border-slate-900 flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(d)}
                      className="text-xs font-bold text-accent hover:text-accent-hover px-3 py-1.5 rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => handleRemove(d.id)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {confirmRemoveId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-4 text-slate-300">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-400">person_remove</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Remove Driver</h3>
                <p className="text-slate-400 text-sm">This will permanently remove the driver from the fleet.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-400 bg-slate-900 border border-slate-805 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <h3 className="font-bold text-white text-base">
                {modalMode === 'create' ? 'Register New Driver Account' : 'Edit Driver Account'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 flex items-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-350">
              {formError && (
                <div className="bg-red-500/5 text-red-400 text-xs p-3 rounded-lg border border-red-500/20">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-500/5 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/20">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. drivername@transitops.com"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {modalMode === 'create' ? 'Login Password *' : 'Login Password (leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={modalMode === 'create' ? "Minimum 6 characters" : "••••••••"}
                  className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  required={modalMode === 'create'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">License Number *</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. DL-12345678"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">License Category *</label>
                  <select
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value)}
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  >
                    <option value="Class A">Class A (Heavy Commercial)</option>
                    <option value="Class B">Class B (Commercial Trucks)</option>
                    <option value="Class C">Class C (Light Haulage/Vans)</option>
                    <option value="Specialist">Specialist Cargo (Hazmat)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">License Expiry Date *</label>
                  <input
                    type="date"
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Number *</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Safety Compliance Score (0-100) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Account status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-lg shadow-accent/25"
                >
                  {modalMode === 'create' ? 'Create Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
