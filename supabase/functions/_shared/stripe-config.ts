import Stripe from 'npm:stripe'

let stripeInstance: Stripe | undefined

export const getStripe = (): Stripe => {
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is missing from environment variables')
    }

    if (!stripeInstance) {
        stripeInstance = new Stripe(secretKey, {
            apiVersion: '2024-06-20',
            httpClient: Stripe.createFetchHttpClient(),
        })
    }

    return stripeInstance
}
