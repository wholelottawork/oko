#!/bin/bash

echo "=================================="
echo "OKO Backend Restart and Test Script"
echo "=================================="

# 1. Stop the old process
echo ""
echo "1️⃣  Stopping the old process..."
pkill -f "bin/oko" || echo "  No running process found"
sleep 2

# 2. Clear old data
echo ""
echo "2️⃣  Clearing test data..."
sqlite3 data/data.db "DELETE FROM trader_fills; DELETE FROM trader_orders;"
echo "  ✅ Cleared the trader_orders and trader_fills tables"

# 3. Verify that the database tables are empty
ORDERS_COUNT=$(sqlite3 data/data.db "SELECT COUNT(*) FROM trader_orders")
FILLS_COUNT=$(sqlite3 data/data.db "SELECT COUNT(*) FROM trader_fills")
echo "  Verification: trader_orders=$ORDERS_COUNT, trader_fills=$FILLS_COUNT"

# 4. Start the new process
echo ""
echo "3️⃣  Starting the newly built backend..."
if [ ! -f "bin/oko" ]; then
    echo "  ❌ bin/oko does not exist; run go build -o bin/oko . first"
    exit 1
fi

nohup ./bin/oko > data/oko_$(date +%Y-%m-%d).log 2>&1 &
OKO_PID=$!
echo "  ✅ Backend started (PID: $OKO_PID)"

# 5. Wait for the service to start
echo ""
echo "4️⃣  Waiting for the service to start..."
sleep 3

# 6. Verify that the process is running
if ps -p $OKO_PID > /dev/null; then
    echo "  ✅ Backend process is running (PID: $OKO_PID)"
else
    echo "  ❌ Backend failed to start; check the logs"
    tail -20 data/oko_$(date +%Y-%m-%d).log
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Restart completed"
echo "=================================="
echo ""
echo "📝 Next steps:"
echo "  1. Open the frontend"
echo "  2. Close a position manually or with AI"
echo "  3. Wait 10 seconds for pollLighterTradeHistory to finish"
echo "  4. Check the database:"
echo "     sqlite3 data/data.db \"SELECT id, status, avg_fill_price, filled_quantity FROM trader_orders\""
echo "  5. Refresh the chart page; B/S markers should appear"
echo ""
echo "📊 Follow live logs:"
echo "  tail -f data/oko_$(date +%Y-%m-%d).log | grep -E 'Order recorded|Found matching trade|Fill recorded'"
echo ""
