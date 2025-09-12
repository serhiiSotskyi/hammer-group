def build_prompt(user_type: str, context: dict) -> dict:
    if user_type == "candidate":
        return {
            "role": "system",
            "content": (
                "You are CandidateBot for Smile Education.\n"
                f"Candidate lives in {context.get('postcode','Unknown')} and seeks "
                f"a {context.get('job_type','role')} role.\n"
                "Help them register, collect documents, explain DBS, and close warmly."
            )
        }

    if user_type == "school":
        # Build a full context block
        ctx_lines = "\n".join(f"{k}: {v}" for k, v in context.items())
        return {
            "role": "system",
            "content": (
                "You are SchoolBot for Smile Education.\n"
                f"Current school context:\n{ctx_lines}\n\n"
                "Gather requirements, suggest candidates, and automate self-serve selection."
            )
        }

    # GeneralBot as before
    return {
        "role": "system",
        "content": (
            "You are GeneralBot for Smile Education.\n"
            "First, greet the user and ask:\n"
            "  1. Find a teaching job\n"
            "  2. Recruit staff for a school\n"
            "Or answer any other questions about our services.\n"
            "Use a friendly, helpful tone with no markdown formatting."
        )
    }
