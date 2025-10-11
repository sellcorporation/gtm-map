# Edge Cases & Security Testing - GTM Map Authentication

## Overview

This document covers uncommon scenarios, error conditions, and security vulnerabilities to test.

---

## 1. Authentication Edge Cases 🔐

### 1.1 Token Manipulation

**Test**: Modified JWT Token
```bash
# Steps:
1. Log in successfully
2. Open DevTools > Application > Cookies
3. Find Supabase auth cookie
4. Modify the token value (change 1 character)
5. Refresh page

# Expected:
- Middleware rejects invalid token
- Redirect to /login
- Error logged (but not shown to user)
```

**Test**: Expired Access Token
```bash
# Steps:
1. Log in
2. Wait for access token to expire (default: 1 hour)
3. Perform action (e.g., create company)

# Expected:
- Supabase automatically refreshes token using refresh token
- Action succeeds without user noticing
- New access token in cookies
```

**Test**: Missing Refresh Token
```bash
# Steps:
1. Log in
2. Delete refresh token cookie manually
3. Wait for access token to expire
4. Try to access protected route

# Expected:
- Cannot refresh session
- Redirect to /login
- User must re-authenticate
```

---

### 1.2 Session Edge Cases

**Test**: Concurrent Logins (Same User, Different Locations)
```bash
# Scenario: User logs in from home, then from office
# Expected: Both sessions active (multi-device support)

# Steps:
1. Login from Browser A (Chrome, Location: Home)
2. Login from Browser B (Firefox, Location: Office)
3. Verify both sessions active
4. Logout from Browser A
5. Verify Browser B session still active
```

**Test**: Zombie Session (Orphaned Browser Tab)
```bash
# Scenario: User closes laptop for 3 days, then reopens

# Steps:
1. Login on laptop
2. Close laptop (sleep mode) for 7+ days
3. Wake laptop, app tab still open
4. Try to perform action

# Expected:
- Session expired (7-day TTL)
- Middleware catches expired session
- Redirect to /login
```

**Test**: Session Fixation Attack
```bash
# Scenario: Attacker tries to use a pre-set session ID

# Steps:
1. Attacker creates a session ID
2. Tricks victim into using that session
3. Attacker tries to access victim's session

# Expected:
- Supabase Auth prevents session fixation
- Each login creates a new session token
- Old tokens invalidated
```

---

### 1.3 Email Verification Edge Cases

**Test**: Click Verification Link Twice
```bash
# Steps:
1. Sign up (receive verification email)
2. Click verification link → redirected to app
3. Click same link again (from email)

# Expected:
- First click: Verify succeeds, redirect to app
- Second click: Already verified, redirect to app (no error)
```

**Test**: Verification Link After 24 Hours
```bash
# Steps:
1. Sign up
2. Wait 24+ hours (without verifying)
3. Click verification link

# Expected:
- Link expired
- Show error: "Verification link expired"
- Provide "Resend verification email" button
```

**Test**: Sign Up with Already-Verified Email
```bash
# Steps:
1. User A signs up with alice@test.com, verifies
2. User A tries to sign up again with same email

# Expected:
- Error: "User already registered"
- No duplicate entry in auth.users
```

---

### 1.4 Password Edge Cases

**Test**: Very Long Password (100+ chars)
```bash
# Steps:
1. Sign up with password: (100 characters)
2. Complete signup
3. Login with same 100-char password

# Expected:
- Signup succeeds (or fails gracefully if limit exists)
- Login works with full password
```

**Test**: Password with Unicode/Emoji
```bash
# Steps:
1. Sign up with password: "Pаssword123!😀" (Cyrillic 'а', emoji)
2. Login with same password

# Expected:
- Supabase handles Unicode correctly
- Login succeeds
```

**Test**: Password Reset for Non-Existent Email
```bash
# Steps:
1. Go to /forgot-password
2. Enter email: nonexistent@test.com
3. Submit

# Expected:
- Generic success message ("Check your email")
- No email sent (security: don't leak user existence)
```

**Test**: Multiple Password Reset Requests (Rate Limiting)
```bash
# Steps:
1. Request password reset 10 times in 1 minute

# Expected:
- Supabase rate limits (e.g., 3 requests/hour)
- Later requests return 429 Too Many Requests
```

---

## 2. Security Vulnerabilities 🛡️

### 2.1 SQL Injection

**Test**: Login Form SQL Injection
```bash
# Attack Vector: Email field
Input: admin' OR '1'='1' --
Password: anything

# Expected:
- Login fails
- Supabase parameterizes queries (immune to SQL injection)
- No SQL error exposed to user
```

**Test**: Signup Form SQL Injection
```bash
# Attack Vector: Full Name field
Input: John'; DROP TABLE companies; --

# Expected:
- Name stored as literal string
- No SQL executed
- No tables dropped
```

---

### 2.2 Cross-Site Scripting (XSS)

**Test**: Reflected XSS in URL
```bash
# Attack: Inject script in URL parameter
URL: /login?message=<script>alert('XSS')</script>

# Expected:
- Message parameter sanitized before rendering
- No script execution
- Show error or ignore malicious input
```

**Test**: Stored XSS in User Data
```bash
# Attack: Store malicious script in profile name
Steps:
1. Sign up with name: <img src=x onerror=alert('XSS')>
2. View profile in UserMenu

# Expected:
- Name sanitized on save or display
- No script execution
- React escapes HTML by default (good!)
```

**Test**: XSS in Company Name
```bash
# Attack: Create company with malicious name
Steps:
1. Add company with name: <svg/onload=alert('XSS')>
2. View company in prospects list

# Expected:
- Name displayed as plain text
- No script execution
```

---

### 2.3 Cross-Site Request Forgery (CSRF)

**Test**: CSRF on Company Creation
```bash
# Attack: Malicious site sends POST to /api/company
Steps:
1. User logs into GTM Map
2. User visits malicious site
3. Malicious site sends: POST /api/company {name: "Hacked Co"}

# Expected:
- Request blocked by Supabase Auth (SameSite cookies)
- Or blocked by CORS policy
- No company created
```

**Test**: CSRF on Password Change
```bash
# Attack: Malicious site triggers password reset
Steps:
1. User logs in
2. Visits malicious site
3. Site sends: POST /api/auth/reset-password

# Expected:
- Supabase requires confirmation token
- Cannot change password via CSRF
```

---

### 2.4 Broken Access Control

**Test**: Direct Object Reference (IDOR)
```bash
# Attack: User A tries to access User B's company
Steps:
1. User A logs in, gets company ID: 123
2. User B logs in, gets company ID: 456
3. User A sends: GET /api/company?id=456

# Expected:
- RLS blocks access
- Returns 0 rows or 403 Forbidden
- User A cannot see User B's data
```

**Test**: Privilege Escalation (Change User ID)
```bash
# Attack: User A tries to insert data for User B
Steps:
1. User A logs in
2. User A sends: POST /api/company {user_id: "USER_B_UUID", name: "Fake Co"}

# Expected:
- RLS prevents INSERT with wrong user_id
- Or middleware overwrites user_id with auth.uid()
- No data created for User B
```

---

### 2.5 Session Hijacking

**Test**: Steal Session Cookie
```bash
# Attack: Attacker steals victim's session cookie (e.g., via XSS)
Steps:
1. Victim logs in (session cookie: abc123)
2. Attacker copies cookie to their browser
3. Attacker navigates to app

# Expected:
- Supabase cookies have HttpOnly flag (XSS can't steal)
- Secure flag (only sent over HTTPS)
- SameSite flag (CSRF protection)
```

**Test**: Man-in-the-Middle (MitM)
```bash
# Attack: Intercept unencrypted traffic
Scenario: User on public WiFi, attacker intercepts login request

# Expected:
- All traffic over HTTPS (enforced by Vercel)
- HSTS header forces HTTPS
- Attacker cannot intercept credentials
```

---

### 2.6 Denial of Service (DoS)

**Test**: Excessive Signup Requests
```bash
# Attack: Bot sends 1000 signup requests
Steps:
1. Script sends POST /signup 1000 times

# Expected:
- Supabase rate limits (e.g., 10 signups/minute per IP)
- Later requests return 429 Too Many Requests
- No database overflow
```

**Test**: Large Password (Memory Exhaustion)
```bash
# Attack: Sign up with 1MB password
Steps:
1. Send signup request with 1,000,000 character password

# Expected:
- Supabase rejects (e.g., max 72 bytes for bcrypt)
- Or server rejects before processing
- No memory exhaustion
```

---

## 3. Data Integrity Edge Cases 💾

### 3.1 Concurrent Modifications

**Test**: Two Users Modify Same Company Simultaneously
```bash
# Scenario: User A and User B both edit Company X

# Steps:
1. User A opens Company X in modal
2. User B opens Company X in modal
3. User A changes name to "Updated by A", saves
4. User B changes name to "Updated by B", saves

# Expected:
- Last write wins (User B's change)
- Or optimistic locking prevents conflict
- No data corruption
```

**Test**: User Deletes Company While Generating Clusters
```bash
# Scenario: Race condition during AI generation

# Steps:
1. Start "Analyze & Generate Clusters" (long-running)
2. Immediately delete a company that's being analyzed

# Expected:
- Cluster generation continues (or gracefully aborts)
- No orphaned cluster references deleted company
- No 500 errors
```

---

### 3.2 Orphaned Data

**Test**: Delete User with Companies
```bash
# Scenario: User account deleted, but companies remain

# Steps:
1. User A creates 10 companies
2. Admin deletes User A from auth.users

# Expected:
- ON DELETE CASCADE triggers
- All User A's companies deleted automatically
- All User A's clusters deleted
- No orphaned data
```

**Test**: Delete Cluster with Ads
```bash
# Steps:
1. Create cluster with 5 ads
2. Delete cluster

# Expected:
- ON DELETE CASCADE triggers
- All 5 ads deleted automatically
- No orphaned ads
```

---

## 4. Network & Infrastructure Edge Cases 🌐

### 4.1 Slow Network

**Test**: Login on 3G Connection
```bash
# Simulate: Throttle network to 3G in DevTools

# Steps:
1. Throttle to "Slow 3G"
2. Enter credentials, click "Sign in"

# Expected:
- Shows loading spinner
- Request completes in 5-10 seconds
- No timeout error
```

**Test**: Signup on Flaky Connection
```bash
# Simulate: Toggle network on/off during signup

# Steps:
1. Fill signup form
2. Click "Sign up"
3. Immediately disconnect network
4. Reconnect after 5 seconds

# Expected:
- Request retries or fails gracefully
- Shows error: "Network error, please try again"
- No partial account created
```

---

### 4.2 Server Errors

**Test**: Supabase Downtime
```bash
# Simulate: Supabase service unavailable

# Steps:
1. Temporarily block Supabase API in hosts file
2. Try to log in

# Expected:
- Shows error: "Service unavailable"
- Graceful fallback (not a crash)
- User can retry later
```

**Test**: Database Connection Lost
```bash
# Scenario: Vercel loses connection to database

# Steps:
1. Log in successfully
2. Simulate DB disconnect (e.g., firewall rule)
3. Try to fetch prospects

# Expected:
- API returns 500 or 503
- Error logged in Vercel
- User sees: "Database error, please try again"
```

---

## 5. Browser & Device Edge Cases 📱

### 5.1 Browser Quirks

**Test**: Disable Cookies
```bash
# Steps:
1. Disable cookies in browser settings
2. Try to log in

# Expected:
- Error: "Cookies required for authentication"
- Or login fails gracefully
```

**Test**: Private/Incognito Mode
```bash
# Steps:
1. Open incognito window
2. Log in
3. Close incognito window
4. Reopen incognito, navigate to app

# Expected:
- Session not persisted (expected)
- Redirect to /login
```

**Test**: Old Browser (Safari 12)
```bash
# Scenario: User on outdated browser

# Expected:
- Polyfills handle modern JS
- Or show "Browser not supported" message
```

---

### 5.2 Mobile Edge Cases

**Test**: App in Background for Hours (Mobile Safari)
```bash
# Steps:
1. Login on iPhone
2. Switch to another app for 6 hours
3. Return to app (still in background)

# Expected:
- Session still active (or auto-refreshes)
- No forced logout
```

**Test**: Rotate Screen During Login
```bash
# Steps:
1. Start login on portrait
2. Rotate to landscape mid-login
3. Complete login

# Expected:
- Form adapts to landscape
- No loss of input data
- Login succeeds
```

---

## 6. Testing Tools & Scripts 🔧

### 6.1 Automated Security Scan

```bash
# Use OWASP ZAP or Burp Suite
zap-cli quick-scan https://your-app.vercel.app

# Expected:
- No critical vulnerabilities
- SQL injection: PASS
- XSS: PASS
- CSRF: PASS
```

### 6.2 Load Testing (Login Endpoint)

```bash
# Use Apache Bench or Artillery
ab -n 1000 -c 10 https://your-app.vercel.app/api/auth/login

# Expected:
- 95% requests < 500ms
- No 500 errors
- Rate limiting kicks in at ~100 req/min
```

### 6.3 Penetration Testing Checklist

- [ ] SQL Injection (all forms)
- [ ] XSS (reflected, stored, DOM-based)
- [ ] CSRF (all state-changing actions)
- [ ] IDOR (access control)
- [ ] Session hijacking
- [ ] Brute force login
- [ ] Password reset abuse
- [ ] Email enumeration
- [ ] Rate limiting bypass

---

## Summary

**Total Edge Cases**: 35+  
**Security Tests**: 15  
**Data Integrity Tests**: 5  
**Network Tests**: 4  
**Browser/Device Tests**: 6

**Priority**: Focus on security tests (IDOR, XSS, SQL injection) first.

---

## Next Steps

1. **Run RLS Tests**: Execute `rls-security-tests.sql` in Supabase
2. **Manual Testing**: Complete `MANUAL_TESTING_CHECKLIST.md`
3. **Security Scan**: Run OWASP ZAP scan
4. **Load Test**: Verify performance under load
5. **Document Findings**: Log any failures in GitHub Issues

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Auth Security](https://supabase.com/docs/guides/auth/security)
- [Next.js Security Best Practices](https://nextjs.org/docs/security)

