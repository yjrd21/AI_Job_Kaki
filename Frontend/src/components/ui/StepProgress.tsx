type Props = { steps: readonly string[]; activeIndex: number; className?: string };

export function StepProgress({ steps, activeIndex, className = "" }: Props) {
  return (
    <ol aria-label="Progress" className={`ui-step-progress ${className}`.trim()}>
      {steps.map((name, index) => (
        <li key={`${index}-${name}`} aria-current={index === activeIndex ? "step" : undefined}
          className={index < activeIndex ? "is-complete" : index === activeIndex ? "is-active" : ""}>
          <span aria-hidden="true" className="ui-step-number">{index < activeIndex ? "✓" : index + 1}</span>
          <span>{name}</span>
        </li>
      ))}
    </ol>
  );
}
