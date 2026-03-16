interface MedlemmerProps {
  fadderbarn: string[];
  faddere: { name: string; phone: string }[];
}

export default function Medlemmer({ fadderbarn, faddere }: MedlemmerProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card p-8">
      <div className="grid gap-8 md:grid-cols-2 m-8">
        {/* Fadderbarn Section */}
        <div>
          <h3 className="mb-6 text-lg text-card-foreground">
            Fadderbarn
          </h3>
          <ul className="space-y-3">
            {fadderbarn.map((barn, index) => (
              <li
                key={`fadderbarn-${index}`}
                className="text-base text-muted-foreground transition-colors"
              >
                {barn}
              </li>
            ))}
          </ul>
        </div>

        {/* Faddere Section */}
        <div>
          <h3 className="mb-6 text-lg text-card-foreground">
            Faddere
          </h3>
          <ul className="space-y-3">
            {faddere.map((fadder, index) => (
              <li
                key={`fadder-${index}`}
                className="flex items-start justify-between gap-4"
              >
                <span className="text-base text-muted-foreground transition-colors">
                  {fadder.name}
                </span>
                <a
                  href={`tel:${fadder.phone.replace(/\s/g, '')}`}
                  className="whitespace-nowrap text-base text-muted-foreground transition-colors hover:text-sky-500 dark:hover:text-sky-400"
                >
                  {fadder.phone}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}