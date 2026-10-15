const URLS = /(https?:\/\/[^\s]+)/g;

export function LinkedText({ text }: { text: string }) {
  const parts = text.split(URLS);
  return (
    <p className="whitespace-pre-wrap text-sm">
      {parts.map((part, index) => part.startsWith('http://') || part.startsWith('https://') ? (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline">{part}</a>
      ) : (
        <span key={index}>{part}</span>
      ))}
    </p>
  );
}
