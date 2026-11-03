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

  async function hydratePrivatePhotos(client, record, accessToken = '') {
    if (!client || !record || !record.id_kado) return record;

    const body = {
      id_kado: String(record.id_kado).trim().toLowerCase()
    };

    if (accessToken) {
      body.access_token = String(accessToken).trim();
    }

    const { data, error } = await client.functions.invoke('get-kado-media', { body });

    if (error) {
      throw new Error('Foto privat belum bisa disiapkan.');
    }

    if (data?.error) {
      throw new Error(String(data.error));
    }

    if (data?.photos && typeof data.photos === 'object') {
      Object.assign(record, data.photos);
    }

    return record;
  }

  window.KadoDigital = Object.freeze({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    createSupabaseClient,
    hydratePrivatePhotos
  });
})();
