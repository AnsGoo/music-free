---
name: "task-completion-verifier"
description: "Verifies task completion process for requirements and bug fixes. Invoke after completing a feature or bug fix to ensure proper testing, code submission, and issue updates."
---

# Task Completion Verifier

This skill ensures that every requirement or bug fix is completed following the proper process:

## Process Steps

1. **Write Test Cases**
   - Create comprehensive test cases for the implemented feature or bug fix
   - Ensure tests cover both normal and edge cases
   - Run tests to verify functionality

2. **Self-Test**
   - Test the feature or bug fix manually
   - Verify all requirements are met
   - Check for any regressions

3. **Code Submission**
   - Add all modified files to git
   - Commit changes with a descriptive message
   - Push changes to the remote repository

4. **Issue Update**
   - Update the issue with completion details
   - Include:
     - What was implemented
     - How it was tested
     - Any relevant code changes
   - Close the issue if resolved

## Usage Guidelines

1. **Before invoking**: Complete the feature implementation or bug fix
2. **During invocation**: Follow the step-by-step process
3. **After invocation**: Verify all steps are completed successfully

## Example Workflow

1. Implement feature/bug fix
2. Run this verifier
3. Write and run test cases
4. Perform self-test
5. Commit and push code
6. Update and close issue

## Benefits

- Ensures consistent completion process
- Reduces errors and omissions
- Improves code quality through testing
- Maintains clear issue tracking
- Provides a structured approach to task completion