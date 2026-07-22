package main

import (
	"flag"
	"fmt"
	"oko/store"
	"log"
	"os"
	"path/filepath"
)

func main() {
	var dbPath string
	var dryRun bool

	flag.StringVar(&dbPath, "db", "./data/data.db", "Database file path")
	flag.BoolVar(&dryRun, "dry-run", false, "Inspect without deleting (preview mode)")
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

	fmt.Println("\n🔍 Checking for duplicate data...")
	dupOrders, err := orderStore.GetDuplicateOrdersCount()
	if err != nil {
		log.Fatalf("❌ Failed to check duplicate orders: %v", err)
	}
	fmt.Printf("  📋 Duplicate orders: %d\n", dupOrders)

	dupFills, err := orderStore.GetDuplicateFillsCount()
	if err != nil {
		log.Fatalf("❌ Failed to check duplicate fills: %v", err)
	}
	fmt.Printf("  📊 Duplicate fills: %d\n", dupFills)

	if dupOrders == 0 && dupFills == 0 {
		fmt.Println("\n✅ The database has no duplicate records; no cleanup is needed")
		return
	}

	if dryRun {
		fmt.Println("\n⚠️  Preview mode (--dry-run); no data will be deleted")
		fmt.Println("   Run 'go run scripts/cleanup_duplicates.go' to perform the cleanup")
		return
	}

	if dupOrders > 0 {
		fmt.Println("\n🧹 Removing duplicate orders...")
		deleted, err := orderStore.CleanupDuplicateOrders()
		if err != nil {
			log.Fatalf("❌ Cleanup failed: %v", err)
		}
		fmt.Printf("  ✅ Removed %d duplicate orders\n", deleted)
	}

	if dupFills > 0 {
		fmt.Println("\n🧹 Removing duplicate fills...")
		deleted, err := orderStore.CleanupDuplicateFills()
		if err != nil {
			log.Fatalf("❌ Cleanup failed: %v", err)
		}
		fmt.Printf("  ✅ Removed %d duplicate fills\n", deleted)
	}

	fmt.Println("\n🔍 Verifying cleanup results...")
	dupOrdersAfter, _ := orderStore.GetDuplicateOrdersCount()
	dupFillsAfter, _ := orderStore.GetDuplicateFillsCount()
	fmt.Printf("  📋 Remaining duplicate orders: %d\n", dupOrdersAfter)
	fmt.Printf("  📊 Remaining duplicate fills: %d\n", dupFillsAfter)

	if dupOrdersAfter == 0 && dupFillsAfter == 0 {
		fmt.Println("\n✅ Cleanup complete; the database has been deduplicated")
	} else {
		fmt.Println("\n⚠️  Duplicate data remains and may require manual review")
	}
}
