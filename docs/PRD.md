# RYDALUX Product Requirements Document

## 1. Product Vision
RYDALUX is a premium Lagos-first ride-hailing and shipment platform designed to deliver safe, reliable, and elegant transport experiences for riders, drivers, and businesses. The product aims to combine modern mobile-first convenience with local operational resilience, enabling Lagos residents and businesses to move people and packages quickly across the city.

## 2. Target Users
- **Urban commuters** in Lagos who want premium and dependable rides.
- **Business customers** that need secure, fast shipment and delivery services.
- **Drivers and fleet operators** seeking a premium platform with transparent earnings and better passenger/shipper experience.
- **Logistics managers** for small-to-midsize businesses needing last-mile delivery.
- **Event planners and high-value travelers** preferring chauffeur-level service for safety and reliability.

## 3. Rider App Requirements
- Onboarding flow with phone number verification and optional email.
- Fast booking flow: pickup, dropoff, service type selection, and fare estimate.
- Real-time map with route preview and driver ETA.
- Trip tracking while in transit with driver details and live position.
- Favorite locations and saved addresses.
- Fare summary, surge/zone pricing display, and receipt generation.
- In-app messaging or call support between rider and driver.
- Ability to rate drivers and leave feedback.
- Support for scheduled rides and immediate bookings.
- Payment selection: card, wallet, Paystack, and cash fallback.
- Safety tools: SOS panic button, trip sharing, and driver profile verification badges.

## 4. Driver App Requirements
- Driver onboarding and approval status display.
- Driver dashboard showing available requests, active trips, earnings, and ratings.
- Ride acceptance flow with countdown, route preview, and cancellation policies.
- Real-time navigation integration (Google Maps first, Mapbox later).
- In-trip status markers: arrived, passenger onboard, trip completed.
- Earnings breakdown, incentives, and bonuses.
- Driver profile management: name, photo, vehicle, and documentation status.
- Ability to switch between ride and shipment modes.
- In-app notifications for new requests, payment updates, and compliance alerts.
- Driver support flow and issue reporting.

## 5. Admin Dashboard Requirements
- User, driver, shipment, and trip management views.
- Real-time operational monitoring: active trips, drivers online, queue status.
- Financial reporting: ride revenue, shipment revenue, refunds, commissions.
- Fleet and vehicle inventory management.
- Driver onboarding pipeline with document verification status.
- Incident and safety report dashboard.
- Surge pricing and zone configuration controls.
- Payment reconciliation with Paystack and Flutterwave transaction logs.
- Shipment task assignment and route planning tools.
- Role-based access control for operations, finance, compliance, and support.
- Audit logging for key actions and data access.

## 6. Shipment Module Requirements
- Shipper flow for booking parcel pickup and dropoff locations.
- Package details capture: weight, dimensions, value, contents category.
- Shipment pricing calculator with distance, urgency, and package tier.
- Real-time shipment tracking and status updates.
- Driver assignment for shipment pickups and deliveries.
- Proof of delivery capture: photo, recipient name, and signature if possible.
- Shipment history and tracking reference numbers.
- Option for same-day and scheduled collection.
- Insurance or declared value handling for premium shipments.
- Admin shipment workflow with exceptions, delays, and claims handling.

## 7. Safety Features
- Phone verification and authenticated accounts for riders and drivers.
- Driver identity verification badges on the rider app.
- Trip sharing to trusted contacts with live route and ETA.
- SOS/panic button that alerts support and optionally local emergency contacts.
- Pre-ride driver and vehicle information display.
- In-app support line and incident reporting for both riders and drivers.
- Post-trip rating and feedback loop for quality control.
- Biometric or PIN protection for account-sensitive screens (future enhancement).
- Driver inactivity and speed limit alerts in backend monitoring.

## 8. Payment Features
- Primary integration with Paystack for card and wallet payments.
- Secondary support for Flutterwave in post-MVP scope.
- In-app wallet balance for riders and drivers.
- Pre-authorized payment capture for booking confirmation.
- Split payments between rider, driver payout, and platform commission.
- Refund and cancellation policy support.
- Transaction status reconciliation and webhook handling.
- Multi-currency support for NGN and future expansion.
- Secure storage of transaction metadata and audit trails.

## 9. Driver Onboarding
- Online application capture for personal and vehicle details.
- Document upload support for driver license, ID, and vehicle registration.
- Background check status indicator and approval workflow.
- Vehicle and driver document validity expiration tracking.
- Initial training resources and platform usage guidelines.
- Offline capability for support staff to verify driver details in Lagos operations.
- Clear onboarding status updates via driver app.

## 10. Vehicle Verification
- Vehicle registration number validation and plate recognition support.
- Capture of vehicle make, model, year, color, and inspection photos.
- Verification workflow for both private vehicles and commercial fleets.
- Vehicle condition checklist and periodic re-verification reminders.
- Badge display for verified vehicles in rider-facing UI.
- Admin controls to approve, suspend, or reject vehicles.

## 11. Trip Lifecycle
1. Rider requests a ride.
2. System estimates fare and shows available service options.
3. Driver receives a request and accepts or declines.
4. Rider receives driver details and ETA.
5. Driver navigates to pickup and marks arrival.
6. Rider boards vehicle and trip status changes to active.
7. Trip is tracked to destination with live location updates.
8. Driver completes the trip and submits final fare.
9. Rider pays via selected method.
10. Rider and driver provide rating and feedback.
11. Trip is logged and available in history.

## 12. Shipment Lifecycle
1. Shipper creates a shipment order with pickup/dropoff details.
2. System calculates shipment cost and confirms booking.
3. Driver accepts shipment pickup assignment.
4. Driver picks up parcel and marks pickup complete.
5. Shipment is tracked in transit with status updates.
6. Driver delivers the parcel and records proof of delivery.
7. System closes the shipment and charges the shipper.
8. Shipper receives delivery confirmation and invoice.
9. Admin can manage exceptions, delays, or claims.

## 13. MVP Scope
- Rider app: booking, live tracking, payment with Paystack, ratings, and trip history.
- Driver app: request acceptance, navigation, earnings summary, and basic profile.
- Admin dashboard: trip monitoring, driver management, revenue overview, and basic reporting.
- Shipment module: parcel booking, driver assignment, pickup/delivery tracking, and proof-of-delivery recording.
- Core safety features: verified profiles, trip sharing, and incident reporting.
- Infrastructure: NestJS API, Next.js admin, Expo mobile, Prisma Postgres backend, Redis queue support.

## 14. Post-MVP Scope
- Flutterwave payment integration.
- Full wallet and loyalty program.
- Mapbox support and advanced route optimization.
- Scheduled rides and recurring shipments.
- Premium chauffeur and fleet scheduling features.
- Advanced analytics and dynamic surge pricing controls.
- Insurance products and declared-value shipment protection.
- Biometric login and adaptive safety monitoring.
- Multi-city expansion beyond Lagos.

### 14.1 Trip PIN verification
- Generate a secure 4-digit PIN when a driver is assigned to a trip.
- Rider can retrieve the PIN only through `GET /trips/:id/pin` when they are the assigned rider and the trip is still active.
- Driver may not retrieve the PIN directly; the driver verifies the PIN through `POST /trips/:id/transition` with `nextState=PIN_VERIFIED` and `{ pin }`.
- Each verification attempt generates a `TripEvent`:
  - `PIN_VERIFICATION_FAILED` for invalid attempts,
  - `PIN_VERIFIED` for successful verification,
  - `SAFETY_FLAG_TRIGGERED` when failed attempts exceed the limit.
- Failed PIN attempts are limited to 3; on the third failed attempt the trip is safety flagged and verification is blocked.
- PINs expire after 15 minutes and cannot be verified for expired, cancelled, or completed trips.
- The trip cannot transition to `IN_PROGRESS` unless it has already reached `PIN_VERIFIED`.

## 15. Non-goals
- Building a full logistics TMS for heavy cargo freight.
- Multi-modal transit outside car/van delivery in MVP.
- Advanced machine learning dynamic pricing in initial launch.
- Full-scale international payments or foreign currency settlement during MVP.
- Building a general marketplace for third-party couriers outside the core driver network.

## 16. Security Requirements
- Encrypted transport for all API requests (HTTPS/TLS).
- Secure secret management for payment credentials and API keys.
- Role-based access control for admin operations.
- Input validation and sanitization on all rider, driver, and shipment endpoints.
- Webhook signature verification for Paystack and Flutterwave.
- Secure authentication tokens with refresh and revocation support.
- Data protection for user identity, trip location, and payment records.
- Audit logs for financial and compliance-sensitive actions.
- Regular vulnerability review for mobile and backend dependencies.

## 17. Compliance Notes for Lagos, Nigeria
- Ensure driver and vehicle documentation complies with FRSC and Lagos State transport regulations.
- Use verified local phone numbers and OTP verification to reduce fraud.
- Implement clear pricing transparency in line with Nigerian Consumer Protection norms.
- Maintain audit-ready records for payments, driver onboarding, and shipment manifest details.
- Support local payment channels and currency (NGN) as default.
- Design incident reporting and support escalation consistent with Nigerian safety expectations.

## 18. Success Metrics
- Number of completed rides per day/week in Lagos.
- Average rider wait time and driver acceptance rate.
- Shipment delivery success rate and average delivery time.
- Rider and driver app retention rates.
- Driver earnings per hour and platform commission revenue.
- Customer satisfaction score (ratings and feedback) for both riders and shippers.
- Payment success rate and chargeback/refund ratio.
- Time to onboard a new driver and complete vehicle verification.

---

This PRD is intentionally practical for engineers and product designers, with clear feature boundaries, flows, and launch priorities for RYDALUX.
