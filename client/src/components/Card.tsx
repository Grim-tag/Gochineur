interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    footer?: React.ReactNode;
}

export default function Card({ title, children, className = '', footer }: CardProps) {
    return (
        <div className={`bg-background-paper rounded-lg border border-gray-700 shadow-lg overflow-hidden ${className}`}>
            {title && (
                <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-primary">{title}</h3>
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
            {footer && (
                <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700">
                    {footer}
                </div>
            )}
        </div>
    );
}
