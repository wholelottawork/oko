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
	var dryRun bool

	flag.StringVar(&dbPath, "db", "./data/data.db", "Database file path")
	flag.BoolVar(&dryRun, "dry-run", false, "Inspect without repairing (preview mode)")
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

	db := s.DB()

	fmt.Println("\n🔍 Checking for orders that need repair...")

	var needFixFilledAt int
	err = db.QueryRow(`
		SELECT COUNT(*)
		FROM trader_orders
		WHERE status = 'FILLED' AND (filled_at IS NULL OR filled_at = '')
	`).Scan(&needFixFilledAt)
	if err != nil {
		log.Fatalf("❌ Query failed: %v", err)
	}

	fmt.Printf("   📋 Orders missing a fill time: %d\n", needFixFilledAt)

	var needFixAvgPrice int
	err = db.QueryRow(`
		SELECT COUNT(*)
		FROM trader_orders
		WHERE status = 'FILLED' AND (avg_fill_price = 0 OR avg_fill_price IS NULL) AND price > 0
	`).Scan(&needFixAvgPrice)
	if err != nil {
		log.Fatalf("❌ Query failed: %v", err)
	}

	fmt.Printf("   💰 Orders with a zero fill price: %d\n", needFixAvgPrice)

	if needFixFilledAt == 0 && needFixAvgPrice == 0 {
		fmt.Println("\n✅ No orders need repair!")
		return
	}

	if dryRun {
		fmt.Println("\n⚠️  Preview mode (--dry-run); no data will be changed")
		fmt.Println("   Run 'go run scripts/fix_order_data.go' to perform the repair")
		return
	}

	fmt.Println("\n🔧 Starting repair...")

	if needFixFilledAt > 0 {
		result, err := db.Exec(`
			UPDATE trader_orders
			SET filled_at = COALESCE(updated_at, created_at)
			WHERE status = 'FILLED' AND (filled_at IS NULL OR filled_at = '')
		`)
		if err != nil {
			log.Fatalf("❌ Failed to repair fill times: %v", err)
		}
		rows, _ := result.RowsAffected()
		fmt.Printf("   ✅ Repaired fill times for %d orders\n", rows)
	}

	if needFixAvgPrice > 0 {
		result, err := db.Exec(`
			UPDATE trader_orders
			SET avg_fill_price = price,
				filled_quantity = quantity
			WHERE status = 'FILLED'
			  AND (avg_fill_price = 0 OR avg_fill_price IS NULL)
			  AND price > 0
		`)
		if err != nil {
			log.Fatalf("❌ Failed to repair fill prices: %v", err)
		}
		rows, _ := result.RowsAffected()
		fmt.Printf("   ✅ Repaired fill prices for %d orders\n", rows)
	}

	fmt.Println("\n🔍 Verifying repair results...")
	time.Sleep(100 * time.Millisecond)

	var stillMissingFilledAt int
	db.QueryRow(`
		SELECT COUNT(*)
		FROM trader_orders
		WHERE status = 'FILLED' AND (filled_at IS NULL OR filled_at = '')
	`).Scan(&stillMissingFilledAt)

	var stillMissingAvgPrice int
	db.QueryRow(`
		SELECT COUNT(*)
		FROM trader_orders
		WHERE status = 'FILLED' AND (avg_fill_price = 0 OR avg_fill_price IS NULL)
	`).Scan(&stillMissingAvgPrice)

	fmt.Printf("   📋 Still missing a fill time: %d\n", stillMissingFilledAt)
	fmt.Printf("   💰 Still missing a fill price: %d\n", stillMissingAvgPrice)

	if stillMissingFilledAt == 0 && stillMissingAvgPrice == 0 {
		fmt.Println("\n✅ Repair complete! All order data is complete")
		fmt.Println("\n💡 Refresh the chart page; the B/S markers should now appear")
	} else {
		fmt.Println("\n⚠️  Some orders could not be repaired and may require manual review")
	}
}
