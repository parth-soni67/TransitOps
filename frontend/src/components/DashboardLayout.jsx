import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ vehicles: [], drivers: [], trips: [] });
  const [allData, setAllData] = useState({ vehicles: [], drivers: [], trips: [] });
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const fetchSearchData = () => {
    if (allData.vehicles.length > 0) return;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/vehicles', { headers }).then(r => r.json()),
      fetch('/api/drivers', { headers }).then(r => r.json()),
      fetch('/api/trips', { headers }).then(r => r.json()),
    ]).then(([veh, drv, trp]) => {
      setAllData({
        vehicles: veh.data || [],
        drivers: drv.data || [],
        trips: trp.data || [],
      });
    }).catch(err => console.error(err));
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults({ vehicles: [], drivers: [], trips: [] });
      return;
    }

    const q = query.toLowerCase();
    const filteredVehicles = allData.vehicles.filter(v => 
      v.registration_number.toLowerCase().includes(q) || 
      v.name_model.toLowerCase().includes(q) ||
      v.region.toLowerCase().includes(q)
    ).slice(0, 4);

    const filteredDrivers = allData.drivers.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.license_number.toLowerCase().includes(q)
    ).slice(0, 4);

    const filteredTrips = allData.trips.filter(t => 
      t.source.toLowerCase().includes(q) || 
      t.destination.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    ).slice(0, 4);

    setSearchResults({
      vehicles: filteredVehicles,
      drivers: filteredDrivers,
      trips: filteredTrips,
    });
  };

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-4xl text-teal-600">sync</span>
          <span className="text-slate-600 font-semibold">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  const adminMenuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Vehicles & Fleet', path: '/dashboard/vehicles', icon: 'local_shipping' },
    { name: 'Drivers', path: '/dashboard/drivers', icon: 'badge' },
    { name: 'Trips & Dispatch', path: '/dashboard/trips', icon: 'route' },
    { name: 'Maintenance', path: '/dashboard/maintenance', icon: 'build' },
    { name: 'Expenses & Fuel', path: '/dashboard/expenses', icon: 'payments' },
    { name: 'Reports & Analytics', path: '/dashboard/reports', icon: 'analytics' },
  ];

  const driverMenuItems = [
    { name: 'My Trips', path: '/dashboard/trips', icon: 'route' },
    { name: 'Expenses & Fuel', path: '/dashboard/expenses', icon: 'payments' },
    { name: 'My Profile', path: '/dashboard/drivers', icon: 'badge' },
  ];

  const menuItems = user.role === 'Driver' ? driverMenuItems : adminMenuItems;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shadow-lg">
        {/* Sidebar Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <span className="material-symbols-outlined text-teal-400 font-bold text-3xl">local_shipping</span>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">TransitOps</h1>
            <p className="text-[10px] text-teal-400 font-medium uppercase tracking-wider">Precision Logistics</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 bg-slate-800/50 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-lg">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
            <p className="text-[11px] text-slate-400 truncate">{user.role}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-grow px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-red-500/30 text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm relative z-30">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="font-semibold text-slate-800 text-lg shrink-0">
              {menuItems.find((item) => item.path === location.pathname)?.name || 'Control Panel'}
            </h2>
            
            {/* Global Search Bar */}
            <div className="relative flex-grow max-w-md mx-8 hidden md:block">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search vehicles, drivers, trips..."
                  value={searchQuery}
                  onFocus={() => { fetchSearchData(); setShowOverlay(true); }}
                  onChange={handleSearchChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs focus:bg-white focus:border-teal-500 focus:ring-teal-500 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setSearchResults({ vehicles: [], drivers: [], trips: [] }); }}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Results Dropdown Overlay */}
              {showOverlay && (searchQuery.trim() || allData.vehicles.length > 0) && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOverlay(false)}></div>
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[450px] overflow-y-auto p-2 scrollbar">
                    {!searchQuery.trim() ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Start typing to search across registry assets and dispatches.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Vehicles */}
                        {searchResults.vehicles.length > 0 && (
                          <div>
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded">Vehicles</div>
                            <div className="divide-y divide-slate-100">
                              {searchResults.vehicles.map(v => (
                                <Link
                                  key={v.id}
                                  to="/dashboard/vehicles"
                                  onClick={() => setShowOverlay(false)}
                                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                  <div>
                                    <div className="text-xs font-semibold text-slate-700">{v.name_model}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{v.registration_number}</div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${v.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : v.status === 'On Trip' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                    {v.status}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Drivers */}
                        {searchResults.drivers.length > 0 && (
                          <div>
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded">Drivers</div>
                            <div className="divide-y divide-slate-100">
                              {searchResults.drivers.map(d => (
                                <Link
                                  key={d.id}
                                  to="/dashboard/drivers"
                                  onClick={() => setShowOverlay(false)}
                                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                  <div>
                                    <div className="text-xs font-semibold text-slate-700">{d.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">Score: {d.safety_score}</div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${d.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : d.status === 'On Trip' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                    {d.status}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Trips */}
                        {searchResults.trips.length > 0 && (
                          <div>
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded">Trips</div>
                            <div className="divide-y divide-slate-100">
                              {searchResults.trips.map(t => (
                                <Link
                                  key={t.id}
                                  to="/dashboard/trips"
                                  onClick={() => setShowOverlay(false)}
                                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                  <div>
                                    <div className="text-xs font-semibold text-slate-700">{t.source} ➔ {t.destination}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">Trip #{t.id}</div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : t.status === 'Dispatched' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                                    {t.status}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.vehicles.length === 0 && searchResults.drivers.length === 0 && searchResults.trips.length === 0 && (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No matching assets or dispatches found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">

            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Current Workspace</p>
              <p className="text-xs font-semibold text-slate-700">{user.role} Hub</p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-2 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-slate-600">Connected</span>
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-grow p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
