import json
import os

from services.llm_service import call_llm
from core.logger import log_interaction
from services.email_service import EmailService
from ui.context_handler import ConversationContext

# Triggers that *might* indicate “done” — fast path
END_DOC_TRIGGERS = {
    "i'm done", "done",
    "no more", "no more questions",
    "no questions",
    "thanks", "thank you"
}

# Words that typically start a question
QUESTION_WORDS = {
    "what", "how", "when", "where", "why", "who",
    "is", "are", "can", "could", "would", "should"
}

class CandidateBot:
    def __init__(
        self,
        memory_manager,
        system_prompt: str,
        context: ConversationContext,
        email_service: EmailService = None
    ):
        self.memory_manager = memory_manager
        self.system_prompt   = system_prompt
        self.context         = context
        self.email_service   = email_service or EmailService()

    def generate_response(self, user_input: str, smart_mode: bool=False):
        # Log the incoming user message
        log_interaction(user_input, "CandidateBot", "", 0.0)

        txt = user_input.strip()
        ctx = self.context.data

        # ─── Stage 1: Onboarding ───────────────────────
        if not ctx["script_complete"]:
            reply = self._handle_onboarding(txt)

        # ─── Stage 2: Documents Q&A & Email send ───────
        elif not ctx["final_upload_email_sent"]:
            reply = self._handle_document_stage(txt)

        # ─── Stage 3: Post-email Q&A & Close ──────────
        else:
            if txt.lower() in END_DOC_TRIGGERS:
                # Final closing via LLM
                closing = call_llm(
                    self.system_prompt,
                    self.memory_manager.get_last_messages(),
                    "Write a warm closing message summarising next steps."
                )
                # Persist final summary
                os.makedirs("summaries", exist_ok=True)
                fname = ctx["email"].lower().replace(" ", "_")
                with open(f"summaries/{fname}_summary.json", "w") as f:
                    json.dump({"context": ctx, "closing_message": closing}, f, indent=2)

                reply = closing + "\n\nThank you for choosing Smile Education. Goodbye!"
            else:
                # Any other follow-up: open LLM Q&A
                reply = call_llm(
                    self.system_prompt,
                    self.memory_manager.get_last_messages(),
                    txt
                )

        # Log and return
        log_interaction(user_input, "CandidateBot", reply, 0.0)
        return reply, None, None


    def _handle_onboarding(self, txt: str) -> str:
        """
        1) start→ask name
        2) name→ask email
        3) email→ask phone
        4) phone→ask postcode
        5) postcode→complete onboarding + show full docs checklist
        """
        ctx = self.context.data

        # 1) Name
        if ctx["name"] is None:
            if txt.lower() == "start" or not txt:
                return "🤖 Please tell me your full name."
            self.context.update("name", txt)
            return "🤖 What’s your email address?"

        # 2) Email
        if ctx["email"] is None:
            self.context.update("email", txt)
            return "🤖 What’s the best phone number to reach you on?"

        # 3) Phone
        if ctx["phone"] is None:
            self.context.update("phone", txt)
            return "🤖 What’s your postcode?"

        # 4) Postcode → finish onboarding
        self.context.update("postcode", txt.upper())
        self.context.update("script_complete", True)

        # Integrated first docs prompt
        return (
            "✅ Thanks! Your personal details are saved.\n\n"
            "📑 To complete your registration, you'll need:\n"
            "- Proof of Identity (e.g. passport/driver’s licence)\n"
            "- Proof of Address (bank statement/utility bill)\n"
            "- Qualification Certificates (e.g. diploma)\n"
            "- DBS Check (required for working with children)\n\n"
            f"We will send an email to {ctx['email']} with a secure upload form. "
            "We can handle the DBS check ourselves once you upload the rest.\n\n"
            "Do you have any questions about any of these, or shall I send it now?"
        )


    def _handle_document_stage(self, txt: str) -> str:
        """
        Hybrid logic for the documents stage:
        1) Rule-based done?
        2) Question detection -> LLM answer
        3) LLM classify done?
        4) Otherwise, LLM generic guidance
        """
        ctx = self.context.data
        lower = txt.lower()

        # 1) Fast rule-based done
        if lower in END_DOC_TRIGGERS:
            return self._send_email_and_summary()

        # 2) If it looks like a question
        first = lower.split()[0] if lower.split() else ""
        if txt.endswith("?") or first in QUESTION_WORDS:
            return call_llm(
                self.system_prompt,
                self.memory_manager.get_last_messages(),
                f"A candidate asked about documents:\n\"{txt}\"\n\n"
                "Please explain clearly what happens after they upload the documents."
            )

        # 3) Fallback: LLM classify readiness using full stage context
        classify_prompt = (
            "Based on the document-collection conversation so far:\n"
            + "\n".join(self.memory_manager.get_stage_messages())
            + "\n\nHas the user indicated they are done and ready to upload? Reply 'Yes' or 'No' only."
        )
        flag = call_llm(
            self.system_prompt,
            self.memory_manager.get_last_messages(),
            classify_prompt
        ).strip().lower()

        if flag.startswith("yes"):
            return self._send_email_and_summary()

        # 4) Generic guidance via LLM
        return call_llm(
            self.system_prompt,
            self.memory_manager.get_last_messages(),
            f"A candidate said:\n\"{txt}\"\n\n"
            "Provide guidance about these required documents."
        )


    def _send_email_and_summary(self) -> str:
        """
        Perform the email send and reset stage history.
        """
        ctx     = self.context.data
        summary = self.context.dump_context()
        link    = self.email_service.send_upload_form(ctx["email"], summary)

        self.context.update("documents_checked", True)
        self.context.update("final_upload_email_sent", True)
        self.memory_manager.reset_stage_messages()

        return (
            "Email Sent!\n\n"
            f"I’ve just sent the secure upload form to {ctx['email']}. "
            "Once you’ve completed and returned it, we’ll review your documents and move "
            "forward with the onboarding process.\n\n"
            "Any other questions?"
        )
