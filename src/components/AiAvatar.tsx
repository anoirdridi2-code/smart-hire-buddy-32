import { useVoiceGender } from "@/components/VoiceControls";

/**
 * Avatar IA du recruteur virtuel : visage stylisé en SVG dont la bouche
 * s'anime pendant la lecture vocale de la question.
 */
export function AiAvatar({
  speaking,
  label = "Recruteur IA",
  className = "",
}: {
  speaking: boolean;
  label?: string;
  className?: string;
}) {
  const gender = useVoiceGender();

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative">
        <span
          className={`absolute inset-0 rounded-full bg-primary/25 ${
            speaking ? "animate-ping" : "opacity-0"
          }`}
          aria-hidden
        />
        <div
          className={`relative grid size-24 place-items-center rounded-full border-2 bg-gradient-to-b from-primary/15 to-background transition-colors sm:size-28 ${
            speaking ? "border-primary" : "border-border/70"
          }`}
        >
          <svg viewBox="0 0 100 100" className="size-20 sm:size-24" role="img" aria-label={label}>
            {/* cheveux */}
            {gender === "female" ? (
              <path
                d="M22 52c0-18 12-30 28-30s28 12 28 30c0 6-2 10-4 12 2-16-6-24-24-24s-26 8-24 24c-2-2-4-6-4-12Z"
                className="fill-primary/70"
              />
            ) : (
              <path
                d="M24 46c2-16 13-24 26-24s24 8 26 24c-4-6-12-10-26-10s-22 4-26 10Z"
                className="fill-primary/70"
              />
            )}
            {/* visage */}
            <ellipse cx="50" cy="54" rx="24" ry="27" className="fill-muted" />
            {/* yeux */}
            <g className="fill-foreground">
              <ellipse cx="41" cy="50" rx="2.6" ry="3.2">
                <animate
                  attributeName="ry"
                  values="3.2;0.4;3.2"
                  dur="4s"
                  keyTimes="0;0.04;0.08"
                  repeatCount="indefinite"
                />
              </ellipse>
              <ellipse cx="59" cy="50" rx="2.6" ry="3.2">
                <animate
                  attributeName="ry"
                  values="3.2;0.4;3.2"
                  dur="4s"
                  keyTimes="0;0.04;0.08"
                  repeatCount="indefinite"
                />
              </ellipse>
            </g>
            {/* bouche */}
            <ellipse cx="50" cy="66" rx="8" ry={speaking ? 5 : 1.6} className="fill-foreground/80">
              {speaking && (
                <animate
                  attributeName="ry"
                  values="1.6;5.5;2.5;6;1.8"
                  dur="0.7s"
                  repeatCount="indefinite"
                />
              )}
            </ellipse>
          </svg>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {label} · {speaking ? "parle…" : "à l'écoute"}
      </p>
    </div>
  );
}
