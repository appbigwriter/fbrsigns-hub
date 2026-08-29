import { supabase } from "@/integrations/supabase/client";

export const createPaymentIntent = async (
  amount: number, 
  metadata: any = {}
): Promise<{ clientSecret: string } | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("create-payment-intent", {
      body: { 
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata 
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return { clientSecret: data.clientSecret };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
};
