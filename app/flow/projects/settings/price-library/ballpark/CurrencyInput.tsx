"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/shared/ui/primitives/input/input";

interface CurrencyInputProps {
    value?: number;
    onChange?: (val: string) => void;
    className?: string;
    placeholder?: string;
}

export const CurrencyInput = ({ value, onChange, className, placeholder }: CurrencyInputProps) => {
    // Initializes the local display string from the numerical value prop
    // Use an empty string if value is null/undefined to allow clearing
    const [displayValue, setDisplayValue] = useState(
        value !== undefined && value !== null ? new Intl.NumberFormat('id-ID').format(value) : ""
    );

    useEffect(() => {
        // Sync display value when prop changes externally (e.g. initial load or reset)
        // Only update if the numerical equivalent of displayValue differs to avoid cursor jumps on some edge cases
        // But for simple "money" inputs, unconditional update on prop change is usually safer for consistency
        setDisplayValue(
            value !== undefined && value !== null ? new Intl.NumberFormat('id-ID').format(value) : ""
        );
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 1. Get raw input
        let raw = e.target.value;

        // 2. Remove non-numeric chars (except maybe comma if we supported decimal, but IDR usually doesn't need partial cents in this context)
        // For ID format, dots are thousands, commas are decimals.
        // Let's assume standard integer inputs for IDs cost mostly.
        const clean = raw.replace(/[^0-9]/g, "");

        // 3. Format back to display (e.g. 3000 -> 3.000)
        let formatted = "";
        if (clean) {
            formatted = new Intl.NumberFormat('id-ID').format(parseInt(clean));
        }

        // 4. Update local state
        setDisplayValue(formatted);

        // 5. Trigger parent onChange with Raw Value
        if (onChange) {
            onChange(clean);
        }
    };

    return (
        <Input
            value={displayValue}
            onChange={handleChange}
            className={className}
            placeholder={placeholder}
            // Use type="text" to allow formatting chars
            type="text"
            style={{ textAlign: "right" }}
        />
    );
};
