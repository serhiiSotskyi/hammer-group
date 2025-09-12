import json
import os

from services.llm_service import call_llm
from core.logger            import log_interaction
from services.email_service import EmailService
from ui.context_handler     import ConversationContext
from services.prompt_builder import build_prompt

# Rule‐based cues for “send me the CVs”
END_SUGGEST_TRIGGERS = {"yes", "please send", "send", "email", "okay", "sure"}
# Cues for “book an interview”
BOOKING_TRIGGERS = {"interview", "schedule", "book", "portal"}

SCHOOL_TYPES = ["Primary", "Secondary", "SEND", "Nursery", "Other"]
FTE_OPTIONS  = ["Full-time", "Part-time"]

class SchoolBot:
    def __init__(self,
                 memory_manager,
                 context: ConversationContext,
                 email_service: EmailService=None):
        self.memory_manager = memory_manager
        self.context        = context
        self.email_service  = email_service or EmailService()

    def generate_response(self, user_input: str, smart_mode: bool=False):
        log_interaction(user_input, "SchoolBot", "", 0.0)
        txt = user_input.strip()
        self.memory_manager.add_user_message(txt)
        ctx = self.context.data

        # 1) Onboarding questions (name → postcode → email → phone)
        if not ctx.get("script_complete", False):
            reply = self._handle_onboarding(txt)

        # 2) Requirements (start date → contract length → suggestions)
        elif not ctx.get("requirements_captured", False):
            reply = self._handle_requirements(txt)

        # 3) Send out 3 candidate profiles
        elif not ctx.get("suggestions_sent", False):
            reply = self._handle_suggestions()

        # 4) Before final_closed: handle CV-email or booking triggers
        elif not ctx.get("final_closed", False):
            lower = txt.lower()
            if any(trigger in lower for trigger in END_SUGGEST_TRIGGERS):
                reply = self._send_candidate_email()
            elif any(trigger in lower for trigger in BOOKING_TRIGGERS):
                reply = self._send_booking_portal()
            else:
                reply = call_llm(
                    build_prompt("school", ctx),
                    self.memory_manager.get_last_messages(),
                    txt
                )
        else:
            # 5) Ongoing Q&A
            reply = call_llm(
                build_prompt("school", ctx),
                self.memory_manager.get_last_messages(),
                txt
            )

        self.memory_manager.add_assistant_message(reply)
        log_interaction(user_input, "SchoolBot", reply, 0.0)
        return reply, None, None

    def _handle_onboarding(self, txt: str) -> str:
        ctx = self.context.data
        # 1) School name
        if not ctx.get("school_name"):
            if txt.lower() in ("start", ""):
                return "🤖 What is your school's name?"
            self.context.update("school_name", txt)
            return "🤖 What is your school's postcode? 📍"

        # 2) Postcode
        if not ctx.get("school_postcode"):
            self.context.update("school_postcode", txt.upper())
            return "🤖 And your best email address? ✉️"

        # 3) Email
        if not ctx.get("school_email"):
            self.context.update("school_email", txt)
            return "🤖 Finally, your phone number? 📱"

        # 4) Phone → finish onboarding
        self.context.update("school_phone", txt)
        self.context.update("script_complete", True)
        return "✅ Thanks! I have your school details.\n\nWhen do you need this role to start?"

    def _handle_requirements(self, txt: str) -> str:
        ctx = self.context.data

        # 1) Start date
        if not ctx.get("start_date"):
            self.context.update("start_date", txt)
            return "🤖 And how long do you need the contract for? (e.g. 6 months, permanent)"

        # 2) Contract length → suggestions
        self.context.update("contract_length", txt)
        self.context.update("requirements_captured", True)
        return self._handle_suggestions()

    def _handle_suggestions(self) -> str:
        prompt_text = (
            "Based on this school’s needs:\n"
            f"{self.context.dump_context()}\n\n"
            "Generate 3 brief candidate profiles (name + 2–3 bullet points each)."
        )
        profiles = call_llm(
            build_prompt("school", self.context.data),
            self.memory_manager.get_last_messages(),
            prompt_text
        ).strip()

        self.context.update("suggestions_sent", True)
        self.memory_manager.reset_stage_messages()

        return (
            "✅ Here are 3 candidates I’ve found:\n\n"
            f"{profiles}\n\n"
            "Would you like me to email you their full CVs? (type 'yes' or ask any questions)"
        )

    def _send_candidate_email(self) -> str:
        ctx = self.context.data
        summary = self.context.dump_context()
        path    = self.email_service.send_candidate_list(
                      ctx["school_email"], summary
                  )
        self.context.update("final_closed", True)

        return (
            "📧 Email sent!\n\n"
            f"You can view the shortlist here: {path}\n\n"
            "You can now select a candidate and book interviews directly "
            "via our portal. If you need anything else, just let me know!"
        )

    def _send_booking_portal(self) -> str:
        ctx = self.context.data
        # Send a booking‐portal email (reuse candidate list sender)
        summary = (
            "Interview booking requested for: " 
            f"{ctx.get('school_name','')} on {ctx.get('start_date','')}")
        path = self.email_service.send_candidate_list(
            ctx["school_email"], summary
        )
        self.context.update("final_closed", True)
        return (
            "📧 Interview‐portal email sent!"
            f"You can book your interview here: {path}"
            "Let me know if you need anything else."
        )
