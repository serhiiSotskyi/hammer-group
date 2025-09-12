from ui.context_handler        import collect_user_context
from core.conversation_manager import ConversationManager
from agents.candidatebot       import CandidateBot
from agents.schoolbot          import SchoolBot
from agents.generalbot         import GeneralBot
from ui.chat_loop              import run_chat_loop
from services.prompt_builder   import build_prompt
from services.email_service    import EmailService

def main():
    print("\n🎓 Welcome to Smile Education's Virtual Assistant!\n")

    # 1) Decide which flow
    context      = collect_user_context()
    conv_manager = ConversationManager()

    # 2) Build the LLM system prompt
    system_prompt = build_prompt(
        user_type=context.get("user_type"),
        context=context.data
    )

    # 3) Instantiate the appropriate agent
    email_svc = EmailService()
    if context.get("user_type") == "candidate":
        agent = CandidateBot(conv_manager, system_prompt, context, email_svc)
    elif context.get("user_type") == "school":
        agent = SchoolBot(conv_manager, system_prompt, context, email_svc)
    else:
        # pass context so GeneralBot can triage
        agent = GeneralBot(conv_manager, system_prompt, context)

    # 4) Run the chat loop
    run_chat_loop(agent, context)

if __name__ == "__main__":
    main()
