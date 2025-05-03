import type { Address } from '~/types';

/**
 * Formats an address object into a string.
 * @param address - The address object to format.
 * @returns A formatted address string, or an empty string if the address is null.
 */
export function formatAddress(address: Address | null): string {
    if (!address) return '';
    const { streetName, houseNumber, boxNumber, postcode, municipalityName } = address;
    let formatted = `${streetName} ${houseNumber}`;
    if (boxNumber) {
        formatted += ` / ${boxNumber}`;
    }
    formatted += `, ${postcode} – ${municipalityName}`;
    return formatted;
}

/**
 * Converts a string to camel case.
 * @param str
 */
export function toCamelCase(str: string): string {
    // Split the input string by underscore and convert every part to lower case
    const words = str.split('_').map(word => word.toLowerCase());
    // If there's no word, return an empty string
    if (words.length === 0) return '';
    // Return the first word as is, and capitalize the first letter of every subsequent word
    return words[0] + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

/**
 * Pads a number to 2 digits.
 */
function pad2(n: number): string {
    return n.toString().padStart(2, '0');
}

/**
 * Formats a Date as an RFC3339 string with local timezone offset.
 *
 * @param date - the Date to format
 * @returns yyyy-MM-ddTHH:mm:ss±HH:MM
 */
function formatRFC3339Local(date: Date): string {
    const year   = date.getFullYear();
    const month  = pad2(date.getMonth() + 1);
    const day    = pad2(date.getDate());
    const hour   = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    const second = pad2(date.getSeconds());

    // timezone offset in minutes: positive if behind UTC
    const tzOffsetMin = -date.getTimezoneOffset();
    const sign = tzOffsetMin >= 0 ? '+' : '-';
    const absOffset = Math.abs(tzOffsetMin);
    const offHour = pad2(Math.floor(absOffset / 60));
    const offMin  = pad2(absOffset % 60);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offHour}:${offMin}`;
}

/**
 * Converts an "HH:mm" time string into a full RFC3339 timestamp
 * using today's date.
 *
 * @param timeStr - time in "HH:mm" format
 * @returns RFC3339 timestamp string
 */
export function timeToRFC3339(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    now.setHours(h, m, 0, 0);
    return formatRFC3339Local(now);
}
