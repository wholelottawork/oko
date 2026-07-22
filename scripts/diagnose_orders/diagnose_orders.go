package main

import (
	"flag"
	"fmt"
	"oko/store"
	"log"
	"os"
	"path/filepath"
	"time"
)

func main() {
	var dbPath string
	var traderID string

	flag.StringVar(&dbPath, "db", "./data/data.db", "Database file path")
	flag.StringVar(&traderID, "trader", "", "Trader ID (optional)")
	flag.Parse()

	absPath, err := filepath.Abs(dbPath)
	if err != nil {
		log.Fatalf("❌ Invalid database path: %v", err)
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		log.Fatalf("❌ Database file does not exist: %s", absPath)
	}

	fmt.Printf("📂 Database path: %s\n", absPath)

	s, err := store.New(absPath)
	if err != nil {
		log.Fatalf("❌ Unable to open database: %v", err)
	}
	defer s.Close()

	orderStore := s.Order()

	if traderID == "" {
		fmt.Println("\n⚠️  No trader_id specified; use: --trader <trader_id>")
		fmt.Println("   Fetching statistics for all traders...")
		fmt.Println()
	}

	orders, err := orderStore.GetTraderOrders(traderID, 100)
	if err != nil {
		log.Fatalf("❌ Failed to fetch orders: %v", err)
	}

	fmt.Printf("\n📋 Found %d order records\n\n", len(orders))

	if len(orders) == 0 {
		fmt.Println("⚠️  No order data found. Possible causes:")
		fmt.Println("   1. The trader has not executed any trades")
		fmt.Println("   2. CreateOrder failed to insert due to a duplicate-key conflict")
		fmt.Println("   3. The specified trader_id does not exist")
		return
	}

	var (
		totalOrders        = len(orders)
		filledOrders       = 0
		withFilledAt       = 0
		withAvgFillPrice   = 0
		withOrderAction    = 0
		missingFilledAt    = 0
		missingAvgPrice    = 0
		missingOrderAction = 0
	)

	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("%-15s %-10s %-10s %-15s %-10s %-15s\n", "Order ID", "Status", "Action", "Average Price", "Fill Time", "Issues")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	for _, order := range orders {
		issues := []string{}

		if order.Status == "FILLED" {
			filledOrders++

			if order.FilledAt > 0 {
				withFilledAt++
			} else {
				missingFilledAt++
				issues = append(issues, "❌ Missing fill time")
			}

			if order.AvgFillPrice > 0 {
				withAvgFillPrice++
			} else {
				missingAvgPrice++
				issues = append(issues, "❌ Fill price is zero")
			}
		}

		if order.OrderAction != "" {
			withOrderAction++
		} else {
			missingOrderAction++
			issues = append(issues, "⚠️  Missing order action")
		}

		issueStr := "✅ OK"
		if len(issues) > 0 {
			issueStr = ""
			for i, issue := range issues {
				if i > 0 {
					issueStr += ", "
				}
				issueStr += issue
			}
		}

		filledAtStr := "N/A"
		if order.FilledAt > 0 {
			filledAtStr = time.UnixMilli(order.FilledAt).Format("01-02 15:04")
		}

		fmt.Printf("%-15s %-10s %-10s %-15.2f %-10s %s\n",
			order.ExchangeOrderID[:min(15, len(order.ExchangeOrderID))],
			order.Status,
			order.OrderAction,
			order.AvgFillPrice,
			filledAtStr,
			issueStr,
		)
	}

	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	fmt.Printf("\n📊 Summary:\n")
	fmt.Printf("   Total orders:       %d\n", totalOrders)
	fmt.Printf("   Filled orders:      %d\n", filledOrders)
	fmt.Printf("   With fill time:     %d / %d (%.1f%%)\n", withFilledAt, filledOrders, float64(withFilledAt)/float64(max(filledOrders, 1))*100)
	fmt.Printf("   With fill price:    %d / %d (%.1f%%)\n", withAvgFillPrice, filledOrders, float64(withAvgFillPrice)/float64(max(filledOrders, 1))*100)
	fmt.Printf("   With order action:  %d / %d (%.1f%%)\n", withOrderAction, totalOrders, float64(withOrderAction)/float64(max(totalOrders, 1))*100)

	fmt.Printf("\n⚠️  Problem orders:\n")
	if missingFilledAt > 0 {
		fmt.Printf("   ❌ %d orders are missing a fill time (filled_at)\n", missingFilledAt)
	}
	if missingAvgPrice > 0 {
		fmt.Printf("   ❌ %d orders have a zero fill price (avg_fill_price)\n", missingAvgPrice)
	}
	if missingOrderAction > 0 {
		fmt.Printf("   ⚠️  %d orders are missing an order action (order_action)\n", missingOrderAction)
	}

	if missingFilledAt > 0 || missingAvgPrice > 0 {
		fmt.Println("\n💡 These orders cannot appear on the chart because:")
		fmt.Println("   - A missing fill time prevents the frontend from locating the candle")
		fmt.Println("   - The frontend filters out a zero fill price (line 164: if (!orderPrice || orderPrice === 0) return)")
		fmt.Println("\n🔧 Possible causes:")
		fmt.Println("   1. UpdateOrderStatus was not called correctly")
		fmt.Println("   2. GetOrderStatus returned data without the avgPrice field")
		fmt.Println("   3. The Lighter exchange order-status query is malfunctioning")
	}

	if missingFilledAt == 0 && missingAvgPrice == 0 && missingOrderAction == 0 {
		fmt.Println("\n✅ All order data is complete!")
		fmt.Println("   If B/S markers still do not appear, check:")
		fmt.Println("   1. Whether the frontend calls the /api/orders API correctly")
		fmt.Println("   2. Whether the browser console reports errors")
		fmt.Println("   3. Whether the order times fall within the chart range")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
