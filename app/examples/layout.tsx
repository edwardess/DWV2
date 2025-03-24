"use client";

import React from "react";
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
    <div className="flex min-h-screen bg-gray-50">
      <ExampleSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
} 