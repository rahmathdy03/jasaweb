// Shared Supabase configuration for KadoDigital.
// The anon key is safe to expose in the browser because database access is protected by RLS.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://rvsrazqskmtpwyzjnnfm.supabase.co/';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3JhenFza210cHd5empubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM2OTcsImV4cCI6MjEwMTQyOTY5N30.8pfXz_0ZTG8c2K5eP02kNHwg85MV2WEpBL1mpl0Ah9I';

  function createSupabaseClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase SDK belum dimuat.');
    }

    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  window.KadoDigital = Object.freeze({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    createSupabaseClient
  });
})();
