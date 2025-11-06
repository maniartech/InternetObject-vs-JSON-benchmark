/**
 * Escapes strings for Internet Object format
 * Rules:
 * 1. If string contains comma, double-quote, or needs escaping -> wrap in quotes
 * 2. Escape any double-quotes inside the string
 * 3. Otherwise, return as-is for minimal size
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeString(str) {
  if (typeof str !== 'string') {
    return String(str);
  }

  // Check if string needs quoting (contains special chars)
  const needsQuotes = str.includes(',') ||
                      str.includes('"') ||
                      str.includes('\n') ||
                      str.includes('\r') ||
                      str.trim() !== str; // leading/trailing whitespace

  if (needsQuotes) {
    // Escape any existing double-quotes
    const escaped = str.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  // Return as-is if no special characters
  return str;
}

/**
 * Generates Internet Object schema header
 * @returns {string} IO schema header
 */
export function toIOHeader() {
  return "name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive";
}

/**
 * Converts a record to Internet Object format
 * @param {Object} record - Record to convert
 * @returns {string} IO formatted string
 */
export function toIOData(record) {
  // Format address object
  const addressParts = [escapeString(record.address.street), escapeString(record.address.city)];
  if (record.address.state) {
    addressParts.push(record.address.state);
  }
  const addressStr = `{${addressParts.join(', ')}}`;

  // Format colors array
  const colorsStr = `[${record.colors.join(', ')}]`;

  // Format boolean as T/F
  const isActiveStr = record.isActive ? 'T' : 'F';

  // Format date as d'YYYY-MM-DD'
  const dateStr = `d'${record.joiningDt}'`;

  return `${escapeString(record.name)}, ${record.age}, ${record.gender}, ${dateStr}, ${addressStr}, ${colorsStr}, ${isActiveStr}`;
}

/**
 * Converts a record to JSON format
 * @param {Object} record - Record to convert
 * @returns {string} JSON formatted string
 */
export function toJSON(record) {
  return JSON.stringify(record);
}
