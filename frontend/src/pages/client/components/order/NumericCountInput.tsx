import { useEffect, useState } from 'react';

interface NumericCountInputProps {
    value: number;
    onCommit: (value: number) => void;
    disabled?: boolean;
    ariaLabel: string;
}

const sanitizeToDigits = (raw: string) => raw.replace(/\D+/g, '');

const NumericCountInput = ({
    value,
    onCommit,
    disabled,
    ariaLabel,
}: NumericCountInputProps) => {
    const [draft, setDraft] = useState(String(value));

    useEffect(() => {
        setDraft(String(value));
    }, [value]);

    const commit = () => {
        const normalized = sanitizeToDigits(draft);
        const nextValue = normalized === '' ? 0 : Number.parseInt(normalized, 10);
        onCommit(nextValue);
        setDraft(String(nextValue));
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`count zp-counter-input${value <= 0 ? ' zero' : ''}`}
            value={draft}
            disabled={disabled}
            aria-label={ariaLabel}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraft(sanitizeToDigits(event.target.value))}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commit();
                    event.currentTarget.blur();
                }
            }}
        />
    );
};

export default NumericCountInput;
