# Verification Guide

To test the changes, run the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 1. Test Navigation & Breadcrumbs
- **Action**: Navigate to deep pages like `Flow > Projects > [Project Name] > Setup > WBS`.
- **Expected**: check that the Breadcrumb at the top correctly shows the path (e.g., `Flow / Projects / ... / WBS`).
- **Action**: Click on "Projects" in the breadcrumb.
- **Expected**: It should navigate you back to the Projects list.

## 2. Test Empty States
- **Action**: Go to `Flow > Expense` or `Flow > Supply`.
- **Expected**: You should see the new "Empty State" component (icon + title + description + action button) instead of a dashed box.
- **Action**: Go to `Feel > Culture` or `Feel > Crew`.
- **Expected**: Similar premium empty state styling.

## 3. Test Select Component Keyboard Navigation
- **Action**: Go to `Flow > Projects`.
- **Action**: Find the "Group By" or any other dropdown (Select component).
- **Test Steps**:
    1. Click the dropdown to open it.
    2. Press **Arrow Down** / **Arrow Up** to highlight options.
    3. Press **Enter** to select an option.
    4. Press **Escape** to close the dropdown without selecting.
    5. (Advanced) Tab to the dropdown trigger and press **Space** or **Enter** to open it.
