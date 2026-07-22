import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Maintenance() {
  const { user } = useOutletContext();
  const isManager = user?.role === 'Admin';

  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('');

  // ── Create Modal States ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Edit Modal States ──
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    let url = '/api/maintenance?';
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

    fetch(url, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => { setLogs(data.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  const fetchVehicles = () => {
    fetch('/api/vehicles', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setVehicles(data.data.filter(v => v.status !== 'Retired')))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchLogs(); }, [statusFilter]);

  // ── Create ──
  const openModal = () => {
    setVehicleId('');
    setDescription('');
    setCost('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setFormSuccess('');
    fetchVehicles();
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!vehicleId || !description || cost === '' || !date) {
      setFormError('Please fill out all required fields.');
      return;
    }

    fetch('/api/maintenance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ vehicle_id: Number(vehicleId), description, cost: Number(cost), date })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create maintenance log');
        return data;
      })
      .then(() => {
        setFormSuccess('Maintenance log opened successfully!');
        setTimeout(() => { setIsModalOpen(false); fetchLogs(); }, 1000);
      })
      .catch(err => setFormError(err.message));
  };

  // ── Close ──
  const handleClose = (id) => {
    fetch(`/api/maintenance/${id}/close`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to close log');
        return data;
      })
      .then(() => fetchLogs())
      .catch(err => alert(err.message));
  };

  // ── Edit ──
  const openEdit = (log) => {
    setEditLog(log);
    setEditDescription(log.description);
    setEditCost(String(log.cost));
    setEditDate(log.date?.split('T')[0] || '');
    setEditError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDescription || editCost === '' || !editDate) {
      setEditError('Please fill out all required fields.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`/api/maintenance/${editLog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ description: editDescription, cost: Number(editCost), date: editDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update log');
      setIsEditOpen(false);
      fetchLogs();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-slate-400">Track vehicle maintenance intervals, service costs, and shop status.</p>
        {isManager && (
          <button
            onClick={openModal}
            className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2.5 rounded-lg text-sm transition-all duration-200 shadow-lg shadow-accent/25 flex items-center justify-center gap-1.5 hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined font-bold text-lg">add</span>
            Open Maintenance Log
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 shadow-md flex flex-wrap gap-4 items-center glass-panel">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border-slate-800 text-sm text-slate-350 focus:border-accent focus:ring-accent"
          >
            <option value="">All</option>
            <option value="active">Active (In Shop)</option>
            <option value="closed">Closed (Returned)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-3xl text-accent glow-text">sync</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">{error}</div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-950/20 border border-slate-800 text-center py-12 rounded-xl text-slate-500 font-medium">
          No maintenance records found.
        </div>
      ) : (
        <div className="glass-panel border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Cost</th>
                  <th className="p-4">Status</th>
                  {isManager && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">{log.vehicle_name}</div>
                      <div className="text-xs font-mono text-slate-500">{log.registration_number}</div>
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs">
                      <p className="truncate">{log.description}</p>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-accent">₹{Number(log.cost).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${log.status === 'active' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {log.status === 'active' ? 'In Shop' : 'Closed'}
                      </span>
                    </td>
                    {isManager && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(log)}
                            className="text-xs font-bold text-accent hover:text-accent-hover bg-accent/5 hover:bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">edit</span>
                            Edit
                          </button>
                          {log.status === 'active' && (
                            <button
                              onClick={() => handleClose(log.id)}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 hover:scale-[1.02] shadow-md shadow-emerald-600/20"
                            >
                              <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                              Close Log
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center border border-accent/20">
                  <span className="material-symbols-outlined text-accent text-base font-bold">build</span>
                </div>
                <h3 className="font-bold text-white text-base">Open Maintenance Work Order</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-300">
              {formError && <div className="bg-red-500/5 text-red-400 text-xs p-3 rounded-lg border border-red-500/20">{formError}</div>}
              {formSuccess && <div className="bg-emerald-500/5 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/20">{formSuccess}</div>}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle *</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name_model} ({v.registration_number}) — {v.status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Service Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="e.g. Full engine overhaul, brake replacement, tire rotation..."
                  className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estimated Cost (₹) *</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Service Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-800 text-slate-400 text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-accent hover:bg-accent-hover text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-lg shadow-accent/25">Open Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {isEditOpen && editLog && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setIsEditOpen(false)}
        >
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
                  <span className="material-symbols-outlined text-accent font-bold">edit_note</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Maintenance Log</h3>
                  <p className="text-xs text-slate-400">
                    {editLog.vehicle_name} · <span className="font-mono text-slate-500">{editLog.registration_number}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-905 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-slate-300">
              {editError && (
                <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                  {editError}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Service Description *</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder="Describe the maintenance work..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all resize-none text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Cost */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Cost (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-base">payments</span>
                    <input
                      type="number"
                      value={editCost}
                      onChange={e => setEditCost(e.target.value)}
                      required
                      min="0"
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-slate-200"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Service Date *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-base">calendar_month</span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Status badge (read-only info) */}
              <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl px-4 py-3 text-sm text-slate-400 border border-slate-805">
                <span className="material-symbols-outlined text-base text-slate-500">info</span>
                Status:
                <span className={`ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${editLog.status === 'active' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {editLog.status === 'active' ? 'In Shop' : 'Closed'}
                </span>
                <span className="text-xs text-slate-500 ml-1">(status not changed here)</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 border border-slate-800 text-slate-450 font-semibold py-3 rounded-xl text-sm hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-accent hover:bg-accent-hover text-slate-950 font-bold py-3 rounded-xl text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/25 hover:scale-[1.01]"
                >
                  {editLoading ? (
                    <><span className="material-symbols-outlined animate-spin text-base">sync</span> Saving…</>
                  ) : (
                    <><span className="material-symbols-outlined text-base font-bold">save</span> Save Changes</>
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
