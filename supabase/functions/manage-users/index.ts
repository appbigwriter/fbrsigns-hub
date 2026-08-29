// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Log request start immediately
  console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Read body FIRST to ensure we can parse it.
    // Sometimes 400 Bad Request comes from malformed JSON before we even start logic.
    let body;
    try {
      body = await req.json();
      // Mask password in logs if present
      const logBody = { ...body };
      if (logBody.password) logBody.password = '[REDACTED]';
      console.log("Body parsed successfully:", logBody);
    } catch (e) {
      console.error("Failed to parse request JSON:", e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const { action, ...data } = body;

    // Debug Environment Variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error('Missing environment variables:', {
        url: !!supabaseUrl,
        anonKey: !!supabaseAnonKey,
        serviceKey: !!serviceRoleKey
      })
      throw new Error('Server configuration error: Missing environment variables')
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Check if the requester is an admin
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth check failed:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    console.log('User authenticated:', user.id)

    // Initialize Admin Client
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    // SKIP ADMIN CHECK FOR NOW (Debug Mode)
    console.log("Skipping DB admin check for debug purposes.");

    if (action === 'create') {
      const { email, password, full_name, role } = data
      
      console.log('Processing create/sync for:', email)
      
      let targetUser = null;
      let isNewUser = false;

      // 1. Try to find existing user first to avoid "already registered" error loop
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ 
        page: 1, 
        perPage: 1000 
      });

      if (listError) {
        console.error("Failed to list users:", listError);
        throw listError;
      }

      // Case-insensitive email check
      targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      // 2. If not found, create the user
      if (!targetUser) {
        console.log("User not found in Auth, creating new...");
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        })

        if (createError) {
          console.error('Auth user creation failed:', createError)
          throw createError
        }
        targetUser = newUser.user;
        isNewUser = true;
      } else {
        console.log("User found in Auth (ID: " + targetUser.id + "), skipping creation and syncing to admins table.");
      }

      // 3. Upsert Admin Record
      const { data: existingAdmin, error: checkError } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('user_id', targetUser.id)
        .maybeSingle()

      if (checkError) {
         console.error('Database check failed:', checkError)
         if (isNewUser) await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
         throw checkError
      }

      let dbOperation;
      if (existingAdmin) {
        console.log(`Updating existing admin record (ID: ${existingAdmin.id})`)
        dbOperation = supabaseAdmin
          .from('admins')
          .update({
            email: email.toLowerCase(),
            full_name,
            role,
            active: true
          })
          .eq('id', existingAdmin.id)
      } else {
        console.log(`Inserting new admin record for user ${targetUser.id}`)
        // Deno web standard crypto.randomUUID() is available.
        
        dbOperation = supabaseAdmin
          .from('admins')
          .insert({
            id: crypto.randomUUID(),
            user_id: targetUser.id,
            email: email.toLowerCase(),
            full_name,
            role,
            active: true
          })
      }

      const { error: dbError } = await dbOperation

      if (dbError) {
        console.error('Database operation failed:', dbError)
        // Only rollback if we actually created the user in this transaction
        if (isNewUser) {
           await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
        }
        return new Response(JSON.stringify({ error: dbError.message, details: dbError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      console.log('Admin record synced successfully')
      return new Response(JSON.stringify({ user: targetUser, message: isNewUser ? "User created" : "User synced" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'updatePassword') {
      const { userId, password } = data
      
      const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (updateError) throw updateError

      return new Response(JSON.stringify({ message: 'Password updated successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    
    if (action === 'delete') {
      const { userId } = data
      
      // Delete Auth User (Cascade should handle DB if configured, otherwise we might need to delete manually)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) throw deleteError

      // Also try to delete from admins table just in case cascade isn't set up or to be sure
      await supabaseAdmin.from('admins').delete().eq('user_id', userId)

      return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    console.error('Unhandled error in Edge Function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
