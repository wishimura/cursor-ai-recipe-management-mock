export type Organization = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export type Profile = {
  id: string
  org_id: string
  email: string
  full_name: string
  role: 'owner' | 'admin' | 'member'
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export type Supplier = {
  id: string
  org_id: string
  name: string
  contact_phone: string | null
  contact_person: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export type Ingredient = {
  id: string
  org_id: string
  supplier_id: string | null
  name: string
  specification: string | null
  unit: string
  purchase_price: number
  unit_cost: number
  cost_unit: string
  created_at: string
  supplier?: Supplier
}

export type PrepRecipe = {
  id: string
  org_id: string
  name: string
  total_weight_g: number
  total_cost: number
  cost_per_gram: number
  notes: string | null
  created_at: string
  items?: PrepRecipeItem[]
}

export type PrepRecipeItem = {
  id: string
  prep_recipe_id: string
  ingredient_id: string | null
  name: string
  quantity: number
  unit: string
  unit_cost: number
  cost: number
  ingredient?: Ingredient
}

export type Recipe = {
  id: string
  org_id: string
  name: string
  category: string
  selling_price: number
  cost: number
  cost_rate: number
  gross_profit: number
  notes: string | null
  image_url: string | null
  created_at: string
  items?: RecipeItem[]
}

export type RecipeItem = {
  id: string
  recipe_id: string
  item_type: 'ingredient' | 'prep_recipe'
  ingredient_id: string | null
  prep_recipe_id: string | null
  name: string
  quantity: number
  unit: string
  unit_cost: number
  cost: number
}

export type InventoryRecord = {
  id: string
  org_id: string
  year_month: string
  item_type: 'ingredient' | 'prep_recipe'
  ingredient_id: string | null
  prep_recipe_id: string | null
  item_name: string
  quantity: number
  unit_cost: number
  total_value: number
  created_at: string
}

export type MonthlyAnalysis = {
  id: string
  org_id: string
  year_month: string
  monthly_sales: number
  purchase_amount: number
  beginning_inventory: number
  ending_inventory: number
  cost_of_sales: number
  cost_rate: number
  created_at: string
}
