# services/email_service.py

import os, json

class EmailService:
    """
    Simulates emails by writing JSON files to emails/.
    """

    def __init__(self, upload_link="https://example.com/selection-portal"):
        self.upload_link = upload_link

    def send_upload_form(self, to_address: str, context_summary: str) -> str:
        os.makedirs("emails", exist_ok=True)
        fname = to_address.replace("@","_at_").replace(" ","_")
        path  = f"emails/{fname}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "to":          to_address,
                "upload_link": self.upload_link,
                "summary":     context_summary
            }, f, indent=2)
        return self.upload_link

    def send_candidate_list(self, to_address: str, candidate_profiles: str) -> str:
        os.makedirs("emails", exist_ok=True)
        fname = to_address.replace("@","_at_").replace(" ","_")
        path  = f"emails/{fname}_candidates.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "to":         to_address,
                "candidates": candidate_profiles
            }, f, indent=2)
        return path
