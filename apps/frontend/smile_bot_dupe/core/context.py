from collections.abc import MutableMapping

class ConversationContext(MutableMapping):
    def __init__(self):
        self.data = {
            "user_type": None,
            "school_interest": None,
            "job_type": None,
            "school_type": None,
            "role_needed": None,
            "name": None,
            "postcode": None,
            "email": None,
            "phone": None,
            # phase flags:
            "script_complete": False,           # finished onboarding
            "doc_phase_started": False,         # shown the doc checklist
            "documents_checked": False,         # user done with docs Q&A
            "has_id": None,                     # True/False
            "has_address": None,                # True/False
            "has_qualifications": None,         # True/False
            "needs_dbs_help": None,             # True/False
            "final_upload_email_sent": False    # email+summary sent
        }

    # ---- MutableMapping / dict-like interface ----
    def __getitem__(self, key):
        return self.data[key]

    def __setitem__(self, key, value):
        if key not in self.data:
            raise KeyError(f"Invalid context key: {key}")
        self.data[key] = value

    def __delitem__(self, key):
        raise KeyError("Cannot delete context keys")

    def __iter__(self):
        return iter(self.data)

    def __len__(self):
        return len(self.data)

    def get(self, key, default=None):
        return self.data.get(key, default)

    # ---- convenience methods ----
    def is_ready_for_ai(self):
        return self.data["script_complete"]

    def dump_context(self):
        return "\n".join(f"{k}: {v}"
                         for k, v in self.data.items()
                         if v is not False and v is not None)
