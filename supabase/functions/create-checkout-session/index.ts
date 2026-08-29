import { corsHeaders } from '../_shared/cors.ts'
import { getStripe } from '../_shared/stripe-config.ts'

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripe = getStripe()
        const {
            items,
            success_url,
            cancel_url,
            customer_email,
            metadata = {}
        } = await req.json()

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items.map((item: any) => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.round(item.amount),
                },
                quantity: item.quantity || 1,
            })),
            mode: 'payment',
            success_url: success_url,
            cancel_url: cancel_url,
            customer_email: customer_email,
            metadata: metadata,
        })

        return new Response(
            JSON.stringify({ url: session.url, id: session.id }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('[Checkout Service] Error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
