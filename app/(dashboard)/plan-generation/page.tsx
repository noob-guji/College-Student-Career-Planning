import BlueprintReport from '@/app/components/BlueprintReport';
import SmartEditorTool from '@/app/components/SmartEditorTool';

export default function PlanGeneration() {
    return (
        <div className="relative w-full h-full bg-slate-100 flex overflow-hidden">
            <div className="flex-1 h-full overflow-y-auto scroll-smooth relative">
                <SmartEditorTool />

                <div className="py-12 md:py-20 px-4 max-w-7xl w-full mx-auto">
                    {/* Render the editorial-style report component */}
                    <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-900/5 bg-white">
                        <BlueprintReport />
                    </div>
                </div>
            </div>


        </div>
    );
}
