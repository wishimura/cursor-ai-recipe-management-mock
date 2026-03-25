-- ============================================================================
-- Recipe Cost Management SaaS - Complete Database Schema
-- Target: Supabase (PostgreSQL)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE org_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE recipe_item_type AS ENUM ('ingredient', 'prep_recipe');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Organizations (multi-tenant root)
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        org_plan NOT NULL DEFAULT 'free',
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations (slug);

-- 2. Profiles (linked to auth.users)
CREATE TABLE profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    org_id        UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    email         TEXT NOT NULL,
    full_name     TEXT,
    role          user_role NOT NULL DEFAULT 'member',
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_org_id ON profiles (org_id);

-- 3. Suppliers
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    name            TEXT NOT NULL,
    contact_phone   TEXT,
    contact_person  TEXT,
    email           TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_org_id ON suppliers (org_id);

-- 4. Ingredients
CREATE TABLE ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    supplier_id     UUID REFERENCES suppliers ON DELETE SET NULL,
    name            TEXT NOT NULL,
    specification   TEXT,
    unit            TEXT NOT NULL,
    purchase_price  NUMERIC NOT NULL DEFAULT 0,
    unit_cost       NUMERIC NOT NULL DEFAULT 0,
    cost_unit       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredients_org_id ON ingredients (org_id);
CREATE INDEX idx_ingredients_supplier_id ON ingredients (supplier_id);

-- 5. Prep Recipes
CREATE TABLE prep_recipes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    name            TEXT NOT NULL,
    total_weight_g  NUMERIC NOT NULL DEFAULT 0,
    total_cost      NUMERIC NOT NULL DEFAULT 0,
    cost_per_gram   NUMERIC NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prep_recipes_org_id ON prep_recipes (org_id);

-- 6. Prep Recipe Items
CREATE TABLE prep_recipe_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prep_recipe_id  UUID NOT NULL REFERENCES prep_recipes ON DELETE CASCADE,
    ingredient_id   UUID REFERENCES ingredients ON DELETE SET NULL,
    name            TEXT NOT NULL,
    quantity        NUMERIC NOT NULL DEFAULT 0,
    unit            TEXT NOT NULL,
    unit_cost       NUMERIC NOT NULL DEFAULT 0,
    cost            NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX idx_prep_recipe_items_prep_recipe_id ON prep_recipe_items (prep_recipe_id);
CREATE INDEX idx_prep_recipe_items_ingredient_id ON prep_recipe_items (ingredient_id);

-- 7. Recipes
CREATE TABLE recipes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT,
    selling_price   NUMERIC NOT NULL DEFAULT 0,
    cost            NUMERIC NOT NULL DEFAULT 0,
    cost_rate       NUMERIC NOT NULL DEFAULT 0,
    gross_profit    NUMERIC NOT NULL DEFAULT 0,
    notes           TEXT,
    image_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_org_id ON recipes (org_id);

-- 8. Recipe Items
CREATE TABLE recipe_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id       UUID NOT NULL REFERENCES recipes ON DELETE CASCADE,
    item_type       recipe_item_type NOT NULL,
    ingredient_id   UUID REFERENCES ingredients ON DELETE SET NULL,
    prep_recipe_id  UUID REFERENCES prep_recipes ON DELETE SET NULL,
    name            TEXT NOT NULL,
    quantity        NUMERIC NOT NULL DEFAULT 0,
    unit            TEXT NOT NULL,
    unit_cost       NUMERIC NOT NULL DEFAULT 0,
    cost            NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_items_recipe_id ON recipe_items (recipe_id);
CREATE INDEX idx_recipe_items_ingredient_id ON recipe_items (ingredient_id);
CREATE INDEX idx_recipe_items_prep_recipe_id ON recipe_items (prep_recipe_id);

-- 9. Inventory Records
CREATE TABLE inventory_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    year_month      TEXT NOT NULL,  -- e.g. '2026-03'
    item_type       recipe_item_type NOT NULL,
    ingredient_id   UUID REFERENCES ingredients ON DELETE SET NULL,
    prep_recipe_id  UUID REFERENCES prep_recipes ON DELETE SET NULL,
    item_name       TEXT NOT NULL,
    quantity        NUMERIC NOT NULL DEFAULT 0,
    unit_cost       NUMERIC NOT NULL DEFAULT 0,
    total_value     NUMERIC NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_records_org_id ON inventory_records (org_id);
CREATE INDEX idx_inventory_records_year_month ON inventory_records (org_id, year_month);

-- 10. Monthly Analyses
CREATE TABLE monthly_analyses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    year_month          TEXT NOT NULL,  -- e.g. '2026-03'
    monthly_sales       NUMERIC NOT NULL DEFAULT 0,
    purchase_amount     NUMERIC NOT NULL DEFAULT 0,
    beginning_inventory NUMERIC NOT NULL DEFAULT 0,
    ending_inventory    NUMERIC NOT NULL DEFAULT 0,
    cost_of_sales       NUMERIC NOT NULL DEFAULT 0,
    cost_rate           NUMERIC NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (org_id, year_month)
);

CREATE INDEX idx_monthly_analyses_org_id ON monthly_analyses (org_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Helper: get the current user's org_id from their profile
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM profiles WHERE id = auth.uid()
$$;

-- ---------- organizations ----------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = auth.user_org_id());

CREATE POLICY "Owners can update their organization"
    ON organizations FOR UPDATE
    USING (id = auth.user_org_id())
    WITH CHECK (id = auth.user_org_id());

-- ---------- profiles ----------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organization"
    ON profiles FOR SELECT
    USING (org_id = auth.user_org_id());

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins and owners can manage profiles in their org"
    ON profiles FOR ALL
    USING (
        org_id = auth.user_org_id()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    );

-- ---------- suppliers ----------
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view suppliers"
    ON suppliers FOR SELECT
    USING (org_id = auth.user_org_id());

CREATE POLICY "Org members can insert suppliers"
    ON suppliers FOR INSERT
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can update suppliers"
    ON suppliers FOR UPDATE
    USING (org_id = auth.user_org_id())
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can delete suppliers"
    ON suppliers FOR DELETE
    USING (org_id = auth.user_org_id());

-- ---------- ingredients ----------
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view ingredients"
    ON ingredients FOR SELECT
    USING (org_id = auth.user_org_id());

CREATE POLICY "Org members can insert ingredients"
    ON ingredients FOR INSERT
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can update ingredients"
    ON ingredients FOR UPDATE
    USING (org_id = auth.user_org_id())
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can delete ingredients"
    ON ingredients FOR DELETE
    USING (org_id = auth.user_org_id());

-- ---------- prep_recipes ----------
ALTER TABLE prep_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prep_recipes"
    ON prep_recipes FOR SELECT
    USING (org_id = auth.user_org_id());

CREATE POLICY "Org members can insert prep_recipes"
    ON prep_recipes FOR INSERT
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can update prep_recipes"
    ON prep_recipes FOR UPDATE
    USING (org_id = auth.user_org_id())
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can delete prep_recipes"
    ON prep_recipes FOR DELETE
    USING (org_id = auth.user_org_id());

-- ---------- prep_recipe_items ----------
ALTER TABLE prep_recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prep_recipe_items"
    ON prep_recipe_items FOR SELECT
    USING (
        prep_recipe_id IN (
            SELECT id FROM prep_recipes WHERE org_id = auth.user_org_id()
        )
    );

CREATE POLICY "Org members can insert prep_recipe_items"
    ON prep_recipe_items FOR INSERT
    WITH CHECK (
        prep_recipe_id IN (
            SELECT id FROM prep_recipes WHERE org_id = auth.user_org_id()
        )
    );

CREATE POLICY "Org members can update prep_recipe_items"
    ON prep_recipe_items FOR UPDATE
    USING (
        prep_recipe_id IN (
            SELECT id FROM prep_recipes WHERE org_id = auth.user_org_id()
        )
    )
    WITH CHECK (
        prep_recipe_id IN (
            SELECT id FROM prep_recipes WHERE org_id = auth.user_org_id()
        )
    );

CREATE POLICY "Org members can delete prep_recipe_items"
    ON prep_recipe_items FOR DELETE
    USING (
        prep_recipe_id IN (
            SELECT id FROM prep_recipes WHERE org_id = auth.user_org_id()
        )
    );

-- ---------- recipes ----------
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recipes"
    ON recipes FOR SELECT
    USING (org_id = auth.user_org_id());

CREATE POLICY "Org members can insert recipes"
    ON recipes FOR INSERT
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can update recipes"
    ON recipes FOR UPDATE
    USING (org_id = auth.user_org_id())
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can delete recipes"
    ON recipes FOR DELETE
    USING (org_id = auth.user_org_id());

-- ---------- recipe_items ----------
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recipe_items"
    ON recipe_items FOR SELECT
    USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE org_id = auth.user_org_id()
        )
    );

CREATE POLICY "Org members can insert recipe_items"
    ON recipe_items FOR INSERT
    WITH CHECK (
        recipe_id IN (
            SELECT id FROM recipes WHERE org_id = auth.user_org_id()
        )
    );

CREATE POLICY "Org members can update recipe_items"
    ON recipe_items FOR UPDATE
    USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE org_id = auth.user_org_id()
        )
    )
    WITH CHECK (
        recipe_id IN (
            SELECT id FROM recipes WHERE org_id = auth.user_org_id()
        )
    );

CREATE POLICY "Org members can delete recipe_items"
    ON recipe_items FOR DELETE
    USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE org_id = auth.user_org_id()
        )
    );

-- ---------- inventory_records ----------
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inventory_records"
    ON inventory_records FOR SELECT
    USING (org_id = auth.user_org_id());

CREATE POLICY "Org members can insert inventory_records"
    ON inventory_records FOR INSERT
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can update inventory_records"
    ON inventory_records FOR UPDATE
    USING (org_id = auth.user_org_id())
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can delete inventory_records"
    ON inventory_records FOR DELETE
    USING (org_id = auth.user_org_id());

-- ---------- monthly_analyses ----------
ALTER TABLE monthly_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view monthly_analyses"
    ON monthly_analyses FOR SELECT
    USING (org_id = auth.user_org_id());

CREATE POLICY "Org members can insert monthly_analyses"
    ON monthly_analyses FOR INSERT
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can update monthly_analyses"
    ON monthly_analyses FOR UPDATE
    USING (org_id = auth.user_org_id())
    WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Org members can delete monthly_analyses"
    ON monthly_analyses FOR DELETE
    USING (org_id = auth.user_org_id());

-- ============================================================================
-- TRIGGER: Auto-create organization + profile on new user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id UUID;
    user_name  TEXT;
    user_slug  TEXT;
BEGIN
    -- Derive display name from metadata or email
    user_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        split_part(NEW.email, '@', 1)
    );

    -- Build a unique slug from the email prefix + random suffix
    user_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'gi'))
                 || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- Create the user's default organization
    INSERT INTO organizations (name, slug)
    VALUES (user_name || '''s Organization', user_slug)
    RETURNING id INTO new_org_id;

    -- Create the profile linked to auth.users and the new organization
    INSERT INTO profiles (id, org_id, email, full_name, role)
    VALUES (NEW.id, new_org_id, NEW.email, user_name, 'owner');

    RETURN NEW;
END;
$$;

-- Fire after every new row in auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
