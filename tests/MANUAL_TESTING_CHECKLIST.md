# Manual Testing Checklist - GTM Map Authentication

## Test Environment Setup

- [ ] **Supabase Project**: Confirm project is running with RLS enabled
- [ ] **Environment Variables**: All Supabase env vars set locally and on Vercel
- [ ] **Database Migration**: `migrations/auth_migration_safe.sql` executed successfully
- [ ] **Test Accounts**: Create 2-3 test user accounts for testing

---

## Phase 1: User Signup Flow ✅

### Test Case 1.1: Successful Signup
- [ ] Navigate to `/signup`
- [ ] Enter valid details:
  - Full Name: "Test User"
  - Email: "test@example.com"
  - Password: "SecureP@ss123!" (8+ chars, uppercase, lowercase, number, special)
- [ ] Click "Sign up"
- [ ] **Expected**: Redirect to `/login?message=Check your email to verify your account`
- [ ] Check email inbox for verification link
- [ ] **Expected**: Email from Supabase with "Confirm your signup" link

### Test Case 1.2: Email Verification
- [ ] Open verification email
- [ ] Click "Confirm your signup" link
- [ ] **Expected**: Redirect to app dashboard (logged in)
- [ ] Check Supabase Dashboard > Authentication > Users
- [ ] **Expected**: New user appears with `email_confirmed_at` timestamp
- [ ] Check database `profiles` table
- [ ] **Expected**: New row with `id = auth.users.id`, `full_name = "Test User"`
- [ ] Check database `user_settings` table
- [ ] **Expected**: New row with `user_id = auth.users.id`, `timezone = 'Europe/London'`

### Test Case 1.3: Duplicate Email (Edge Case)
- [ ] Navigate to `/signup`
- [ ] Enter email that already exists
- [ ] Click "Sign up"
- [ ] **Expected**: Error message "User already registered"
- [ ] **Expected**: No duplicate rows in `auth.users`

### Test Case 1.4: Weak Password (Edge Case)
- [ ] Navigate to `/signup`
- [ ] Enter weak password (e.g., "123")
- [ ] Click "Sign up"
- [ ] **Expected**: Error message about password requirements
- [ ] **Expected**: User not created

### Test Case 1.5: Invalid Email (Edge Case)
- [ ] Navigate to `/signup`
- [ ] Enter invalid email (e.g., "notanemail")
- [ ] Click "Sign up"
- [ ] **Expected**: Error message "Invalid email"

---

## Phase 2: User Login Flow 🔐

### Test Case 2.1: Successful Login (Verified User)
- [ ] Navigate to `/login`
- [ ] Enter verified user credentials
- [ ] Click "Sign in"
- [ ] **Expected**: Redirect to `/` (dashboard)
- [ ] **Expected**: UserMenu displays in top-right with user's name
- [ ] **Expected**: Session cookie set (check DevTools > Application > Cookies)

### Test Case 2.2: Login Before Email Verification
- [ ] Create new account but DON'T verify email
- [ ] Navigate to `/login`
- [ ] Enter credentials
- [ ] Click "Sign in"
- [ ] **Expected**: Error message "Email not confirmed"
- [ ] **Expected**: Remain on login page

### Test Case 2.3: Invalid Credentials
- [ ] Navigate to `/login`
- [ ] Enter wrong password
- [ ] Click "Sign in"
- [ ] **Expected**: Error message "Invalid login credentials"
- [ ] **Expected**: Remain on login page

### Test Case 2.4: Non-Existent User
- [ ] Navigate to `/login`
- [ ] Enter email that doesn't exist
- [ ] Click "Sign in"
- [ ] **Expected**: Error message "Invalid login credentials" (don't leak user existence)

---

## Phase 3: Session Management 🕒

### Test Case 3.1: Session Persistence
- [ ] Log in successfully
- [ ] Close browser tab
- [ ] Open new tab and navigate to app URL
- [ ] **Expected**: Still logged in (no redirect to login)

### Test Case 3.2: Session Refresh
- [ ] Log in successfully
- [ ] Wait 5 minutes (or adjust session timeout)
- [ ] Perform an action (e.g., create a company)
- [ ] **Expected**: Action succeeds, session auto-refreshed
- [ ] Check Network tab for `Set-Cookie` headers

### Test Case 3.3: Session Expiry (7 Days)
- [ ] Log in successfully
- [ ] Manually adjust system clock forward 8 days
- [ ] Refresh page
- [ ] **Expected**: Redirect to `/login` (session expired)

### Test Case 3.4: Concurrent Sessions (Multi-Device)
- [ ] Log in on Device A (e.g., Chrome on Mac)
- [ ] Log in on Device B (e.g., Safari on iPhone)
- [ ] Perform actions on both devices
- [ ] **Expected**: Both sessions active simultaneously
- [ ] **Expected**: Data syncs across devices

---

## Phase 4: Logout Flow 🚪

### Test Case 4.1: Successful Logout
- [ ] Log in successfully
- [ ] Click UserMenu (top-right)
- [ ] Click "Log out"
- [ ] **Expected**: Redirect to `/login`
- [ ] **Expected**: Session cookie removed
- [ ] Try to access `/` directly
- [ ] **Expected**: Redirect to `/login` (middleware protection)

### Test Case 4.2: Logout Clears All Data
- [ ] Log in
- [ ] Log out
- [ ] Check DevTools > Application > Cookies
- [ ] **Expected**: No Supabase auth cookies
- [ ] Check LocalStorage/SessionStorage
- [ ] **Expected**: No auth tokens stored

---

## Phase 5: Password Reset Flow 🔄

### Test Case 5.1: Request Password Reset
- [ ] Navigate to `/login`
- [ ] Click "Forgot password?"
- [ ] **Expected**: Redirect to `/forgot-password`
- [ ] Enter verified user email
- [ ] Click "Send reset link"
- [ ] **Expected**: Success message "Check your email for a password reset link"
- [ ] Check email inbox
- [ ] **Expected**: Email from Supabase with "Reset Password" link

### Test Case 5.2: Complete Password Reset
- [ ] Open password reset email
- [ ] Click "Reset Password" link
- [ ] **Expected**: Redirect to `/reset-password` with token in URL
- [ ] Enter new password (e.g., "NewSecureP@ss456!")
- [ ] Click "Update password"
- [ ] **Expected**: Success message "Password updated successfully"
- [ ] **Expected**: Redirect to `/login`
- [ ] Log in with new password
- [ ] **Expected**: Login succeeds

### Test Case 5.3: Old Password No Longer Works
- [ ] Complete password reset (Test 5.2)
- [ ] Try to log in with OLD password
- [ ] **Expected**: Error "Invalid login credentials"

### Test Case 5.4: Reset Link Expiry (Edge Case)
- [ ] Request password reset
- [ ] Wait for link to expire (default: 1 hour)
- [ ] Click expired reset link
- [ ] **Expected**: Error message "Reset link expired"
- [ ] **Expected**: Option to request new link

### Test Case 5.5: Non-Existent Email (Security)
- [ ] Navigate to `/forgot-password`
- [ ] Enter email that doesn't exist
- [ ] Click "Send reset link"
- [ ] **Expected**: Generic success message (don't leak user existence)
- [ ] **Expected**: No email sent

---

## Phase 6: Authorization & RLS 🔒

### Test Case 6.1: Data Isolation (Two Users)
- [ ] Create User A (alice@test.com) with 3 companies
- [ ] Create User B (bob@test.com) with 2 companies
- [ ] Log in as User A
- [ ] **Expected**: See only Alice's 3 companies
- [ ] Log out, log in as User B
- [ ] **Expected**: See only Bob's 2 companies
- [ ] **Expected**: Bob's companies have different IDs (no overlap)

### Test Case 6.2: Protected API Routes
- [ ] Log out (or use incognito)
- [ ] Try to access `/api/prospects` directly (e.g., via curl/Postman)
- [ ] **Expected**: 401 Unauthorized or redirect to login
- [ ] Log in
- [ ] Try same API call
- [ ] **Expected**: 200 OK with user's data

### Test Case 6.3: Middleware Protection
- [ ] Log out
- [ ] Try to access `/` (dashboard)
- [ ] **Expected**: Redirect to `/login`
- [ ] Try to access any protected route
- [ ] **Expected**: Redirect to `/login`

---

## Phase 7: Edge Cases & Security 🛡️

### Test Case 7.1: SQL Injection Attempts
- [ ] Try logging in with email: `admin' OR '1'='1`
- [ ] **Expected**: Login fails, no SQL error
- [ ] Try signing up with malicious name: `<script>alert('XSS')</script>`
- [ ] **Expected**: Name sanitized or rejected

### Test Case 7.2: CSRF Protection
- [ ] Log in on your app
- [ ] Open malicious site (simulate) that sends POST to `/api/company`
- [ ] **Expected**: Request blocked (Supabase handles this)

### Test Case 7.3: Rate Limiting (If Implemented)
- [ ] Attempt 10+ failed logins rapidly
- [ ] **Expected**: Rate limit kicks in, temp block or CAPTCHA

### Test Case 7.4: Invalid Token in URL
- [ ] Navigate to `/reset-password?token=invalid-token-12345`
- [ ] **Expected**: Error message "Invalid or expired token"

---

## Phase 8: Mobile & Cross-Browser 📱

### Test Case 8.1: Mobile Safari (iOS)
- [ ] Signup flow works
- [ ] Login flow works
- [ ] Session persists across app switches
- [ ] Logout works

### Test Case 8.2: Mobile Chrome (Android)
- [ ] Signup flow works
- [ ] Login flow works
- [ ] Session persists
- [ ] Logout works

### Test Case 8.3: Desktop Browsers
- [ ] Chrome (Mac/Windows)
- [ ] Safari (Mac)
- [ ] Firefox (Mac/Windows)
- [ ] Edge (Windows)

### Test Case 8.4: Responsive Design
- [ ] Login/Signup forms look good on mobile (320px width)
- [ ] UserMenu accessible on mobile
- [ ] No horizontal scrolling

---

## Phase 9: Performance & UX ⚡

### Test Case 9.1: Login Speed
- [ ] Time from "Sign in" click to dashboard load
- [ ] **Expected**: < 2 seconds on good connection

### Test Case 9.2: Email Delivery Speed
- [ ] Time from "Sign up" to email received
- [ ] **Expected**: < 1 minute

### Test Case 9.3: Session Refresh (Transparent)
- [ ] Leave app open for 30+ minutes
- [ ] Perform action
- [ ] **Expected**: No visible delay, session refreshes silently

---

## Phase 10: Post-Deployment Verification ✅

### Test Case 10.1: Production Signup
- [ ] Navigate to live app (Vercel URL)
- [ ] Create new account with real email
- [ ] **Expected**: Verification email received from Supabase
- [ ] **Expected**: Can verify and log in

### Test Case 10.2: Production RLS
- [ ] Run SQL tests in production Supabase (see `rls-security-tests.sql`)
- [ ] **Expected**: All tests pass

### Test Case 10.3: HTTPS & Security Headers
- [ ] Check browser DevTools > Network > Response Headers
- [ ] **Expected**: `strict-transport-security: max-age=...`
- [ ] **Expected**: `x-frame-options: DENY`
- [ ] **Expected**: `x-content-type-options: nosniff`

### Test Case 10.4: Monitoring & Logs
- [ ] Check Vercel logs for auth errors
- [ ] Check Supabase logs for failed login attempts
- [ ] Set up alerts for anomalies (e.g., 100+ failed logins)

---

## Summary

**Total Test Cases**: 37  
**Critical**: 15  
**Important**: 14  
**Nice-to-Have**: 8

---

## Notes for Tester

- Use **real email addresses** for signup/verification tests (not disposable)
- Test on **actual devices** (not just DevTools mobile mode)
- Document any **unexpected behavior** with screenshots
- For RLS tests, use Supabase SQL Editor with the provided script

---

## Sign-Off

**Tester Name**: _______________  
**Date**: _______________  
**Pass Rate**: _____% (_____ / 37)  
**Critical Failures**: _____  
**Notes**: 

