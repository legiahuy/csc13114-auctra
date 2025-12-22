# Admin Dashboard Requirements Analysis

## Overall Status: ✅ 70% Implemented (with some gaps)

---

## 4. Administrator Management System

### General Requirements: ✅ SATISFIED

- **View list**: ✅ Implemented
- **View details**: ✅ Implemented
- **Add**: ✅ Implemented
- **Delete**: ✅ Implemented
- **Update**: ✅ Implemented
- **Special operations**: ✅ Partially (upgrade approval/rejection only)

---

## 4.1 Category Management: ✅ SATISFIED

### Basic Management Functions: ✅ COMPLETE

- ✅ **View list**: Implemented - displays all categories in a table
- ✅ **View details**: Implemented via `getCategoryById` endpoint
- ✅ **Add**: Implemented - "Add Category" button with dialog
- ✅ **Update**: Implemented - "Edit" button with dialog
- ✅ **Delete**: Implemented - "Delete" button with confirmation

### Important Constraint: ✅ SATISFIED

- ✅ **Cannot delete a category with products**
  - Backend: `deleteCategory` checks `productCount` and rejects if > 0
  - Frontend: Provides clear error message to user
  - Implementation: `Category Management` section in AdminDashboardPage.tsx

### Additional Protection: ✅ BONUS

- ✅ Cannot delete category with subcategories
- Backend validation in place

---

## 4.2 Product Management: ✅ SATISFIED

### Delete/Remove Products: ✅ IMPLEMENTED

- ✅ **Remove products**: Implemented
  - Backend: `deleteProduct` endpoint (admin only)
  - Frontend: "Delete" button in Products table
  - Action: Sets product status to `cancelled` instead of hard delete (soft delete pattern)
  - Protection: Only admins can delete products

---

## 4.3 User List Management: ✅ SATISFIED

### Basic Management Functions: ✅ COMPLETE

- ✅ **View list**: Implemented - paginated user list with search
  - Backend: `getAllUsers` with pagination and search (email/fullName)
  - Frontend: Table showing all users with role badges
- ✅ **View details**: Implemented via `getUserById` endpoint
- ✅ **Add**: Not shown in UI (users register themselves)
- ✅ **Update**: Implemented via `updateUser` endpoint
- ✅ **Delete**: Implemented - "Delete" button in table (with confirmation)

### View List of Upgrade Requests: ✅ IMPLEMENTED

- ✅ **View list of bidders requesting account upgrade**
  - Backend: `getUpgradeRequests` endpoint
  - Shows users with `upgradeRequestStatus = 'pending'`
  - Sorted by `upgradeRequestDate` ascending

### Approve/Reject Upgrade Requests: ✅ IMPLEMENTED

- ✅ **Approve bidder → seller upgrade**

  - Backend: `approveUpgrade` endpoint
  - Sets role to `seller`
  - Sets `upgradeRequestStatus` to `approved`
  - Sets `upgradeExpireAt` (currently 1 minute for testing)
  - Frontend: Green "Approve" button

- ✅ **Reject upgrade requests**
  - Backend: `rejectUpgrade` endpoint
  - Sets `upgradeRequestStatus` to `rejected`
  - Allows optional rejection reason
  - Frontend: Amber "Reject" button with prompt for reason

### User List Features:

- ✅ Search by email/fullName
- ✅ Pagination support
- ✅ Role badges (Admin/Seller/Bidder)
- ✅ Upgrade status display (Pending/Approved/Rejected)
- ✅ Visual alert when pending upgrades exist

---

## 4.4 Admin Dashboard Charts & Statistics: ⚠️ PARTIALLY IMPLEMENTED

### Implemented Statistics: ✅

Dashboard displays the following cards:

1. ✅ **New Auctions (30 days)** - `newAuctions`

   - Count of products created in last 30 days
   - Icon: Gavel

2. ✅ **Revenue (30 days)** - `revenue`

   - Sum of `finalPrice` from completed orders in last 30 days
   - Displayed in Vietnamese Đồng (VNĐ)
   - Icon: DollarSign

3. ✅ **New Users (30 days)** - `newUsers`

   - Count of users created in last 30 days
   - Icon: Users

4. ✅ **Upgrade Requests** - `upgradeRequests`

   - Count of pending upgrade requests
   - Icon: TrendingUp

5. ✅ **New Upgrade Requests (7 days)** - `newUpgradeRequests`

   - Count of pending upgrades in last 7 days
   - (Calculated but not shown in UI cards)

6. ✅ **Active Products** - `activeProducts`

   - Count of active products ending in future
   - Icon: Package

7. ✅ **Total Users** - `totalUsers`

   - Total user count (all time)
   - Icon: Users

8. ✅ **Total Products** - `totalProducts`
   - Total product count (all time)
   - Icon: ShoppingBag

### Missing: ❌

- ❌ **Visual Charts/Graphs**: Statistics are displayed as simple cards, not charts
  - Missing: Line graphs, bar charts, pie charts for trends
  - Could use: Chart.js, Recharts, or similar
- ❌ **Time-series data**: Only current aggregates, no trend visualization

  - No monthly/weekly trend analysis

- ❌ **Student-proposed statistics**: Not implemented
  - Open for student suggestions (e.g., top sellers, category distribution, etc.)

### Backend Endpoint: ✅

- ✅ `/admin/dashboard` - GET endpoint returns all dashboard data
  - Requires admin role
  - Calculates metrics over 30-day and 7-day windows
  - Located in `admin.controller.ts`

### Frontend Implementation: ✅ (Basic)

- ✅ Stats cards displayed in grid layout
- ✅ Data fetched from API on component mount
- ✅ Responsive design (2 columns on tablet, 4 on desktop)
- ✅ Icons and formatting for visual appeal
- Located in `AdminDashboardPage.tsx`

---

## Summary Table

| Requirement                                    | Status | Notes                          |
| ---------------------------------------------- | ------ | ------------------------------ |
| **4.1.1 View categories list**                 | ✅     | Table with all categories      |
| **4.1.2 View category details**                | ✅     | Via API endpoint               |
| **4.1.3 Add category**                         | ✅     | Dialog form                    |
| **4.1.4 Update category**                      | ✅     | Edit button                    |
| **4.1.5 Delete category**                      | ✅     | With product check             |
| **4.1.6 Cannot delete category with products** | ✅     | Enforced in backend            |
| **4.2.1 Remove products**                      | ✅     | Soft delete (status=cancelled) |
| **4.3.1 View user list**                       | ✅     | Paginated table                |
| **4.3.2 View user details**                    | ✅     | Via API                        |
| **4.3.3 Add user**                             | ⚠️     | Users self-register            |
| **4.3.4 Update user**                          | ✅     | Via API                        |
| **4.3.5 Delete user**                          | ✅     | Delete button                  |
| **4.3.6 View upgrade requests**                | ✅     | In user table                  |
| **4.3.7 Approve bidder→seller upgrade**        | ✅     | Approve button                 |
| **4.4.1 New auctions chart**                   | ✅     | Card (not chart)               |
| **4.4.2 Revenue chart**                        | ✅     | Card (not chart)               |
| **4.4.3 New users chart**                      | ✅     | Card (not chart)               |
| **4.4.4 Bidder→seller upgrades chart**         | ✅     | Card (not chart)               |
| **4.4.5 Other charts**                         | ❌     | Missing visual representation  |
| **4.4.6 Student-proposed stats**               | ❌     | Not implemented                |

---

## Files Involved

### Backend

- `/backend/src/controllers/admin.controller.ts` - All admin operations
- `/backend/src/routes/admin.routes.ts` - Admin route definitions
- `/backend/src/controllers/category.controller.ts` - Category CRUD
- `/backend/src/routes/category.routes.ts` - Category routes
- `/backend/src/controllers/product.controller.ts` - Product deletion

### Frontend

- `/frontend/src/pages/AdminDashboardPage.tsx` - Main admin dashboard UI
- `/frontend/src/api/client.ts` - API client for requests

---

## Recommendations for Improvement

### High Priority

1. **Add visual charts** for dashboard statistics (use Recharts or Chart.js)
2. **Add student-proposed statistics** (discuss with team about what makes sense)
3. **Improve category management UX** (bulk operations, better hierarchy display)

### Medium Priority

1. Add audit logging for admin actions
2. Add confirmation dialogs for critical deletions
3. Add filters/sorting to user management
4. Implement batch operations for products

### Low Priority

1. Export dashboard data as CSV/PDF
2. Add admin activity timeline
3. Add system health metrics

---

## Testing Notes

- ✅ Category deletion blocked when products exist
- ✅ Product deletion (soft delete) working
- ✅ User upgrade approval/rejection working
- ✅ Dashboard stats calculated correctly
- ✅ Admin authentication enforced on all routes
