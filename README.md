# BI-101: Geospatial Profitability Predictor — X-Pand

**X-Pand** is a premium, end-to-end geospatial profitability prediction system designed for **Tomato**, a food delivery company. It predicts the 6-month profitability of new service hubs by analyzing high-resolution delivery zone data over a 500m × 500m geospatial grid.

The system combines advanced spatial feature engineering, Geographically Weighted Regression (GWR), LightGBM classification with SHAP-based interpretability, and Binary Integer Programming (BIP) for strategic expansion — all served through a modern React SPA and a robust FastAPI backend.

---

## 🏛️ System Architecture

The following diagram illustrates the interaction between the modern React frontend, the FastAPI backend, and the core ML pipeline.

```mermaid
graph TB
    subgraph "Frontend Layer (React SPA)"
        UI["Modern Dashboard (Framer Motion)"]
        Map["Leaflet Map (GeoJSON Grid)"]
        State["State Management (AppProvider)"]
    end

    subgraph "Backend Layer (FastAPI)"
        API["API Endpoints (/predict, /optimize, /status)"]
        Loader["Model Loader (Joblib)"]
    end

    subgraph "ML Core Pipeline"
        Grid["Grid Builder (H3/500m Grid)"]
        Feature["Feature Engineer (Spatial Lags, OSM)"]
        Predictor["LightGBM Classifier (Calibrated)"]
        Explainer["SHAP Explainer (Local Interpretability)"]
        Optimizer["BIP Optimizer (Strategic Placement)"]
        TS["Thompson Sampler (Exploration-Exploitation)"]
    end

    subgraph "Data Storage"
        Raw["Raw Data (CSV/DEM)"]
        Proc["Processed Data (GeoJSON/PKL)"]
        Models["Saved Models (PKL)"]
    end

    UI --> API
    API --> Loader
    Loader --> Models
    Models --> Predictor
    Predictor --> Explainer
    API --> Predictor
    API --> Optimizer
    Optimizer --> Predictor
    API --> Grid
    Grid --> Proc
    Proc --> Feature
    Feature --> Predictor
```

---

## 🔄 Data Workflow

The end-to-end pipeline from raw geospatial data to optimized strategic hub placement.

```mermaid
sequenceDiagram
    participant D as Raw Data (OSM, WorldPop)
    participant P as Geospatial Processing
    participant M as ML Pipeline (LightGBM + SHAP)
    participant O as BIP Optimizer
    participant F as React Frontend

    D->>P: Grid Generation (500m x 500m)
    P->>P: Feature Engineering (Spatial Lags, GWR)
    P->>M: Train/Load Model
    M->>F: Cell-level Predictions & SHAP Drivers
    F->>O: Set Constraints (Budget, Max Hubs)
    O->>M: Query ML Model (Live Scoring)
    M->>O: Yield Probability Scores
    O->>F: Optimal Hub Selection (Live Strategic Plan)
```

---

## 🚀 Key Features

- **Multi-City Support**: Dynamic grid generation and model scoring for Delhi, Jaipur, Kolkata, Indore, and Jalandhar.
- **High-Fidelity UI**: A modern, glassmorphic React SPA with fluid animations and interactive map visualizations.
- **ML Interpretability**: Full SHAP explanations for every prediction, identifying the top drivers of profitability.
- **Strategic Optimization**: Solve complex hub-placement problems under business constraints in real-time.
- **Financial ROI Modeling**: Synthesizes setup cost (CAPEX) per cell dynamically based on property metrics like population density and commercial activity (road density) to frame decisions in INR.
- **Live Monitoring**: Real-time status tracking for model caching and system health.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Core** | Python 3.9+, HTML5, TypeScript |
| **Backend** | FastAPI, Uvicorn, Pydantic |
| **Machine Learning** | LightGBM, Geographically Weighted Regression (MGWR), SHAP, Scikit-learn |
| **Spatial Processing** | GeoPandas, Shapely, PySal, WorldPop |
| **Optimization** | PuLP (Binary Integer Programming), Thompson Sampling |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, Leaflet, Recharts |

---

## 🏗️ Getting Started

### 1. Install Dependencies

```bash
cd X-Pand
pip install -r requirements.txt
cd frontend
npm install
```

### 2. Start the Backend Server

```bash
# Return to root directory
cd ..
python -m uvicorn api.main:app --port 8000 --reload
```

### 3. Launch the React Dashboard

```bash
cd frontend
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173).

---

## 📂 Project Structure

```
X-Pand/
├── api/                # FastAPI application & model loaders
├── data/
│   ├── raw/            # Delivery zones & demographics
│   └── processed/      # Grid GeoJSON & feature pickles
├── frontend/           # Modern React/Vite SPA
│   ├── src/components/ # Reusable UI & Map components
│   └── src/pages/      # Dashboard and Home views
├── models/             # Serialized LightGBM & GWR models
├── src/                # Core ML pipeline & optimization logic
│   ├── bip_optimizer.py
│   ├── city_grids.py
│   ├── lgbm_model.py
│   └── explainer.py
├── notebooks/          # Data preparation & training walkthroughs
└── README.md
```

---

## 🏆 Performance Targets

| Metric | Target |
|--------|--------|
| **F1-Score** | > 0.80 on held-out test set |
| **Batch Scoring** | 10,000 grid cells scored in < 5 minutes |
| **BIP Optimization** | Optimal hub selection computed in < 60 seconds |
| **Interpretability** | Full SHAP explanations for every prediction |

---

Developed by the X-Pand Engineering Team.
