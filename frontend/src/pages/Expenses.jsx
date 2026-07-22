import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Expenses() {
  const { user } = useOutletContext();

  const [fuelLogs, setFuelLogs] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [costRollup, setCostRollup] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [activeTab, setActiveTab] = useState('fuel');
  const [loading, setLoading] = useState(true);

  // Fuel Modal
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelError, setFuelError] = useState('');
  const [fuelSuccess, setFuelSuccess] = useState('');

  // Other Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expCategory, setExpCategory] = useState('Toll');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');
  const [expError, setExpError] = useState('');
  const [expSuccess, setExpSuccess] = useState('');

  const fetchAll = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/expenses/fuel', { headers }).then(r => r.json()),
      fetch('/api/expenses/other', { headers }).then(r => r.json()),
      fetch('/api/expenses/rollup', { headers }).then(r => r.json()),
      fetch('/api/vehicles', { headers }).then(r => r.json()),
    ]).then(([fuel, other, rollup, veh]) => {
      setFuelLogs(fuel.data);
      setOtherExpenses(other.data);
      setCostRollup(rollup.data);
      setVehicles(veh.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const handleFuelSubmit = (e) => {
    e.preventDefault();
    setFuelError('');
    if (!fuelVehicleId || !fuelLiters || !fuelCost || !fuelDate) { setFuelError('All fields are required.'); return; }
    fetch('/api/expenses/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ vehicle_id: Number(fuelVehicleId), liters: Number(fuelLiters), cost: Number(fuelCost), date: fuelDate })
    })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data; })
      .then(() => { setFuelSuccess('Fuel log added!'); setTimeout(() => { setIsFuelModalOpen(false); fetchAll(); }, 800); })
      .catch(err => setFuelError(err.message));
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    setExpError('');
    if (!expVehicleId || !expAmount || !expDate) { setExpError('All fields are required.'); return; }
    fetch('/api/expenses/other', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ vehicle_id: Number(expVehicleId), category: expCategory, amount: Number(expAmount), date: expDate, notes: expNotes })
    })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data; })
      .then(() => { setExpSuccess('Expense recorded!'); setTimeout(() => { setIsExpenseModalOpen(false); fetchAll(); }, 800); })
      .catch(err => setExpError(err.message));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-3xl text-accent glow-text">sync</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-450">Track fuel consumption, tollage, and operational expenses per vehicle.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setFuelVehicleId('');
              setFuelLiters('');
              setFuelCost('');
              setFuelDate(new Date().toISOString().split('T')[0]);
              setFuelError('');
              setFuelSuccess('');
              setIsFuelModalOpen(true);
            }}
            className="bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg shadow-accent/25 flex items-center justify-center gap-1.5 hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined font-bold text-lg">local_gas_station</span>
            Log Fuel
          </button>
          <button
            onClick={() => {
              setExpVehicleId('');
              setExpCategory('Toll');
              setExpAmount('');
              setExpDate(new Date().toISOString().split('T')[0]);
              setExpNotes('');
              setExpError('');
              setExpSuccess('');
              setIsExpenseModalOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined font-bold text-lg">payments</span>
            Log Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-900">
        <div className="flex gap-1">
          {[
            { key: 'fuel', label: 'Fuel Logs', icon: 'local_gas_station' },
            { key: 'other', label: 'Other Expenses', icon: 'payments' },
            { key: 'rollup', label: 'Cost Rollup', icon: 'account_balance' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fuel Logs */}
      {activeTab === 'fuel' && (
        fuelLogs.length === 0 ? (
          <div className="bg-slate-950/20 border border-slate-800 text-center py-12 rounded-xl text-slate-500 font-medium">No fuel logs recorded yet.</div>
        ) : (
          <div className="glass-panel border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Liters</th>
                    <th className="p-4">Cost</th>
                    <th className="p-4">Per Liter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {fuelLogs.map(f => (
                    <tr key={f.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{f.vehicle_name}</div>
                        <div className="text-xs font-mono text-slate-500">{f.registration_number}</div>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(f.date).toLocaleDateString()}</td>
                      <td className="p-4 font-medium text-slate-200">{f.liters} L</td>
                      <td className="p-4 font-semibold text-accent">₹{Number(f.cost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="p-4 text-slate-500">₹{(Number(f.cost) / Number(f.liters)).toFixed(2)}/L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Other Expenses */}
      {activeTab === 'other' && (
        otherExpenses.length === 0 ? (
          <div className="bg-slate-950/20 border border-slate-800 text-center py-12 rounded-xl text-slate-500 font-medium">No expenses recorded yet.</div>
        ) : (
          <div className="glass-panel border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {otherExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{e.vehicle_name}</div>
                        <div className="text-xs font-mono text-slate-500">{e.registration_number}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="p-4 font-semibold text-accent">₹{Number(e.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="p-4 text-slate-400 text-xs truncate max-w-[150px]">{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Cost Rollup */}
      {activeTab === 'rollup' && (
        costRollup.length === 0 ? (
          <div className="bg-slate-950/20 border border-slate-800 text-center py-12 rounded-xl text-slate-500 font-medium">No vehicles with operational cost data yet.</div>
        ) : (
          <div className="glass-panel border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Fuel Cost</th>
                    <th className="p-4">Maintenance</th>
                    <th className="p-4">Other Expenses</th>
                    <th className="p-4">Total Op. Cost</th>
                    <th className="p-4">Acquisition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {costRollup.map(v => (
                    <tr key={v.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{v.name_model}</div>
                        <div className="text-xs font-mono text-slate-500">{v.registration_number}</div>
                      </td>
                      <td className="p-4 text-slate-300">₹{Number(v.total_fuel_cost).toLocaleString()}</td>
                      <td className="p-4 text-slate-300">₹{Number(v.total_maintenance_cost).toLocaleString()}</td>
                      <td className="p-4 text-slate-300">₹{Number(v.total_other_expense_cost).toLocaleString()}</td>
                      <td className="p-4 font-bold text-accent">₹{Number(v.total_operational_cost).toLocaleString()}</td>
                      <td className="p-4 text-slate-500">₹{Number(v.acquisition_cost).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Fuel Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <h3 className="font-bold text-white text-base">Log Fuel Fill-Up</h3>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleFuelSubmit} className="p-6 space-y-4 text-slate-350">
              {fuelError && <div className="bg-red-500/5 text-red-400 text-xs p-3 rounded-lg border border-red-500/20">{fuelError}</div>}
              {fuelSuccess && <div className="bg-emerald-500/5 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/20">{fuelSuccess}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle *</label>
                <select value={fuelVehicleId} onChange={(e) => setFuelVehicleId(e.target.value)} className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" required>
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name_model} ({v.registration_number})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Liters *</label>
                  <input type="number" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} placeholder="e.g. 80" className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Total Cost (₹) *</label>
                  <input type="number" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} placeholder="e.g. 8000" className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date *</label>
                  <input type="date" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" required />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2">
                <button type="button" onClick={() => setIsFuelModalOpen(false)} className="px-4 py-2 border border-slate-800 text-slate-400 text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-accent hover:bg-accent-hover text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-lg shadow-accent/25">Save Logs</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Other Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <h3 className="font-bold text-white text-base">Log Operational Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4 text-slate-350">
              {expError && <div className="bg-red-500/5 text-red-400 text-xs p-3 rounded-lg border border-red-500/20">{expError}</div>}
              {expSuccess && <div className="bg-emerald-500/5 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/20">{expSuccess}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle *</label>
                <select value={expVehicleId} onChange={(e) => setExpVehicleId(e.target.value)} className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" required>
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name_model} ({v.registration_number})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category *</label>
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent">
                    <option value="Toll">Toll</option>
                    <option value="Parking">Parking</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Driver Allowance">Driver Allowance</option>
                    <option value="Loading/Unloading">Loading/Unloading</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Amount (₹) *</label>
                  <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="e.g. 850" className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date *</label>
                <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
                <input type="text" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} placeholder="Optional description..." className="w-full rounded-lg border-slate-800 text-sm focus:border-accent focus:ring-accent" />
              </div>
              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 border border-slate-800 text-slate-400 text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-accent hover:bg-accent-hover text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-lg shadow-accent/25">Save Expenses</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
