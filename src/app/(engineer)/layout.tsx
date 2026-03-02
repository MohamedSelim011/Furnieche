import { BottomNav } from "@/components/layout/bottom-nav";

export default function EngineerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
