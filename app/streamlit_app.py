import streamlit as st
import streamlit.components.v1 as components
import os

# ──────────────────────────────────────────────────────────────────────
# Fullscreen Wrapper for the pure HTML/JS Application
# ──────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="X-Pand.AI — Geospatial Hub Intelligence",
    page_icon="⬡",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Force Streamlit to act as an invisible, fullscreen host
st.markdown("""
<style>
    /* 1. Remove padding from the main central container */
    .block-container {
        padding-top: 0rem !important;
        padding-bottom: 0rem !important;
        padding-left: 0rem !important;
        padding-right: 0rem !important;
        max-width: 100% !important;
        overflow: hidden !important;
    }
    
    /* 2. Hide Streamlit top header completely */
    header[data-testid="stHeader"] {
        display: none !important;
        visibility: hidden !important;
        height: 0px !important;
    }
    
    /* 3. Hide Streamlit footer */
    footer {
        display: none !important;
    }
    
    /* 4. Disable body scrolling to let maplibre handle it */
    body {
        overflow: hidden !important;
        margin: 0;
        padding: 0;
    }
    
    /* 5. Force the iframe injected by components.html to fill the screen */
    iframe[title="streamlit_components.v1.html"] {
        width: 100vw !important;
        height: 100vh !important;
        border: none !important;
        display: block;
    }
</style>
""", unsafe_allow_html=True)

try:
    # Read the custom standalone Web App component
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html_code = f.read()
        
    # Render the HTML. The CSS above will expand it to 100vh.
    # Height parameter is ignored by CSS override, but Streamlit expects one.
    components.html(html_code, height=900, scrolling=False)
    
except Exception as e:
    st.error(f"Failed to load user interface: {e}")
