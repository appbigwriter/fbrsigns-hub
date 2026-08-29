import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://sssmxxigyipnqcaxpsfx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc214eGlneWlwbnFjYXhwc2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTk1ODEsImV4cCI6MjA3MjgzNTU4MX0.M2b3yDzhS2ZGcy60wgjLz66Byevy7_EKiVNZKu3u1Uk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Calling Edge Function create-payment-intent...");

const payload = {
    amount: 5000, // $50.00
    currency: 'usd',
    description: 'Test Payment Debug',
    metadata: {
        test: 'true'
    }
};

try {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: payload
    });

    if (error) {
        console.error("Function returned error:");
        console.error(JSON.stringify(error, null, 2));
        
        // Try to fetch raw response if possible, but supabase client hides it.
        // Let's use fetch directly to see the body
        console.log("\nTrying direct fetch for raw error details...");
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const rawBody = await res.text();
        console.log("Raw Response Status:", res.status);
        console.log("Raw Response Body:", rawBody);

    } else {
        console.log("Success!");
        console.log(data);
    }
} catch (e) {
    console.error("Exception:", e);
}
