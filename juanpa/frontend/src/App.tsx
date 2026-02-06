import { useEffect, useMemo, useState } from 'react';
import './App.css';

const METRIC_TARGETS = {
  water: 12840,
  carbon: 3420,
  harvest: 980,
};

const CROPS = [
  {
    name: 'Basil',
    summary: 'High-menthol microgreens tuned for rapid cycles.',
    nutrition: 'Vitamin K · 62% DV',
    cycle: '18-day growth',
    yield: '1.8 kg / m²',
  },
  {
    name: 'Butterhead Lettuce',
    summary: 'Soft-leaf cultivar optimized for LED density.',
    nutrition: 'Folate · 42% DV',
    cycle: '24-day growth',
    yield: '3.1 kg / m²',
  },
  {
    name: 'Micro Kale',
    summary: 'Compact nutrient stacks for urban kitchens.',
    nutrition: 'Vitamin C · 71% DV',
    cycle: '16-day growth',
    yield: '1.2 kg / m²',
  },
];

const LINE_DATA = [
  { label: 'Nutrient Flow', values: [10, 30, 18, 45, 32, 52] },
  { label: 'Photon Output', values: [8, 24, 16, 38, 35, 48] },
  { label: 'Growth Velocity', values: [12, 28, 22, 40, 36, 55] },
];

const App = () => {
  const [metrics, setMetrics] = useState({ water: 0, carbon: 0, harvest: 0 });
  const [activeCrop, setActiveCrop] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMetrics((prev) => ({
        water: Math.min(prev.water + 84, METRIC_TARGETS.water),
        carbon: Math.min(prev.carbon + 24, METRIC_TARGETS.carbon),
        harvest: Math.min(prev.harvest + 12, METRIC_TARGETS.harvest),
      }));
    }, 60);

    return () => window.clearInterval(interval);
  }, []);

  const linePaths = useMemo(() => {
    return LINE_DATA.map((line) => {
      const points = line.values
        .map((value, index) => {
          const x = (index / (line.values.length - 1)) * 180 + 10;
          const y = 70 - value * 0.9;
          return `${x},${y}`;
        })
        .join(' ');

      return {
        label: line.label,
        points,
      };
    });
  }, []);

  return (
    <div className="skyharvest">
      <header className="skyharvest__hero">
        <nav className="skyharvest__nav">
          <div className="skyharvest__logo">
            <span className="skyharvest__logo-mark">◆</span>
            SkyHarvest
          </div>
          <div className="skyharvest__nav-links">
            <button className="ghost-button">Platform</button>
            <button className="ghost-button">Eco-Dashboard</button>
            <button className="ghost-button">Contact</button>
          </div>
        </nav>
        <div className="skyharvest__hero-grid">
          <div className="skyharvest__hero-copy">
            <p className="eyebrow">Urban Agriculture, Reimagined</p>
            <h1>Vertical farming engineered like a cleanroom lab.</h1>
            <p className="hero-subtitle">
              SkyHarvest delivers pesticide-free produce through precision hydroponics, stacked modules,
              and AI-driven growth recipes. Farming becomes an urban science — luminous, sterile, and
              efficient.
            </p>
            <div className="hero-actions">
              <button className="primary-button">Tour the Facility</button>
              <button className="secondary-button">Download Spec Sheet</button>
            </div>
            <div className="hero-metrics">
              <div>
                <span>98%</span>
                <p>Water reclaimed per cycle</p>
              </div>
              <div>
                <span>24/7</span>
                <p>Climate orchestration</p>
              </div>
              <div>
                <span>0</span>
                <p>Soil contaminants detected</p>
              </div>
            </div>
          </div>
          <div className="skyharvest__hero-visual">
            <div className="visual-panel">
              <img
                src="https://images.unsplash.com/photo-1545239351-ef35f43d514b?auto=format&fit=crop&w=900&q=80"
                alt="Sterile vertical farming tower with LED lighting"
              />
              <div className="visual-overlay">
                <p>Layered hydroponic towers</p>
                <span>Photon Density: 98 μmol/m²</span>
              </div>
            </div>
            <div className="visual-panel">
              <img
                src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                alt="Crisp lettuce under artificial LED lighting"
              />
              <div className="visual-overlay">
                <p>Clean-growth produce</p>
                <span>Zero pesticide residue</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="skyharvest__stack">
        <div className="section-heading">
          <h2>Modular vertical stacks for city infrastructure.</h2>
          <p>
            Each SkyHarvest cell is a self-contained ecosystem — a grid-based architecture that scales
            across rooftops, warehouses, and subterranean hubs.
          </p>
        </div>
        <div className="stack-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="stack-module">
              <h3>Tier {index + 1}</h3>
              <p>Independent nutrient loop, LED spectrum tailoring, and sterile airflow.</p>
              <span className="stack-status">Active</span>
            </div>
          ))}
        </div>
      </section>

      <section className="skyharvest__dashboard">
        <div className="section-heading">
          <h2>Eco-Dashboard · Live Metrics</h2>
          <p>Real-time sustainability impact from every harvest cycle.</p>
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-metrics">
            <div className="metric-card">
              <p>Water Saved</p>
              <h3>{metrics.water.toLocaleString()} L</h3>
              <span className="metric-detail">Compared to field irrigation</span>
            </div>
            <div className="metric-card">
              <p>Carbon Offset</p>
              <h3>{metrics.carbon.toLocaleString()} kg</h3>
              <span className="metric-detail">Renewable energy matched</span>
            </div>
            <div className="metric-card">
              <p>Daily Harvest Yield</p>
              <h3>{metrics.harvest.toLocaleString()} kg</h3>
              <span className="metric-detail">Average across 42 modules</span>
            </div>
          </div>
          <div className="dashboard-visuals">
            {linePaths.map((line) => (
              <div key={line.label} className="line-card">
                <div className="line-header">
                  <span>{line.label}</span>
                  <span className="line-status">Live</span>
                </div>
                <svg viewBox="0 0 200 80" aria-hidden="true">
                  <polyline
                    className="line-graph"
                    points={line.points}
                    fill="none"
                    stroke="url(#skyGradient)"
                    strokeWidth="3"
                  />
                  <defs>
                    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="skyharvest__crops">
        <div className="section-heading">
          <h2>Crop intelligence layer</h2>
          <p>Hover to reveal holographic nutrition and growth data streams.</p>
        </div>
        <div className="crop-grid">
          {CROPS.map((crop) => (
            <div
              key={crop.name}
              className={`crop-card ${activeCrop === crop.name ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveCrop(crop.name)}
              onMouseLeave={() => setActiveCrop(null)}
            >
              <div className="crop-header">
                <h3>{crop.name}</h3>
                <span className="chip">Bio-Optimized</span>
              </div>
              <p>{crop.summary}</p>
              <div className="crop-meta">
                <span>{crop.nutrition}</span>
                <span>{crop.cycle}</span>
              </div>
              <div className="holo-popup" aria-hidden={activeCrop !== crop.name}>
                <h4>Nutrition Scan</h4>
                <p>{crop.nutrition}</p>
                <p>{crop.cycle}</p>
                <p>Yield: {crop.yield}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="skyharvest__cta">
        <div>
          <h2>Deploy a SkyHarvest lab in your city.</h2>
          <p>We partner with urban developers and grocers to install modular, carbon-negative farms.</p>
        </div>
        <button className="primary-button">Schedule a Demo</button>
      </section>
    </div>
  );
};

export default App;
