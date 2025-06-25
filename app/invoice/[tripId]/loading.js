export default function InvoiceLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Skeleton */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                            <div>
                                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-24 mt-2 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
                            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    {/* Invoice Header Skeleton */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="h-8 bg-white/20 rounded w-48 animate-pulse"></div>
                                <div className="h-4 bg-white/20 rounded w-64 animate-pulse"></div>
                                <div className="mt-4 space-y-1">
                                    <div className="h-3 bg-white/20 rounded w-56 animate-pulse"></div>
                                    <div className="h-3 bg-white/20 rounded w-40 animate-pulse"></div>
                                    <div className="h-3 bg-white/20 rounded w-52 animate-pulse"></div>
                                </div>
                            </div>
                            <div>
                                <div className="bg-white/20 rounded-lg p-4">
                                    <div className="h-6 bg-white/20 rounded w-32 animate-pulse mb-2"></div>
                                    <div className="h-4 bg-white/20 rounded w-24 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Skeleton */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Left Column */}
                            <div>
                                <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse"></div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                        <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                <div className="h-6 bg-gray-200 rounded w-28 mb-4 animate-pulse"></div>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="h-4 bg-gray-200 rounded w-14 animate-pulse"></div>
                                        <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Route Information Skeleton */}
                        <div className="mb-8">
                            <div className="h-6 bg-gray-200 rounded w-36 mb-4 animate-pulse"></div>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
                                            <div>
                                                <div className="h-3 bg-gray-200 rounded w-12 mb-1 animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
                                            <div>
                                                <div className="h-3 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded w-52 animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Service Details Skeleton */}
                        <div className="mb-8">
                            <div className="h-6 bg-gray-200 rounded w-44 mb-4 animate-pulse"></div>
                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 p-4">
                                    <div className="flex justify-between">
                                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="bg-white p-6">
                                    <div className="flex justify-between items-center">
                                        <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-r from-gray-300 to-gray-400 p-6">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-1">
                                            <div className="h-4 bg-white/30 rounded w-24 animate-pulse"></div>
                                            <div className="h-3 bg-white/30 rounded w-20 animate-pulse"></div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="h-8 bg-white/30 rounded w-24 animate-pulse"></div>
                                            <div className="h-3 bg-white/30 rounded w-8 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Status Skeleton */}
                        <div className="border-t pt-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                                </div>
                                <div className="h-10 bg-gray-200 rounded w-36 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Skeleton */}
                <div className="mt-8 text-center space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-80 mx-auto animate-pulse"></div>
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-8 right-8">
                <div className="bg-white rounded-full shadow-lg p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        </div>
    );
}
