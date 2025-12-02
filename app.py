from flask import Flask, render_template, request, jsonify, session
import sqlite3
import os
from datetime import datetime
from database import get_db_connection, init_db
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=api_key) if api_key else None

if not api_key:
    print("WARNING: OPENAI_API_KEY not found in .env. AI features will be disabled.")

# Initialize DB on start
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/task/<int:task_id>')
def task_detail(task_id):
    return render_template('task.html', task_id=task_id)

# API Routes

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({"ai_available": bool(openai_client)})

@app.route('/api/identify', methods=['POST'])
def identify():
    data = request.json
    session['user_name'] = data.get('name')
    return jsonify({"status": "success", "user_name": session['user_name']})

@app.route('/api/tasks', methods=['GET', 'POST'])
def tasks():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        user_name = session.get('user_name', 'Anonymous')
        
        title = data['title']
        description = data.get('description', '')
        use_ai = data.get('use_ai', True)
        
        # OpenAI Rewrite for Task
        if openai_client and use_ai:
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant. Rewrite the title and the description of the following task in a more professional, clear, and concise way. Return the result as a JSON object with the keys “title” and “description”."},
                        {"role": "user", "content": f"Title: {title}\nDescription: {description}"}
                    ],
                    response_format={"type": "json_object"}
                )
                import json
                rewritten = json.loads(response.choices[0].message.content)
                title = rewritten.get('title', title)
                description = rewritten.get('description', description)
            except Exception as e:
                print(f"OpenAI Error (Task Create): {e}")
                # Fallback to original
        
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO tasks (title, description, created_by) VALUES (?, ?, ?)',
            (title, description, user_name)
        )
        conn.commit()
        task_id = cursor.lastrowid
        conn.close()
        return jsonify({"id": task_id, "status": "created", "title": title, "description": description}), 201
    
    else: # GET
        status_filter = request.args.get('status', 'open')
        search_query = request.args.get('search', '').strip()
        
        if search_query:
            # Search in title, description, AND messages
            # We use DISTINCT to avoid duplicates if multiple messages match
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
        return jsonify([dict(task) for task in tasks])

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
def task(task_id):
    conn = get_db_connection()
    if request.method == 'PUT':
        data = request.json
        
        # Handle status update
        if 'status' in data:
            status = data.get('status')
            if status == 'completed':
                conn.execute('UPDATE tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', (status, task_id))
            elif status == 'open':
                conn.execute('UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?', (status, task_id))
        
        # Handle content update (title/description)
        if 'title' in data:
            conn.execute('UPDATE tasks SET title = ?, description = ? WHERE id = ?', (data['title'], data.get('description', ''), task_id))
            
        conn.commit()
        conn.close()
        return jsonify({"status": "updated"})
    
    elif request.method == 'DELETE':
        # Delete messages first (foreign key constraint usually handles this if ON DELETE CASCADE, but let's be safe/explicit or just delete task if no constraint issues)
        # SQLite default FK support might need enabling or manual deletion. Let's delete messages first to be sure.
        conn.execute('DELETE FROM messages WHERE task_id = ?', (task_id,))
        conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()
        return jsonify({"status": "deleted"})
    
    else: # GET
        task = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        conn.close()
        if task:
            return jsonify(dict(task))
        return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<int:task_id>/messages', methods=['GET', 'POST'])
def messages(task_id):
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        user_name = session.get('user_name', 'Anonymous')
        content = data['content']
        use_ai = data.get('use_ai', True)
        
        # OpenAI Rewrite
        if openai_client and use_ai:
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant who rewrites messages so they become more professional and clear. Preserve the meaning but improve the tone and grammar. Return ONLY the rewritten text."},
                        {"role": "user", "content": content}
                    ]
                )
                rewritten_content = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"OpenAI Error: {e}")
                rewritten_content = content # Fallback
        else:
            rewritten_content = content # No AI available
            
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO messages (task_id, user_name, content, original_content) VALUES (?, ?, ?, ?)',
            (task_id, user_name, rewritten_content, content)
        )
        conn.commit()
        msg_id = cursor.lastrowid
        conn.close()
        return jsonify({"id": msg_id, "content": rewritten_content, "original_content": content}), 201
        
    else: # GET
        messages = conn.execute('SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC', (task_id,)).fetchall()
        conn.close()
        return jsonify([dict(msg) for msg in messages])

@app.route('/api/messages/<int:msg_id>', methods=['PUT', 'DELETE'])
def message_op(msg_id):
    conn = get_db_connection()
    if request.method == 'PUT':
        data = request.json
        new_content = data['content']
        # When editing, we do NOT rewrite with AI, as per requirements
        conn.execute('UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?', (new_content, msg_id))
        conn.commit()
        conn.close()
        return jsonify({"status": "updated"})
    
    elif request.method == 'DELETE':
        conn.execute('DELETE FROM messages WHERE id = ?', (msg_id,))
        conn.commit()
        conn.close()
        return jsonify({"status": "deleted"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
