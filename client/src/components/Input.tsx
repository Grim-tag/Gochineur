interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export default function Input({
    label,
    error,
    helperText,
    className = '',
    ...props
}: InputProps) {
    const baseStyles = 'w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:outline-none text-text-primary transition-colors';
    const normalStyles = 'border-gray-600 focus:ring-primary focus:border-primary';
    const errorStyles = 'border-red-500 focus:ring-red-500 focus:border-red-500';

    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-text-secondary">
                    {label}
                </label>
            )}
            <input
                className={`${baseStyles} ${error ? errorStyles : normalStyles} ${className}`}
                {...props}
            />
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-sm text-text-secondary">{helperText}</p>
            )}
        </div>
    );
}
