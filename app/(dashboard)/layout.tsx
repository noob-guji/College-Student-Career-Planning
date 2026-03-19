import Sidebar from '@/app/components/Sidebar'
import Header from '@/app/components/Header'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden relative">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#F8FAFC]">
                <Header />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
