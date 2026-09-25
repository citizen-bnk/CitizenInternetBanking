import Shell from "@/components/Shell";
import { BankProvider } from "@/lib/bank";

export default function BankLayout({ children }: { children: React.ReactNode }) {
  return (
    <BankProvider>
      <Shell>{children}</Shell>
    </BankProvider>
  );
}
