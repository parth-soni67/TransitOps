import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigate = useNavigate();
  const heroLeftRef = useRef(null);
  const dashboardPreviewRef = useRef(null);

  // Counter values
  const [utilization, setUtilization] = useState(0);
  const [activeTrips, setActiveTrips] = useState(0);
  const [onTimeRate, setOnTimeRate] = useState(0);

  // Trigger counters animation
  const animateCounters = () => {
    const duration = 2000;
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    let currentFrame = 0;

    const animate = () => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      const easedProgress = 1 - Math.pow(1 - progress, 2); // Ease out quadratic

      setUtilization(easedProgress * 94);
      setActiveTrips(Math.floor(easedProgress * 124));
      setOnTimeRate(easedProgress * 98.2);

      if (currentFrame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        setUtilization(94);
        setActiveTrips(124);
        setOnTimeRate(98.2);
      }
    };
    animate();
  };

  useEffect(() => {
    // Intersection Observer for fade-in animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          if (entry.target.id === 'dashboard-preview') {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'scale(1)';
          }
          if (entry.target.id === 'hero-left') {
            animateCounters();
          }
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in-up, #dashboard-preview');
    animatedElements.forEach(el => observer.observe(el));

    // Force first slide view
    setTimeout(() => {
      if (heroLeftRef.current) heroLeftRef.current.classList.add('visible');
    }, 100);

    return () => observer.disconnect();
  }, []);

  // Handle Login Submit
  const handleLogin = async (e, customEmail, customPassword) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const loginEmail = customEmail || email;
    const loginPassword = customPassword || password;

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Authentication failed');
      }

      // Store JWT token and user info
      localStorage.setItem('token', json.data.token);
      localStorage.setItem('user', JSON.stringify(json.data.user));

      // Redirect to Dashboard
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Workspace shortcuts
  const loginAsWorkspace = (role) => {
    let targetEmail = '';
    const targetPassword = 'password123';

    switch (role) {
      case 'Admin':
        targetEmail = 'admin@transitops.com';
        break;
      case 'Driver':
        targetEmail = 'driver@transitops.com';
        break;
      default:
        return;
    }

    setEmail(targetEmail);
    setPassword(targetPassword);
    handleLogin(null, targetEmail, targetPassword);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="flex justify-center items-center px-container-margin py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold text-3xl">local_shipping</span>
            <span className="font-bold text-2xl text-primary font-sans">TransitOps</span>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header 
        className="relative min-h-screen pt-32 pb-20 overflow-hidden flex items-center" 
        style={{
          background: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(19, 78, 74, 0.75)) center center / cover, url("https://lh3.googleusercontent.com/aida/AP1WRLsCWOfckLMJAkyei2oosG8me9IHbXZLQrQKDPQfowUk8vLodWvVcS14iktXBI50UZ0GgdVHkNnMvwOX0RuAK9DF-O8er_SGcLSEvHxSam8l7noE2PtM6I0X-5HjpQganGaFIZ-YE3d8tjYgQphQhXJFzRRzqSAtAWH8NEKP8-aUiddsgk-jaNB_U-BtIPLW7y0jfJ6893dN2YDILEIHy4ffyeiD5TmmD5k43-W9muDEbX8kVwZu2lCj") center center / cover`
        }}
      >
        <div className="max-w-7xl mx-auto px-container-margin grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10 items-center w-full">
          {/* Left Content */}
          <div className="space-y-8 fade-in-up text-center lg:text-left lg:col-span-7" id="hero-left" ref={heroLeftRef}>
            <h1 className="text-white font-bold text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight">
              Run Your Fleet on <span className="text-accent">One Platform</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-xl mx-auto lg:mx-0">
              Unified precision logistics. Monitor, dispatch, and optimize your entire operational ecosystem with real-time intelligence and automated compliance.
            </p>
            {/* Trust Strip / Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 max-w-lg mx-auto lg:mx-0">
              <div className="space-y-1">
                <div className="text-white font-bold text-3xl md:text-4xl">{utilization.toFixed(1)}%</div>
                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Fleet Utilization</div>
              </div>
              <div className="space-y-1">
                <div className="text-white font-bold text-3xl md:text-4xl">{activeTrips}</div>
                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Active Trips</div>
              </div>
              <div className="space-y-1">
                <div className="text-white font-bold text-3xl md:text-4xl">{onTimeRate.toFixed(1)}%</div>
                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">On-Time Rate</div>
              </div>
            </div>
          </div>

          {/* Right: Login Card */}
          <div className="fade-in-up lg:col-span-5" id="hero-right" style={{ transitionDelay: '200ms' }}>
            <div className="glass-panel p-card-padding rounded-xl shadow-2xl max-w-md mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-white text-2xl font-bold mb-1">Access TransitOps</h2>
                <p className="text-slate-400 text-sm">Sign in to your operational dashboard</p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-lg">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-slate-300 text-xs font-medium block">Corporate Email</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-white/20 text-sm" 
                    placeholder="name@transitops.com" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-300 text-xs font-medium block">Password</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-white/20 text-sm" 
                    placeholder="••••••••" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <a className="text-accent text-xs hover:underline" href="#">Forgot password?</a>
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-primary font-bold py-3 rounded-lg hover:bg-white transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10">
                <p className="text-slate-400 text-[10px] font-bold text-center mb-3 uppercase tracking-widest">Quick Access</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => loginAsWorkspace('Admin')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded bg-white/5 hover:bg-white/10 text-white/80 transition-all text-xs border border-white/5"
                  >
                    <span className="material-symbols-outlined text-sm">admin_panel_settings</span> Admin
                  </button>
                  <button 
                    onClick={() => loginAsWorkspace('Driver')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded bg-white/5 hover:bg-white/10 text-white/80 transition-all text-xs border border-white/5"
                  >
                    <span className="material-symbols-outlined text-sm">drive_eta</span> Driver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURE SECTION */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-container-margin relative z-10">
          <div className="text-center mb-20 fade-in-up">
            <h2 className="text-primary font-bold text-4xl mb-4">Precision-Engineered Features</h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">High-performance tools for every aspect of your transit operation, built on enterprise-grade infrastructure.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {/* Card 1 */}
            <div className="bg-bg rounded-xl p-card-padding border border-border shadow-sm hover:shadow-md transition-all fade-in-up" style={{ transitionDelay: '100ms' }}>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-6 text-accent">
                <span className="material-symbols-outlined text-2xl">near_me</span>
              </div>
              <h3 className="text-primary font-bold text-xl mb-3">Live Dispatch</h3>
              <p className="text-muted text-sm">Intelligent route optimization and driver assignment with sub-second latency.</p>
            </div>
            {/* Card 2 */}
            <div className="bg-bg rounded-xl p-card-padding border border-border shadow-sm hover:shadow-md transition-all fade-in-up" style={{ transitionDelay: '200ms' }}>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-6 text-accent">
                <span className="material-symbols-outlined text-2xl">build</span>
              </div>
              <h3 className="text-primary font-bold text-xl mb-3">Maintenance Automation</h3>
              <p className="text-muted text-sm">Predictive scheduling based on telematics data to eliminate unplanned downtime.</p>
            </div>
            {/* Card 3 */}
            <div className="bg-bg rounded-xl p-card-padding border border-border shadow-sm hover:shadow-md transition-all fade-in-up" style={{ transitionDelay: '300ms' }}>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-6 text-accent">
                <span className="material-symbols-outlined text-2xl">monitoring</span>
              </div>
              <h3 className="text-primary font-bold text-xl mb-3">Fuel & Cost Tracking</h3>
              <p className="text-muted text-sm">Deep visibility into operational expenses with automated expense reconciliation.</p>
            </div>
            {/* Card 4 */}
            <div className="bg-bg rounded-xl p-card-padding border border-border shadow-sm hover:shadow-md transition-all fade-in-up" style={{ transitionDelay: '400ms' }}>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6 text-danger">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <h3 className="text-primary font-bold text-xl mb-3">Compliance Alerts</h3>
              <p className="text-muted text-sm">Automated HOS, ELD tracking, and instant alerts for safety violations.</p>
            </div>
          </div>
          {/* Parallax Element */}
          <div className="relative mt-20 w-full overflow-hidden rounded-xl shadow-lg">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVnXZy8sjI6FhPP-Yr1rH0shdgPVKfLEkRZxg5ZgP2tqNajPayCTZt3Z53nqMkJJUEoQ9LK1KesV-EfB3dfWHr_I8RDfcct-ITDuxbCnvqtHkBnxrubS5Hcmft0tCoT116WDrQsNuzapIPQqYBPQLeF1RZDqxXQQTHK9QRVTVSF9ZvCQVq85FeBVhLloAbljltbpKpQDyuFy004NZ7-EtBYghV66Bi0VE3zolBM9LUhXnHodAcjAM" alt="Modern semi-truck on highway at twilight" className="w-full h-64 object-cover opacity-90" />
          </div>
        </div>
      </section>

      {/* OPERATIONAL SNAPSHOT */}
      <section className="py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-container-margin">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Dashboard Mockup */}
            <div className="w-full lg:w-3/5 scale-90 opacity-0 transition-all duration-1000 ease-out" id="dashboard-preview" ref={dashboardPreviewRef}>
              <div className="bg-white rounded-2xl shadow-2xl border border-border p-6 relative">
                {/* Top Navigation of Mockup */}
                <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                  <div className="flex gap-4">
                    <div className="w-3 h-3 rounded-full bg-danger"></div>
                    <div className="w-3 h-3 rounded-full bg-warning"></div>
                    <div className="w-3 h-3 rounded-full bg-success"></div>
                  </div>
                  <div className="text-muted text-xs font-semibold">Dashboard / Fleet Overview</div>
                  <div className="w-8 h-8 bg-slate-100 rounded-full"></div>
                </div>
                {/* KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-bg rounded-xl p-4 border border-border">
                    <p className="text-muted text-xs font-medium mb-1">Active Vehicles</p>
                    <p className="text-primary font-bold text-2xl">342</p>
                    <div className="flex items-center gap-1 text-success text-[10px] font-semibold mt-1">
                      <span className="material-symbols-outlined text-[10px]">trending_up</span> +4.2%
                    </div>
                  </div>
                  <div className="bg-bg rounded-xl p-4 border border-border">
                    <p className="text-muted text-xs font-medium mb-1">In Maintenance</p>
                    <p className="text-primary font-bold text-2xl">12</p>
                    <div className="flex items-center gap-1 text-muted text-[10px] font-semibold mt-1">
                      <span className="material-symbols-outlined text-[10px]">sync</span> Processing
                    </div>
                  </div>
                  <div className="bg-bg rounded-xl p-4 border border-border relative">
                    <div className="absolute top-2 right-2 bg-yellow-100 text-warning px-1.5 py-0.5 rounded text-[8px] font-bold">LIVE</div>
                    <p className="text-muted text-xs font-medium mb-1">Drivers Duty</p>
                    <p className="text-primary font-bold text-2xl">289</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-accent h-full w-[85%]"></div>
                    </div>
                  </div>
                  <div className="bg-bg rounded-xl p-4 border border-border">
                    <p className="text-muted text-xs font-medium mb-1">Fleet Utilization</p>
                    <p className="text-primary font-bold text-2xl">94.8%</p>
                    <div className="flex items-center gap-1 text-muted text-[10px] font-semibold mt-1">
                      Target: 92%
                    </div>
                  </div>
                </div>
                {/* Main Content of Mockup */}
                <div className="bg-bg rounded-xl border border-border h-64 flex flex-col items-center justify-center text-muted">
                  <div className="w-full h-full p-4">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvGBbMbWs-LFRdg_ctkpQ7VKUu1Z8lUmuMUUh41HANzJjqGftDPT0uSEg0hX4a69MA5I6HyJp3sXqqNzH1rw8V_GhryyXoV-JOCwgqcwKle2NDQVuSjJAS_ZBW39HRH_8bRLAV1F9gq2mCzSIRfyDFiyghFAAsouoLzkdObxItOPkgXezBqQ7M_9mdFvUlp50_jOXWRSoinQwW8GZvs3UqqKaXy97LHTsiqwvR0OsutKQDy_Jt2dA" alt="Modern logistics warehouse interior with organized shelving and workers" className="w-full h-full object-cover rounded-xl shadow-md" />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-2/5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs uppercase tracking-widest font-bold">
                <span className="material-symbols-outlined text-sm">visibility</span> Complete Visibility
              </div>
              <h2 className="text-primary font-bold text-4xl leading-tight">Data-Driven Decisions in Milliseconds.</h2>
              <p className="text-muted text-base leading-relaxed">
                TransitOps processes over 150 million data points daily. Our dashboard gives you the signal in the noise, highlighting critical issues before they impact your bottom line.
              </p>
              <ul className="space-y-4 pt-4 text-primary">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="font-semibold text-sm">Real-time GPS and Telematics integration</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="font-semibold text-sm">AI-powered predictive maintenance</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="font-semibold text-sm">Unified driver communication hub</span>
                </li>
              </ul>
              <div className="pt-6">
                <button className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 group">
                  Start Your Free Pilot
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-container-margin bg-primary border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-stack-md max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-accent text-2xl">local_shipping</span>
              <span className="text-xl font-bold">TransitOps</span>
            </div>
            <p className="text-slate-400 text-xs">© 2026 TransitOps. Precision Logistics Systems.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="text-slate-400 text-xs hover:text-white transition-colors" href="#">Privacy Policy</a>
            <a className="text-slate-400 text-xs hover:text-white transition-colors" href="#">Terms of Service</a>
            <a className="text-slate-400 text-xs hover:text-white transition-colors" href="#">Security</a>
            <a className="text-slate-400 text-xs hover:text-white transition-colors" href="#">Contact</a>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-xl">language</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-xl">rss_feed</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
