# Component Structure

This project has been reorganized to follow modern best practices as of 2025. The structure is as follows:

## Directory Structure

```
components/
├── common/               # Common reusable components
│   ├── buttons/          # Button components
│   ├── feedback/         # Feedback components (e.g., Snackbar)
│   ├── forms/            # Form-related components
│   ├── inputs/           # Input components (e.g., Select)
│   ├── layout/           # Layout components
│   ├── media/            # Media-related components (e.g., AttachmentDropZone, ContentPool)
│   ├── modals/           # Basic modal component
│   └── typography/       # Typography components
├── icons/                # Icon components
├── modals/               # Application-specific modals
│   └── DetailsModalParts/# Parts of the Details Modal
├── pages/                # Page components
│   ├── Calendar/         # Calendar page component
│   └── DemoWrapper/      # DemoWrapper page component
└── services/             # Service components
```

## Migration Guide

1. Move each file to its corresponding directory based on its type and functionality.
2. Update imports according to the new paths (refer to `components/helpers/importUpdater.ts` for a detailed reference).
3. Ensure that no functionality is changed during the migration.

## Common Components

Common components are designed to be reusable across the application. They are:
- Small, focused on a single responsibility
- Highly configurable through props
- Styled consistently with the design system
- Well-documented with TypeScript types

## Page Components

Page components are specific to certain pages or feature areas of the application. The main page components are:
- DemoWrapper - The main dashboard/wrapper component
- ContinuousCalendar - The calendar component

## Modal Components

Modal components are separated into two categories:
1. Common modal component: A basic reusable modal that provides the foundation for other modals
2. Specific modal components: Application-specific modals that implement particular functionality

## Services

Service components handle business logic, data fetching, authentication, and other service-related functionalities. 