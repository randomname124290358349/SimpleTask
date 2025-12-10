# SimpleTask

SimpleTask is a lightweight, local task management application designed for small teams and individual use.

![Demo](demos/demo.gif)

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

3.  **Configuration**:
    *   Create a `.env` file in the root directory or rename `.example.env`.
    *   Add your OpenAI API Key (optional):
        ```
        OPENAI_API_KEY=sk-...
        ```
    *   Create your api key for the app (needed!):
        ```
        API_KEY=my-default-key
        ```

4.  **Run the Application**:
    ```bash
    uv run .\app.py
    ```
    or to start silenced and minimized
    ```
    uv run pythonw launch_as_system_tray.pyw
    ```
    Access the app at `http://localhost:3333`.
    Access the application from other computers on your LAN at `http://<your-lan-ip>:3333` (check the console output for the IP).

## Running with Docker (Alternative)

If you prefer to run the application using Docker, follow these steps:

1.  **Prerequisites**:
    *   Docker and Docker Compose installed on your system.

2.  **Configuration**:
    *   Create a `.env` file in the root directory (same as above):
        ```
        OPENAI_API_KEY=sk-...
        API_KEY=my-default-key
        ```

3.  **Build and Run**:
    ```bash
    docker compose up -d --build
    ```

4.  **Access the Application**:
    *   Open `http://localhost:3333` in your browser.

5.  **View Logs**:
    ```bash
    docker compose logs -f
    ```

> **Note**: The database is persisted in a Docker volume called `simpletask_data`. Your data will be preserved across container restarts.

## Technologies

- Python (Flask)
- SQLite
- OpenAI API
- HTML/CSS/JS



