import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Vehicles() {
  const { user } = useOutletContext();
  const isManager = user?.role === 'Admin';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form Fields
  const [vehicleId, setVehicleId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [nameModel, setNameModel] = useState('');
  const [type, setType] = useState('Box Truck');
  const [maxLoadCapacity, setMaxLoadCapacity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [region, setRegion] = useState('North');
  const [status, setStatus] = useState('Available');

  const fetchVehicles = () => {
    setLoading(true);
    let url = '/api/vehicles?';
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
    if (typeFilter) url += `type=${encodeURIComponent(typeFilter)}&`;
    if (regionFilter) url += `region=${encodeURIComponent(regionFilter)}&`;

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch vehicle registry');
        return res.json();
      })
      .then(data => {
        setVehicles(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, typeFilter, regionFilter]);

  const openCreateModal = () => {
    setModalMode('create');
    setVehicleId('');
    setRegistrationNumber('');
    setNameModel('');
    setType('Box Truck');
    setMaxLoadCapacity('');
    setOdometer('0');
    setAcquisitionCost('');
    setRegion('North');
    setStatus('Available');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (v) => {
    setModalMode('edit');
    setVehicleId(v.id);
    setRegistrationNumber(v.registration_number);
    setNameModel(v.name_model);
    setType(v.type);
    setMaxLoadCapacity(v.max_load_capacity);
    setOdometer(v.odometer);
    setAcquisitionCost(v.acquisition_cost);
    setRegion(v.region);
    setStatus(v.status);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!registrationNumber || !nameModel || !maxLoadCapacity || !acquisitionCost) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const payload = {
      registration_number: registrationNumber,
      name_model: nameModel,
      type,
      max_load_capacity: Number(maxLoadCapacity),
      odometer: Number(odometer || 0),
      acquisition_cost: Number(acquisitionCost),
      status,
      region
    };

    const url = modalMode === 'create' ? '/api/vehicles' : `/api/vehicles/${vehicleId}`;
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
        setFormSuccess(`Vehicle ${modalMode === 'create' ? 'created' : 'updated'} successfully!`);
        setTimeout(() => {
          setIsModalOpen(false);
          fetchVehicles();
        }, 1000);
      })
      .catch(err => {
        console.error(err);
        setFormError(err.message);
      });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    fetch(`/api/vehicles/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete vehicle');
        return data;
      })
      .then(() => {
        fetchVehicles();
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };

  const handleRetire = (v) => {
    if (!window.confirm(`Are you sure you want to Retire ${v.registration_number}?`)) return;
    const payload = { ...v, status: 'Retired' };
    fetch(`/api/vehicles/${v.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to retire vehicle');
        return data;
      })
      .then(() => {
        fetchVehicles();
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'On Trip': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Shop': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Retired': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">View and manage all company vehicles and haulage assets.</p>
        </div>
        <div>
          {isManager && (
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-teal-500/20 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined font-bold text-lg">add</span>
              Register Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
          >
            <option value="">All Types</option>
            <option value="Box Truck">Box Truck</option>
            <option value="Flatbed">Flatbed</option>
            <option value="Van">Van</option>
            <option value="Reefer">Reefer</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Region</label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
          >
            <option value="">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-3xl text-teal-600">sync</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">{error}</div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 text-center py-12 rounded-xl text-slate-500">
          No vehicles registered matching current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{v.name_model}</h3>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{v.registration_number}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(v.status)}`}>
                    {v.status}
                  </span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Type</span>
                    <span className="font-semibold text-slate-700">{v.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Max Capacity</span>
                    <span className="font-semibold text-slate-700">{v.max_load_capacity.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Odometer</span>
                    <span className="font-semibold text-slate-700">{v.odometer.toLocaleString()} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Region</span>
                    <span className="font-semibold text-slate-700">{v.region}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {isManager && (
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                  {v.status !== 'Retired' && (
                    <button
                      onClick={() => handleRetire(v)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Retire
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(v)}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 px-3 py-1.5 rounded-lg border border-teal-100 bg-white hover:bg-teal-50/50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {modalMode === 'create' ? 'Register New Vehicle' : 'Edit Vehicle Details'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 flex items-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-150">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-150">
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registration Number *</label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH-12-AB-1234"
                  className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name & Model *</label>
                <input
                  type="text"
                  value={nameModel}
                  onChange={(e) => setNameModel(e.target.value)}
                  placeholder="e.g. Tata Prima 4925"
                  className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                  >
                    <option value="Box Truck">Box Truck</option>
                    <option value="Flatbed">Flatbed</option>
                    <option value="Van">Van</option>
                    <option value="Reefer">Reefer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Max Load Capacity (kg) *</label>
                  <input
                    type="number"
                    value={maxLoadCapacity}
                    onChange={(e) => setMaxLoadCapacity(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Odometer Reading (km) *</label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    placeholder="e.g. 45000"
                    className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Acquisition Cost ($) *</label>
                  <input
                    type="number"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    placeholder="e.g. 85000"
                    className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Region *</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                  >
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
                {modalMode === 'edit' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-lg border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500"
                    >
                      <option value="Available">Available</option>
                      <option value="On Trip">On Trip</option>
                      <option value="In Shop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-lg shadow-teal-500/20"
                >
                  {modalMode === 'create' ? 'Add Asset' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
