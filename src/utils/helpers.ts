/**
 * =============================================================================
 * HELPER FUNCTIONS
 * Small, reusable utilities used across commands and modules.
 * =============================================================================
 */

/**
 * Returns a random emoji from a playful list.
 */
export function getRandomEmoji(): string {
  const list = ["😭", "😄", "😌", "🤓", "😎", "😤", "🤖", "🌏", "📸", "💿", "👋", "🌊", "✨"];
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Capitalizes the first letter of a word.
 * "rock" → "Rock"
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Picks a random element from an array.
 */
export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Formats a Date into a readable short string.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
