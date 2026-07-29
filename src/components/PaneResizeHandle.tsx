import { useRef } from 'react';

interface PaneResizeHandleProps {
  orientation: 'vertical' | 'horizontal';
  label: string;
  onResize: (delta: number) => void;
  className?: string;
}

export function PaneResizeHandle({
  orientation,
  label,
  onResize,
  className = '',
}: PaneResizeHandleProps) {
  const dragging = useRef(false);
  const lastPosition = useRef(0);

  const getPosition = (event: React.PointerEvent) =>
    orientation === 'vertical' ? event.clientX : event.clientY;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    lastPosition.current = getPosition(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const position = getPosition(event);
    const delta = position - lastPosition.current;
    lastPosition.current = position;
    if (delta !== 0) onResize(delta);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.userSelect = '';
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 40 : 10;
    if (orientation === 'vertical' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      onResize(event.key === 'ArrowRight' ? amount : -amount);
    }
    if (orientation === 'horizontal' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      onResize(event.key === 'ArrowDown' ? amount : -amount);
    }
  };

  const orientationClasses = orientation === 'vertical'
    ? 'w-1.5 cursor-col-resize before:h-10 before:w-px'
    : 'h-1.5 cursor-row-resize before:h-px before:w-10';

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={handleKeyDown}
      className={`
        group shrink-0 touch-none items-center justify-center bg-transparent
        hover:bg-blue-400/10 focus:bg-blue-400/10 focus:outline-none
        before:block before:bg-white/15 before:transition-colors
        hover:before:bg-blue-300/70 focus:before:bg-blue-300/70
        ${orientationClasses} ${className}
      `}
    />
  );
}
