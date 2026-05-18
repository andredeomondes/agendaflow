import z from 'zod';
import {
    parsePhoneNumberFromString,
    AsYouType,
    isValidPhoneNumber,
} from 'libphonenumber-js';

// ─── Country codes (DDI) ───────────────────────────────────────────────────
// Most common; mostly BR but extensible.
export const DDI_LIST = [
    { code: '55', label: '🇧🇷 BR', dialCode: '+55', iso2: 'BR' },
    { code: '1', label: '🇺🇸 US', dialCode: '+1', iso2: 'US' },
    { code: '44', label: '🇬🇧 GB', dialCode: '+44', iso2: 'GB' },
    { code: '34', label: '🇪🇸 ES', dialCode: '+34', iso2: 'ES' },
    { code: '351', label: '🇵🇹 PT', dialCode: '+351', iso2: 'PT' },
    { code: '54', label: '🇦🇷 AR', dialCode: '+54', iso2: 'AR' },
    { code: '56', label: '🇨🇱 CL', dialCode: '+56', iso2: 'CL' },
    { code: '57', label: '🇨🇴 CO', dialCode: '+57', iso2: 'CO' },
    { code: '58', label: '🇻🇪 VE', dialCode: '+58', iso2: 'VE' },
    { code: '51', label: '🇵🇪 PE', dialCode: '+51', iso2: 'PE' },
    { code: '52', label: '🇲🇽 MX', dialCode: '+52', iso2: 'MX' },
    { code: '31', label: '🇳🇱 NL', dialCode: '+31', iso2: 'NL' },
    { code: '32', label: '🇧🇪 BE', dialCode: '+32', iso2: 'BE' },
    { code: '33', label: '🇫🇷 FR', dialCode: '+33', iso2: 'FR' },
    { code: '41', label: '🇨🇭 CH', dialCode: '+41', iso2: 'CH' },
    { code: '49', label: '🇩🇪 DE', dialCode: '+49', iso2: 'DE' },
    { code: '39', label: '🇮🇹 IT', dialCode: '+39', iso2: 'IT' },
];

export const DEFAULT_DDI = '55';
export const DEFAULT_ISO2 = 'BR';

// ─── Phone number Zod schema ────────────────────────────────────────────────
/**
 * Free-form schema (no DDI inside the value) that calls
 * libphonenumber-js isValidPhoneNumber against a country.
 *
 * Use when validating the *national* digits together with a known DDI/iso2.
 */
const NationalNumberSchema = z.custom(
    (val) => {
        if (typeof val !== 'string') return false;
        const digits = val.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) return false;
        return isValidPhoneNumber(digits, DEFAULT_ISO2);
    },
    { message: 'Número de telefone inválido.' }
);

// Full "phone with DDI" schema (used by form-level schemes)
const PhoneWithDDISchema = z.object({
    ddi: z.string().regex(/^\d{1,5}$/, 'Código do país deve conter 1 a 5 dígitos.').default(DEFAULT_DDI),
    number: z.string().regex(/^[0-9\s\-().]+$/, 'Número de telefone inválido.'), // free-form while typing
});

// Zod chain helper: validates the *national* digits field only
export const phoneNationalDigitsChain = z.string()
    .regex(/^\d+$/, 'Apenas dígitos são permitidos.')
    .min(10, 'Número deve ter no mínimo 10 dígitos.')
    .max(15, 'Número deve ter no máximo 15 dígitos.')
    .superRefine((val, ctx) => {
        if (!isValidPhoneNumber(val, DEFAULT_ISO2)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Telefone inválido para o Brasil.' });
        }
    });

/**
 * Full phone envelope schema for forms.
 * Result after `.parse()`:
 *   { ddi: '55', number: '(11) 98765-4321' }
 *
 * Call `toE164National(parsed)` to get the value to send to the backend (e.g. `55911987654321`).
 */
export const PhoneSchema = PhoneWithDDISchema;

// ─── Helpers ────────────────────────────────────────────────────────────────
function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

/**
 * Build E.164 national string (no leading '+') from DDI + national digits.
 * Example: ddi=55, national="11987654321" → "5511987654321"
 */
export function toE164National(ddi, nationalDigits) {
    const cleanDdi = String(ddi || DEFAULT_DDI).replace(/\D/g, '') || DEFAULT_DDI;
    const digits   = onlyDigits(nationalDigits);
    if (!digits) return '';
    return cleanDdi + digits;
}

/**
 * Format `rawNationalDigits` as AsYouType for the given iso2 country code.
 * Heuristic fallback if libphonenumber throws.
 */
export function formatDisplayNumber(rawNationalDigits, iso2 = DEFAULT_ISO2) {
    const digits = onlyDigits(rawNationalDigits);
    if (digits.length === 0) return '';
    if (digits.length > 20) return digits;
    try {
        // AsYouType returns a human-readable display string as you type
        return new AsYouType(iso2).input(digits);
    } catch {
        if (digits.length <= 11) {
            if (digits.length <= 2) return `(${digits}`;
            if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        }
        return digits;
    }
}

/**
 * Parse a raw input value (local digits only) into a display string
 * in the format (DDD) NNNNN-NNNN using AsYouType for the given ISO2.
 * Falls back to plain digits if libphonenumber throws.
 */
export function formatNationalInput(raw, iso2 = DEFAULT_ISO2) {
    const digits = onlyDigits(raw);
    if (digits.length === 0) return '';
    if (digits.length > 15) return raw;
    try {
        return new AsYouType(iso2).input(digits);
    } catch {
        if (digits.length <= 11) {
            const ddd = digits.slice(0, 2);
            const rest = digits.slice(2);
            if (rest.length <= 5) return `(${ddd}) ${rest}`;
            return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
        }
        return digits;
    }
}

/**
 * Format an E.164 national number (DDI+digits, e.g. "55911987654321")
 * into the display format (DDD) 9NNNN-NNNN.
 */
export function formatNationalPhone(e164NoPrefix) {
    if (!e164NoPrefix) return '';
    const digits = onlyDigits(e164NoPrefix);
    // If it already looks like E.164, strip the country code
    if (digits.length >= 12) {
        const country = digits.slice(0, 2);
        const national = digits.slice(2);
        return formatNationalInput(national, DDI_LIST.find(c => c.code === country)?.iso2 || DEFAULT_ISO2);
    }
    // Treat as national
    return formatNationalInput(digits);
}

/**
 * Extract national (DDD + number) digits from a stored phone string.
 * Works with both legacy "(11) 98765-4321" and E.164 national "5511987654321".
 */
export function extractNationalDigits(storedPhone) {
    if (!storedPhone) return '';
    const digits = onlyDigits(storedPhone);
    if (digits.length <= 11) return digits; // already national or legacy short form
    const brCode = DEFAULT_DDI; // '55'
    if (digits.startsWith(brCode)) {
        return digits.slice(brCode.length);
    }
    return digits;
}

/**
 * Build a WhatsApp wa.me link from a full E.164 national string
 * stored in the DB (e.g. "5511987654321" → https://wa.me/5511987654321).
 */
export function getWhatsAppLink(e164National) {
    if (!e164National) return null;
    const digits = onlyDigits(e164National);
    if (digits.length < 10) return null;
    return `https://wa.me/${digits}`;
}

// ─── Public Zod parse / validate helpers ───────────────────────────────────
export function parsePhone(value, iso2 = DEFAULT_ISO2) {
    return PhoneSchema.safeParse(value);
}

export function validatePhoneNational(digits) {
    return phoneNationalDigitsChain.safeParse(digits);
}
