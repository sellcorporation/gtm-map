# CSV Upload End-to-End Test

## Test Setup
1. Navigate to `http://localhost:3002`
2. You should see the main page with "Upload CSV" and "Manual Entry" tabs

## Test Case 1: CSV Upload via Click
### Steps:
1. Ensure "Upload CSV" tab is selected (blue button)
2. Click anywhere on the dashed border area
3. **Expected**: File picker dialog should open
4. Select `test-customers.csv` from the project root
5. **Expected**: 
   - Green border appears
   - Checkmark with filename: "✅ test-customers.csv"
   - Text: "3 customer(s) loaded • Click to upload a different file"
   - Customer table appears below with 3 rows:
     - Reliable Surveyors | reliablesurveyors.co.uk | Quality surveying services
     - ABC Construction | abcconstruction.com | Large construction firm
     - XYZ Property | xyzproperty.co.uk | Property management company

## Test Case 2: CSV Upload via Drag & Drop
### Steps:
1. Drag `test-customers.csv` from Finder
2. Hover over the dashed border area
3. **Expected**: Blue border appears with "Drop the CSV file here..."
4. Drop the file
5. **Expected**: Same as Test Case 1, step 5

## Test Case 3: Re-upload Different CSV
### Steps:
1. After successful upload (green border shown)
2. Click on the green upload area
3. **Expected**: File picker opens again
4. Select a different CSV
5. **Expected**: New file replaces old data

## Test Case 4: Invalid CSV Format
### Steps:
1. Create a file with wrong columns: `test-invalid.csv`
2. Upload it
3. **Expected**: Red error message: "No valid customer data found in CSV. Expected columns: name, domain, notes (optional)"

## Test Case 5: Full Flow - CSV to Analysis
### Steps:
1. Upload `test-customers.csv`
2. Enter website URL: `https://eservcompliance.com`
3. Click "Extract ICP & Find Prospects"
4. **Expected**: ICP extraction begins, loading spinner shown
5. After ICP extracted, review and click "Proceed"
6. **Expected**: 
   - Right-side panel shows AI progress logs
   - Prospects are analyzed with AI workflow scoring
   - Final results table shows prospects

## Console Debugging
Open browser DevTools (F12) and check console for:
- `Parsing CSV file: test-customers.csv`
- `CSV parse results: ...`
- `Parsed customers: ...`
- `✅ Successfully uploaded 3 customers from CSV`

## Known Issues Fixed
- ✅ File picker not opening → Added `display: none` to input
- ✅ No visual feedback → Added green success state
- ✅ State sync issues → Now syncs both customers and manualCustomers
- ✅ Empty lines causing errors → Added `skipEmptyLines: true`

## Sample CSV Format
```csv
name,domain,notes
Reliable Surveyors,reliablesurveyors.co.uk,Quality surveying services
ABC Construction,abcconstruction.com,Large construction firm
XYZ Property,xyzproperty.co.uk,Property management company
```

