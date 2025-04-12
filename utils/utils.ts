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

export function toCamelCase(str: string): string {
    // Split the input string by underscore and convert every part to lower case
    const words = str.split('_').map(word => word.toLowerCase());
    // If there's no word, return an empty string
    if (words.length === 0) return '';
    // Return the first word as is, and capitalize the first letter of every subsequent word
    return words[0] + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}
