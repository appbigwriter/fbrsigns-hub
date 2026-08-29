import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe outside of component to avoid recreating Stripe object on every render
// Ideally, fetch publishable key from env or backend config if dynamic
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (errorMessage: string) => void;
}

function CheckoutForm({ clientSecret, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: window.location.origin + "/payment-completion", 
      },
      redirect: "if_required", // Prevent redirect if not 3DS
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || "An unexpected error occurred.");
        onError(error.message || "An unexpected error occurred.");
      } else {
        setMessage("An unexpected error occurred.");
        onError("An unexpected error occurred.");
      }
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
       onSuccess(paymentIntent.id);
       setMessage("Payment succeeded!");
    } else {
       setMessage("Payment processing...");
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
      <Button 
        disabled={isLoading || !stripe || !elements} 
        id="submit" 
        className="w-full"
      >
        <span id="button-text">
          {isLoading ? <div className="spinner" id="spinner">Processing...</div> : "Pay now"}
        </span>
      </Button>
      {message && <div id="payment-message" className="text-red-500 text-sm mt-2">{message}</div>}
    </form>
  );
}

interface StripeCheckoutProps {
  amount: number; // Amount in cents
  currency?: string;
  onSuccess?: () => void;
}

export function StripeCheckout({ amount, currency = "usd", onSuccess }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (amount <= 0) return;

    // Create PaymentIntent as soon as the page loads
    const createPaymentIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { amount, currency },
        });

        if (error) {
           throw new Error(error.message);
        }

        if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
        } else {
            throw new Error("No client secret returned");
        }

      } catch (error: any) {
        console.error("Error creating payment intent:", error);
        toast({
            title: "Error initializing payment",
            description: error.message || "Please try again later.",
            variant: "destructive"
        });
      }
    };

    createPaymentIntent();
  }, [amount, currency, toast]);

  const handlePaymentSuccess = (paymentIntentId: string) => {
    toast({
        title: "Payment Successful",
        description: `Transaction ID: ${paymentIntentId}`,
    });
    if (onSuccess) onSuccess();
  };

  const handlePaymentError = (errorMessage: string) => {
      // Error handling is already done in form, but parent can be notified here
      console.error("Payment failed:", errorMessage);
  };

  const appearance = {
    theme: 'stripe' as const,
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="App">
      {clientSecret && stripePromise && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm 
            clientSecret={clientSecret} 
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Elements>
      )}
      {!clientSecret && <div>Loading payment details...</div>}
      {!stripePromise && (
        <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
          Stripe configuration missing. Please check your environment variables.
        </div>
      )}
    </div>
  );
}
