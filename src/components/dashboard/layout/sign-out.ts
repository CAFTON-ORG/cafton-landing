/** Ends the session (a POST with an origin check) and returns to the sign-in page. */
export async function signOut() {
  try {
    await fetch("/auth/signout", { method: "POST" });
  } finally {
    // A full page load on purpose, not a router push: it drops everything the signed-out person
    // had in memory (cached pages, client state), which a client-side navigation would keep.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
}
