# AI Coding Agent Instructions for StackOps Frontend

Welcome to the StackOps frontend codebase! This document provides essential guidelines for AI coding agents to be productive in this project. Please follow these instructions to maintain consistency and quality.

## Project Overview

This is a modern React-based frontend application built with the following key technologies:

- **React Router**: For routing and navigation.
- **Mantine**: For UI styling and components.
- **Vite**: For development and build tooling.
- **TypeScript**: For type safety.
- **Vitest**: For testing.

The application supports server-side rendering, hot module replacement (HMR), and optimized asset bundling.

## Codebase Structure

- **`src/`**: Contains the main application code.
  - **`layouts/`**: Shared layout components, such as `Navbar`.
  - **`pages/`**: Individual pages like `home.tsx` and `test.tsx`.
  - **`providers/`**: Context providers, including `theme.tsx`.
  - **`routes.ts`**: Centralized route definitions.
  - **`global.css`**: Global styles.
- **`public/`**: Static assets like `favicon.ico`.
- **`build/`**: Generated production build files.
- **`vite.config.ts`**: Vite configuration.
- **`vitest.config.ts`**: Vitest configuration.

## Developer Workflows

### Installation

Install dependencies using:

```bash
pnpm install
```

### Development

Start the development server with HMR:

```bash
pnpm run dev
```

The application will be available at `http://localhost:5173`.

### Testing

Run tests using:

```bash
pnpm run test
```

### Building for Production

Create a production build:

```bash
pnpm run build
```

### Docker Deployment

Build and run the application using Docker:

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

## Project-Specific Conventions

- **Routing**: All routes are defined in `src/routes.ts`.
- **Styling**: Mantine is the default styling library. Use Mantine components and theming whenever possible.
- **Testing**: Use Vitest and Testing Library for unit and integration tests.
- **TypeScript**: Ensure all new code is strongly typed.

## Integration Points

- **React Router**: Centralized in `src/routes.ts`.
- **Mantine Theme**: Configured in `src/providers/theme.tsx`.
- **Vite Plugins**: Defined in `vite.config.ts`.

## Examples

### Adding a New Page

1. Create a new file in `src/pages/`, e.g., `about.tsx`.
2. Add the route to `src/routes.ts`:
   ```typescript
   {
     path: '/about',
     element: <About />,
   }
   ```

### Adding a New Layout Component

1. Create a new folder in `src/layouts/`, e.g., `Footer/`.
2. Add the component and export it from `index.tsx`.

---

For any questions or clarifications, refer to the `README.md` or existing code patterns.
