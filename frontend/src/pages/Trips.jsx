import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Trips() {
  const { user } = useOutletContext();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filter States
  const [statusFilter, setStatusFilter] = useState('');

  // Dropdown options for Trip Creation (Available Assets)
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);

  // Create Modal / Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  
  // Create Form Fields
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');

  // Complete Modal / Form States
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(null);
  const [completeError, setCompleteError] = useState('');
  const [completeSuccess, setCompleteSuccess] = useState('');

  // Complete Form Fields
  const [finalOdometer, setFinalOdometer] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [revenue, setRevenue] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');

  const fetchTrips = () => {
    setLoading(true);
    let url = '/api/trips?';
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch trips list');
        return res.json();
      })
      .then(data => {
        setTrips(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  const fetchAvailableAssets = () => {
    // Fetch available vehicles
    fetch('/api/vehicles?status=Available', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setAvailableVehicles(data.data))
      .catch(err => console.error('Failed to fetch available vehicles:', err));

    // Fetch available drivers
    fetch('/api/drivers?status=Available', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        // Filter out drivers with expired licenses
        const validDrivers = data.data.filter(d => new Date(d.license_expiry_date) >= new Date());
        setAvailableDrivers(validDrivers);
      })
      .catch(err => console.error('Failed to fetch available drivers:', err));
  };

  useEffect(() => {
    fetchTrips();
  }, [statusFilter]);

  const openCreateModal = () => {
    setSource('');
    setDestination('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setCargoWeight('');
    setPlannedDistance('');
    setCreateError('');
    setCreateSuccess('');
    fetchAvailableAssets();
    setIsCreateModalOpen(true);
  };

  const openCompleteModal = (trip) => {
    setCompletingTrip(trip);
    setFinalOdometer('');
    setFuelConsumed('');
    setRevenue('');
    setFuelCost('');
    setExpenseAmount('');
    setExpenseDescription('');
    setCompleteError('');
    setCompleteSuccess('');
    setIsCompleteModalOpen(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!source || !destination || !selectedVehicleId || !selectedDriverId || !cargoWeight || !plannedDistance) {
      setCreateError('Please fill out all required fields.');
      return;
    }

    // Client-side verification: check vehicle cargo capacity limit (Rule 5)
    const vehicleObj = availableVehicles.find(v => v.id.toString() === selectedVehicleId.toString());
    if (vehicleObj && Number(cargoWeight) > Number(vehicleObj.max_load_capacity)) {
      setCreateError(`Cargo weight (${cargoWeight} kg) exceeds vehicle max capacity (${vehicleObj.max_load_capacity} kg)`);
      return;
    }

    const payload = {
      source,
      destination,
      vehicle_id: Number(selectedVehicleId),
      driver_id: Number(selectedDriverId),
      cargo_weight: Number(cargoWeight),
      planned_distance: Number(plannedDistance)
    };

    fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create trip');
        return data;
      })
      .then(() => {
        setCreateSuccess('Trip draft created successfully!');
        setTimeout(() => {
          setIsCreateModalOpen(false);
          fetchTrips();
        }, 1000);
      })
      .catch(err => {
        console.error(err);
        setCreateError(err.message);
      });
  };

  const handleDispatch = (id) => {
    setActionError('');
    setActionSuccess('');
    fetch(`/api/trips/${id}/dispatch`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to dispatch trip');
        return data;
      })
      .then(() => {
        setActionSuccess('Trip dispatched! Vehicle and driver are now On Trip.');
        fetchTrips();
      })
      .catch(err => {
        console.error(err);
        setActionError(err.message);
      });
  };

  const handleCancel = (id) => {
    setActionError('');
    setActionSuccess('');
    fetch(`/api/trips/${id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to cancel trip');
        return data;
      })
      .then(() => {
        setActionSuccess('Trip cancelled. Vehicle and driver have been freed.');
        fetchTrips();
      })
      .catch(err => {
        console.error(err);
        setActionError(err.message);
      });
  };

  const handleCompleteSubmit = (e) => {
    e.preventDefault();
    setCompleteError('');
    setCompleteSuccess('');

    if (!finalOdometer || !fuelConsumed) {
      setCompleteError('Please fill out all required fields.');
      return;
    }

    const payload = {
      final_odometer: Number(finalOdometer),
      fuel_consumed: Number(fuelConsumed),
      revenue: Number(revenue || 0),
      fuel_cost: fuelCost ? Number(fuelCost) : undefined,
      expense_amount: expenseAmount ? Number(expenseAmount) : undefined,
      expense_description: expenseDescription || undefined
    };

    fetch(`/api/trips/${completingTrip.id}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to complete trip');
        return data;
      })
      .then(() => {
        setCompleteSuccess('Trip completed successfully!');
        setTimeout(() => {
          setIsCompleteModalOpen(false);
          fetchTrips();
        }, 1000);
      })
      .catch(err => {
        console.error(err);
        setCompleteError(err.message);
      });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Draft': return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'Dispatched': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            {user.role === 'Driver'
              ? 'View and manage trips assigned to you. Dispatch and complete your runs.'
              : 'Dispatch trips, complete active runs, and monitor active operational lines.'}
          </p>
        </div>
        {user.role === 'Admin' && (
          <div>
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2.5 rounded-lg text-sm transition-all duration-200 shadow-lg shadow-accent/25 flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined font-bold text-lg">route</span>
              Create Trip Dispatch
            </button>
          </div>
        )}
      </div>

      {/* Inline Action Feedback Banners */}
      {actionError && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-sm font-medium p-4 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400 text-base animate-pulse">error</span>
            {actionError}
          </div>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-300">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-sm font-medium p-4 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
            {actionSuccess}
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-400 hover:text-emerald-300">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 shadow-md flex flex-wrap gap-4 items-center glass-panel">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border-slate-800 text-sm text-slate-350 focus:border-accent focus:ring-accent"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft (Pending)</option>
            <option value="Dispatched">Dispatched (On Trip)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-3xl text-accent glow-text">sync</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">{error}</div>
      ) : trips.length === 0 ? (
        <div className="bg-slate-950/20 border border-slate-800 text-center py-12 rounded-xl text-slate-500 font-medium">
          No dispatches or trips matching current filters.
        </div>
      ) : (
        <div className="glass-panel border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="p-4">Route (Src ➔ Dest)</th>
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4">Cargo / Distance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Operational Data</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {trips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">{t.source} ➔ {t.destination}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">Trip ID: #{t.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{t.vehicle_name}</div>
                      <div className="text-xs font-mono text-slate-500">{t.registration_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{t.driver_name}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-200 font-medium">{t.cargo_weight.toLocaleString()} kg</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.planned_distance.toLocaleString()} km</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      {t.status === 'Completed' ? (
                        <div className="space-y-0.5 text-slate-350">
                          <div><span className="text-slate-500">Odo:</span> <span className="font-semibold text-slate-200">{t.final_odometer.toLocaleString()} km</span></div>
                          <div><span className="text-slate-500">Fuel:</span> <span className="font-semibold text-slate-200">{t.fuel_consumed} Liters</span></div>
                          <div><span className="text-slate-500">Rev:</span> <span className="font-semibold text-accent">${t.revenue.toLocaleString()}</span></div>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {t.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => handleDispatch(t.id)}
                              className="text-xs font-bold bg-accent hover:bg-accent-hover text-slate-950 px-3 py-1.5 rounded-lg transition-all duration-200 shadow-sm hover:scale-[1.02]"
                            >
                              Dispatch
                            </button>
                            {user.role === 'Admin' && (
                              <button
                                onClick={() => handleCancel(t.id)}
                                className="text-xs font-bold border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}
                        {t.status === 'Dispatched' && (
                          <>
                            <button
                              onClick={() => openCompleteModal(t)}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all duration-200 shadow-md hover:scale-[1.02]"
                            >
                              Complete
                            </button>
                            {user.role === 'Admin' && (
                              <button
                                onClick={() => handleCancel(t.id)}
                                className="text-xs font-bold border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <h3 className="font-bold text-white text-base">Plan New Dispatch</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 flex items-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-300">
              {createError && (
                <div className="bg-red-500/5 text-red-400 text-xs p-3 rounded-lg border border-red-500/20">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-emerald-500/5 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/20">
                  {createSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Source / Origin *</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Mumbai Port"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Destination *</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Delhi Warehouse"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Vehicle (Available Only) *</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  required
                >
                  <option value="">Select a Vehicle</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name_model} ({v.registration_number}) - Capacity: {v.max_load_capacity} kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Driver (Available + Valid License) *</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  required
                >
                  <option value="">Select a Driver</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Safety Score: {d.safety_score})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cargo Weight (kg) *</label>
                  <input
                    type="number"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    placeholder="e.g. 8000"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Planned Distance (km) *</label>
                  <input
                    type="number"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    placeholder="e.g. 1400"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-lg shadow-accent/25"
                >
                  Plan Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <h3 className="font-bold text-white text-base">Complete Active Trip</h3>
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 flex items-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-300">
              {completeError && (
                <div className="bg-red-500/5 text-red-400 text-xs p-3 rounded-lg border border-red-500/20">
                  {completeError}
                </div>
              )}
              {completeSuccess && (
                <div className="bg-emerald-500/5 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/20">
                  {completeSuccess}
                </div>
              )}

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                <div>Route: <strong className="text-white">{completingTrip?.source} ➔ {completingTrip?.destination}</strong></div>
                <div>Vehicle: <strong className="text-white">{completingTrip?.vehicle_name} ({completingTrip?.registration_number})</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Final Odometer Reading (km) *</label>
                <input
                  type="number"
                  value={finalOdometer}
                  onChange={(e) => setFinalOdometer(e.target.value)}
                  placeholder="Must be greater than current odometer"
                  className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fuel Consumed (Liters) *</label>
                  <input
                    type="number"
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Total Fuel Cost (₹)</label>
                  <input
                    type="number"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    placeholder="e.g. 11000"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Other Expense Amount (₹)</label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Trip Revenue (₹)</label>
                  <input
                     type="number"
                     value={revenue}
                     onChange={(e) => setRevenue(e.target.value)}
                     placeholder="e.g. 3500"
                     className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                   />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Other Expense Notes</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="e.g. Tolls, highway tax, refreshments"
                  className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent"
                />
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Log Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
