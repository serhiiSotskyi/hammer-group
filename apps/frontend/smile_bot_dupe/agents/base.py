from abc import ABC, abstractmethod

class BaseAgent(ABC):
    def __init__(self, conversation_manager):
        self.conversation_manager = conversation_manager

    @abstractmethod
    def generate_response(self, user_input: str, smart_mode: bool):
        pass
