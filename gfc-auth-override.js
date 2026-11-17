/* gfc-auth-override.js — GFC : plus de pont Supabase → Firebase.
   La connexion est directement Firebase Auth (voir gsc-auth-firebase.js). */
(function () {
  'use strict';
  window.ensureFirebaseAuthViaSupabase = function () {
    if (typeof window._gscEnsureAuth === 'function') return window._gscEnsureAuth();
    return Promise.reject(new Error('Authentification Firebase indisponible.'));
  };
})();
