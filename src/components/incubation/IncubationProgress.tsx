import { Check } from "lucide-react";
import type { WorkIncubationStatus } from "@prisma/client";
import { getProgressIndex, getProgressLabel, incubationProgressStages } from "@/lib/operation-growth";

type IncubationProgressProps = {
  status: WorkIncubationStatus;
};

export function IncubationProgress({ status }: IncubationProgressProps) {
  const activeIndex = getProgressIndex(status);

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-[660px] items-start gap-2 md:min-w-0">
        {incubationProgressStages.map((stage, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;
          return (
            <div key={stage} className="flex min-w-0 flex-1 items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <div
                  className={`flex size-8 items-center justify-center rounded-full border text-xs font-semibold ${
                    isActive
                      ? "border-ink bg-ink text-white"
                      : isDone
                        ? "border-ink bg-white text-ink"
                        : "border-black/10 bg-paper text-ink/30"
                  }`}
                >
                  {isDone ? <Check size={15} /> : index + 1}
                </div>
                <p className={`mt-2 text-center text-[11px] font-semibold leading-4 ${isActive ? "text-ink" : isDone ? "text-ink/60" : "text-ink/32"}`}>
                  {getProgressLabel(stage)}
                </p>
              </div>
              {index < incubationProgressStages.length - 1 ? <div className={`mt-4 h-px flex-1 ${index < activeIndex ? "bg-ink" : "bg-black/10"}`} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
