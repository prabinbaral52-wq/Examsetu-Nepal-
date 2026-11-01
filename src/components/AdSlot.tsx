type AdSlotProps = {
  approvedPublicPage: boolean;
  label?: string;
};

export function AdSlot({ approvedPublicPage, label = "Advertisement" }: AdSlotProps) {
  if (!approvedPublicPage) return null;

  return (
    <aside className="ad-slot" aria-label={label}>
      <span>{label}</span>
    </aside>
  );
}
