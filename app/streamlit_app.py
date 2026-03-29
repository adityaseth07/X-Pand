"""
app/streamlit_app.py
=====================
Streamlit dashboard for the BI-101 Geospatial Profitability Predictor.

Refactored to match the "Tomato Intelligence BI-101" dark-mode UI design.
Features:
  - Multi-city support with city selector dropdown
  - Prediction Map with pydeck PolygonLayer (colored by p_profit)
  - Competitor overlay toggle (ScatterplotLayer from export.geojson)
  - Cell Detail tab with SHAP drivers, investment estimate, competition snapshot
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import geopandas as gpd
import numpy as np
import pandas as pd
import pydeck as pdk
import requests
import streamlit as st

# ──────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────

API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8000")
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "grid.geojson")
COMPETITORS_PKL_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "grid_with_competitors.pkl")
COMPETITORS_GEOJSON_PATH = os.path.join(PROJECT_ROOT, "data", "raw", "export.geojson")

st.set_page_config(
    page_title="X-Pand Profitability Predictor",
    page_icon="🗺️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────────────────────────────────
# Custom CSS for Tomato Intel UI
# ──────────────────────────────────────────────────────────────────────
CUSTOM_CSS = """
<style>
/* === FIX: Hide Streamlit default header & footer === */
header[data-testid="stHeader"] {
    background-color: #0b1120 !important;
    /* Make it blend with dark theme instead of white */
}
[data-testid="stHeader"] {
    background-color: #0b1120 !important;
}
/* Also target the toolbar/deploy area */
.stDeployButton, [data-testid="stToolbar"] {
    background-color: #0b1120 !important;
}
/* Ensure the top bar area matches dark theme */
header {
    background-color: #0b1120 !important;
}
/* Hide the Streamlit footer */
footer {
    display: none !important;
}
/* Remove any top padding that creates white space */
.stApp > header {
    background-color: #0b1120 !important;
}

/* Base Dark Theme */
[data-testid="stAppViewContainer"] {
    background-color: #0b1120;
    color: #e2e8f0;
}
[data-testid="stSidebar"] {
    background-color: #0f172a;
    border-right: 1px solid #1e293b;
}

/* Sidebar Titles */
.sidebar-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: -10px;
}
.sidebar-subtitle {
    font-size: 1.5rem;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: -10px;
}
.sidebar-link {
    font-size: 0.9rem;
    color: #38bdf8;
    margin-bottom: 2rem;
}
.sidebar-divider {
    border-bottom: 1px solid #1e293b;
    margin: 1.5rem 0;
}

/* System Status */
.status-dot {
    height: 8px;
    width: 8px;
    background-color: #10b981;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
}
.status-text {
    font-size: 0.85rem;
    color: #94a3b8;
}

/* Top Header */
.top-header-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
}
.top-header-subtitle {
    font-size: 0.85rem;
    color: #64748b;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

/* Metric Cards */
.metric-card {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    flex-direction: column;
}
.metric-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 5px;
}
.metric-value {
    font-size: 1.8rem;
    font-weight: 700;
}
.val-white { color: #ffffff; }
.val-green { color: #10b981; }
.val-yellow { color: #f59e0b; }
.val-red { color: #ef4444; }
.val-amber { color: #f59e0b; }

/* Legend */
.legend-container {
    display: flex;
    gap: 20px;
    align-items: center;
    font-size: 0.85rem;
    color: #94a3b8;
    margin-top: 15px;
    margin-bottom: 5px;
}
.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
}
.legend-dot-g { height: 10px; width: 10px; border-radius: 50%; background-color: #10b981; }
.legend-dot-y { height: 10px; width: 10px; border-radius: 50%; background-color: #f59e0b; }
.legend-dot-r { height: 10px; width: 10px; border-radius: 50%; background-color: #ef4444; }
.legend-dot-b { height: 12px; width: 12px; border-radius: 50%; background-color: #06b6d4; border: 2px solid #0b1120; }
.legend-dot-gold { height: 10px; width: 10px; border-radius: 50%; background-color: #ffc800; }

/* Override Tabs */
.stTabs [data-baseweb="tab-list"] {
    gap: 24px;
    background-color: transparent;
}
.stTabs [data-baseweb="tab"] {
    height: 50px;
    white-space: pre-wrap;
    background-color: transparent;
    border-radius: 0;
    color: #64748b;
    font-weight: 700;
    letter-spacing: 0.05em;
    font-size: 0.85rem;
}
.stTabs [aria-selected="true"] {
    color: #38bdf8 !important;
    border-bottom: 2px solid #38bdf8 !important;
}

/* Button override */
div.stButton > button:first-child {
    background-color: transparent;
    color: #38bdf8;
    border: 1px solid #38bdf8;
    border-radius: 4px;
    width: 100%;
    font-weight: 600;
    letter-spacing: 0.05em;
}
div.stButton > button:hover {
    background-color: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    border: 1px solid #38bdf8;
}

/* Result Card */
.result-card {
    border: 1px solid #10b981;
    border-radius: 8px;
    padding: 15px;
    margin-top: 15px;
    background-color: rgba(16, 185, 129, 0.05);
}
.result-title { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
.result-val { font-size: 1.5rem; font-weight: 700; color: #10b981; margin-bottom: 5px; }
.result-sub { font-size: 0.85rem; color: #94a3b8; }

/* Section header */
.section-header {
    font-size: 0.8rem;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 30px;
    margin-bottom: 15px;
}

/* City selector styling */
.city-selector-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 5px;
}
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# ──────────────────────────────────────────────────────────────────────
# City Configs (fallback if API is unreachable during city list fetch)
# ──────────────────────────────────────────────────────────────────────

CITY_CONFIGS_FALLBACK = {
    "delhi":     {"name": "Delhi NCR",  "map_center": {"lat": 28.65, "lon": 77.10},   "zoom": 10.2},
    "jaipur":    {"name": "Jaipur",     "map_center": {"lat": 26.90, "lon": 75.80},   "zoom": 11.5},
    "jalandhar": {"name": "Jalandhar",  "map_center": {"lat": 31.34, "lon": 75.575},  "zoom": 12.0},
    "kolkata":   {"name": "Kolkata",    "map_center": {"lat": 22.55, "lon": 88.365},  "zoom": 11.5},
    "indore":    {"name": "Indore",     "map_center": {"lat": 22.715, "lon": 75.85},  "zoom": 12.0},
}


@st.cache_data(ttl=300)
def fetch_cities():
    """Fetch available cities from the API."""
    try:
        resp = requests.get(f"{API_BASE}/cities", timeout=5)
        resp.raise_for_status()
        data = resp.json()
        cities = {}
        for c in data["cities"]:
            cities[c["key"]] = {
                "name": c["name"],
                "cell_count": c["cell_count"],
                "map_center": c["map_center"],
                "zoom": c["zoom"],
            }
        return cities
    except Exception:
        # Fallback to local config
        return CITY_CONFIGS_FALLBACK

@st.cache_data(ttl=3600, show_spinner=False)
def fetch_location_name(lat: float, lon: float):
    """
    Reverse geocode using backend's Nominatim /geocode endpoint.
    Responses are cached frontend-side for an hour to avoid rate-limits.
    """
    try:
        r = requests.get(f"{API_BASE}/geocode", params={"lat": lat, "lon": lon}, timeout=5)
        if r.status_code == 200:
            data = r.json()
            area = data.get("area_name", "Unknown Area")
            # Return area name explicitly, ensuring missing info doesn't break UI
            return area if area else "Unknown Location"
    except Exception:
        pass
    return "Location Unavailable"

# ──────────────────────────────────────────────────────────────────────
# Data Loading
# ──────────────────────────────────────────────────────────────────────

@st.cache_resource
def load_delhi_grid_geojson():
    """Load the Delhi grid GeoDataFrame with polygon coordinates for PolygonLayer."""
    try:
        if not os.path.exists(GRID_PATH):
            return None

        gdf = gpd.read_file(GRID_PATH)
        if "centroid_lat" not in gdf.columns:
            gdf["centroid_lat"] = gdf.geometry.centroid.y
        if "centroid_lon" not in gdf.columns:
            gdf["centroid_lon"] = gdf.geometry.centroid.x

        # Extract polygon coordinates for PyDeck PolygonLayer
        gdf["coordinates"] = gdf.geometry.apply(
            lambda geom: [list(c) for c in geom.exterior.coords]
        )
        return gdf
    except Exception as exc:
        st.error(f"Failed to load Delhi grid: {exc}")
        return None


@st.cache_resource
def build_city_grid_local(city_key):
    """
    Build grid locally using src/city_grids.py — no API call needed.
    This is instant and avoids the /grid endpoint timeout issue.
    Returns DataFrame with grid_id, centroid_lat, centroid_lon, coordinates.
    """
    try:
        from src.city_grids import build_city_grid
        gdf = build_city_grid(city_key)
        # gdf already has: grid_id, centroid_lat, centroid_lon, coordinates, geometry
        return gdf[["grid_id", "centroid_lat", "centroid_lon", "coordinates"]].copy()
    except Exception as exc:
        st.warning(f"Could not build grid for {city_key}: {exc}")
        return None


@st.cache_data
def load_competitors_geojson():
    """Load competitor restaurant locations from export.geojson."""
    try:
        if not os.path.exists(COMPETITORS_GEOJSON_PATH):
            return None
        comp_gdf = gpd.read_file(COMPETITORS_GEOJSON_PATH)
        comp_gdf = comp_gdf[comp_gdf.geometry.geom_type == "Point"].copy()
        comp_gdf["lon"] = comp_gdf.geometry.x
        comp_gdf["lat"] = comp_gdf.geometry.y
        comp_df = comp_gdf[["lon", "lat", "name", "cuisine"]].fillna("Unknown")
        return comp_df
    except Exception as exc:
        st.warning(f"Could not load competitor data: {exc}")
        return None


@st.cache_data
def load_grid_with_competitors():
    """Load the grid_with_competitors.pkl for cell-level competition data."""
    try:
        if not os.path.exists(COMPETITORS_PKL_PATH):
            return None
        df = pd.read_pickle(COMPETITORS_PKL_PATH)
        return df
    except Exception as exc:
        st.warning(f"Could not load grid_with_competitors.pkl: {exc}")
        return None


def fetch_predictions(locations_dict, city_key="delhi"):
    """Call POST /batch with every grid-cell centroid."""
    try:
        resp = requests.post(
            f"{API_BASE}/batch",
            json={"locations": locations_dict, "city": city_key},
            timeout=300,
        )
        resp.raise_for_status()
        return resp.json()["predictions"]
    except requests.exceptions.ConnectionError:
        st.sidebar.error(f"API unreachable ({API_BASE}). Start uvicorn.")
        st.stop()
    except Exception as exc:
        st.sidebar.error(f"Prediction error: {exc}")
        st.stop()


def load_grid_for_selected_city(city_key):
    """Load the appropriate grid data for the selected city."""
    if city_key == "delhi":
        gdf = load_delhi_grid_geojson()
        if gdf is not None:
            return gdf[["grid_id", "centroid_lat", "centroid_lon", "coordinates"]].copy()
        return None
    else:
        return build_city_grid_local(city_key)


# ──────────────────────────────────────────────────────────────────────
# Fetch cities and initialize
# ──────────────────────────────────────────────────────────────────────

cities_info = fetch_cities()
comp_df = load_competitors_geojson()
grid_comp_df = load_grid_with_competitors()


# ──────────────────────────────────────────────────────────────────────
# Sidebar Layout
# ──────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown('<div class="sidebar-title">X-Pand.AI</div>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-subtitle">BI-101</div>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-link">Geospatial Profitability</div>', unsafe_allow_html=True)

    st.markdown('<div class="sidebar-divider"></div>', unsafe_allow_html=True)

    # ── City Selector ─────────────────────────────────────────────────
    st.markdown('<div class="sidebar-title" style="margin-bottom: 15px;">CITY SELECTOR</div>', unsafe_allow_html=True)

    city_keys = list(cities_info.keys())
    city_labels = [cities_info[k]["name"] for k in city_keys]

    # Create a mapping for display
    city_display_map = {cities_info[k]["name"]: k for k in city_keys}

    selected_city_name = st.selectbox(
        "Choose a city",
        options=city_labels,
        index=0,
        label_visibility="collapsed",
    )
    selected_city = city_display_map[selected_city_name]

    # Show cell count if available
    city_meta = cities_info.get(selected_city, {})
    cell_count = city_meta.get("cell_count", "")
    if cell_count:
        st.markdown(f'<div class="status-text" style="margin-top: -10px;">📍 {cell_count:,} grid cells</div>', unsafe_allow_html=True)

    st.markdown('<div class="sidebar-divider"></div>', unsafe_allow_html=True)

    st.markdown('<div class="sidebar-title" style="margin-bottom: 15px;">OPTIMIZER CONTROLS</div>', unsafe_allow_html=True)

    min_prob = st.slider("MIN PROBABILITY", 0.0, 1.0, 0.50, 0.05)
    max_hubs = st.slider("MAX HUBS", 1, 50, 10)
    min_sep = st.slider("MIN SEPARATION KM", 0.5, 10.0, 2.0, 0.5)

    # ── Competitor toggle ─────────────────────────────────────────────
    st.markdown('<div class="sidebar-divider"></div>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-title" style="margin-bottom: 15px;">MAP OVERLAYS</div>', unsafe_allow_html=True)
    show_competitors = st.toggle("Show competitors", value=False, help="Overlay restaurant locations from OSM data")

    st.write("")  # spacer
    run_optimizer = st.button("RUN OPTIMIZER")

    if run_optimizer:
        with st.spinner("Optimizing..."):
            try:
                resp = requests.post(
                    f"{API_BASE}/optimize",
                    json={
                        "max_hubs": max_hubs,
                        "min_separation_km": min_sep,
                        "min_prob_threshold": min_prob,
                        "city": selected_city,
                    },
                    timeout=120,
                )
                resp.raise_for_status()
                res = resp.json()
                st.session_state["selected_hubs"] = res["selected_hubs"]
                st.session_state["opt_score"] = res["total_score"]
                st.session_state["sep_met"] = res["separation_constraint_met"]
                # Trigger a one-time API poll in the browser's Network tab
                st.session_state["poll_network_apis"] = True
            except Exception as exc:
                st.error(f"Optimizer failed: {exc}")

    # Display Last Result
    if "selected_hubs" in st.session_state:
        n_hubs = len(st.session_state["selected_hubs"])
        sc = st.session_state["opt_score"]
        sep_ok = "OK" if st.session_state.get("sep_met") else "VIOLATED"
        st.markdown(f"""
        <div class="result-card">
            <div class="result-title">LAST RESULT</div>
            <div class="result-val">{n_hubs} hubs</div>
            <div class="result-sub">Score: {sc:.4f}<br/>Separation: {sep_ok}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown('<div class="sidebar-divider" style="margin-top: 40px;"></div>', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-title" style="margin-bottom: 15px;">SYSTEM STATUS</div>', unsafe_allow_html=True)
    st.markdown('<div><span class="status-dot"></span><span class="status-text">API Connected</span></div>', unsafe_allow_html=True)
    st.markdown('<div><span class="status-dot"></span><span class="status-text">Models Loaded</span></div>', unsafe_allow_html=True)


# ──────────────────────────────────────────────────────────────────────
# Load grid & predictions for selected city
# ──────────────────────────────────────────────────────────────────────

grid_df = load_grid_for_selected_city(selected_city)

if grid_df is None:
    st.error(f"Could not load grid for {selected_city_name}. Ensure the backend is running.")
    st.stop()

# Clear predictions cache when city changes
if st.session_state.get("_current_city") != selected_city:
    st.session_state.pop("predictions", None)
    st.session_state.pop("locs_payload", None)
    st.session_state.pop("selected_hubs", None)
    st.session_state["_current_city"] = selected_city

# Build location payload
if "locs_payload" not in st.session_state:
    _payload_df = grid_df[["grid_id", "centroid_lat", "centroid_lon"]].copy()
    _payload_df = _payload_df.rename(columns={"centroid_lat": "lat", "centroid_lon": "lon"})
    _payload_df["grid_id"] = _payload_df["grid_id"].astype(str)
    _payload_df["lat"] = _payload_df["lat"].astype(float)
    _payload_df["lon"] = _payload_df["lon"].astype(float)
    st.session_state["locs_payload"] = _payload_df.to_dict(orient="records")

if "predictions" not in st.session_state:
    with st.spinner(f"Scoring {selected_city_name} grid cells..."):
        st.session_state["predictions"] = fetch_predictions(
            st.session_state["locs_payload"], city_key=selected_city
        )

predictions = st.session_state["predictions"]

# Get map view config for selected city
city_cfg = cities_info.get(selected_city, CITY_CONFIGS_FALLBACK.get(selected_city, {}))
map_center = city_cfg.get("map_center", {"lat": 28.65, "lon": 77.10})
map_zoom = city_cfg.get("zoom", 10.2)


# ──────────────────────────────────────────────────────────────────────
# Main Layout - Header & Tabs
# ──────────────────────────────────────────────────────────────────────

# Convert predictions to DF and join with coordinates
pred_df = pd.DataFrame(predictions)
merged_df = pred_df.merge(
    grid_df[["grid_id", "coordinates"]],
    on="grid_id",
    how="inner",
)

h_cnt = int((merged_df["p_profit"] > 0.7).sum())
m_cnt = int(((merged_df["p_profit"] >= 0.4) & (merged_df["p_profit"] <= 0.7)).sum())
s_cnt = int((merged_df["p_profit"] < 0.4).sum())
t_cnt = len(merged_df)

def render_cell_details(selected_id):
    cell_pred = next((p for p in predictions if p["grid_id"] == selected_id), None)

    if cell_pred:
        # Fetch actual area/location string via OSM Nominatim API
        area_name = fetch_location_name(cell_pred["lat"], cell_pred["lon"])
        
        st.markdown(
            f'''
            <div style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 20px; display: flex; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                <span style="color: #38bdf8; font-size: 1.2rem; margin-right: 8px;">📍</span> 
                <span style="font-weight: 500; letter-spacing: 0.02em;">{area_name.upper()}</span>
                <span style="margin-left: 10px; font-size: 0.8rem; opacity: 0.6;">({cell_pred["lat"]:.4f}, {cell_pred["lon"]:.4f})</span>
            </div>
            ''', 
            unsafe_allow_html=True
        )

        mcol1, mcol2, mcol3, mcol4, mcol5 = st.columns(5)

        p_pct = f"{cell_pred['p_profit'] * 100:.1f}%"
        mcol1.markdown(f'<div class="metric-card"><div class="metric-title">P(PROFIT)</div><div class="metric-value val-white">{p_pct}</div></div>', unsafe_allow_html=True)

        ci_lo = cell_pred.get("ci_lower")
        lo_str = f"{ci_lo:.3f}" if ci_lo is not None else "N/A"
        mcol2.markdown(f'<div class="metric-card"><div class="metric-title">CI LOWER</div><div class="metric-value val-white">{lo_str}</div></div>', unsafe_allow_html=True)

        ci_hi = cell_pred.get("ci_upper")
        hi_str = f"{ci_hi:.3f}" if ci_hi is not None else "N/A"
        mcol3.markdown(f'<div class="metric-card"><div class="metric-title">CI UPPER</div><div class="metric-value val-white">{hi_str}</div></div>', unsafe_allow_html=True)

        rec = cell_pred["recommendation"].upper()
        rc_color = "val-green" if rec == "OPEN" else "val-yellow" if rec == "MONITOR" else "val-red"
        mcol4.markdown(f'<div class="metric-card"><div class="metric-title">STATUS</div><div class="metric-value {rc_color}">{rec}</div></div>', unsafe_allow_html=True)

        cld = "YES" if cell_pred["is_cold_start"] else "NO"
        cld_color = "val-red" if cld == "YES" else "val-white"
        mcol5.markdown(f'<div class="metric-card"><div class="metric-title">COLD START</div><div class="metric-value {cld_color}">{cld}</div></div>', unsafe_allow_html=True)

        # ── SHAP Drivers ──────────────────────────────────────────────
        st.markdown('<div class="section-header">TOP FEATURE IMPACTS (SHAP)</div>', unsafe_allow_html=True)

        drivers = cell_pred.get("shap_drivers", [])
        if not drivers and not cell_pred["is_cold_start"]:
            with st.spinner("Analyzing ML drivers..."):
                try:
                    r = requests.post(
                        f"{API_BASE}/predict",
                        json={
                            "locations": [{"lat": cell_pred["lat"], "lon": cell_pred["lon"], "grid_id": selected_id}],
                            "city": selected_city,
                        },
                        timeout=15,
                    )
                    if r.status_code == 200:
                        drivers = r.json()["predictions"][0].get("shap_drivers", [])
                except Exception:
                    pass

        if drivers:
            driver_df = pd.DataFrame(drivers[:5]).set_index("feature")
            st.bar_chart(driver_df["impact"], color="#38bdf8")
        else:
            st.info("No SHAP drivers available (cold-start cells use Thompson Sampling).")

        # ──────────────────────────────────────────────────────────────
        # Investment Estimate
        # ──────────────────────────────────────────────────────────────
        st.markdown('<div class="section-header">INVESTMENT ESTIMATE</div>', unsafe_allow_html=True)

        # Look up cell data from grid_with_competitors.pkl (Delhi only)
        cell_comp_data = None
        if grid_comp_df is not None:
            cell_match = grid_comp_df[grid_comp_df["grid_id"] == selected_id]
            if not cell_match.empty:
                cell_comp_data = cell_match.iloc[0]

        # Get market_saturation and pop_density
        market_saturation = float(cell_comp_data["market_saturation"]) if cell_comp_data is not None and "market_saturation" in cell_comp_data.index else 0.0
        pop_density = float(cell_comp_data["pop_density"]) if cell_comp_data is not None and "pop_density" in cell_comp_data.index else 0.0

        cost_proxy = int(
            (market_saturation * 80000)
            + ((pop_density / 10000) * 40000)
            + 15000
        )

        p_profit = cell_pred["p_profit"]

        # Investment tier
        if cost_proxy < 40000:
            inv_tier = "Low"
            tier_color = "val-green"
        elif cost_proxy <= 80000:
            inv_tier = "Medium"
            tier_color = "val-amber"
        else:
            inv_tier = "High"
            tier_color = "val-red"

        # Cost per profit point
        cost_per_profit = cost_proxy / max(p_profit, 0.01)

        inv1, inv2, inv3 = st.columns(3)
        inv1.markdown(f'<div class="metric-card"><div class="metric-title">EST. MONTHLY COST (PROXY)</div><div class="metric-value val-white">₹{cost_proxy:,}</div></div>', unsafe_allow_html=True)
        inv2.markdown(f'<div class="metric-card"><div class="metric-title">INVESTMENT TIER</div><div class="metric-value {tier_color}">{inv_tier}</div></div>', unsafe_allow_html=True)
        inv3.markdown(f'<div class="metric-card"><div class="metric-title">COST PER PROFIT POINT</div><div class="metric-value val-white">₹{cost_per_profit:,.0f}</div></div>', unsafe_allow_html=True)

        st.caption("⚠️ Cost estimate is a proxy based on market saturation and population density. Integrate real property data for production use.")

        # ──────────────────────────────────────────────────────────────
        # Competition Snapshot
        # ──────────────────────────────────────────────────────────────
        st.markdown('<div class="section-header">COMPETITION SNAPSHOT</div>', unsafe_allow_html=True)

        if cell_comp_data is not None:
            comp_count = cell_comp_data.get("competitor_count", "N/A") if cell_comp_data is not None else "N/A"
            comp_density_1km = cell_comp_data.get("competitor_density_1km", "N/A") if cell_comp_data is not None else "N/A"
            nearest_km = cell_comp_data.get("nearest_competitor_km", None) if cell_comp_data is not None else None
            mkt_sat = cell_comp_data.get("market_saturation", None) if cell_comp_data is not None else None

            nearest_str = f"{nearest_km:.2f} km" if nearest_km is not None and not pd.isna(nearest_km) else "N/A"
            mkt_sat_str = f"{mkt_sat:.2f}" if mkt_sat is not None and not pd.isna(mkt_sat) else "N/A"

            cs1, cs2, cs3, cs4 = st.columns(4)
            cs1.markdown(f'<div class="metric-card"><div class="metric-title">COMPETITORS (500M)</div><div class="metric-value val-white">{comp_count}</div></div>', unsafe_allow_html=True)
            cs2.markdown(f'<div class="metric-card"><div class="metric-title">COMPETITORS (1KM)</div><div class="metric-value val-white">{comp_density_1km}</div></div>', unsafe_allow_html=True)
            cs3.markdown(f'<div class="metric-card"><div class="metric-title">NEAREST COMPETITOR</div><div class="metric-value val-white">{nearest_str}</div></div>', unsafe_allow_html=True)
            cs4.markdown(f'<div class="metric-card"><div class="metric-title">MARKET SATURATION</div><div class="metric-value val-white">{mkt_sat_str}</div></div>', unsafe_allow_html=True)

            # Verdict
            if mkt_sat is not None and not pd.isna(mkt_sat):
                if mkt_sat < 0.3:
                    st.success("🟢 Underserved area — low competition")
                elif mkt_sat <= 0.6:
                    st.warning("🟡 Moderate competition")
                else:
                    st.error("🔴 Saturated market — high competition")
            else:
                st.info("Market saturation data not available for this cell.")
        else:
            if selected_city != "delhi":
                st.info(f"Detailed competition data is available for Delhi only. {selected_city_name} uses synthetic features for scoring.")
            else:
                st.info("Competition data not available for this cell. Ensure grid_with_competitors.pkl is present.")

tab1, tab2 = st.tabs(["PREDICTION MAP", "CELL DETAIL"])

with tab1:
    # ── Header row
    col_t1, col_t2 = st.columns([1, 1])
    with col_t1:
        st.markdown('<div class="top-header-title">Profitability<br/>Prediction Map</div>', unsafe_allow_html=True)
    with col_t2:
        st.markdown(f'<div class="top-header-subtitle" style="text-align: right; margin-top: 25px;">{selected_city_name.upper()} — 500M GRID</div>', unsafe_allow_html=True)

    # ── Metrics row
    c1, c2, c3, c4 = st.columns(4)
    c1.markdown(f'<div class="metric-card"><div class="metric-title">TOTAL CELLS</div><div class="metric-value val-white">{t_cnt:,}</div></div>', unsafe_allow_html=True)
    c2.markdown(f'<div class="metric-card"><div class="metric-title">HIGH POTENTIAL</div><div class="metric-value val-green">{h_cnt:,}</div></div>', unsafe_allow_html=True)
    c3.markdown(f'<div class="metric-card"><div class="metric-title">MONITOR</div><div class="metric-value val-yellow">{m_cnt:,}</div></div>', unsafe_allow_html=True)
    c4.markdown(f'<div class="metric-card"><div class="metric-title">SKIP</div><div class="metric-value val-red">{s_cnt:,}</div></div>', unsafe_allow_html=True)

    # ── Legend row
    legend_html = """
    <div class="legend-container">
        <div style="margin-right: 10px; letter-spacing: 0.05em; transform: scale(0.9);">LEGEND</div>
        <div class="legend-item"><span class="legend-dot-g"></span> High &gt; 0.7</div>
        <div class="legend-item"><span class="legend-dot-y"></span> Monitor 0.4–0.7</div>
        <div class="legend-item"><span class="legend-dot-r"></span> Skip &lt; 0.4</div>
        <div class="legend-item"><span class="legend-dot-b"></span> Selected hub</div>
    """
    if show_competitors:
        legend_html += '    <div class="legend-item"><span class="legend-dot-gold"></span> Competitor</div>\n'
    legend_html += "</div>"
    st.markdown(legend_html, unsafe_allow_html=True)

    # ── Map
    def _color_for_p(p):
        if p > 0.7:
            return [16, 185, 129]   # Green
        if p >= 0.4:
            return [245, 158, 11]   # Yellow/Orange
        return [239, 68, 68]        # Red

    merged_df["fill_color"] = merged_df["p_profit"].apply(_color_for_p)
    merged_df["p_profit_fmt"] = merged_df["p_profit"].apply(lambda p: f"{p*100:.1f}%")

    grid_layer = pdk.Layer(
        "PolygonLayer",
        data=merged_df,
        get_polygon="coordinates",
        get_fill_color="fill_color",
        get_line_color=[30, 41, 59, 200],
        line_width_min_pixels=1,
        stroked=True,
        filled=True,
        extruded=False,
        pickable=True,
        opacity=0.85,
        id="grid_layer",
    )

    layers = [grid_layer]

    # Hub overlay
    if "selected_hubs" in st.session_state:
        hub_ids = set(st.session_state["selected_hubs"])
        hub_df = merged_df[merged_df["grid_id"].isin(hub_ids)].copy()

        hub_layer = pdk.Layer(
            "ScatterplotLayer",
            data=hub_df,
            get_position=["lon", "lat"],
            get_radius=550,
            get_fill_color=[6, 182, 212],  # Cyan
            pickable=False,
            opacity=1.0,
            id="hub_layer",
        )
        layers.append(hub_layer)

    # Competitor overlay layer
    if show_competitors and comp_df is not None:
        competitor_layer = pdk.Layer(
            "ScatterplotLayer",
            data=comp_df,
            get_position=["lon", "lat"],
            get_radius=80,
            get_fill_color=[255, 200, 0, 160],
            pickable=True,
            id="competitor_layer",
        )
        layers.append(competitor_layer)

    tooltip = {
        "html": "<b>Grid Cell:</b> {grid_id}<br/><b>P(profit):</b> {p_profit_fmt}<br/><b>Status:</b> {recommendation}",
        "style": {
            "backgroundColor": "#0f172a",
            "color": "#e2e8f0",
            "border": "1px solid #1e293b",
            "fontSize": "13px",
            "fontFamily": "sans-serif",
            "padding": "10px",
            "borderRadius": "6px"
        },
    }

    # Dynamic map center based on selected city
    view = pdk.ViewState(
        longitude=map_center["lon"],
        latitude=map_center["lat"],
        zoom=map_zoom,
        pitch=0,
    )

    deck = pdk.Deck(
        layers=layers,
        initial_view_state=view,
        tooltip=tooltip,
        map_style=pdk.map_styles.DARK,
        map_provider="carto"
    )

    event = st.pydeck_chart(
        deck, 
        width="stretch", 
        on_select="rerun", 
        selection_mode="single-object"
    )

    # If user clicks a grid cell on map, open details inline
    selected_grid_id_map = None
    if event and event.selection and "objects" in event.selection:
        if "grid_layer" in event.selection["objects"] and len(event.selection["objects"]["grid_layer"]) > 0:
            selected_grid_data = event.selection["objects"]["grid_layer"][0]
            if "grid_id" in selected_grid_data:
                selected_grid_id_map = selected_grid_data["grid_id"]
                # Sync logic with tab2 selectbox
                st.session_state["synced_grid_id"] = selected_grid_id_map

    if selected_grid_id_map:
        st.markdown('<div class="section-header">SELECTED CELL DETAILS</div>', unsafe_allow_html=True)
        render_cell_details(selected_grid_id_map)




with tab2:
    st.markdown(f'<div class="top-header-title" style="margin-bottom: 20px;">Grid Cell Detail — {selected_city_name}</div>', unsafe_allow_html=True)

    grid_ids = sorted([p["grid_id"] for p in predictions])
    
    # Sync with map click if present
    default_index = 0
    if "synced_grid_id" in st.session_state and st.session_state["synced_grid_id"] in grid_ids:
        default_index = grid_ids.index(st.session_state["synced_grid_id"])
        
    selected_id = st.selectbox("Select Grid Cell Identifier", options=grid_ids, index=default_index)

    render_cell_details(selected_id)

# ──────────────────────────────────────────────────────────────────────
# Network Tab API Poller (for DevTools visibility)
# ──────────────────────────────────────────────────────────────────────

# Fire a single background fetch for these APIs only when requested 
# (e.g., after the "RUN OPTIMIZER" button is clicked) to avoid endless polling.
if st.session_state.get("poll_network_apis", False):
    poll_script = f"""
    <script>
        const baseUrl = '{API_BASE}';
        
        async function fetchAndLog(url) {{
            try {{
                const response = await fetch(url, {{ mode: 'cors' }});
                if (!response.ok) throw new Error(`HTTP error! status: ${{response.status}}`);
                const data = await response.json();
                console.log(`[Network poll] ${{url.split('/').pop()}} response:`, data);
            }} catch (error) {{
                console.error(`[Network poll] ${{url.split('/').pop()}} error:`, error);
            }}
        }}
        
        async function pollApis() {{
            await fetchAndLog(`${{baseUrl}}/last_result`);
            await fetchAndLog(`${{baseUrl}}/top_n`);
            await fetchAndLog(`${{baseUrl}}/cache`);
        }}
        
        // Execute exactly once per trigger
        pollApis();
    </script>
    """
    import streamlit.components.v1 as components
    components.html(poll_script, height=0, width=0)
    
    # Reset the flag so it doesn't fire on subsequent dashboard clicks
    st.session_state["poll_network_apis"] = False
