#!/bin/bash
set -e

echo "==> Installing frontend dependencies..."
cd frontend
npm install

echo "==> Building frontend..."
npm run build

echo "==> Installing backend dependencies..."
cd ../backend
pip install -r requirements.txt -q

echo "==> Starting server on port 8080..."
uvicorn main:app --host 0.0.0.0 --port 8080
