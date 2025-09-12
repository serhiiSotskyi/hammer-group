# config.py

import os

# 1) Load local .env if present (dev)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 2) Get from environment
api_key = os.getenv("OPENAI_API_KEY")

# 3) Try Streamlit secrets (if running under Streamlit)
try:
    import streamlit as st
    try:
        secret_key = st.secrets.get("OPENAI_API_KEY")
    except Exception:
        secret_key = None
    if secret_key:
        api_key = secret_key
except Exception:
    # Not running in Streamlit or no secrets → ignore
    pass

if not api_key:
    raise ValueError(
        "❌ Missing OpenAI API Key! Set OPENAI_API_KEY in your environment "
        "or in .streamlit/secrets.toml."
    )

OPENAI_API_KEY = api_key
MESSAGE_BUFFER_SIZE = 10
