import sqlite3
import os
from datetime import datetime

# Allow configuring DB path via environment variable (useful for Docker)
DB_NAME = os.environ.get("DB_PATH", "simpletask.db")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tasks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            created_by TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'open',
            completed_at TIMESTAMP
        )
    ''')
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            content TEXT NOT NULL,
            original_content TEXT,
            is_edited BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks (id)
        )
    ''')
    
    conn.commit()
    conn.close()

class DBHandler:
    def __init__(self, db_name=DB_NAME):
        self.db_name = db_name

    def _get_conn(self):
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
        return conn

    def create_task(self, title, description, created_by):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO tasks (title, description, created_by) VALUES (?, ?, ?)',
            (title, description, created_by)
        )
        conn.commit()
        task_id = cursor.lastrowid
        conn.close()
        return task_id

    def get_tasks(self, status_filter='open', search_query=None):
        conn = self._get_conn()
        if search_query:
            # Search in title, description, AND messages
            query = """
                SELECT DISTINCT t.* 
                FROM tasks t
                LEFT JOIN messages m ON t.id = m.task_id
                WHERE t.status = ? 
                AND (
                    t.title LIKE ? 
                    OR t.description LIKE ? 
                    OR m.content LIKE ?
                )
                ORDER BY t.created_at DESC
            """
            search_param = f'%{search_query}%'
            tasks = conn.execute(query, (status_filter, search_param, search_param, search_param)).fetchall()
        else:
            tasks = conn.execute('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC', (status_filter,)).fetchall()
        conn.close()
        return [dict(task) for task in tasks]

    def get_task_by_id(self, task_id):
        conn = self._get_conn()
        task = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        conn.close()
        return dict(task) if task else None

    def update_task_status(self, task_id, status):
        conn = self._get_conn()
        if status == 'completed':
            conn.execute('UPDATE tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', (status, task_id))
        elif status == 'open':
            conn.execute('UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?', (status, task_id))
        conn.commit()
        conn.close()

    def update_task_content(self, task_id, title, description):
        conn = self._get_conn()
        conn.execute('UPDATE tasks SET title = ?, description = ? WHERE id = ?', (title, description, task_id))
        conn.commit()
        conn.close()

    def delete_task(self, task_id):
        conn = self._get_conn()
        # Delete messages first
        conn.execute('DELETE FROM messages WHERE task_id = ?', (task_id,))
        conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()

    def add_message(self, task_id, user_name, content, original_content):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO messages (task_id, user_name, content, original_content) VALUES (?, ?, ?, ?)',
            (task_id, user_name, content, original_content)
        )
        conn.commit()
        msg_id = cursor.lastrowid
        conn.close()
        return msg_id

    def get_messages(self, task_id):
        conn = self._get_conn()
        messages = conn.execute('SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC', (task_id,)).fetchall()
        conn.close()
        return [dict(msg) for msg in messages]

    def update_message(self, msg_id, content):
        conn = self._get_conn()
        conn.execute('UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?', (content, msg_id))
        conn.commit()
        conn.close()

    def delete_message(self, msg_id):
        conn = self._get_conn()
        conn.execute('DELETE FROM messages WHERE id = ?', (msg_id,))
        conn.commit()
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
