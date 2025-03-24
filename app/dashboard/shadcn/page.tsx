"use client";

import React from 'react';
import Link from 'next/link';
import { Container, Typography, DashboardHeader } from '@/components/common';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ShadcnDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Container maxWidth="lg">
        <DashboardHeader 
          title=""
        />
        
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to main dashboard
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
              <CardDescription>Active user count</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">1,245</p>
              <p className="text-sm text-green-600">+12% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
              <CardDescription>Monthly revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$34,578</p>
              <p className="text-sm text-green-600">+8% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Conversion</CardTitle>
              <CardDescription>Conversion rate</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">3.2%</p>
              <p className="text-sm text-red-600">-1% from last month</p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recently Added Items</CardTitle>
            <CardDescription>Latest items added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center p-3 rounded-md border border-gray-200 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                    <span className="text-gray-600 font-medium">{item}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Item #{item}</p>
                    <p className="text-sm text-gray-500">Added on {new Date().toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline">Load More</Button>
          </CardFooter>
        </Card>
        
      </Container>
    </div>
  );
} 