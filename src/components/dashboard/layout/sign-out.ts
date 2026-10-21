/** Ends the session (a POST with an origin check) and returns to the sign-in page. */
export async function signOut() {
  try {
    await fetch("/auth/signout", { method: "POST" });
  } finally {
    window.location.assign("/login");
  }
}
