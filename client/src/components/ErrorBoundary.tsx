import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    retryAttempts: number;
}

const MAX_AUTO_RETRIES = 2;
const RETRY_DELAYS = [3000, 5000]; // 3s puis 5s

class ErrorBoundary extends Component<Props, State> {
    private retryTimeout: number | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryAttempts: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });

        // Tentative de retry automatique
        const { retryAttempts } = this.state;
        if (retryAttempts < MAX_AUTO_RETRIES) {
            const delay = RETRY_DELAYS[retryAttempts];
            console.log(`Auto-retry ${retryAttempts + 1}/${MAX_AUTO_RETRIES} dans ${delay}ms...`);

            this.retryTimeout = window.setTimeout(() => {
                this.handleRetry();
            }, delay);
        }
    }

    componentWillUnmount() {
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
    }

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryAttempts: prevState.retryAttempts + 1
        }));
    };

    handleManualRetry = () => {
        // Réinitialiser complètement
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            retryAttempts: 0
        });
        window.location.reload();
    };

    render() {
        const { hasError, retryAttempts } = this.state;

        if (hasError) {
            // Si on est encore en phase de retry automatique
            if (retryAttempts < MAX_AUTO_RETRIES) {
                return (
                    <div style={styles.container}>
                        <div style={styles.card}>
                            <div style={styles.logo}>⏳</div>
                            <h1 style={styles.title}>Reconnexion en cours...</h1>
                            <p style={styles.status}>
                                Le serveur se réveille, veuillez patienter quelques instants.
                            </p>
                            <div style={styles.loadingBar}>
                                <div style={styles.loadingProgress}></div>
                            </div>
                            <p style={styles.attemptCounter}>
                                Tentative {retryAttempts + 1}/{MAX_AUTO_RETRIES}...
                            </p>
                        </div>
                    </div>
                );
            }

            // Toutes les tentatives automatiques ont échoué
            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        <div style={styles.logoError}>⚠️</div>
                        <h1 style={styles.titleError}>Service temporairement indisponible</h1>
                        <p style={styles.status}>
                            Nous rencontrons actuellement des difficultés techniques.
                            Notre équipe a été alertée et travaille à résoudre le problème.
                        </p>
                        <button style={styles.retryBtn} onClick={this.handleManualRetry}>
                            Réessayer maintenant
                        </button>
                        <p style={styles.info}>
                            Si le problème persiste, contactez-nous à{' '}
                            <strong>gochineur@gmail.com</strong>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
        textAlign: 'center' as const,
        maxWidth: '600px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '3rem 2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    logo: {
        fontSize: '4rem',
        marginBottom: '1rem',
        animation: 'pulse 2s ease-in-out infinite'
    },
    logoError: {
        fontSize: '4rem',
        marginBottom: '1rem'
    },
    title: {
        color: '#ff6b35',
        fontSize: '1.8rem',
        marginBottom: '1rem',
        fontWeight: 600
    },
    titleError: {
        color: '#ff6b35',
        fontSize: '1.8rem',
        marginBottom: '1rem',
        fontWeight: 600
    },
    status: {
        fontSize: '1.1rem',
        marginBottom: '1.5rem',
        color: '#e0e0e0',
        lineHeight: 1.6
    },
    loadingBar: {
        width: '100%',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
        margin: '2rem 0',
        position: 'relative' as const
    },
    loadingProgress: {
        height: '100%',
        background: 'linear-gradient(90deg, #ff6b35, #ff8555)',
        width: '100%',
        animation: 'loading 3s ease-in-out infinite'
    },
    retryBtn: {
        background: 'linear-gradient(135deg, #ff6b35 0%, #ff8555 100%)',
        color: 'white',
        border: 'none',
        padding: '14px 32px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
        marginTop: '1rem'
    },
    attemptCounter: {
        fontSize: '0.85rem',
        color: '#999',
        marginTop: '1rem'
    },
    info: {
        marginTop: '2rem',
        fontSize: '0.9rem',
        color: '#999'
    }
};

export default ErrorBoundary;
