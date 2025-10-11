#!/bin/bash

# Start Stripe webhook listener and Next.js dev server together

echo "🎯 STARTING BILLING SYSTEM WITH STRIPE WEBHOOKS"
echo ""
echo "This will start:"
echo "  1. Stripe CLI webhook listener (forwards to localhost:3000)"
echo "  2. Next.js dev server (localhost:3000)"
echo ""
echo "Press Ctrl+C to stop both processes"
echo ""

# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start Stripe listener in background
echo "🔗 Starting Stripe webhook listener..."
cd "$(dirname "$0")/.."
./stripe listen --forward-to localhost:3000/api/stripe/webhook > stripe-webhook.log 2>&1 &
STRIPE_PID=$!

# Wait a moment for Stripe to start
sleep 2

# Start Next.js dev server
echo "🚀 Starting Next.js dev server..."
npm run dev &
NEXTJS_PID=$!

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $STRIPE_PID 2>/dev/null || true
    kill $NEXTJS_PID 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    echo "✅ Services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for both processes
echo ""
echo "✅ Services running!"
echo "   📊 App: http://localhost:3000"
echo "   🎣 Stripe webhook logs: stripe-webhook.log"
echo ""
echo "Press Ctrl+C to stop"
echo ""

wait $NEXTJS_PID

