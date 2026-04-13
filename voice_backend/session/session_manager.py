from datetime import datetime, timezone
import os
import sys

# Ensure config is available globally easily
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

class Session:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.history: list[dict] = []
        self.created_at = datetime.now(timezone.utc)
        self.last_active = self.created_at

    def add_turn(self, user_text: str, assistant_text: str):
        if user_text:
            self.history.append({"role": "user", "content": user_text})
        if assistant_text:
            self.history.append({"role": "assistant", "content": assistant_text})
            
        # Keep only last MAX_HISTORY_TURNS pairs (user + assistant)
        max_messages = settings.MAX_HISTORY_TURNS * 2
        if len(self.history) > max_messages:
            self.history = self.history[-max_messages:]
            
        self.last_active = datetime.now(timezone.utc)

    def get_history(self) -> list[dict]:
        return self.history

    def clear(self):
        self.history.clear()


class SessionManager:
    def __init__(self):
        self.sessions: dict[str, Session] = {}

    def get_or_create(self, session_id: str) -> Session:
        if session_id not in self.sessions:
            self.sessions[session_id] = Session(session_id)
        else:
            self.sessions[session_id].last_active = datetime.now(timezone.utc)
        return self.sessions[session_id]

    def delete(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]

    def cleanup_old_sessions(self):
        now = datetime.now(timezone.utc)
        to_delete = []
        for sid, session in self.sessions.items():
            # Inactive > 30 minutes
            if (now - session.last_active).total_seconds() > 1800:
                to_delete.append(sid)
        
        for sid in to_delete:
            del self.sessions[sid]

# Singleton
session_manager = SessionManager()
