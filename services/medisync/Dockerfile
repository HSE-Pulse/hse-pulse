# Stage 1: Build the React UI
FROM node:20-slim AS ui-builder
WORKDIR /ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
ENV VITE_BASE_PATH=/
RUN npm run build

# Stage 2: Python backend with UI static files
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 300 -r requirements.txt
COPY app/ ./app/
COPY checkpoints/ ./checkpoints/
RUN mkdir -p /app/models

# Copy built UI to static directory
COPY --from=ui-builder /ui/dist /app/static

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
