# EduBridge: Git Collaboration & Workflow Guide

To ensure code quality and prevent the main branch from breaking, all developers must strictly follow this Git workflow. 

**Do NOT commit directly to the `main` branch under any circumstances.**

---

## 1. Branch Naming Convention

When starting a new piece of work, create a separate branch. Use a descriptive name prefixed with the type of work you are doing:

- **Feature:** `feat/short-description` (e.g., `feat/teacher-grading-ui`)
- **Bug Fix:** `fix/short-description` (e.g., `fix/auth-middleware-crash`)
- **Documentation:** `docs/short-description` (e.g., `docs/api-readme`)
- **Refactoring:** `refactor/short-description` (e.g., `refactor/button-component`)

### How to create your branch:
First, ensure you have the latest code from the main branch:
```bash
git checkout main
git pull origin main
```
Then, create and switch to your new branch:
```bash
git checkout -b feat/your-feature-name
```

---

## 2. Making Commits

Commit your changes frequently as you work. This makes it easier to track progress and revert mistakes.

1. **Write clear commit messages:** A commit message should describe *what* you changed and *why*.
2. **Keep commits focused:** Try to group related changes together.

```bash
git add .
git commit -m "Add dynamic routing for Vice Principal dashboard"
```

---

## 3. Creating a Pull Request (PR)

Once your feature is complete and you have tested it locally, it's time to merge it into the main codebase via a Pull Request.

### Step 1: Push your branch to GitHub
```bash
git push origin feat/your-feature-name
```

### Step 2: Open the Pull Request on GitHub
1. Go to the repository on GitHub.
2. You will see a banner saying "Compare & pull request" for your newly pushed branch. Click it.
3. **Fill out the PR description thoroughly:**
   - What does this PR do?
   - What issue/SRS requirement does it resolve?
   - How can a reviewer test it? (e.g., "Log in as teacher@demo.school.et and click the 'Grades' tab").
4. Assign at least one other team member to review your code.

### Step 3: Peer Review
- Do **NOT** merge your own Pull Request.
- Wait for a team member to review your code and approve it.
- If they request changes, make the changes locally, commit them, and push again. The PR will update automatically.

---

## 4. Merging & Cleanup

Once your PR is approved:
1. Click the **"Squash and merge"** or **"Merge pull request"** button on GitHub.
2. Delete your branch on GitHub using the "Delete branch" button provided after merging.
3. Switch back to `main` on your local machine and pull the latest updates.

```bash
git checkout main
git pull origin main
git branch -d feat/your-feature-name # Deletes the branch locally
```

By following this workflow, we ensure that the `main` branch always contains production-ready, peer-reviewed code!
