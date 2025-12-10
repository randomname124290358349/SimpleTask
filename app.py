from flask import Flask, render_template, request, jsonify, session
import os
from datetime import datetime
from modules.database import DBHandler, init_db
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
SERVER_API_KEY = os.getenv("API_KEY")
openai_client = OpenAI(api_key=api_key) if api_key else None

if not api_key:
    print("WARNING: OPENAI_API_KEY not found in .env. AI features will be disabled.")

# Initialize DB on start
init_db()
db = DBHandler()

@app.before_request
def require_api_key():
    if request.path.startswith('/api/'):
        if request.method == 'OPTIONS':
            return
        
        if not SERVER_API_KEY:
            # Secure by default: If server isn't configured, deny access or Warn loudly
            print("CRITICAL: API_KEY not set in environment!")
            return jsonify({"error": "Configuration Error", "message": "Server API Key not configured"}), 500
        
        client_key = request.headers.get('X-API-Key')
        if not client_key or client_key != SERVER_API_KEY:
            return jsonify({"error": "Unauthorized", "message": "Invalid API Key"}), 401

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
        
        task_id = db.create_task(title, description, user_name)
        return jsonify({"id": task_id, "status": "created", "title": title, "description": description}), 201
    
    else: # GET
        status_filter = request.args.get('status', 'open')
        search_query = request.args.get('search', '').strip()
        
        tasks = db.get_tasks(status_filter, search_query)
        return jsonify(tasks)

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
def task(task_id):
    if request.method == 'PUT':
        data = request.json
        
        # Handle status update
        if 'status' in data:
            db.update_task_status(task_id, data.get('status'))
        
        # Handle content update (title/description)
        if 'title' in data:
            db.update_task_content(task_id, data['title'], data.get('description', ''))
            
        return jsonify({"status": "updated"})
    
    elif request.method == 'DELETE':
        db.delete_task(task_id)
        return jsonify({"status": "deleted"})
    
    else: # GET
        task = db.get_task_by_id(task_id)
        if task:
            return jsonify(task)
        return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<int:task_id>/messages', methods=['GET', 'POST'])
def messages(task_id):
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
            
        msg_id = db.add_message(task_id, user_name, rewritten_content, content)
        return jsonify({"id": msg_id, "content": rewritten_content, "original_content": content}), 201
        
    else: # GET
        messages = db.get_messages(task_id)
        return jsonify(messages)

@app.route('/api/messages/<int:msg_id>', methods=['PUT', 'DELETE'])
def message_op(msg_id):
    if request.method == 'PUT':
        data = request.json
        new_content = data['content']
        # When editing, we do NOT rewrite with AI, as per requirements
        db.update_message(msg_id, new_content)
        return jsonify({"status": "updated"})
    
    elif request.method == 'DELETE':
        db.delete_message(msg_id)
        return jsonify({"status": "deleted"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
