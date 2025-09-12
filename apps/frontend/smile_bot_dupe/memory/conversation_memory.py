# memory/conversation_memory.py

from collections import deque
from llm.llm_service import call_gpt4

class ConversationMemory:
    def __init__(self, max_raw_messages=10):
        self.raw_messages = deque(maxlen=max_raw_messages)  # Holds most recent raw messages
        self.summary = ""  # LLM-generated summary of previous conversations

    def add_message(self, role, content):
        """Add a message to memory and maintain the summary buffer."""
        self.raw_messages.append({"role": role, "content": content})

    def get_context(self):
        """Return the current context combining summary and raw messages."""
        messages = []

        if self.summary:
            messages.append({"role": "system", "content": f"Conversation so far: {self.summary}"})

        messages.extend(list(self.raw_messages))
        return messages

    def summarize_old_messages(self):
        """Summarize old messages and clear the raw buffer."""
        if not self.raw_messages:
            return  # Nothing to summarize

        raw_text = "\n".join([f"{m['role']}: {m['content']}" for m in self.raw_messages])

        summary_prompt = (
            "You are a summarisation assistant. Read the following conversation and return a concise summary "
            "that preserves all important context, user needs, and decisions. Do not include greetings or small talk."
        )

        self.summary = call_gpt4(summary_prompt, raw_text).strip()
        self.raw_messages.clear()

    def reset(self):
        """Clear all memory."""
        self.raw_messages.clear()
        self.summary = ""
