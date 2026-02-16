interface MedlemmerProps {
  fadderbarn: string[];
  faddere: { name: string; phone: string }[];
}

export default function Medlemmer({ fadderbarn, faddere }: MedlemmerProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 p-8 backdrop-blur-sm">
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5" />
      
      <div className="relative z-10 grid gap-8 md:grid-cols-2 m-8">
        {/* Fadderbarn Section */}
        <div>
          <h3 className="mb-6 text-lg text-white">
            Fadderbarn
          </h3>
          <ul className="space-y-3">
            {fadderbarn.map((barn, index) => (
              <li
                key={`fadderbarn-${index}`}
                className="text-base text-slate-400 transition-colors"
              >
                {barn}
              </li>
            ))}
          </ul>
        </div>

        {/* Faddere Section */}
        <div>
          <h3 className="mb-6 text-lg text-white">
            Faddere
          </h3>
          <ul className="space-y-3">
            {faddere.map((fadder, index) => (
              <li
                key={`fadder-${index}`}
                className="flex items-start justify-between gap-4"
              >
                <span className="text-base text-slate-400 transition-colors">
                  {fadder.name}
                </span>
                <a
                  href={`tel:${fadder.phone.replace(/\s/g, '')}`}
                  className="whitespace-nowrap text-base text-slate-400 transition-colors hover:text-sky-400"
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