// Grafik batang 14 hari, SVG murni (tanpa lib chart).

export default function Grafik({
  deret,
}: {
  deret: { tanggal: string; masuk: number; keluar: number }[];
}) {
  const W = 560;
  const H = 180;
  const padB = 22;
  const maks = Math.max(1, ...deret.flatMap((d) => [d.masuk, d.keluar]));
  const sk = (n: number) => (H - padB - 10) * (n / maks);
  const slot = W / Math.max(1, deret.length);
  const bw = Math.min(16, (slot - 8) / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", border: "1px solid #ccc" }} role="img">
      {deret.map((d, i) => {
        const x = i * slot + (slot - bw * 2 - 4) / 2;
        const hM = sk(d.masuk);
        const hK = sk(d.keluar);
        return (
          <g key={d.tanggal}>
            <rect x={x} y={H - padB - hM} width={bw} height={hM} fill="#16a34a">
              <title>{`${d.tanggal} masuk ${d.masuk}`}</title>
            </rect>
            <rect x={x + bw + 4} y={H - padB - hK} width={bw} height={hK} fill="#dc2626">
              <title>{`${d.tanggal} keluar ${d.keluar}`}</title>
            </rect>
            {i % 2 === 0 && (
              <text x={x} y={H - 8} fontSize="9" fill="#666">
                {d.tanggal.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <g fontSize="11">
        <rect x={8} y={6} width={10} height={10} fill="#16a34a" />
        <text x={22} y={15}>masuk</text>
        <rect x={80} y={6} width={10} height={10} fill="#dc2626" />
        <text x={94} y={15}>keluar</text>
      </g>
    </svg>
  );
}
