# E2E Test Scenarios - GTM Map Authentication

## Overview

This document describes end-to-end user journeys for the authentication system. These can be automated using tools like Playwright, Cypress, or tested manually.

---

## Scenario 1: Complete New User Journey (Happy Path) 🎉

### User Story
> As a new user, I want to sign up, verify my email, and start using the app.

### Steps

1. **Land on App**
   - Navigate to `https://your-app.vercel.app`
   - **Verify**: Redirect to `/login` (not authenticated)

2. **Navigate to Signup**
   - Click "Sign up" link
   - **Verify**: URL is `/signup`
   - **Verify**: Form has fields: Full Name, Email, Password

3. **Fill Signup Form**
   - Enter Full Name: "John Doe"
   - Enter Email: "john.doe+test@gmail.com"
   - Enter Password: "SecureP@ss123!"
   - Click "Sign up" button
   - **Verify**: Redirect to `/login?message=Check+your+email+to+verify+your+account`
   - **Verify**: Success message displayed

4. **Check Email**
   - Open email client (john.doe+test@gmail.com)
   - **Verify**: Email from Supabase with subject "Confirm your signup"
   - Click "Confirm your signup" link
   - **Verify**: Redirect to app dashboard (`/`)

5. **First Login (Post-Verification)**
   - **Verify**: UserMenu appears with "John Doe"
   - **Verify**: Dashboard loads with empty prospects
   - **Verify**: ICP Profile modal appears (first-time setup)

6. **Set Up ICP Profile**
   - Fill in ICP details
   - Click "Save"
   - **Verify**: ICP saved, modal closes

7. **Create First Prospect**
   - Click "Add Manually"
   - Enter company name and domain
   - Click "Save"
   - **Verify**: New company appears in prospects list

8. **Logout**
   - Click UserMenu
   - Click "Log out"
   - **Verify**: Redirect to `/login`
   - **Verify**: UserMenu no longer visible

9. **Login Again**
   - Enter email and password
   - Click "Sign in"
   - **Verify**: Redirect to dashboard
   - **Verify**: Previously created prospect still visible
   - **Verify**: ICP profile persists

### Expected Duration
- **Total**: ~5 minutes (including email delivery)
- **Automated**: ~30 seconds (mock email verification)

### Success Criteria
- ✅ User can complete entire flow without errors
- ✅ Email verification works
- ✅ Data persists across sessions
- ✅ Session remains active for 7 days

---

## Scenario 2: Existing User - Daily Login 🔄

### User Story
> As a returning user, I want to log in quickly and resume my work.

### Steps

1. **Navigate to App**
   - Open browser, go to app URL
   - **Verify**: Redirect to `/login` (not authenticated)

2. **Enter Credentials**
   - Enter email: "john.doe@gmail.com"
   - Enter password: "SecureP@ss123!"
   - Click "Sign in"
   - **Verify**: Redirect to `/` within 2 seconds

3. **Resume Work**
   - **Verify**: Previous prospects loaded
   - **Verify**: ICP profile loaded
   - **Verify**: UserMenu shows correct name

4. **Perform Actions**
   - Generate more prospects
   - Update company status
   - Add decision makers
   - **Verify**: All actions succeed without re-authentication

5. **Session Persists Across Tabs**
   - Open new tab, navigate to app
   - **Verify**: Already logged in (no redirect)

### Expected Duration
- **Total**: ~10 seconds (login to dashboard)

### Success Criteria
- ✅ Fast login (<2s)
- ✅ Data loads correctly
- ✅ Session works across tabs

---

## Scenario 3: Password Reset (Forgot Password) 🔐

### User Story
> As a user who forgot my password, I want to reset it securely.

### Steps

1. **Initiate Reset**
   - Navigate to `/login`
   - Click "Forgot password?"
   - **Verify**: Redirect to `/forgot-password`

2. **Request Reset Link**
   - Enter email: "john.doe@gmail.com"
   - Click "Send reset link"
   - **Verify**: Success message appears
   - **Verify**: Redirect to `/login?message=Check+your+email`

3. **Check Email**
   - Open email client
   - **Verify**: Email from Supabase with "Reset Password" link
   - Click link
   - **Verify**: Redirect to `/reset-password?token=...`

4. **Set New Password**
   - Enter new password: "NewSecureP@ss456!"
   - Confirm new password: "NewSecureP@ss456!"
   - Click "Update password"
   - **Verify**: Success message "Password updated"
   - **Verify**: Redirect to `/login`

5. **Login with New Password**
   - Enter email and NEW password
   - Click "Sign in"
   - **Verify**: Login succeeds, redirect to dashboard

6. **Old Password No Longer Works**
   - Log out
   - Try to log in with OLD password ("SecureP@ss123!")
   - **Verify**: Error "Invalid login credentials"

### Expected Duration
- **Total**: ~3 minutes

### Success Criteria
- ✅ Reset email delivered within 1 minute
- ✅ New password works
- ✅ Old password invalidated

---

## Scenario 4: Multi-User Data Isolation 🔒

### User Story
> As a user, I want to ensure my data is private and not visible to other users.

### Steps

1. **Create User A (Alice)**
   - Sign up as alice@test.com
   - Verify email, log in
   - Create 3 companies: "Alice Co 1", "Alice Co 2", "Alice Co 3"
   - Create 1 cluster: "Alice Cluster"
   - Note: User ID (check UserMenu or DB)

2. **Create User B (Bob)**
   - Open **incognito/private** browser window
   - Sign up as bob@test.com
   - Verify email, log in
   - Create 2 companies: "Bob Co 1", "Bob Co 2"
   - Create 1 cluster: "Bob Cluster"

3. **Verify Alice's View**
   - Switch back to Alice's browser
   - Refresh page
   - **Verify**: See only Alice's 3 companies
   - **Verify**: See only "Alice Cluster"
   - **Verify**: No Bob companies visible

4. **Verify Bob's View**
   - Switch to Bob's browser (incognito)
   - Refresh page
   - **Verify**: See only Bob's 2 companies
   - **Verify**: See only "Bob Cluster"
   - **Verify**: No Alice companies visible

5. **API-Level Isolation**
   - As Alice, open DevTools → Network
   - Refresh page
   - Check `GET /api/prospects` response
   - **Verify**: Response contains only Alice's companies
   - Manually call API with Bob's user_id (if possible)
   - **Verify**: Returns 0 rows or error (RLS blocks it)

### Expected Duration
- **Total**: ~10 minutes

### Success Criteria
- ✅ Alice sees only her data
- ✅ Bob sees only his data
- ✅ No cross-user data leakage
- ✅ API enforces RLS

---

## Scenario 5: Session Expiry & Re-authentication ⏰

### User Story
> As a user whose session has expired, I want to be redirected to login without data loss.

### Steps

1. **Normal Login**
   - Log in as test user
   - Create a new company (unsaved state)
   - **Verify**: Dashboard loads, company form open

2. **Simulate Session Expiry**
   - Option A: Wait 7+ days (impractical)
   - Option B: Manually delete Supabase auth cookies in DevTools
   - Option C: Adjust server-side session timeout (for testing)

3. **Trigger Expired Session**
   - After expiry simulation, click any action (e.g., "Save Company")
   - **Verify**: Middleware detects expired session
   - **Verify**: Redirect to `/login`

4. **Re-authenticate**
   - Enter credentials, log in
   - **Verify**: Redirect back to dashboard
   - **Verify**: Unsaved data may be lost (expected behavior)

5. **Session Refresh (Before Expiry)**
   - Log in, wait 30 minutes (but within 7 days)
   - Perform action (e.g., create company)
   - **Verify**: Session auto-refreshes silently
   - **Verify**: No redirect to login

### Expected Duration
- **Total**: ~5 minutes (with manual expiry simulation)

### Success Criteria
- ✅ Expired sessions redirect to login
- ✅ Active sessions auto-refresh
- ✅ No data corruption

---

## Scenario 6: Concurrent Sessions (Multi-Device) 📱💻

### User Story
> As a user, I want to be logged in on multiple devices simultaneously.

### Steps

1. **Login on Device A (Desktop)**
   - Log in on Chrome (Mac)
   - Create Company X
   - **Verify**: Company X appears

2. **Login on Device B (Mobile)**
   - Open Safari on iPhone
   - Log in with same credentials
   - **Verify**: Login succeeds (no conflict)
   - **Verify**: Company X visible on mobile

3. **Create Data on Device B**
   - On iPhone, create Company Y
   - **Verify**: Company Y appears on iPhone

4. **Refresh Device A**
   - Back on desktop, refresh page
   - **Verify**: Company Y now visible (synced)

5. **Logout on Device A**
   - On desktop, log out
   - **Verify**: Desktop redirected to `/login`
   - Switch to iPhone
   - **Verify**: iPhone session still active (independent)

6. **Perform Action on Device B**
   - On iPhone, create Company Z
   - **Verify**: Action succeeds (session not killed by Device A logout)

### Expected Duration
- **Total**: ~5 minutes

### Success Criteria
- ✅ Multiple sessions allowed
- ✅ Data syncs across devices
- ✅ Logout on one device doesn't kill other sessions

---

## Scenario 7: Unauthorized Access Attempts 🚫

### User Story
> As a security tester, I want to verify the app blocks unauthorized access.

### Steps

1. **Access Protected Route (Not Logged In)**
   - Open incognito window
   - Navigate directly to `/` (dashboard)
   - **Verify**: Redirect to `/login`

2. **Access API Endpoint (Not Logged In)**
   - Use curl or Postman
   - `GET https://your-app.vercel.app/api/prospects`
   - **Verify**: 401 Unauthorized or redirect

3. **Attempt SQL Injection**
   - On login page, enter email: `admin' OR '1'='1 --`
   - Enter password: anything
   - Click "Sign in"
   - **Verify**: Login fails, no SQL error shown

4. **Attempt XSS**
   - On signup, enter name: `<script>alert('XSS')</script>`
   - Complete signup
   - **Verify**: Script not executed, name sanitized or rejected

5. **Attempt CSRF (Simulated)**
   - Log in to app
   - Open malicious site (or use curl) that POSTs to `/api/company`
   - **Verify**: Request blocked (SameSite cookie, CORS)

6. **Token Replay Attack**
   - Capture a valid auth token (e.g., from Network tab)
   - Log out
   - Try to use old token to access API
   - **Verify**: Token invalid, request blocked

### Expected Duration
- **Total**: ~10 minutes

### Success Criteria
- ✅ All unauthorized attempts fail
- ✅ No sensitive error messages leaked
- ✅ XSS/SQL injection blocked

---

## Scenario 8: Edge Case - Unverified Email Login Attempt 📧

### User Story
> As a user who signed up but didn't verify my email, I want to understand why I can't log in.

### Steps

1. **Sign Up (Don't Verify)**
   - Go to `/signup`
   - Enter details (email: unverified@test.com)
   - Click "Sign up"
   - **Verify**: Redirect to login with message
   - **Do NOT click verification email link**

2. **Attempt Login (Unverified)**
   - Go to `/login`
   - Enter email and password
   - Click "Sign in"
   - **Verify**: Error "Email not confirmed"
   - **Verify**: Remain on login page

3. **Verify Email Later**
   - Open email, click verification link
   - **Verify**: Redirect to dashboard, logged in

4. **Login Now Works**
   - Log out
   - Log in again
   - **Verify**: Login succeeds

### Expected Duration
- **Total**: ~3 minutes

### Success Criteria
- ✅ Unverified users cannot log in
- ✅ Clear error message
- ✅ Login works after verification

---

## Automation Recommendations

### Tools
- **Playwright** (recommended): Multi-browser, great for Next.js
- **Cypress**: Popular, good DX
- **Puppeteer**: Headless Chrome only

### Key Tests to Automate
1. ✅ **Signup + Email Verification** (mock email)
2. ✅ **Login + Dashboard Load**
3. ✅ **Data Isolation** (2 users)
4. ✅ **Session Expiry**
5. ✅ **Unauthorized Access**

### Example Playwright Test (Pseudocode)

```javascript
test('Complete signup and login flow', async ({ page }) => {
  // Navigate to signup
  await page.goto('/signup');
  
  // Fill form
  await page.fill('[name="fullName"]', 'John Doe');
  await page.fill('[name="email"]', 'john@test.com');
  await page.fill('[name="password"]', 'SecureP@ss123!');
  await page.click('button[type="submit"]');
  
  // Expect redirect to login
  await expect(page).toHaveURL(/\/login\?message=/);
  
  // Mock email verification (bypass Supabase)
  await mockSupabaseVerification('john@test.com');
  
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'john@test.com');
  await page.fill('[name="password"]', 'SecureP@ss123!');
  await page.click('button[type="submit"]');
  
  // Expect dashboard
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="user-menu"]')).toContainText('John Doe');
});
```

---

## Summary

**Total Scenarios**: 8  
**Critical**: 5 (Scenarios 1, 2, 4, 5, 7)  
**Important**: 2 (Scenarios 3, 6)  
**Nice-to-Have**: 1 (Scenario 8)

**Automation Priority**: Scenarios 1, 2, 4, 7

---

## Notes

- All scenarios assume Supabase is configured correctly with RLS
- Email delivery times may vary (1-60 seconds typical)
- For automated tests, consider mocking email verification
- Use test-specific Supabase project (not production)

