"use client";

import React, { useState } from 'react';
import {
  Button,
  Card,
  Container,
  Typography,
  Input,
  TextArea,
  Select,
  Badge,
  LoadingSpinner,
  FormField
} from '@/components/common';
import { PlusIcon, BellIcon } from '@heroicons/react/24/outline';

export default function ComponentsExamplePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert(`Form submitted!\nName: ${name}\nEmail: ${email}\nCategory: ${category}\nMessage: ${message}`);
    }, 1500);
  };

  return (
    <Container maxWidth="lg" className="py-10">
      <Typography variant="h1" align="center" gutterBottom>
        Component Examples
      </Typography>
      
      <Typography variant="body1" align="center" className="mb-10">
        This page showcases the reusable components created for this project.
      </Typography>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Button Examples */}
        <Card title="Buttons" subtitle="Various button styles and variants">
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Button icon={<PlusIcon className="h-5 w-5" />}>With Icon</Button>
            <Button icon={<PlusIcon className="h-5 w-5" />} iconPosition="right">Icon Right</Button>
            <Button isLoading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>
        
        {/* Badge Examples */}
        <Card title="Badges" subtitle="Status and notification indicators">
          <div className="flex flex-wrap gap-4">
            <Badge content={5}>
              <Button variant="outline">
                Notifications
              </Button>
            </Badge>
            
            <Badge content={99} max={99}>
              <BellIcon className="h-6 w-6" />
            </Badge>
            
            <Badge content={3} color="success">
              <span className="p-2 border rounded">New messages</span>
            </Badge>
            
            <Badge content={7} color="error" variant="outline">
              <span className="p-2 border rounded">Tasks</span>
            </Badge>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <Typography variant="body1">Dot variants:</Typography>
            <Badge variant="dot" color="primary"><span>Primary</span></Badge>
            <Badge variant="dot" color="success"><span>Success</span></Badge>
            <Badge variant="dot" color="warning"><span>Warning</span></Badge>
            <Badge variant="dot" color="error"><span>Error</span></Badge>
          </div>
        </Card>
      </div>
      
      {/* Form Example */}
      <Card 
        title="Contact Form" 
        subtitle="Example form using our components"
        className="mb-10"
        footer={
          <div className="flex justify-end">
            <Button type="submit" form="contact-form" isLoading={isLoading}>
              Submit
            </Button>
          </div>
        }
      >
        {isLoading && <LoadingSpinner fullScreen />}
        <form id="contact-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
            
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
          </div>
          
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'general', label: 'General Inquiry' },
              { value: 'support', label: 'Technical Support' },
              { value: 'billing', label: 'Billing Questions' },
              { value: 'feedback', label: 'Feedback' },
            ]}
            className="mt-4"
            fullWidth
          />
          
          <TextArea
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            className="mt-4"
            fullWidth
          />
        </form>
      </Card>
      
      {/* Typography Example */}
      <Card title="Typography" subtitle="Text style variations">
        <Typography variant="h1" gutterBottom>Heading 1</Typography>
        <Typography variant="h2" gutterBottom>Heading 2</Typography>
        <Typography variant="h3" gutterBottom>Heading 3</Typography>
        <Typography variant="h4" gutterBottom>Heading 4</Typography>
        <Typography variant="h5" gutterBottom>Heading 5</Typography>
        <Typography variant="h6" gutterBottom>Heading 6</Typography>
        <Typography variant="subtitle1" gutterBottom>Subtitle 1</Typography>
        <Typography variant="subtitle2" gutterBottom>Subtitle 2</Typography>
        <Typography variant="body1" gutterBottom>Body 1 - Regular text paragraph with normal font size.</Typography>
        <Typography variant="body2" gutterBottom>Body 2 - Smaller text paragraph.</Typography>
        <Typography variant="caption" gutterBottom>Caption text - Very small text</Typography>
        <Typography variant="overline" gutterBottom>OVERLINE TEXT</Typography>
        
        <div className="mt-4">
          <Typography variant="h6" gutterBottom>Color variations:</Typography>
          <Typography color="primary">Primary Color</Typography>
          <Typography color="secondary">Secondary Color</Typography>
          <Typography color="error">Error Color</Typography>
          <Typography color="textSecondary">Text Secondary</Typography>
        </div>
      </Card>
    </Container>
  );
} 