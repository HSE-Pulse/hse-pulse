# CarePlanPlus - Treatment Pathway Recommender Service
# BERT-based personalized procedure recommendations

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 300 -r requirements.txt

# Download BERT model during build (optional - can be mounted instead)
RUN python -c "from transformers import BertTokenizer, BertModel; \
    BertTokenizer.from_pretrained('bert-base-uncased'); \
    BertModel.from_pretrained('bert-base-uncased')" || true

# Copy application code
COPY app/ ./app/

# Copy data files
COPY data/ ./data/

# Create models directory
RUN mkdir -p /app/models

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV TRANSFORMERS_CACHE=/app/models/transformers

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
