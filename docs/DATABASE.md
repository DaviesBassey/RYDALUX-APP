# RYDALUX Database Design

This document explains the production-grade Prisma schema for RYDALUX. It is designed to support a premium Lagos-first ride-hailing and shipment platform with strong auditability, PostGIS geospatial support, and extensible payment and operations models.

## Overview

The schema is built on PostgreSQL with PostGIS support for precise location and geofence data. It emphasizes:

- UUID primary keys for global uniqueness
- `createdAt` / `updatedAt` timestamps on all core entities
- soft delete semantics on operational records
- immutable ledger entries and audit logs
- enum-backed state machines for trips, payments, KYC, payouts, and documents
- index coverage for trip-heavy and location-heavy queries
- no raw card data stored in the schema

## Key Domains

### Users and Profiles

- `User` stores authentication and identity fields, verification state, and healthcare for riders/drivers.
- `RiderProfile` and `DriverProfile` keep user-specific behavior, preferences, and operational details separate from authentication.
- `DriverProfile` links to vehicles, payouts, trips, and driver-specific onboarding state.

### Vehicles and Documents

- `Vehicle` captures the registration, capacity, and status of licensed ride/hail assets.
- `DriverDocument` and `VehicleDocument` model verification artifacts separately, with document status and soft delete support.

### Compliance and KYC

- `KycCheck` tracks all Know Your Customer verification workflows and review metadata.
- `AdminUser`, `Role`, and `Permission` capture platform access governance from day one.
- `AuditLog` records actor-driven changes for operational and compliance auditing.

### Trips and Geospatial Data

- `Trip` holds the lifecycle of a ride with pickup/dropoff locations, status transitions, and timeout fields.
- `TripEvent` and `TripLocation` support event history and location tracking during a ride.
- PostGIS `geography(Point,4326)` fields are used for pickup/dropoff and SOS location storage.
- `CityZone` and `Geofence` model zones and polygons for dynamic pricing, safety regions, or restricted areas.

### Payments and Wallets

- `Payment` stores gateway references, status and metadata without raw card data.
- `Wallet` provides an account-level balance for riders/drivers.
- `LedgerEntry` is immutable by design and records every wallet movement with a balance snapshot.
- `Payout` enables driver settlement flows and provider reconciliation.

### Safety and Support

- `SupportTicket` supports customer operations with assigned admin workflow.
- `IncidentReport` captures trip-level incidents and drive-level severity.
- `SosEvent` keeps emergency events and location context for rider and driver safety.
- `TrustedContact` models emergency contacts and verified relationships.

### Promotions and Pricing

- `PromoCode` supports discount campaigns, usage limits, and active windows.
- `FareQuote` preserves price breakdowns and surge factors before a trip is accepted.

## Indexing Strategy

The schema includes indexes for common queries and operational workloads:

- `Trip` indexes on status, rider/driver IDs, and pickup/dropoff coordinates
- `Payment` indexes on status, provider, and creating user
- `DriverProfile` indexes on online and availability state
- `Vehicle` indexes on driver and status
- `AuditLog` indexes on actor and timestamp
- `CityZone` and `Geofence` indexes for zone lookups

## PostGIS Notes

PostGIS geometry columns are represented using `Unsupported("geography(Point,4326)")` and `Unsupported("geography(Polygon,4326)")` in Prisma. These fields allow raw spatial storage while still letting Prisma manage relational data.

The schema also retains normalized latitude/longitude fields for high-performance filtering and indexing in standard SQL queries.

## Soft Delete and Auditability

Soft delete is enabled with nullable `deletedAt` fields on records that should remain queryable for compliance and recovery:

- `User`
- `RiderProfile`
- `DriverProfile`
- `Vehicle`
- `DriverDocument`
- `VehicleDocument`
- `SupportTicket`
- `PromoCode`
- `CityZone`
- `Geofence`

Immutable operational data is preserved in `LedgerEntry` and `AuditLog` without update fields.

## Enums and State Machines

The schema uses explicit enums for critical state flows to keep logic consistent across services:

- `TripStatus`
- `PaymentStatus`
- `KycStatus`
- `PayoutStatus`
- `DocumentStatus`
- `DriverStatus`
- `VehicleStatus`
- `SupportStatus`
- `IncidentStatus`
- `SosStatus`
- `PromoType`
- `ZoneType`
- `ServiceType`

## Operational Guidance

- Keep business logic in the service layer and use the schema for structure, integrity, and relationship enforcement.
- Use `AuditLog` for any admin or operational action that changes state.
- Avoid storing sensitive payment details; use `externalId` and `gatewayMeta` for reconciliation.
- Use `TripEvent` and `TripLocation` for real-time monitoring and historical analytics.

## Migration Notes

When running Prisma migrations, ensure PostGIS is enabled on the PostgreSQL instance. The `Unsupported` PostGIS columns may require manual SQL in migration scripts for the exact index definitions and spatial constraints.

## Summary

This schema is designed for Lagos-first ride-hailing and shipments with strong operational visibility, data auditability, and a clear path for advanced location and safety features. It balances flexibility with domain-specific structure, making it a solid foundation for engineering and product delivery.
