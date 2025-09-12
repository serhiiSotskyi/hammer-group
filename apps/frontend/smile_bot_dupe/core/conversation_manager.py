# core/conversation_manager.py

from config import MESSAGE_BUFFER_SIZE

class ConversationManager:
    """
    Keeps the last MESSAGE_BUFFER_SIZE messages for LLM context,
    and separately tracks all user inputs for the current stage.
    """
    def __init__(self):
        self.messages            = []
        self.stage_user_messages = []

    def add_user_message(self, text: str):
        self.messages.append({"role": "user", "content": text})
        self.stage_user_messages.append(text)
        self._trim()

    def add_assistant_message(self, text: str):
        self.messages.append({"role": "assistant", "content": text})
        self._trim()

    def _trim(self):
        if len(self.messages) > MESSAGE_BUFFER_SIZE:
            self.messages = self.messages[-MESSAGE_BUFFER_SIZE:]

    def get_last_messages(self):
        return list(self.messages)

    def get_stage_messages(self):
        return list(self.stage_user_messages)

    def reset_stage_messages(self):
        self.stage_user_messages = []
