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
