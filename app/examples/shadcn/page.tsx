"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Container, Typography } from '@/components/common';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ShadcnExamplesPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [terms, setTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Form submitted!\nEmail: ${email}\nAgreed to terms: ${terms}\nMessage: ${message}`);
  };

  return (
    <Container maxWidth="lg" className="py-10">
      <div className="flex items-center justify-between mb-8">
        <Typography variant="h1">
          Shadcn UI Examples
        </Typography>
        <Link href="/examples">
          <Button variant="outline">Back to Examples</Button>
        </Link>
      </div>
      
      <Typography variant="body1" className="mb-10">
        This page showcases the shadcn UI components that have been integrated into the project.
      </Typography>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Button Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button styles and variants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Button size="default">Default Size</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button disabled>Disabled</Button>
              <Button asChild>
                <a href="#">As Link</a>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Toggle Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Toggle</CardTitle>
            <CardDescription>Two-state button for toggling between selected and deselected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Toggle>Default</Toggle>
              <Toggle variant="outline">Outline</Toggle>
              <Toggle defaultPressed>Pressed</Toggle>
              <Toggle size="sm">Small</Toggle>
              <Toggle size="lg">Large</Toggle>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Form Example */}
      <Card className="mb-10">
        <CardHeader>
          <CardTitle>Contact Form</CardTitle>
          <CardDescription>Example form using shadcn UI components</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter your email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea 
                id="message" 
                placeholder="Type your message here" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                required 
                className="min-h-32" 
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={terms} 
                onCheckedChange={(checked) => setTerms(checked as boolean)} 
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the terms and conditions
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Submit</Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Card Examples */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Basic Card</CardTitle>
            <CardDescription>A simple card with title and description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is a basic card component with a header, content, and footer.</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost">Cancel</Button>
            <Button>Save</Button>
          </CardFooter>
        </Card>
        
        <Card className={cn("bg-primary text-primary-foreground")}>
          <CardHeader>
            <CardTitle>Primary Card</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              A card with primary background color
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>The card background uses the primary color from the theme.</p>
          </CardContent>
          <CardFooter>
            <Button variant="secondary">Action</Button>
          </CardFooter>
        </Card>
        
        <Card className="border-destructive">
          <CardHeader className="border-b">
            <CardTitle>Custom Border</CardTitle>
            <CardDescription>A card with custom border styling</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p>This card has a custom border color and divider.</p>
          </CardContent>
          <CardFooter className="bg-muted/50">
            <Button variant="destructive">Delete</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="text-center mt-8">
        <Typography variant="body2" color="textSecondary">
          These components are from <a href="https://ui.shadcn.com" className="underline" target="_blank" rel="noopener noreferrer">shadcn/ui</a>, a collection of reusable components built on Radix UI and Tailwind CSS.
        </Typography>
      </div>
    </Container>
  );
} 