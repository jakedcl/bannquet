type TableProps = {
  caption?: string;
  headers: string[];
  rows: React.ReactNode[][];
};

export function Table({ caption, headers, rows }: TableProps) {
  return (
    <div className="retro-box-inset overflow-x-auto bg-white">
      <table className="w-full border-collapse text-left text-sm">
        {caption ? (
          <caption className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">{caption}</caption>
        ) : null}
        <thead className="bg-beige text-xs uppercase">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border border-border-gray px-3 py-2 font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-border-gray px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
