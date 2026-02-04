import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class OrderEditErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Order Edit Error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>

                        <h2 className="mt-4 text-xl font-bold text-center text-gray-900 dark:text-gray-100">
                            حدث خطأ غير متوقع
                        </h2>

                        <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
                            عذراً، حدث خطأ أثناء تحميل صفحة تعديل الطلب. يرجى المحاولة مرة أخرى.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-md">
                                <p className="text-xs font-mono text-red-800 dark:text-red-400 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 font-medium"
                            >
                                إعادة المحاولة
                            </button>
                            <button
                                onClick={() => window.history.back()}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                            >
                                رجوع
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default OrderEditErrorBoundary;
