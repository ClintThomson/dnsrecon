# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN npm run build

# Stage 2: Python backend + serve built frontend
FROM python:3.12-alpine AS runtime
RUN apk add --no-cache build-base libffi-dev libxml2-dev libxslt-dev
WORKDIR /app
COPY . /app
COPY --from=frontend-build /frontend/dist /app/frontend/dist
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

EXPOSE 8080
CMD ["uvicorn", "dnsrecon.api:app", "--host", "0.0.0.0", "--port", "8080"]
