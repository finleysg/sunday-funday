export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
