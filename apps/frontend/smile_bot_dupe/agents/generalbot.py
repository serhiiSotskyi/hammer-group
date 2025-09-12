from services.llm_service import call_llm
from core.logger            import log_interaction
from ui.context_handler     import ConversationContext

class GeneralBot:
    def __init__(self, memory_manager, system_prompt: str, context: ConversationContext):
        self.memory_manager = memory_manager
        self.system_prompt  = system_prompt
        self.context        = context
        self._greeted       = False

    def generate_response(self, user_input: str, smart_mode: bool=False):
        log_interaction(user_input, "GeneralBot", "", 0.0)
        txt = user_input.strip()
        ctx = self.context.data

        # 1) First turn: greeting & triage
        if not self._greeted:
            self._greeted = True
            reply = (
                "👋 Hi there! Are you here to:\n"
                "  1. Find a teaching job\n"
                "  2. Recruit staff for your school\n"
                "Or ask me anything about how Smile Education works."
            )

        # 2) Triage to CandidateBot
        elif txt.lower() in ("1", "find job", "find a job", "job", "looking for work"):
            ctx["user_type"] = "candidate"
            reply = (
                "Great — I'll connect you to our candidate flow. "
                "Please restart and type 'start' to begin."
            )

        # 3) Triage to SchoolBot
        elif txt.lower() in ("2", "recruit staff", "recruit", "staff", "looking to recruit"):
            ctx["user_type"] = "school"
            reply = (
                "Excellent — I'll connect you to our school recruitment flow. "
                "Please restart and type 'start' to begin."
            )

        # 4) Free-form Q&A via LLM
        else:
            reply = call_llm(
                self.system_prompt,
                self.memory_manager.get_last_messages(),
                txt
            )

        log_interaction(user_input, "GeneralBot", reply, 0.0)
        return reply, None, None
