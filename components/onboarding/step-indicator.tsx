"use client";

interface StepIndicatorProps {
  stepLabels: string[];
  currentStep: number;
  progressPercent: number;
}

export function StepIndicator({
  stepLabels,
  currentStep,
  progressPercent,
}: StepIndicatorProps) {
  return (
    <>
      <div className="flex items-center justify-center mb-4 gap-1 sm:gap-2 sm:-mx-16">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          return (
            <div key={stepNum} className="flex items-center gap-1 sm:gap-2">
              <div className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-0">
                <div
                  className={[
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200/50 dark:shadow-purple-900/50 scale-110"
                      : isDone
                        ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500",
                  ].join(" ")}
                >
                  {isDone ? "✓" : stepNum}
                </div>
                <span
                  className={[
                    "text-[9px] sm:text-[10px] font-medium transition-colors duration-300 hidden sm:block whitespace-nowrap",
                    isActive
                      ? "text-purple-700 dark:text-purple-300"
                      : isDone
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-400 dark:text-gray-500",
                  ].join(" ")}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div
                  className={[
                    "w-3 sm:w-6 h-px sm:mb-5 transition-colors duration-300",
                    stepNum < currentStep
                      ? "bg-green-400 dark:bg-green-600"
                      : "bg-gray-200 dark:bg-gray-700",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile: show current step label */}
      <p className="sm:hidden text-center text-xs font-medium text-purple-700 dark:text-purple-300 -mt-2 mb-2">
        Step {currentStep}: {stepLabels[currentStep - 1]}
      </p>

      {/* 進捗バー */}
      <div className="mb-4 px-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {progressPercent}% 完了
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200/70 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </>
  );
}
