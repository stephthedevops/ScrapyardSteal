---
title: "TypeScript Standards"
description: "Google TypeScript Style Guide compliance, security practices, and performance optimization"
version: "1.0.0"
lastUpdated: "2025-10-22"
lastUpdatedBy: "AI Assistant"
taskId: "SYNC-018"
inclusion: "fileMatch"
patterns: ["**/*.{ts,tsx,js,jsx}"]
---

# TypeScript Standards

Following [Google's TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), [Google's JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html), and [Google's Security Best Practices](https://developers.google.com/tech/security).

## Google's TypeScript Style Guide

### File Organization
- **File Names**: Use `kebab-case` for files: `user-profile.ts`, `api-client.ts`
- **Directory Names**: Use `kebab-case` for directories: `user-management/`, `api-services/`
- **Module Names**: Use `PascalCase` for modules: `UserProfile`, `ApiClient`

### Type Definitions

#### Interface Patterns
```typescript
// Recommended interface structure
interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Discriminated unions
type ApiResponse<T> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };

// Utility types
type PartialUser = Partial<User>;
type UserKeys = keyof User;
type UserValues = User[UserKeys];
```

#### Type Guards
```typescript
// Type guard pattern
function isUser(obj: unknown): obj is User {
  return obj !== null &&
         typeof obj === 'object' &&
         'id' in obj &&
         'name' in obj &&
         'email' in obj;
}

// Type assertion function
function assertUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error('Invalid user object');
  }
}
```

### Coding Patterns

#### Function Declarations
```typescript
// Function pattern
function createUser(userData: CreateUserRequest): Promise<User> {
  // Implementation
}

// Async function pattern
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return response.json();
}

// Arrow function pattern
const formatUserName = (user: User): string => {
  return `${user.name} (${user.email})`;
};
```

#### Class Patterns
```typescript
// Class structure
class UserService {
  private readonly apiClient: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  async getUser(id: string): Promise<User> {
    return this.apiClient.get<User>(`/users/${id}`);
  }
  
  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.apiClient.post<User>('/users', userData);
  }
}
```

## Security Standards

### Input Validation and Sanitization
```typescript
// ❌ Bad - No validation
const userInput = req.body.data;

// ✅ Good - Recommended validation
interface ValidatedInput {
  readonly data: string;
  readonly sanitized: boolean;
}

function validateAndSanitize(input: unknown): ValidatedInput {
  if (typeof input !== 'string') {
    throw new SecurityException('Invalid input type');
  }
  
  const sanitized = DOMPurify.sanitize(input);
  
  return {
    data: sanitized,
    sanitized: true
  };
}
```

### Naming Conventions

#### Variables and Functions
- **Variables**: `camelCase`: `userName`, `apiClient`
- **Functions**: `camelCase`: `getUser`, `createUser`
- **Constants**: `UPPER_SNAKE_CASE`: `API_BASE_URL`, `MAX_RETRY_COUNT`
- **Classes**: `PascalCase`: `UserService`, `ApiClient`
- **Interfaces**: `PascalCase`: `User`, `ApiResponse`
- **Types**: `PascalCase`: `UserStatus`, `ApiResult`

#### File and Directory Names
- **Files**: `kebab-case`: `user-profile.tsx`, `api-client.ts`
- **Directories**: `kebab-case`: `user-management/`, `api-services/`
- **Components**: `PascalCase`: `UserProfile.tsx`, `ApiClient.ts`

## Best Practices Summary

1. **Defense in Depth** - Multiple security layers
2. **Fail Securely** - Graceful security failures
3. **Least Privilege** - Minimal necessary permissions
4. **Type Safety** - Always use strict TypeScript configuration
5. **Immutability** - Use `readonly` for immutable data
6. **Error Handling** - Use proper error types and result patterns
7. **Performance** - Use memoization and code splitting
8. **Testing** - Write comprehensive unit tests
9. **Documentation** - Use JSDoc for public APIs
10. **Security** - Validate and sanitize all inputs
11. **Organization** - Follow file and naming conventions

### References

- **[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)**
- **[Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)**
- **[Google Security Best Practices](https://developers.google.com/tech/security)**
