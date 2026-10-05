type Props = {
  text: string | null;
  className?: string;
};

export function SpeechBubble({ text, className }: Props) {
  if (!text) return null;
  return (
    <div className={`speech-bubble ${className ?? ''}`} role="status" aria-live="polite">
      <span>{text}</span>
    </div>
  );
}
