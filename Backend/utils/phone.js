const DEFAULT_DDI = '55';

function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function cleanDdi(ddi = DEFAULT_DDI) {
    const digits = onlyDigits(ddi);
    return digits || DEFAULT_DDI;
}

function normalizePhone(phone, ddi = DEFAULT_DDI) {
    const raw = String(phone || '').trim();
    const countryCode = cleanDdi(ddi);
    let digits = onlyDigits(raw);

    if (!digits) return '';

    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }

    const hasExplicitCountryCode = raw.startsWith('+') || raw.startsWith('00');

    if (!hasExplicitCountryCode) {
        if (countryCode === DEFAULT_DDI) {
            if (!digits.startsWith(DEFAULT_DDI) && (digits.length === 10 || digits.length === 11)) {
                digits = `${DEFAULT_DDI}${digits}`;
            }
        } else if (!digits.startsWith(countryCode)) {
            digits = `${countryCode}${digits}`;
        }
    }

    return `+${digits}`;
}

function isValidPhone(phone, ddi = DEFAULT_DDI) {
    const normalized = normalizePhone(phone, ddi);
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return false;

    const digits = onlyDigits(normalized);
    const countryCode = cleanDdi(ddi);

    if (countryCode === DEFAULT_DDI && digits.startsWith(DEFAULT_DDI)) {
        const national = digits.slice(DEFAULT_DDI.length);
        return /^\d{2}\d{8,9}$/.test(national);
    }

    return true;
}

function normalizePhoneOrThrow(phone, ddi = DEFAULT_DDI) {
    const normalized = normalizePhone(phone, ddi);
    if (!isValidPhone(normalized, ddi)) {
        throw new Error('Telefone inválido. Informe DDI, DDD e número no padrão internacional.');
    }
    return normalized;
}

module.exports = {
    DEFAULT_DDI,
    onlyDigits,
    cleanDdi,
    normalizePhone,
    isValidPhone,
    normalizePhoneOrThrow
};