export default function LoadingSpinner({ size = 'md', fullScreen = false }: { size?: 'sm' | 'md' | 'lg', fullScreen?: boolean }) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    const spinner = (
        <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`} />
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                {spinner}
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center p-8">
            {spinner}
        </div>
    );
}
