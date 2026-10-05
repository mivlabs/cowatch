interface PlateHeaderProps {
  label: string;
  title: React.ReactNode;
  note?: string;
}

/** Left column of a landing section: small mono label, italic title, optional note. */
export function PlateHeader({ label, title, note }: PlateHeaderProps) {
  return (
    <header className="grid content-start gap-2.5">
      <span className="cw-label">{label}</span>
      <h2 className="font-display text-[40px] font-medium italic leading-[1.02] text-balance">{title}</h2>
      {note && <p className="text-sm text-cream-dim">{note}</p>}
    </header>
  );
}
