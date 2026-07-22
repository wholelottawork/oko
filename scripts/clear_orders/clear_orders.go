package main

import (
	"bufio"
	"flag"
	"fmt"
	"oko/store"
	"log"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	var dbPath string
	var force bool

	flag.StringVar(&dbPath, "db", "./data/data.db", "Database file path")
	flag.BoolVar(&force, "force", false, "Delete without confirmation")
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

	var orderCount, fillCount int
	db.QueryRow(`SELECT COUNT(*) FROM trader_orders`).Scan(&orderCount)
	db.QueryRow(`SELECT COUNT(*) FROM trader_fills`).Scan(&fillCount)

	fmt.Printf("\n📊 Current data summary:\n")
	fmt.Printf("   trader_orders: %d records\n", orderCount)
	fmt.Printf("   trader_fills:  %d records\n", fillCount)

	if orderCount == 0 && fillCount == 0 {
		fmt.Println("\n✅ The tables are already empty")
		return
	}

	if !force {
		fmt.Println("\n⚠️  Warning: this permanently deletes all order and fill records!")
		fmt.Print("\nConfirm deletion by entering 'yes': ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		if input != "yes" {
			fmt.Println("\n❌ Operation canceled")
			return
		}
	}

	fmt.Println("\n🗑️  Clearing tables...")

	result, err := db.Exec(`DELETE FROM trader_fills`)
	if err != nil {
		log.Fatalf("❌ Failed to clear trader_fills: %v", err)
	}
	fillsDeleted, _ := result.RowsAffected()
	fmt.Printf("   ✅ Deleted %d fill records\n", fillsDeleted)

	result, err = db.Exec(`DELETE FROM trader_orders`)
	if err != nil {
		log.Fatalf("❌ Failed to clear trader_orders: %v", err)
	}
	ordersDeleted, _ := result.RowsAffected()
	fmt.Printf("   ✅ Deleted %d order records\n", ordersDeleted)

	_, err = db.Exec(`DELETE FROM sqlite_sequence WHERE name IN ('trader_orders', 'trader_fills')`)
	if err == nil {
		fmt.Println("   ✅ Reset autoincrement ID counters")
	}

	db.QueryRow(`SELECT COUNT(*) FROM trader_orders`).Scan(&orderCount)
	db.QueryRow(`SELECT COUNT(*) FROM trader_fills`).Scan(&fillCount)

	fmt.Printf("\n🔍 Verification results:\n")
	fmt.Printf("   trader_orders: %d records\n", orderCount)
	fmt.Printf("   trader_fills:  %d records\n", fillCount)

	if orderCount == 0 && fillCount == 0 {
		fmt.Println("\n✅ Tables cleared successfully!")
		fmt.Println("\n💡 You can now restart the trader for testing")
		fmt.Println("   New orders will start at ID=1")
	} else {
		fmt.Println("\n⚠️  Cleanup did not complete; inspect the database")
	}
}
