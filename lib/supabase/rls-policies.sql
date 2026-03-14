-- 🔐 ROW-LEVEL SECURITY POLICIES FOR HOMIE CLEAN FOOD

-- ============================================================================
-- PROFILES TABLE (Customer Personal Data)
-- ============================================================================

-- Policy: Customers can only see their own profile
CREATE POLICY "customers_view_own_profile" ON profiles
FOR SELECT
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Customers can update only their own profile
CREATE POLICY "customers_update_own_profile" ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Admin can view all profiles
CREATE POLICY "admin_view_all_profiles" ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Admin can update all profiles (except their own role)
CREATE POLICY "admin_update_all_profiles" ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- ============================================================================
-- ORDERS TABLE (Customer Order Data)
-- ============================================================================

-- Policy: Customers can only view their own orders
CREATE POLICY "customers_view_own_orders" ON orders
FOR SELECT
USING (
  customer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'kitchen')
  )
);

-- Policy: Kitchen staff can view orders assigned to them
CREATE POLICY "kitchen_view_assigned_orders" ON orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'kitchen'
  )
);

-- Policy: Admin can view all orders
CREATE POLICY "admin_view_all_orders" ON orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Admin can update order status
CREATE POLICY "admin_update_orders" ON orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- ============================================================================
-- MENU_ITEMS TABLE (Public Data - No RLS Needed)
-- ============================================================================

-- Anyone can view menu items
-- Only admin can create/update/delete

-- ============================================================================
-- LOYALTY_POINTS TABLE (Sensitive Data)
-- ============================================================================

-- Policy: Customers can only see their own loyalty points
CREATE POLICY "customers_view_own_points" ON loyalty_points
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Admin can view all loyalty records
CREATE POLICY "admin_view_all_points" ON loyalty_points
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Only admin can modify loyalty points
CREATE POLICY "admin_modify_points" ON loyalty_points
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

