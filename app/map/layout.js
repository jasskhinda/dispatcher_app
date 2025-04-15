import Header from '@/app/components/Header';

export default function MapLayout({ children }) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 bg-brand-background">
                {children}
            </main>
        </div>
    );
}