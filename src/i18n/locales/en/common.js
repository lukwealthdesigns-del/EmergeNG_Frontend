// Shared strings: actions, states, statuses, categories, errors, validation, navigation, theme.
export default {
  "app.name": "EmergeNG",
  "app.tagline": "Locate • Alert • Respond",
  "app.demo": "DEMO MODE — data and partner activity are simulated",

  "act.continue": "Continue", "act.back": "Back", "act.next": "Next", "act.skip": "Skip", "act.save": "Save", "act.cancel": "Cancel",
  "act.close": "Close", "act.confirm": "Confirm", "act.retry": "Try again", "act.edit": "Edit", "act.delete": "Delete", "act.add": "Add",
  "act.done": "Done", "act.submit": "Submit", "act.search": "Search", "act.refresh": "Refresh", "act.view": "View", "act.share": "Share",
  "act.copy": "Copy", "act.copied": "Copied", "act.call": "Call", "act.directions": "Directions", "act.open": "Open", "act.remove": "Remove",
  "act.send": "Send", "act.verify": "Verify", "act.sync_now": "Sync now", "act.learn_more": "Learn more", "act.get_started": "Get started",
  "act.signin": "Sign in", "act.signup": "Create account", "act.signout": "Sign out", "act.apply": "Apply", "act.reset": "Reset", "act.clear": "Clear",

  "state.loading": "Loading…", "state.empty": "Nothing here yet.", "state.error": "Something went wrong.", "state.updated": "Updated {when}",
  "state.optional": "Optional", "state.required": "Required", "state.none": "None", "state.unknown": "Unknown", "state.yes": "Yes", "state.no": "No",
  "state.not_enough_data": "Not enough data",

  "time.just_now": "just now", "time.sec_ago": "{n} s ago", "time.min_ago": "{n} min ago", "time.hour_ago": "{n} h ago", "time.day_ago": "{n} d ago",
  "time.captured": "Captured {when}", "time.cached": "Cached {when}",

  "theme.title": "Appearance", "theme.light": "Light", "theme.dark": "Dark", "theme.system": "System",
  "lang.title": "Language", "lang.choose": "Choose your language", "lang.choose_sub": "You can change this at any time in Settings.",
  "lang.en": "English", "lang.yo": "Yorùbá", "lang.ha": "Hausa", "lang.ig": "Igbo", "lang.pcm": "Naijá Pidgin",
  "lang.review": "Some translations are still being reviewed by native speakers.",

  "nav.home": "Home", "nav.nearby": "Nearby help", "nav.report": "Report", "nav.history": "History", "nav.profile": "Profile", "nav.about": "About",
  "nav.offline": "Offline mode", "nav.track": "Track a report", "nav.settings": "Settings", "nav.notifications": "Notifications",
  "nav.privacy": "Privacy Policy", "nav.terms": "Terms & Conditions", "nav.skip_to_content": "Skip to content", "nav.menu": "Menu",
  "nav.contacts": "Trusted contacts", "nav.places": "Saved places", "nav.emergency_profile": "Emergency profile", "nav.incidents": "My reports",

  // Operational status vocabulary (honest wording: never implies dispatch)
  "status.submitted": "Report submitted", "status.received": "Received by EmergeNG Operations", "status.under_review": "Under review",
  "status.assigned": "Assigned", "status.response_underway": "Response underway", "status.resolved": "Resolved", "status.closed": "Closed", "status.cancelled": "Cancelled",
  "verif.unconfirmed": "Unconfirmed", "verif.under_review": "Under review", "verif.verified": "Verified", "verif.confirmed_false": "Confirmed false", "verif.unable_to_assess": "Unable to assess",
  "prio.unassessed": "Awaiting assessment", "prio.critical": "Critical", "prio.high": "High", "prio.medium": "Medium", "prio.low": "Low",

  "cat.road_accident": "Road accident", "cat.medical_emergency": "Medical emergency", "cat.fire": "Fire", "cat.security_threat": "Security threat",
  "cat.natural_disaster": "Natural disaster", "cat.missing_person": "Missing person", "cat.building_infrastructure": "Building or infrastructure", "cat.other_emergency": "Other emergency",

  "fac.hospital": "Hospitals", "fac.clinic": "Clinics", "fac.pharmacy": "Pharmacies", "fac.police": "Police stations", "fac.fire_station": "Fire services",
  "fac.ambulance": "Ambulance providers", "fac.emergency_agency": "Emergency agencies", "fac.all": "All",

  "pc.not_attempted": "Postcode not requested", "pc.pending": "Postcode verification pending", "pc.resolved": "Postcode verified",
  "pc.not_found": "No postcode found for this spot", "pc.unavailable": "Postcode service unavailable", "pc.failed": "Postcode could not be confirmed",
  "pc.invalid_coordinates": "Coordinates not valid for postcode lookup",

  "acc.excellent": "Excellent", "acc.good": "Good", "acc.moderate": "Moderate", "acc.poor": "Approximate", "acc.unknown": "Unknown",
  "src.gps": "GPS", "src.network": "Network estimate", "src.manual": "Entered manually", "src.postcode_derived": "From postcode", "src.geocoded": "Address lookup",
  "src.saved_location": "Saved place", "src.unknown": "Unknown",

  // Sync (citizen wording, never technical)
  "sync.local_saved": "Saved on this device", "sync.waiting": "Waiting for connection", "sync.syncing": "Synchronizing", "sync.submitted": "Submitted to EmergeNG",
  "sync.attention": "Needs attention", "sync.conflict": "Needs your review", "sync.cancelled_local": "Cancelled on this device",

  // Errors (centralised mapping)
  "err.401": "Your session has expired. Please sign in again.", "err.403": "You do not have permission to perform this action.",
  "err.404": "The requested information could not be found.", "err.409": "This action conflicts with the current state. Refresh and try again.",
  "err.413": "That is too large to send.", "err.422": "Please check the information entered.", "err.429": "Too many attempts. Please wait before trying again.",
  "err.500": "Something went wrong on our side. Please try again.", "err.network": "You appear to be offline or the connection is unstable.",
  "err.timeout": "The request took too long. Please try again.", "err.provider": "The location service is temporarily unavailable.",
  "err.unavailable": "EmergeNG is temporarily unreachable. Your emergency tools still work.", "err.generic": "Something went wrong. Please try again.",
  "err.INVALID_CREDENTIALS": "The email or password is not correct.", "err.ACCOUNT_DISABLED": "This account is disabled. Please contact support.",
  "err.EMAIL_VERIFICATION_REQUIRED": "Please verify your email address first.", "err.INVALID_OTP": "That code is not correct or has expired.",
  "err.MFA_REQUIRED": "Enter your authenticator code to continue.", "err.INVALID_MFA_CODE": "That authenticator code is not correct.",
  "err.REAUTH_REQUIRED": "Please confirm your password to continue.", "err.RATE_LIMITED": "Too many attempts. Please wait before trying again.",
  "err.VALIDATION_ERROR": "Please check the information entered.", "err.INVALID_POSTCODE": "That is not a valid Nigerian digital postcode.",
  "err.PROVIDER_UNAVAILABLE": "The location service is temporarily unavailable.", "err.VERSION_CONFLICT": "This changed elsewhere. Refresh and try again.",
  "err.FILE_TOO_LARGE": "That file is too large.", "err.UNSUPPORTED_TYPE": "That file type is not supported.", "err.MEDIA_DISABLED": "Photo upload is not enabled right now.",
  "err.PERMISSION_REQUIRED": "You do not have permission to perform this action.", "err.INVALID_TRANSITION": "That status change is not allowed from the current state.",
  "err.REASON_REQUIRED": "A reason is required for this action.", "err.APPROVAL_REQUIRED": "This action needs a second approver.",
  "err.boundary": "This part of the page failed to load. The rest of the app still works.",

  "val.required": "This field is required.", "val.email": "Enter a valid email address.", "val.phone": "Enter a valid phone number, e.g. 0803 123 4567.",
  "val.pw_len": "Use at least 10 characters.", "val.pw_case": "Include upper and lower case letters.", "val.pw_digit": "Include at least one number.",
  "val.pw_match": "Passwords do not match.", "val.otp": "Enter the 6-digit code.", "val.postcode": "Use the format AA-99-A99-AA-99, e.g. EK-01-A03-FK-01.",
  "val.coord": "Enter valid coordinates.", "val.too_long": "That is too long.", "val.too_short": "That is too short.",
  "val.file_type": "Use a JPEG, PNG or WebP photo.", "val.file_size": "Photos must be under 5 MB.", "val.terms": "Please accept the Terms and Privacy Policy to continue.",
  "val.dob": "Enter a valid date of birth.", "val.fix_errors": "Please fix the highlighted fields.",

  "net.online": "Connected to EmergeNG", "net.offline": "You're offline. Emergency tools remain available.", "net.connecting": "Connecting…",
  "net.server_down": "EmergeNG can't be reached right now. Emergency tools remain available.", "net.syncing": "Synchronizing your emergency report…",
  "net.restored": "Connection restored. Synchronizing pending emergency information…", "net.sync_error": "Synchronization could not be completed yet.",
  "notice.call_112": "In an emergency, call 112. EmergeNG does not place or monitor that call.",
};
