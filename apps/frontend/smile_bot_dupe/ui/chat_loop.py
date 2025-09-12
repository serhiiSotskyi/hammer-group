# ui/chat_loop.py

from core.logger import log_interaction

def run_chat_loop(agent, context):
    """
    1) Print banner
    2) Seed with "start"
    3) Loop: read → add_user_message → generate_response → add_assistant_message → print
    """
    print("\n💬 You're now chatting with Smile Assistant. Type 'exit' to quit.\n")

    reply,_,_ = agent.generate_response("start")
    print(f"🤖 {reply}")

    while True:
        user_in = input("\nYou: ")
        if user_in.lower() in ("exit","quit"):
            print("🤖 Goodbye!")
            return

        agent.memory_manager.add_user_message(user_in)
        reply,_,_ = agent.generate_response(user_in)
        agent.memory_manager.add_assistant_message(reply)
        print(f"🤖 {reply}")
