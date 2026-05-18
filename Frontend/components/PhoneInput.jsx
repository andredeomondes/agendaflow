'use client';
import React, { forwardRef, useCallback, useRef, useState } from 'react';
import { DDI_LIST, DEFAULT_DDI, DEFAULT_ISO2, toE164National, formatDisplayNumber } from '../utils/phone';

/**
 * PhoneInput – controlled</c: \> component.
 *
 * Props
 * ─────
 * value          { ddi, number }  – controlled state (raw nat. digits in `number`)
 * onChange       { ({ ddi, number }) => void }  – called on every change
 * placeholder    string  – placeholder for the number field (default: "")
 * className      string  – extra classes for the wrapper
 * disabled       boolean
 * error          string  – error message shown below the input
 * label          string  – optional label above the field
 */
const PhoneInput = forwardRef(function PhoneInput(
    {
        value = { ddi: DEFAULT_DDI, number: '' },
        onChange,
        placeholder = '',
        className = '',
        disabled = false,
        error,
        label,
    },
    ref
) {
    const [iso2] = useState(() => {
        const entry = DDI_LIST.find((c) => c.code === (value.ddi || DEFAULT_DDI));
        return entry?.iso2 || DEFAULT_ISO2;
    });

    const prevDdiRef = useRef(iso2);
    const handleChangeDDI = useCallback(
        (newDdi) => {
            const prevIso2 = prevDdiRef.current;
            const ddiChanged = newDdi !== value.ddi;

            if (ddiChanged) {
                // Switch ISO2 so national formatter re-applies once
                const entry = DDI_LIST.find((c) => c.code === newDdi);
                if (entry) prevDdiRef.current = entry.iso2;
            }

            onChange?.({ ...value, ddi: newDdi });
        },
        [value, onChange]
    );

    const handleChangeNumber = useCallback(
        (e) => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 20);
            onChange?.({ ...value, number: raw });
        },
        [value, onChange]
    );

    const formatted = formatDisplayNumber(value.number, iso2);

    // Prepare E.164 national for the hidden input (API / submit)
    const e164National = toE164National(value.ddi, value.number);

    // Pass ref down to the number input
    const inputRef = ref || React.createRef();

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label className="block text-sm text-[#a0a0b8] font-medium">{label}</label>
            )}
            <div
                className={`flex rounded-lg overflow-hidden transition-all ${
                    error
                        ? 'ring-1 ring-red-500/50'
                        : 'focus-within:border-rocket-purple focus-within:shadow-[0_0_0_1px_rgba(130,87,229,0.3)]'
                }`}
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
            >
                {/* DDI country selector */}
                <select
                    value={value.ddi}
                    onChange={(e) => handleChangeDDI(e.target.value)}
                    disabled={disabled}
                    className="h-full bg-transparent border-none outline-none text-white text-sm py-2.5 px-3 cursor-pointer focus:ring-0"
                    style={{
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        minWidth: 88,
                        maxWidth: 120,
                    }}
                >
                    {DDI_LIST.map((country) => (
                        <option key={country.code} value={country.code} className="bg-[#1e1b2e]">
                            {country.label} +{country.code}
                        </option>
                    ))}
                </select>

                {/* National number input */}
                <input
                    ref={inputRef}
                    type="tel"
                    inputMode="tel"
                    placeholder={placeholder || '(DDD) 99999-9999'}
                    value={formatted}
                    onChange={handleChangeNumber}
                    disabled={disabled}
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-[#a0a0b8] py-2.5 px-3 min-w-0"
                />
            </div>

            {/* Hidden field with E.164 national value — picked up by parent onSubmit */}
            <input
                type="hidden"
                name="telefone"
                value={e164National}
                readOnly
            />

            {error && (
                <span className="text-xs text-red-400" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
});

export default PhoneInput;
