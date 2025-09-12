# ui/context_handler.py

from collections.abc import MutableMapping

def collect_user_context():
    """
    Top‐level menu: candidate vs school vs other.
    """
    ctx = ConversationContext()

    print("Are you looking for staff or looking for work?")
    print("  1. I'm a candidate")
    print("  2. I'm from a school")
    print("  3. Other")
    choice    = input("Choose a number: ").strip()
    user_type = {"1":"candidate","2":"school"}.get(choice, "other")
    ctx.update("user_type", user_type)
    return ctx

class ConversationContext(MutableMapping):
    """
    Shared context for both flows, plus stage flags.
    """
    def __init__(self):
        self.data = {
            # Universal
            "user_type": None,

            # Candidate flow
            "school_interest": None,
            "job_type":        None,
            "name":            None,
            "email":           None,
            "phone":           None,
            "postcode":        None,
            "script_complete": False,
            "doc_prompt_sent": False,
            "documents_checked": False,
            "final_upload_email_sent": False,

            # School flow
            "school_type":           None,
            "role_needed":           None,
            "school_name":           None,
            "school_postcode":       None,
            "school_email":          None,
            "school_phone":          None,
            "start_date":            None,
            "contract_length":       None,
            "fte_status":            None,
            "special_requirements":  None,
            "requirements_captured": False,
            "suggestions_sent":      False,
            "final_closed":          False
        }

    def update(self, key: str, val):
        if key not in self.data:
            raise KeyError(f"Invalid context key: {key}")
        self.data[key] = val

    def __getitem__(self, key):    return self.data[key]
    def __setitem__(self, key, v): self.update(key, v)
    def __delitem__(self, key):   raise KeyError("Cannot delete keys")
    def __iter__(self):           return iter(self.data)
    def __len__(self):            return len(self.data)
    def get(self, key, default=None): return self.data.get(key, default)

    def dump_context(self):
        return "\n".join(
            f"{k}: {v}" for k,v in self.data.items()
            if v not in (None, False)
        )
