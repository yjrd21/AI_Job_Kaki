// Describe the ordered step labels and currently active step.
type Props = {
  steps: readonly string[];
  activeIndex: number;
  className?: string;
};

// Display workflow progress with the current step identified for assistive technology.
export function StepProgress({ steps, activeIndex, className = "" }: Props) {
  return (
    <ol
      aria-label="Progress"
      className={`ui-step-progress ${className}`.trim()}
    >
      {steps.map((name, index) => (
        <li
          key={`${index}-${name}`}
          aria-current={index === activeIndex ? "step" : undefined}
          className={
            index < activeIndex
              ? "is-complete"
              : index === activeIndex
                ? "is-active"
                : ""
          }
        >
          <span aria-hidden="true" className="ui-step-number">
            {index < activeIndex ? "✓" : index + 1}
          </span>
          <span>{name}</span>
        </li>
      ))}
    </ol>
  );
}
