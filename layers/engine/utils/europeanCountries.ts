import type { CountryCode } from 'libphonenumber-js'

export interface EuropeanCountry {
    code: CountryCode
    prefix: string
    flag: string
}

// Local delivery + neighbouring countries first, then the rest alphabetically by ISO code.
export const EUROPEAN_COUNTRIES: EuropeanCountry[] = [
    { code: 'BE', prefix: '+32', flag: '\u{1F1E7}\u{1F1EA}' },
    { code: 'FR', prefix: '+33', flag: '\u{1F1EB}\u{1F1F7}' },
    { code: 'NL', prefix: '+31', flag: '\u{1F1F3}\u{1F1F1}' },
    { code: 'LU', prefix: '+352', flag: '\u{1F1F1}\u{1F1FA}' },
    { code: 'DE', prefix: '+49', flag: '\u{1F1E9}\u{1F1EA}' },
    { code: 'AD', prefix: '+376', flag: '\u{1F1E6}\u{1F1E9}' },
    { code: 'AL', prefix: '+355', flag: '\u{1F1E6}\u{1F1F1}' },
    { code: 'AT', prefix: '+43', flag: '\u{1F1E6}\u{1F1F9}' },
    { code: 'BA', prefix: '+387', flag: '\u{1F1E7}\u{1F1E6}' },
    { code: 'BG', prefix: '+359', flag: '\u{1F1E7}\u{1F1EC}' },
    { code: 'BY', prefix: '+375', flag: '\u{1F1E7}\u{1F1FE}' },
    { code: 'CH', prefix: '+41', flag: '\u{1F1E8}\u{1F1ED}' },
    { code: 'CY', prefix: '+357', flag: '\u{1F1E8}\u{1F1FE}' },
    { code: 'CZ', prefix: '+420', flag: '\u{1F1E8}\u{1F1FF}' },
    { code: 'DK', prefix: '+45', flag: '\u{1F1E9}\u{1F1F0}' },
    { code: 'EE', prefix: '+372', flag: '\u{1F1EA}\u{1F1EA}' },
    { code: 'ES', prefix: '+34', flag: '\u{1F1EA}\u{1F1F8}' },
    { code: 'FI', prefix: '+358', flag: '\u{1F1EB}\u{1F1EE}' },
    { code: 'FO', prefix: '+298', flag: '\u{1F1EB}\u{1F1F4}' },
    { code: 'GB', prefix: '+44', flag: '\u{1F1EC}\u{1F1E7}' },
    { code: 'GI', prefix: '+350', flag: '\u{1F1EC}\u{1F1EE}' },
    { code: 'GR', prefix: '+30', flag: '\u{1F1EC}\u{1F1F7}' },
    { code: 'HR', prefix: '+385', flag: '\u{1F1ED}\u{1F1F7}' },
    { code: 'HU', prefix: '+36', flag: '\u{1F1ED}\u{1F1FA}' },
    { code: 'IE', prefix: '+353', flag: '\u{1F1EE}\u{1F1EA}' },
    { code: 'IS', prefix: '+354', flag: '\u{1F1EE}\u{1F1F8}' },
    { code: 'IT', prefix: '+39', flag: '\u{1F1EE}\u{1F1F9}' },
    { code: 'LI', prefix: '+423', flag: '\u{1F1F1}\u{1F1EE}' },
    { code: 'LT', prefix: '+370', flag: '\u{1F1F1}\u{1F1F9}' },
    { code: 'LV', prefix: '+371', flag: '\u{1F1F1}\u{1F1FB}' },
    { code: 'MC', prefix: '+377', flag: '\u{1F1F2}\u{1F1E8}' },
    { code: 'MD', prefix: '+373', flag: '\u{1F1F2}\u{1F1E9}' },
    { code: 'ME', prefix: '+382', flag: '\u{1F1F2}\u{1F1EA}' },
    { code: 'MK', prefix: '+389', flag: '\u{1F1F2}\u{1F1F0}' },
    { code: 'MT', prefix: '+356', flag: '\u{1F1F2}\u{1F1F9}' },
    { code: 'NO', prefix: '+47', flag: '\u{1F1F3}\u{1F1F4}' },
    { code: 'PL', prefix: '+48', flag: '\u{1F1F5}\u{1F1F1}' },
    { code: 'PT', prefix: '+351', flag: '\u{1F1F5}\u{1F1F9}' },
    { code: 'RO', prefix: '+40', flag: '\u{1F1F7}\u{1F1F4}' },
    { code: 'RS', prefix: '+381', flag: '\u{1F1F7}\u{1F1F8}' },
    { code: 'SE', prefix: '+46', flag: '\u{1F1F8}\u{1F1EA}' },
    { code: 'SI', prefix: '+386', flag: '\u{1F1F8}\u{1F1EE}' },
    { code: 'SK', prefix: '+421', flag: '\u{1F1F8}\u{1F1F0}' },
    { code: 'SM', prefix: '+378', flag: '\u{1F1F8}\u{1F1F2}' },
    { code: 'TR', prefix: '+90', flag: '\u{1F1F9}\u{1F1F7}' },
    { code: 'UA', prefix: '+380', flag: '\u{1F1FA}\u{1F1E6}' },
    { code: 'VA', prefix: '+379', flag: '\u{1F1FB}\u{1F1E6}' },
    { code: 'XK', prefix: '+383', flag: '\u{1F1FD}\u{1F1F0}' },
]

export function getCountryName(code: CountryCode, locale: string): string {
    try {
        return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
    }
    catch {
        return code
    }
}
