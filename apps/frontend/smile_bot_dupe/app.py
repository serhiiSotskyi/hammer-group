import sys
sys.dont_write_bytecode = True

import os
import streamlit as st
import streamlit.components.v1 as components
from config import OPENAI_API_KEY
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

from core.conversation_manager import ConversationManager
from ui.context_handler import ConversationContext
from services.prompt_builder import build_prompt
from services.email_service import EmailService
from agents.candidatebot import CandidateBot
from agents.schoolbot import SchoolBot, SCHOOL_TYPES, FTE_OPTIONS
from agents.generalbot import GeneralBot

# Simple stderr logger

def slog(msg):
    print(f"[LOG] {msg}", file=sys.stderr)

# Streamlit page config
st.set_page_config(page_title="Smile Education Bot", layout="wide", initial_sidebar_state="collapsed")

# ─── Session State Init ────────────────────────────────────────────────────
if "stage" not in st.session_state:
    st.session_state.stage             = "flow_select"
    st.session_state.history           = []
    st.session_state.ctx               = ConversationContext()
    st.session_state.mgr               = ConversationManager()
    st.session_state.agent             = None
    st.session_state.awaiting_response = False
    st.session_state.chat_input        = ""

stage = st.session_state.stage

# ─── Sidebar Controls ─────────────────────────────────────────────────────────
# Initialize past conversations storage
if "past_conversations" not in st.session_state:
    st.session_state.past_conversations = []

# Callback to reset chat and archive current conversation

def reset_chat():
    # Archive only if there is something to save
    if st.session_state.history:
        st.session_state.past_conversations.append({
            "history": list(st.session_state.history),
            "context": dict(st.session_state.ctx.data)
        })
    # Reset session state
    st.session_state.history = []
    st.session_state.ctx = ConversationContext()
    st.session_state.mgr = ConversationManager()
    st.session_state.agent = None
    st.session_state.stage = "flow_select"
    st.session_state.awaiting_response = False
    st.session_state.chat_input = ""

# Sidebar UI
with st.sidebar:
    st.button("🔄 Reset Chat", on_click=reset_chat)
    st.markdown("### Past Conversations")
    for i, conv in enumerate(st.session_state.past_conversations):
        with st.expander(f"Conversation {i+1}", expanded=False):
            st.markdown("**History:**")
            for speaker, text in conv["history"]:
                st.write(f"**{speaker.title()}:** {text}")
            st.markdown("**Context:**")
            st.json(conv["context"])

# ─── Render Chat History ─────────────────────────────────────────────────── ─────────────────────────────────────────────────────────────────────────────────────────────────────
st.title("🎓 Smile Education Virtual Assistant")
for speaker, text in st.session_state.history:
    st.chat_message(speaker).write(text)

# ─── Flow stages ────────────────────────────────────────────────────────────
if stage == "flow_select":
    st.chat_message("assistant").write("Hi 👋 How can we help you today?")
    c1, c2, c3 = st.columns(3)
    if c1.button("Find a teaching job", key="flow_job"):
        choice = "Find a teaching job"
        st.session_state.history.append(("user", choice))
        st.session_state.mgr.add_user_message(choice)
        st.session_state.ctx.update("user_type", "candidate")
        st.session_state.stage = "cand_school_interest"
        st.rerun()
    if c2.button("Recruit staff for a school", key="flow_school"):
        choice = "Recruit staff for a school"
        st.session_state.history.append(("user", choice))
        st.session_state.mgr.add_user_message(choice)
        st.session_state.ctx.update("user_type", "school")
        st.session_state.stage = "school_type_select"
        st.rerun()
    if c3.button("Other", key="flow_other"):
        choice = "Other"
        st.session_state.history.append(("user", choice))
        st.session_state.mgr.add_user_message(choice)
        st.session_state.ctx.update("user_type", "other")
        st.session_state.stage = "chatting"
        st.rerun()

elif stage == "cand_school_interest":
    st.chat_message("assistant").write("What kind of school are you looking to work at?")
    opts = ["Primary","Secondary","SEND","Nursery","Other"]
    cols = st.columns(len(opts))
    for i, opt in enumerate(opts):
        if cols[i].button(opt, key=f"cand_school_{opt}"):
            st.session_state.history.append(("user", opt))
            st.session_state.mgr.add_user_message(opt)
            st.session_state.ctx.update("school_interest", opt)
            st.session_state.stage = "cand_job_type"
            st.rerun()

elif stage == "cand_job_type":
    st.chat_message("assistant").write("What type of work are you looking for?")
    opts = ["Teaching Assistant","Teacher","SEND Specialist","Cover Supervisor","Other"]
    cols = st.columns(len(opts))
    for i, opt in enumerate(opts):
        if cols[i].button(opt, key=f"cand_job_{opt}"):
            st.session_state.history.append(("user", opt))
            st.session_state.mgr.add_user_message(opt)
            st.session_state.ctx.update("job_type", opt)

            prompt = build_prompt("candidate", st.session_state.ctx.data)
            bot = CandidateBot(
                st.session_state.mgr,
                prompt,
                st.session_state.ctx,
                EmailService()
            )
            st.session_state.agent = bot
            reply, _, _ = bot.generate_response("start")
            st.session_state.history.append(("assistant", reply))
            st.session_state.mgr.add_assistant_message(reply)
            st.session_state.stage = "chatting"
            st.rerun()

elif stage == "school_type_select":
    st.chat_message("assistant").write("What type of school are you?")
    cols = st.columns(len(SCHOOL_TYPES))
    for i, opt in enumerate(SCHOOL_TYPES):
        if cols[i].button(opt, key=f"school_type_{opt}"):
            st.session_state.history.append(("user", opt))
            st.session_state.mgr.add_user_message(opt)
            st.session_state.ctx.update("school_type", opt)
            st.session_state.stage = "school_role_select"
            st.rerun()

elif stage == "school_role_select":
    st.chat_message("assistant").write("What role are you looking to fill?")
    role_opts = ["Teacher","Teaching Assistant","SEND Specialist","Cover Supervisor","Other"]
    cols = st.columns(len(role_opts))
    for i, opt in enumerate(role_opts):
        if cols[i].button(opt, key=f"school_role_{opt}"):
            st.session_state.history.append(("user", opt))
            st.session_state.mgr.add_user_message(opt)
            st.session_state.ctx.update("role_needed", opt)
            st.session_state.stage = "school_fte_select"
            st.rerun()

elif stage == "school_fte_select":
    st.chat_message("assistant").write("Full-time or part-time?")
    cols = st.columns(len(FTE_OPTIONS))
    for i, opt in enumerate(FTE_OPTIONS):
        if cols[i].button(opt, key=f"school_fte_{opt}"):
            st.session_state.history.append(("user", opt))
            st.session_state.mgr.add_user_message(opt)
            st.session_state.ctx.update("fte_status", opt)
            # instantiate SchoolBot and start chat
            bot = SchoolBot(
                st.session_state.mgr,
                st.session_state.ctx,
                EmailService()
            )
            st.session_state.agent = bot
            reply, _, _ = bot.generate_response("start")
            st.session_state.history.append(("assistant", reply))
            st.session_state.mgr.add_assistant_message(reply)
            st.session_state.stage = "chatting"
            st.rerun()

elif stage == "chatting":
    # ─── Seed GeneralBot if none AND only for new chats ───────────────────────
    if st.session_state.agent is None and len(st.session_state.history) == 0 and st.session_state.opened_conversation is None:
        prompt = build_prompt(
            st.session_state.ctx.get("user_type"),
            st.session_state.ctx.data
        )
        bot = GeneralBot(st.session_state.mgr, prompt, st.session_state.ctx)
        st.session_state.agent = bot
        reply, _, _ = bot.generate_response("start")
        st.session_state.history.append(("assistant", reply))
        st.session_state.mgr.add_assistant_message(reply)
        st.rerun()

    # ─── Two-pass reply ────────────────────────────────────────────────────
    last = st.session_state.history[-1][0] if st.session_state.history else None
    if last == "user" and not st.session_state.awaiting_response:
        st.session_state.awaiting_response = True
        user_msg = st.session_state.history[-1][1]
        reply, _, _ = st.session_state.agent.generate_response(user_msg)
        st.session_state.history.append(("assistant", reply))
        st.session_state.mgr.add_assistant_message(reply)
        st.session_state.awaiting_response = False
        st.rerun()

    # ─── CSS to pin input ─────────────────────────────────────────────────
    st.markdown("""
    <style>
      [data-testid="stTextInput"] {
        position: fixed !important;
        bottom: 1.5rem !important;
        left: 5rem !important;
        right: 5rem !important;
        z-index: 1000;
      }
      [data-testid="stTextInput"] input {
        width: 100% !important;
        box-sizing: border-box;
      }
      @media (max-width: 768px) {
        [data-testid="stTextInput"] {
          left: 1rem !important;
          right: 1rem !important;
        }
      }
    </style>
    """, unsafe_allow_html=True)

    def _submit_chat():
        txt = st.session_state.chat_input.strip()
        if not txt:
            return
        st.session_state.history.append(("user", txt))
        st.session_state.mgr.add_user_message(txt)
        st.session_state.chat_input = ""
        st.session_state.awaiting_response = False
        st.rerun()

    st.text_input(
        "", 
        key="chat_input",
        placeholder="Type your message and press Enter…",
        on_change=_submit_chat,
        label_visibility="collapsed",
    )

    # Automatically focus the chat input field after rendering
    components.html("""
    <script>
      const inputEl = window.parent.document.querySelector('[data-testid="stTextInput"] input');
      if (inputEl) {
        inputEl.focus();
      }
    </script>
    """, height=0)

    components.html("""
    <script>
      const msgs = window.parent.document
        .querySelectorAll('[data-testid="stChatMessage"]');
      if (msgs.length) {
        msgs[msgs.length-1].scrollIntoView({
          behavior: 'smooth', block: 'center'
        });
      }
    </script>
    """, height=0)
