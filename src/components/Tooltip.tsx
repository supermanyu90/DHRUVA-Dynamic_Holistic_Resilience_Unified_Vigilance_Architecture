interface TooltipProps {
  x: number;
  y: number;
  content: string;
}

export function Tooltip({ x, y, content }: TooltipProps) {
  return (
    <div
      id="tooltip"
      style={{
        display: 'block',
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {content}
    </div>
  );
}
