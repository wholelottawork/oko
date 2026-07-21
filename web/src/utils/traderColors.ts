// Trader color configuration - unified color assignment logic
// Used in ComparisonChart and Leaderboard to ensure color consistency

export const TRADER_COLORS = [
  '#60a5fa', // blue-400
  '#c084fc', // purple-400
  '#34d399', // emerald-400
  '#fb923c', // orange-400
  '#f472b6', // pink-400
  '#818cf8', // indigo-400
  '#38bdf8', // sky-400
  '#a78bfa', // violet-400
  '#4ade80', // green-400
  '#fb7185', // rose-400
]

/**
 *  Get color based on trader's index position
 *  @param traders - trader list
 *  @param traderId - ID of the current trader
 *  @returns corresponding color value
 */
export function getTraderColor(
  traders: Array<{ trader_id: string }>,
  traderId: string
): string {
  const traderIndex = traders.findIndex((t) => t.trader_id === traderId)
  if (traderIndex === -1) return TRADER_COLORS[0] // Returns the first color by default
  // If the color pool size is exceeded, recycle
  return TRADER_COLORS[traderIndex % TRADER_COLORS.length]
}
