# core/logger.py
# -----------------
import logging
import os
from datetime import datetime
from collections import deque
from config import MESSAGE_BUFFER_SIZE

# Ensure log directory
os.makedirs("logs", exist_ok=True)

# Configure root logger
logging.basicConfig(
    filename="logs/conversation.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s",
    encoding="utf-8"
)
logger = logging.getLogger()

# In-memory buffer
log_history = deque(maxlen=MESSAGE_BUFFER_SIZE)

def log_interaction(user_input: str, agent_name: str, response: str, response_time: float):
    """
    Append to in-memory log and overwrite the file with the last N entries.
    """
    entry = (
        f"Time: {datetime.now().isoformat()}\n"
        f"User: {user_input}\n"
        f"{agent_name}: {response}\n"
        f"Response Time: {response_time:.2f}s\n"
        "----------------------------------------"
    )
    log_history.append(entry)
    logger.info(entry)

    # Flush to disk
    with open("logs/conversation.log", "w", encoding="utf-8") as f:
        f.write("\n".join(log_history))

def clear_log():
    """Wipe both in-memory and disk logs."""
    log_history.clear()
    with open("logs/conversation.log", "w", encoding="utf-8") as f:
        f.write("")
