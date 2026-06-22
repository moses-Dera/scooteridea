# Testing Ride Booking with Simulator Dashboard

## 🎯 Complete End-to-End Test Workflow

This guide walks you through testing the entire ride booking flow using the simulator dashboard.

## 📋 Prerequisites

- ✅ Simulator Dashboard running (`./start-simulator.sh`)
- ✅ Backend API running (from your main development setup)
- ✅ Rider app running (http://localhost:3000)
- ✅ Authenticated as a test user

## 🚀 Step-by-Step Testing

### Phase 1: Setup Test Bikes

**Duration: 2 minutes**

1. **Open Simulator Dashboard**
   - Navigate to http://localhost:3001
   - Click "Connect" button
   - Should see "Connected" in top right

2. **Add 3 Test Bikes**
   - In "Add New Bike" section, enter: `BK-TEST-RIDE-001`
   - Click "Add Bike"
   - Repeat for `BK-TEST-RIDE-002` and `BK-TEST-RIDE-003`
   - You should see 3 bike cards appear

3. **Verify Initial State**
   - All bikes should show:
     - Status: `LOCKED`
     - Battery: 60-100%
     - Location: Different GPS coordinates in Lagos
     - Speed: 0 km/h

### Phase 2: Test Simple Ride Flow

**Duration: 5 minutes**

1. **View Available Bikes (App)**
   - Open rider app: http://localhost:3000
   - Navigate to "Bikes" or home page
   - You should see bikes appear (they're fetched from backend)
   - Find one of your test bikes (BK-TEST-RIDE-001)

2. **Unlock Bike (App)**
   - Click on the bike card
   - Click "Unlock This Bike" button
   - App should show unlock flow/modal

3. **Monitor Dashboard**
   - Switch to simulator dashboard
   - Watch for bike status to change to `UNLOCKED`
   - Speed should change from 0 → 10-25 km/h
   - Location should start drifting (GPS moving)
   - Battery should start decreasing

4. **Start Ride (App)**
   - In rider app, confirm unlock
   - App navigates to "Active Ride" page
   - Timer starts counting up
   - Cost increases every second

5. **Monitor in Real-Time**
   - Dashboard shows bike moving with changing coordinates
   - Battery decreases every 4 seconds (~0.1% per second)
   - App shows real-time timer and cost
   - Verify costs align (if rate is ₦50/min → ₦0.833/sec)

6. **End Ride (App)**
   - After riding for 1-2 minutes, click "End Ride"
   - Select a dock location
   - App sends ride end request to backend
   - Backend processes payment

7. **Verify Completion**
   - Dashboard should show bike status change to `LOCKED`
   - Battery should show charging status (if in dock)
   - App shows receipt with:
     - Duration (e.g., 1 min 30 sec)
     - Cost (e.g., ₦75)
     - Final location

### Phase 3: Test Multiple Concurrent Rides

**Duration: 10 minutes**

1. **Unlock Second Bike (App)**
   - Go back to bikes list
   - Unlock BK-TEST-RIDE-002
   - Start another ride

2. **Unlock Third Bike (Dashboard)**
   - Switch to dashboard
   - Find BK-TEST-RIDE-003
   - Click "Unlock" button directly

3. **Monitor All Three**
   - Dashboard shows all 3 bikes:
     - BK-TEST-RIDE-001: LOCKED (completed first ride)
     - BK-TEST-RIDE-002: UNLOCKED (active ride via app)
     - BK-TEST-RIDE-003: UNLOCKED (active ride via dashboard)
   - Battery draining on all moving bikes
   - Speed updating every 4 seconds

4. **End Rides in Any Order**
   - End ride 2 from app
   - End ride 3 from dashboard (lock button)
   - Verify all show LOCKED when done

### Phase 4: Test Error Scenarios

**Duration: 5 minutes each**

#### Scenario A: Bike Already Unlocked
1. Dashboard: Unlock bike
2. App: Try to unlock same bike
3. Expected: Error message "Bike already unlocked"

#### Scenario B: Insufficient Balance
1. Simulator: Add high-cost ride
2. Manual: Reduce wallet balance in database
3. App: Try to unlock bike
4. Expected: Error "Insufficient balance"

#### Scenario C: Disabled Bike
1. Dashboard: Click "Disable" on a bike
2. App: Try to unlock that bike
3. Expected: Error "Bike unavailable"

#### Scenario D: Dock Full
1. Dashboard: Manually fill all 12 dock slots
2. App: Try to end ride (select full dock)
3. Expected: Error "Dock is full"

### Phase 5: Test Payment Integration

**Duration: 5 minutes**

1. **Check Wallet Balance (App)**
   - Before ride: Note wallet balance

2. **Complete a Ride**
   - Unlock, ride for 2-3 minutes, end

3. **Verify Deduction**
   - Check wallet balance after ride
   - Should be: `previous - (duration * rate)`
   - Example: ₦1,000 - ₦150 = ₦850

4. **Check Ride History**
   - Go to "Ride History"
   - Latest ride should show:
     - Duration
     - Cost
     - Pickup location
     - Drop-off location
     - Status: Completed

## 📊 Metrics to Validate

| Metric | Expected | How to Check |
|--------|----------|--------------|
| Battery Drain | ~0.1% per second while moving | Dashboard every 4s |
| Battery Charge | ~0.5% per second when docked | Dashboard when locked in dock |
| Speed Range | 10-25 km/h when moving | Dashboard speed field |
| Cost Calculation | ₦50/minute | `(time_in_seconds * 50) / 60` |
| Payment Deduction | Wallet - Cost | Check wallet before/after |
| GPS Movement | Drift within 3km of Lagos | Dashboard coordinates |
| Timer Accuracy | Matches real time | Compare app timer with watch |

## 🐛 Debugging Common Issues

### Bikes don't appear in app after adding to dashboard
- **Issue**: Backend not syncing with simulator
- **Fix**: 
  - Check backend API logs: `logs/` or console
  - Ensure backend is fetching bikes from MQTT or database
  - Restart backend if needed

### Unlock request fails with "404 Not Found"
- **Issue**: Bike not found in backend database
- **Fix**:
  - Backend needs to create bike when simulator broadcasts
  - Check backend's MQTT listener is consuming bike telemetry
  - Manually create bike in DB for testing

### Battery not decreasing
- **Issue**: Dashboard not updating
- **Fix**:
  - Check WebSocket connection (should say "Connected")
  - Simulator API must be running: `npm run api`
  - MQTT broker must be running: `mosquitto`

### Payment not deducting
- **Issue**: Wallet not updated after ride
- **Fix**:
  - Check backend ride service is processing payment
  - Verify wallet API endpoint working
  - Check server logs for payment errors

### Dock slots not showing correctly
- **Issue**: Dashboard rendering issue
- **Fix**:
  - Refresh dashboard page (F5)
  - Check console for JavaScript errors (F12)
  - Verify dock was added with proper format

## 📱 Test Data Quick Reference

```javascript
// Example Test Bikes
BK-TEST-RIDE-001  // First test bike
BK-TEST-RIDE-002  // Second test bike
BK-TEST-RIDE-003  // Third test bike

// Example Docks
DOCK-TEST-001     // Test dock 1
DOCK-TEST-002     // Test dock 2

// Typical Ride
Duration: 2 minutes
Speed: 15 km/h
Cost: ₦100 (2 * 50)
Battery Drain: ~12% (2 minutes * 0.1%/second * 60)
```

## ✅ Checklist for Full Coverage

- [ ] Add bikes via dashboard
- [ ] View bikes in app
- [ ] Unlock bike from app
- [ ] Monitor bike status in dashboard
- [ ] Ride for 1-2 minutes
- [ ] Verify cost calculation in real-time
- [ ] End ride successfully
- [ ] Check payment deducted from wallet
- [ ] View ride in history
- [ ] Test with multiple bikes
- [ ] Test error scenarios (unlock fail, insufficient balance, etc)
- [ ] Verify dock integration
- [ ] Check battery drain rate
- [ ] Verify GPS drift within expected area
- [ ] Test speed updates

## 🎉 Success Criteria

All tests pass when:
- ✅ Bikes appear in app after adding to dashboard
- ✅ Unlock works from app and dashboard
- ✅ Timer counts up correctly during ride
- ✅ Cost increases by ₦0.833 per second (₦50/min)
- ✅ Battery decreases ~0.1% per second while riding
- ✅ Payment deducted correctly from wallet
- ✅ Ride appears in history with correct details
- ✅ Multiple bikes can be ridden concurrently
- ✅ All error scenarios handled gracefully
- ✅ Dock operations work correctly

---

**Need help?** Check the logs:
```bash
# Simulator API logs
tail -f /tmp/simulator-api.log

# Dashboard logs
tail -f /tmp/dashboard.log

# Backend logs (depends on your setup)
```
