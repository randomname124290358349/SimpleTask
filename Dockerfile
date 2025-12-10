# Use a lightweight Python 3.13 Alpine-based image
FROM python:3.13-alpine

# Set the working directory inside the container
WORKDIR /app

# Install essential system dependencies
# curl → required to download the UV installer
RUN apk add --no-cache curl

# Install UV (the fast Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Make UV available in the PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files first to leverage Docker layer caching
COPY pyproject.toml uv.lock ./

# Install project dependencies in a reproducible way
RUN uv sync --frozen --no-dev

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3333

# Start the application using UV
CMD ["uv", "run", "python", "app.py"]
