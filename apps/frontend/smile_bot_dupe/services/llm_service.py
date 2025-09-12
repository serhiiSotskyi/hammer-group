# services/llm_service.py

from openai import OpenAI
from config import MESSAGE_BUFFER_SIZE

client = OpenAI()

def call_llm(system_prompt: str, history: list, user_text: str) -> str:
    """
    Wraps the v1 chat API. 
    - system_prompt: the system-role message (string)
    - history: list of {"role","content"} dicts
    - user_text: the final user or classification prompt
    """
    messages = [{"role": "system", "content": str(system_prompt)}]
    for m in history:
        messages.append({
            "role":    m.get("role",    "user"),
            "content": str(m.get("content",""))
        })
    messages.append({"role": "user", "content": str(user_text)})

    resp = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )
    return resp.choices[0].message.content.strip()
