# SimpleTask

SimpleTask is a lightweight, local task management application designed for small teams and individual use.

> [!WARNING]
>
> This system is a study project and **contains security vulnerabilities**. It is intended **strictly for local use** by small teams or individuals. Do not deploy this application to a public server or use it in a production environment without significant security hardening.


## Features

- **Task Management**: create, edit, and delete tasks easily.
- **AI Enhancement (optional)**:  rewrites task titles, descriptions, and messages to be more professional using OpenAI.
- **Local Database (sqlite)**


## How to Run

1.  **Prerequisites**:
    *   uv (https://docs.astral.sh/uv/)

2.  **Installation**:
    ```bash
    git clone https://github.com/randomname124290358349/SimpleTask.git
    ```

3.  **Configuration (optional)**:
    *   Create a `.env` file in the root directory or rename `.example.env`.
    *   Add your OpenAI API Key:
        ```
        OPENAI_API_KEY=sk-...
        ```

4.  **Run the Application**:
    ```bash
    uv run .\app.py
    ```
    Access the app at `http://localhost:5000`.
    Access the application from other computers on your LAN at `http://<your-lan-ip>:5000` (check the console output for the IP).

## Technologies

- Python (Flask)
- SQLite
- OpenAI API
- HTML/CSS/JS
