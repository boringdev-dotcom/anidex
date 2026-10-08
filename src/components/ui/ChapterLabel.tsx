interface Props {
  n: number;
  children: string;
}
export function ChapterLabel({ n, children }: Props) {
  return (
    <p className="chapter-label">
      <span className="chapter-label__num num">{String(n).padStart(2, '0')}</span>
      <span className="label label--dot">{children}</span>
    </p>
  );
}
