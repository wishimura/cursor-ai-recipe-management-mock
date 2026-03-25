import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion })
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.org_id
        const planId = session.metadata?.plan_id

        if (orgId && planId) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id

          await supabase
            .from('organizations')
            .update({
              plan: planId,
              stripe_customer_id:
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer?.id,
              stripe_subscription_id: subscriptionId ?? null,
            })
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id
        const planId = subscription.metadata?.plan_id

        if (orgId) {
          const updateData: Record<string, unknown> = {
            stripe_subscription_id: subscription.id,
          }

          if (planId) {
            updateData.plan = planId
          }

          // Handle subscription status changes
          if (
            subscription.status === 'past_due' ||
            subscription.status === 'unpaid'
          ) {
            // Optionally downgrade or flag the account
            console.warn(
              `Subscription ${subscription.id} for org ${orgId} is ${subscription.status}`
            )
          }

          await supabase
            .from('organizations')
            .update(updateData)
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id

        if (orgId) {
          // Downgrade to free plan when subscription is canceled
          await supabase
            .from('organizations')
            .update({
              plan: 'free',
              stripe_subscription_id: null,
            })
            .eq('id', orgId)
        } else {
          // Fallback: find org by stripe_subscription_id
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (org) {
            await supabase
              .from('organizations')
              .update({
                plan: 'free',
                stripe_subscription_id: null,
              })
              .eq('id', org.id)
          }
        }
        break
      }

      default:
        // Unhandled event type - log but don't error
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
