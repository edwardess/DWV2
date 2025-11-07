import { Container } from '@/components/common';
import ExampleSidebar from "@/components/common/navigation/ExampleSidebar";

export const metadata = {
  title: 'Component Examples',
  description: 'Showcase of reusable components',
};

export default function ExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container>
      <div className="flex min-h-screen">
        <ExampleSidebar />
        <main className="flex-1 p-4">{children}</main>
      </div>
    </Container>
  );
} 