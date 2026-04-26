---
name: "mermaid-diagrams"
description: "Mermaid diagram standards using default theme only, no custom theming. Covers flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, and accessibility compliance."
---

# Mermaid Diagram Standards

This skill defines standards for creating Mermaid diagrams with default theming, accessibility compliance, and universal platform compatibility.

## 1. Core Rule: Default Theme Only

All Mermaid diagrams MUST use the default Mermaid theme. No custom theming is allowed.

### Rules
1. **No `%%{init}` blocks** — Never use theme initialization directives
2. **No `themeVariables`** — Never set custom colors, fonts, or styles
3. **No `style` directives** — Do not use inline `style` node overrides
4. **Default theme only** — Let Mermaid handle all visual styling

### Rationale
- **Light/Dark mode**: Default theme automatically adapts
- **Universal compatibility**: Works across all platforms (GitHub, GitLab, IDEs, browsers)
- **Accessibility**: Default theme provides proper contrast ratios
- **Zero maintenance**: No custom theme variables to maintain

## 2. Supported Diagram Types

### Flowcharts
```mermaid
graph TD
    A[Start] --> B{Is valid?}
    B -->|Yes| C[Process data]
    B -->|No| D[Show error]
    C --> E[Save result]
    D --> F[Request correction]
    F --> B
    E --> G[End]
```

### Sequence Diagrams
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Gateway
    participant S as Service
    participant D as Database

    U->>F: Submit form
    F->>A: POST /api/resource
    A->>S: Validate and process
    S->>D: Insert record
    D-->>S: Record created
    S-->>A: Success response
    A-->>F: 201 Created
    F-->>U: Success message
```

### Class Diagrams
```mermaid
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    class Order {
        +int orderId
        +Date createdAt
        +submit()
        +cancel()
    }
    User "1" --> "*" Order : places
```

### State Diagrams
```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted : submit
    Submitted --> InReview : assign reviewer
    InReview --> Approved : approve
    InReview --> Rejected : reject
    Rejected --> Draft : revise
    Approved --> [*]
```

### ER Diagrams
```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
```

### Gantt Charts
```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
        Requirements    :a1, 2025-01-01, 14d
        Design          :a2, after a1, 10d
    section Phase 2
        Development     :b1, after a2, 30d
        Testing         :b2, after b1, 14d
```

## 3. Accessibility Requirements

- **Descriptive Node Labels**: Use clear, meaningful text (not `A`, `B`, `C`)
- **Logical Flow Direction**: `TD` for hierarchical, `LR` for sequential
- **Meaningful Link Text**: Label edges with descriptive actions
- **Diagram Complexity**: Limit to ~15 nodes per diagram for readability

## 4. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `%%{init: {'theme': 'dark'}}%%` | Remove the init block entirely |
| `style A fill:#ff0000` | Remove all style directives |
| Unlabeled edges | Add descriptive labels |
| 30+ nodes in one diagram | Split into multiple focused diagrams |
| Cryptic node labels | Use descriptive labels |

## References

- [Mermaid.js Official Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)
- [GitHub Mermaid Support](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)
