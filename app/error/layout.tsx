export default function ErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0d0f1a] overflow-y-auto">
      {children}
    </div>
  );
}
