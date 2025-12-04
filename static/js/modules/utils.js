// Helper to parse SQLite UTC strings ("YYYY-MM-DD HH:MM:SS") as UTC
export function parseUTCDate(dateString) {
    if (!dateString) return null;
    // Replace space with T and append Z to indicate UTC
    // Example: "2023-10-27 10:00:00" -> "2023-10-27T10:00:00Z"
    return new Date(dateString.replace(' ', 'T') + 'Z');
}
