# RYDALUX Support Ticket System

## Overview

The Support Ticket System provides a comprehensive customer support infrastructure for RYDALUX. It enables riders, drivers, and support staff to create, manage, and resolve support tickets linked to trips, payments, payouts, safety incidents, and vehicles.

## Key Features

- **Ticket Creation**: Riders and drivers create tickets for various issues
- **Ticket Linking**: Support tickets can be linked to trips, payments, payouts, SOS events, incident reports, or vehicles
- **Internal Notes**: Support staff can add internal notes hidden from users
- **Public Replies**: Support staff can reply with messages visible to users
- **Status Workflow**: Tickets flow through defined status transitions
- **Priority Management**: Support staff can adjust priority levels
- **Assignment**: Tickets can be assigned to specific support agents
- **Attachments**: Users and staff can upload files (max 10MB)
- **Audit Logging**: All ticket actions are logged for compliance
- **RBAC**: Role-based access control with user/admin separation

## Models

### SupportTicket
Core support ticket entity with the following fields:
- `id`: UUID primary key
- `createdById`: User who created the ticket (FK)
- `assignedToId`: Admin user assigned to handle the ticket (optional, FK)
- `title`: Short description of the issue
- `description`: Detailed description of the issue
- `type`: SupportTicketType enum (12 types)
- `status`: SupportStatus enum (7 statuses)
- `priority`: SupportTicketPriority enum (4 priorities)
- **Linked Entities** (at least one required):
  - `tripId`: Associated trip (optional)
  - `paymentId`: Associated payment (optional)
  - `payoutId`: Associated payout (optional)
  - `sosEventId`: Associated SOS event (optional)
  - `incidentReportId`: Associated incident report (optional)
  - `vehicleId`: Associated vehicle (optional)
- `messages`: Array of SupportTicketMessage records
- `attachments`: Array of SupportTicketAttachment records
- `closedAt`: Timestamp when ticket was closed (optional)
- `resolvedAt`: Timestamp when ticket was marked resolved (optional)
- `createdAt`: Ticket creation timestamp
- `updatedAt`: Last update timestamp
- `deletedAt`: Soft delete timestamp (optional)

**Indexes**:
- (createdById, status)
- (assignedToId, status)
- (type, status)
- (priority, status)
- (tripId)
- (paymentId)
- (payoutId)

### SupportTicketMessage
Messages within a support ticket with the following fields:
- `id`: UUID primary key
- `ticketId`: Parent ticket (FK)
- `authorId`: User who wrote the message (FK)
- `content`: Message text
- `isInternal`: Boolean flag (true = admin-only, false = visible to user)
- `createdAt`: Message creation timestamp
- `updatedAt`: Last update timestamp

**Indexes**:
- (ticketId, isInternal)
- (authorId, createdAt)

### SupportTicketAttachment
File attachments for support tickets with the following fields:
- `id`: UUID primary key
- `ticketId`: Parent ticket (FK)
- `uploadedById`: User who uploaded the file (FK)
- `fileName`: Original filename
- `fileSize`: File size in bytes (max 10MB enforced at API level)
- `mimeType`: MIME type (e.g., "application/pdf")
- `storageKey`: Cloud storage key (S3/similar, no public URLs)
- `uploadedAt`: Upload timestamp

**Indexes**:
- (ticketId)
- (uploadedById)

## Enums

### SupportStatus
Ticket status values with valid transitions:
- `OPEN`: Initial state (transitions to: IN_REVIEW, WAITING_ON_USER, WAITING_ON_ADMIN, ESCALATED)
- `IN_REVIEW`: Admin is reviewing (transitions to: WAITING_ON_USER, WAITING_ON_ADMIN, ESCALATED, RESOLVED, CLOSED)
- `WAITING_ON_USER`: Awaiting user response (transitions to: IN_REVIEW, ESCALATED, CLOSED)
- `WAITING_ON_ADMIN`: Admin is working on it (transitions to: IN_REVIEW, ESCALATED, RESOLVED, CLOSED)
- `ESCALATED`: Escalated to higher tier (transitions to: IN_REVIEW, RESOLVED, CLOSED)
- `RESOLVED`: Issue resolved (transitions to: CLOSED)
- `CLOSED`: Ticket closed (transitions to: OPEN for reopen)

### SupportTicketType
Issue categories (12 types):
- `PAYMENT_ISSUE`: Payment-related problems
- `DRIVER_COMPLAINT`: Complaints about driver behavior
- `RIDER_COMPLAINT`: Complaints about rider behavior
- `LOST_ITEM`: Lost or forgotten items
- `SAFETY_ISSUE`: Safety-related concerns
- `CANCELLATION_ISSUE`: Trip cancellation problems
- `REFUND_REQUEST`: Refund requests
- `PAYOUT_ISSUE`: Driver payout issues
- `ACCOUNT_ISSUE`: Account management problems
- `VEHICLE_ISSUE`: Vehicle-related problems
- `SHIPMENT_ISSUE`: Parcel/shipment issues
- `OTHER`: Miscellaneous issues

### SupportTicketPriority
Priority levels:
- `LOW`: Can wait, non-urgent
- `MEDIUM`: Standard priority (default)
- `HIGH`: Should be addressed soon
- `URGENT`: Immediate attention required

## API Endpoints

### User Endpoints (POST, GET, PATCH)

#### Create Ticket
```
POST /support/tickets
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Payment not processed",
  "description": "I completed payment but the trip didn't start",
  "type": "PAYMENT_ISSUE",
  "priority": "HIGH",
  "tripId": "trip-uuid-123"
}

Response: 201 Created
{
  "id": "ticket-uuid",
  "createdById": "user-uuid",
  "title": "Payment not processed",
  "description": "I completed payment but the trip didn't start",
  "type": "PAYMENT_ISSUE",
  "priority": "HIGH",
  "status": "OPEN",
  "tripId": "trip-uuid-123",
  "createdAt": "2026-05-29T12:00:00Z",
  "messages": [],
  "attachments": []
}
```

#### List Own Tickets
```
GET /support/tickets?page=0&limit=20&status=OPEN&priority=HIGH
Authorization: Bearer {token}

Response: 200 OK
{
  "items": [
    {
      "id": "ticket-uuid",
      "title": "Payment issue",
      "type": "PAYMENT_ISSUE",
      "status": "OPEN",
      "priority": "HIGH",
      "createdAt": "2026-05-29T12:00:00Z",
      "messages": [
        {
          "id": "msg-1",
          "content": "We will investigate",
          "isInternal": false,
          "createdAt": "2026-05-29T13:00:00Z"
        }
      ]
    }
  ],
  "total": 1,
  "page": 0,
  "limit": 20
}
```

#### Get Ticket Details
```
GET /support/tickets/{ticketId}
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "ticket-uuid",
  "createdById": "user-uuid",
  "assignedToId": "admin-uuid",
  "title": "Payment issue",
  "description": "Payment failed",
  "type": "PAYMENT_ISSUE",
  "status": "IN_REVIEW",
  "priority": "HIGH",
  "tripId": "trip-uuid",
  "paymentId": "payment-uuid",
  "messages": [
    {
      "id": "msg-1",
      "content": "We found the issue",
      "isInternal": false,
      "authorId": "admin-uuid",
      "createdAt": "2026-05-29T13:00:00Z"
    }
  ],
  "attachments": [
    {
      "id": "attach-1",
      "fileName": "payment-receipt.pdf",
      "fileSize": 245632,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-05-29T12:30:00Z"
    }
  ]
}
```

#### Add Reply/Message
```
POST /support/tickets/{ticketId}/replies
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "I see the issue now",
  "isInternal": false
}

Response: 201 Created
{
  "id": "msg-uuid",
  "ticketId": "ticket-uuid",
  "content": "I see the issue now",
  "isInternal": false,
  "authorId": "user-uuid",
  "createdAt": "2026-05-29T14:00:00Z"
}
```

#### Request Attachment Upload
```
POST /support/tickets/{ticketId}/attachments/request-upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileName": "screenshot.png",
  "fileSize": 524288,
  "mimeType": "image/png"
}

Response: 201 Created
{
  "attachmentId": "attach-uuid",
  "storageKey": "support-tickets/ticket-uuid/1727789200000-screenshot.png",
  "uploadUrl": "https://api.rydalux.com/support/tickets/ticket-uuid/attachments/attach-uuid/upload"
}
```

#### Close Ticket
```
PATCH /support/tickets/{ticketId}/close
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "ticket-uuid",
  "status": "CLOSED",
  "closedAt": "2026-05-29T14:30:00Z"
}
```

### Admin Endpoints (PATCH, GET)

#### List All Tickets (Admin)
```
GET /admin/support/tickets?status=OPEN&type=PAYMENT_ISSUE&priority=URGENT&assignedToId=admin-uuid&page=0&limit=20
Authorization: Bearer {token}
X-Permissions: SUPPORT_OFFICER

Response: 200 OK
{
  "items": [
    {
      "id": "ticket-uuid",
      "createdBy": {
        "id": "user-uuid",
        "email": "user@example.com"
      },
      "assignedTo": {
        "user": {
          "id": "admin-uuid",
          "email": "support@rydalux.com"
        }
      },
      "status": "IN_REVIEW",
      "priority": "URGENT",
      "type": "PAYMENT_ISSUE"
    }
  ],
  "total": 5,
  "page": 0,
  "limit": 20
}
```

#### Get Ticket Details (Admin)
```
GET /admin/support/tickets/{ticketId}
Authorization: Bearer {token}
X-Permissions: SUPPORT_OFFICER

Response: 200 OK
{
  "id": "ticket-uuid",
  "createdBy": {...},
  "assignedTo": {...},
  "messages": [
    {
      "id": "msg-1",
      "content": "Internal investigation note",
      "isInternal": true,
      "authorId": "admin-uuid",
      "createdAt": "2026-05-29T12:00:00Z"
    },
    {
      "id": "msg-2",
      "content": "We are working on this",
      "isInternal": false,
      "authorId": "admin-uuid",
      "createdAt": "2026-05-29T12:30:00Z"
    }
  ]
}
```

#### Change Ticket Status
```
PATCH /admin/support/tickets/{ticketId}/status
Authorization: Bearer {token}
X-Permissions: SUPPORT_OFFICER
Content-Type: application/json

{
  "status": "RESOLVED",
  "notes": "Issue fixed in backend"
}

Response: 200 OK
{
  "id": "ticket-uuid",
  "status": "RESOLVED",
  "resolvedAt": "2026-05-29T14:00:00Z"
}
```

#### Change Priority
```
PATCH /admin/support/tickets/{ticketId}/priority
Authorization: Bearer {token}
X-Permissions: SUPPORT_OFFICER
Content-Type: application/json

{
  "priority": "URGENT",
  "reason": "Escalated by manager"
}

Response: 200 OK
{
  "id": "ticket-uuid",
  "priority": "URGENT"
}
```

#### Assign Ticket
```
PATCH /admin/support/tickets/{ticketId}/assign
Authorization: Bearer {token}
X-Permissions: SUPPORT_OFFICER
Content-Type: application/json

{
  "adminUserId": "admin-uuid-2",
  "notes": "Reassigning to billing team"
}

Response: 200 OK
{
  "id": "ticket-uuid",
  "assignedToId": "admin-uuid-2"
}
```

#### Reopen Ticket
```
PATCH /admin/support/tickets/{ticketId}/reopen
Authorization: Bearer {token}
X-Permissions: SUPPORT_OFFICER

Response: 200 OK
{
  "id": "ticket-uuid",
  "status": "OPEN",
  "closedAt": null
}
```

## Authorization Rules

### Ticket Creation
- **Riders**: Can create tickets for their own trips only
- **Drivers**: Can create tickets for assigned trips only
- **Admins**: Cannot create tickets (use support dashboard)
- **Public users**: Cannot create tickets

### Ticket Access
- **Creators**: Can view own tickets, add replies, close tickets
- **Assigned Admin**: Can view ticket, add replies/notes, change status, assign, add attachments
- **Other Admins**: Can view ticket, modify status/priority, reassign
- **Support Officer**: Full access (via SUPPORT_OFFICER permission)
- **Support Agent**: View-only access
- **Other users**: No access

### Message Visibility
- **Public messages** (isInternal=false): Visible to ticket creator and all admins
- **Internal messages** (isInternal=true): Visible to admins only, hidden from users
- **User replies**: Always public, but users cannot create internal messages
- **Admin replies**: Can be internal or public

### Status Transitions
Valid transitions are defined by the service:
- OPEN → IN_REVIEW, WAITING_ON_USER, WAITING_ON_ADMIN, ESCALATED
- IN_REVIEW → WAITING_ON_USER, WAITING_ON_ADMIN, ESCALATED, RESOLVED, CLOSED
- WAITING_ON_USER → IN_REVIEW, ESCALATED, CLOSED
- WAITING_ON_ADMIN → IN_REVIEW, ESCALATED, RESOLVED, CLOSED
- ESCALATED → IN_REVIEW, RESOLVED, CLOSED
- RESOLVED → CLOSED
- CLOSED → OPEN (reopen only)

## RBAC Matrix

| Operation | Rider | Driver | Support Officer | Support Agent | Admin |
|-----------|-------|--------|-----------------|---------------|-------|
| Create Ticket (own) | ✓ | ✓ | - | - | - |
| View Own | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add Public Reply | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add Internal Note | - | - | ✓ | - | - |
| Change Status | - | - | ✓ | - | - |
| Change Priority | - | - | ✓ | - | - |
| Assign Ticket | - | - | ✓ | - | - |
| Upload Attachment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Close Ticket | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reopen Ticket | - | - | ✓ | - | - |
| List All | - | - | ✓ | ✓ | ✓ |

## Linked Entities

Support tickets can be linked to multiple entity types to track issues in their broader context:

### Trip Link
- When a rider or driver reports an issue with a specific trip
- Enables tracking payment disputes, safety issues, driver complaints for a trip
- Example: Rider reports "Driver took wrong route" for trip ID

### Payment Link
- When a ticket relates to payment processing, authorization, or refund
- Connects user issues to payment records for dispute resolution
- Example: Rider reports "Payment declined but money taken" for payment ID

### Payout Link
- When a driver reports an issue with their payout
- Links driver earning issues to payout records
- Example: Driver reports "Payout amount incorrect" for payout ID

### SOS Event Link
- When a support ticket needs to be created from a safety SOS event
- Tracks escalation of emergency situations to support team
- Example: SOS event triggered, escalated to support ticket

### Incident Report Link
- When a support ticket is created for a safety incident
- Connects user complaints (harassment, unsafe driving, assault) to official incidents
- Example: Rider reports "Driver was rude" creates incident report, then support ticket

### Vehicle Link
- When a ticket relates to a specific vehicle
- Tracks vehicle condition issues, maintenance complaints
- Example: Driver reports "Vehicle AC broken" for vehicle ID

## Audit Logging

All support operations create audit log entries:

```
{
  "actorId": "user-uuid",
  "action": "SUPPORT_TICKET_CREATED" | "SUPPORT_TICKET_REPLY_ADDED" | "SUPPORT_TICKET_STATUS_CHANGED" | "SUPPORT_TICKET_PRIORITY_CHANGED" | "SUPPORT_TICKET_ASSIGNED" | "SUPPORT_TICKET_CLOSED" | "SUPPORT_TICKET_REOPENED" | "SUPPORT_TICKET_ATTACHMENT_UPLOADED",
  "entity": "SUPPORT_TICKET" | "SUPPORT_TICKET_MESSAGE" | "SUPPORT_TICKET_ATTACHMENT",
  "entityId": "entity-uuid",
  "payload": {
    // Action-specific details
  },
  "createdAt": "2026-05-29T12:00:00Z"
}
```

## Data Exposure Controls

Support tickets can contain sensitive information:

### Protected Fields (Never Exposed via API)
- Payment card information
- Bank account details
- Driver earnings and payout amounts
- User phone numbers (full)
- User addresses (full)

### Limited Fields (Exposure Controlled)
- User names: First name only, last initial
- Phone: Show only last 4 digits
- Addresses: Show city/state only, not full address

### Attachment Security
- Files stored with opaque storage keys (S3/cloud)
- No direct public URLs generated
- Access controlled through ticket ownership
- File size limited to 10MB per file
- MIME type validation on upload

## Service Methods

### Ticket Operations
- `createTicket(userId, dto)` - Create new ticket
- `getTicket(ticketId, userId)` - Get ticket with auth check
- `listTickets(userId, filter, page, limit)` - List tickets
- `closeTicket(ticketId, userId)` - Close ticket
- `reopenTicket(ticketId, adminId)` - Reopen ticket (admin only)

### Message Operations
- `addReply(ticketId, userId, dto)` - Add message/reply
- Auto-updates status to IN_REVIEW when admin replies to OPEN

### Status & Priority
- `changeStatus(ticketId, adminId, dto)` - Change ticket status
- `changePriority(ticketId, adminId, dto)` - Change priority
- Validates transitions according to state machine

### Assignment
- `assignTicket(ticketId, adminId, dto)` - Assign to admin user
- Verifies target admin exists

### Attachments
- `requestUpload(ticketId, userId, dto)` - Request upload URL
- Returns storage key and presigned upload URL
- Validates file size (max 10MB)
- Creates audit log

## Testing

Test suite covers:
- ✓ Ticket creation with validation
- ✓ Ownership and permission checks
- ✓ Link entity authorization
- ✓ Message visibility (internal vs public)
- ✓ Status transition validation
- ✓ Admin-only operations
- ✓ Audit logging
- ✓ RBAC enforcement
- ✓ Pagination and filtering

Run tests:
```bash
cd services/api
corepack pnpm run test -- support.service.spec.ts
```

## Limitations & Future Enhancements

### Current Limitations
- Attachment upload generates storage key but doesn't actually upload to cloud storage
- Attachment download not implemented (would require presigned URLs)
- Auto-escalation based on time or response patterns not implemented
- Email notifications to users/staff not implemented
- Search/full-text search on ticket content not implemented
- Bulk operations on tickets not implemented

### Future Enhancements
- Integration with SMS/email provider for notifications
- AI-powered ticket categorization and routing
- Sentiment analysis for urgent vs standard issues
- Automated escalation for high-priority tickets after time threshold
- Knowledge base integration for self-service resolutions
- Chat interface for real-time support
- Webhook notifications for ticket status changes
- Advanced reporting and analytics dashboard
- Ticket templates for common issues

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BAD_REQUEST | No linked entity provided | Missing required linked entity |
| 400 | BAD_REQUEST | Cannot transition from X to Y | Invalid status transition |
| 403 | FORBIDDEN | You do not have access | Not creator/admin of ticket |
| 403 | FORBIDDEN | Only admin users can... | Insufficient permissions |
| 404 | NOT_FOUND | Support ticket not found | Ticket does not exist |
| 404 | NOT_FOUND | Trip/Payment/Admin not found | Linked entity does not exist |

## Examples

### Example 1: Create Payment Issue Ticket

```javascript
const response = await fetch('/support/tickets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Payment declined but charged',
    description: 'My card was declined but I was still charged 5000 NGN',
    type: 'PAYMENT_ISSUE',
    priority: 'HIGH',
    paymentId: 'pay-abc123'
  })
});

const ticket = await response.json();
console.log('Ticket created:', ticket.id);
```

### Example 2: Admin Resolves Ticket

```javascript
// Add internal note
await fetch(`/support/tickets/${ticketId}/replies`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Found duplicate charge - processing refund',
    isInternal: true
  })
});

// Add public reply
await fetch(`/support/tickets/${ticketId}/replies`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'We found and fixed the duplicate charge. Refund processing in 3-5 business days.',
    isInternal: false
  })
});

// Resolve ticket
const resolved = await fetch(`/admin/support/tickets/${ticketId}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'RESOLVED',
    notes: 'Refund initiated'
  })
});
```

### Example 3: Driver Complaint with Evidence

```javascript
// Create complaint
const ticketRes = await fetch('/support/tickets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${driverToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Rider was rude and did not pay',
    description: 'Rider refused to pay and was verbally abusive',
    type: 'RIDER_COMPLAINT',
    priority: 'HIGH',
    tripId: 'trip-xyz789'
  })
});

const ticket = await ticketRes.json();

// Upload evidence
const uploadRes = await fetch(`/support/tickets/${ticket.id}/attachments/request-upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${driverToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: 'chat-transcript.pdf',
    fileSize: 102400,
    mimeType: 'application/pdf'
  })
});

const uploadInfo = await uploadRes.json();
console.log('Upload to:', uploadInfo.uploadUrl);
// Driver then uploads file to uploadUrl
```
