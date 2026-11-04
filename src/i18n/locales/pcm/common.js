// Naijá Pidgin (pcm): shared strings. Needs review by native speakers.
export default {
  "app.name": "EmergeNG",
  "app.tagline": "Locate • Alert • Respond",
  "app.demo": "DEMO MODE — dem dey pretend di data and partner activity",

  "act.continue": "Continue", "act.back": "Go back", "act.next": "Next", "act.skip": "Skip", "act.save": "Save", "act.cancel": "Cancel",
  "act.close": "Close", "act.confirm": "Confirm", "act.retry": "Try again", "act.edit": "Change", "act.delete": "Delete", "act.add": "Add",
  "act.done": "E don finish", "act.submit": "Submit", "act.search": "Search", "act.refresh": "Refresh", "act.view": "See", "act.share": "Share",
  "act.copy": "Copy", "act.copied": "E don copy", "act.call": "Call", "act.directions": "Road direction", "act.open": "Open", "act.remove": "Comot",
  "act.send": "Send", "act.verify": "Verify", "act.sync_now": "Sync now", "act.learn_more": "Know more", "act.get_started": "Start",
  "act.signin": "Log in", "act.signup": "Open account", "act.signout": "Log out", "act.apply": "Apply", "act.reset": "Reset", "act.clear": "Clear",

  "state.loading": "E dey load…", "state.empty": "Notin dey here yet.", "state.error": "Something go wrong.", "state.updated": "Update {when}",
  "state.optional": "If you want", "state.required": "Must fill am", "state.none": "None", "state.unknown": "We no know", "state.yes": "Yes", "state.no": "No",
  "state.not_enough_data": "Data no reach",

  "time.just_now": "just now", "time.sec_ago": "{n} s ago", "time.min_ago": "{n} min ago", "time.hour_ago": "{n} h ago", "time.day_ago": "{n} d ago",
  "time.captured": "Dem capture am {when}", "time.cached": "Dem save am {when}",

  "theme.title": "How e dey look", "theme.light": "Light", "theme.dark": "Dark", "theme.system": "Follow phone",
  "lang.title": "Language", "lang.choose": "Choose your language", "lang.choose_sub": "You fit change am any time for Settings.",
  "lang.en": "English", "lang.yo": "Yorùbá", "lang.ha": "Hausa", "lang.ig": "Igbo", "lang.pcm": "Naijá Pidgin",
  "lang.review": "Native speakers still dey check some of di translations.",

  "nav.home": "Home", "nav.nearby": "Help wey near", "nav.report": "Report", "nav.history": "History", "nav.profile": "Profile", "nav.about": "About",
  "nav.offline": "Offline mode", "nav.track": "Track report", "nav.settings": "Settings", "nav.notifications": "Notifications",
  "nav.privacy": "Privacy Policy", "nav.terms": "Terms & Conditions", "nav.skip_to_content": "Skip go content", "nav.menu": "Menu",
  "nav.contacts": "Trusted contacts", "nav.places": "Places wey you save", "nav.emergency_profile": "Emergency profile", "nav.incidents": "My reports",

  // Operational status vocabulary (honest wording: never implies dispatch)
  "status.submitted": "Report don submit", "status.received": "EmergeNG Operations don receive am", "status.under_review": "Dem dey review am",
  "status.assigned": "Dem don assign am", "status.response_underway": "Response dey go on", "status.resolved": "E don settle", "status.closed": "Dem don close am", "status.cancelled": "Dem don cancel am",
  "verif.unconfirmed": "Dem never confirm am", "verif.under_review": "Dem dey review am", "verif.verified": "Dem don verify am", "verif.confirmed_false": "Dem confirm say e no true", "verif.unable_to_assess": "Dem no fit assess am",
  "prio.unassessed": "Dey wait for assessment", "prio.critical": "Critical", "prio.high": "High", "prio.medium": "Medium", "prio.low": "Low",

  "cat.road_accident": "Road accident", "cat.medical_emergency": "Medical emergency", "cat.fire": "Fire", "cat.security_threat": "Security wahala",
  "cat.natural_disaster": "Natural disaster", "cat.missing_person": "Person wey miss", "cat.building_infrastructure": "Building or public facility wahala", "cat.other_emergency": "Other emergency",

  "fac.hospital": "Hospitals", "fac.clinic": "Clinics", "fac.pharmacy": "Pharmacies", "fac.police": "Police stations", "fac.fire_station": "Fire services",
  "fac.ambulance": "Ambulance providers", "fac.emergency_agency": "Emergency agencies", "fac.all": "All",

  "pc.not_attempted": "Dem no request postcode", "pc.pending": "Postcode verification dey wait", "pc.resolved": "Postcode don verify",
  "pc.not_found": "We no see postcode for dis place", "pc.unavailable": "Postcode service no dey available", "pc.failed": "We no fit confirm di postcode",
  "pc.invalid_coordinates": "Coordinates no correct for postcode lookup",

  "acc.excellent": "Excellent", "acc.good": "Good", "acc.moderate": "Moderate", "acc.poor": "Rough rough", "acc.unknown": "We no know",
  "src.gps": "GPS", "src.network": "Network estimate", "src.manual": "You enter am yourself", "src.postcode_derived": "From postcode", "src.geocoded": "Address lookup",
  "src.saved_location": "Place wey you save", "src.unknown": "We no know",

  // Sync (citizen wording, never technical)
  "sync.local_saved": "E dey save for dis phone", "sync.waiting": "E dey wait for network", "sync.syncing": "E dey sync", "sync.submitted": "E don submit to EmergeNG",
  "sync.attention": "E need attention", "sync.conflict": "E need make you check am", "sync.cancelled_local": "Dem cancel am for dis phone",

  // Errors (centralised mapping)
  "err.401": "Your session don end. Abeg log in again.", "err.403": "You no get permission to do dis thing.",
  "err.404": "We no see di information wey you ask for.", "err.409": "Dis action no match how things be now. Refresh and try again.",
  "err.413": "E too big to send.", "err.422": "Abeg check di information wey you enter.", "err.429": "You don try too many times. Abeg wait small before you try again.",
  "err.500": "Wahala dey our side. Abeg try again.", "err.network": "E be like say you no get network or di network no stable.",
  "err.timeout": "E take too long. Abeg try again.", "err.provider": "Di location service no dey work for now.",
  "err.unavailable": "We no fit reach EmergeNG for now. Your emergency tools still dey work.", "err.generic": "Something go wrong. Abeg try again.",
  "err.INVALID_CREDENTIALS": "Di email or password no correct.", "err.ACCOUNT_DISABLED": "Dem don disable dis account. Abeg contact support.",
  "err.EMAIL_VERIFICATION_REQUIRED": "Abeg verify your email address first.", "err.INVALID_OTP": "Dat code no correct or e don expire.",
  "err.MFA_REQUIRED": "Put your authenticator code make you continue.", "err.INVALID_MFA_CODE": "Dat authenticator code no correct.",
  "err.REAUTH_REQUIRED": "Abeg confirm your password to continue.", "err.RATE_LIMITED": "You don try too many times. Abeg wait small before you try again.",
  "err.VALIDATION_ERROR": "Abeg check di information wey you enter.", "err.INVALID_POSTCODE": "Dat one no be correct Nigerian digital postcode.",
  "err.PROVIDER_UNAVAILABLE": "Di location service no dey work for now.", "err.VERSION_CONFLICT": "Dis thing change for another place. Refresh and try again.",
  "err.FILE_TOO_LARGE": "Dat file too big.", "err.UNSUPPORTED_TYPE": "We no dey accept dat kind file.", "err.MEDIA_DISABLED": "Photo upload no dey on for now.",
  "err.PERMISSION_REQUIRED": "You no get permission to do dis thing.", "err.INVALID_TRANSITION": "Dem no allow dat status change from di one wey e dey now.",
  "err.REASON_REQUIRED": "You must give reason for dis action.", "err.APPROVAL_REQUIRED": "Dis action need another person to approve am.",
  "err.boundary": "Dis part of di page no load. Di rest of di app still dey work.",

  "val.required": "You must fill dis one.", "val.email": "Enter correct email address.", "val.phone": "Enter correct phone number, like 0803 123 4567.",
  "val.pw_len": "Make e reach 10 characters at least.", "val.pw_case": "Put big letter and small letter.", "val.pw_digit": "Put at least one number.",
  "val.pw_match": "Di passwords no match.", "val.otp": "Enter di 6-digit code.", "val.postcode": "Use dis format AA-99-A99-AA-99, like EK-01-A03-FK-01.",
  "val.coord": "Enter correct coordinates.", "val.too_long": "E too long.", "val.too_short": "E too short.",
  "val.file_type": "Use JPEG, PNG or WebP photo.", "val.file_size": "Photo must dey under 5 MB.", "val.terms": "Abeg accept di Terms and Privacy Policy to continue.",
  "val.dob": "Enter correct date of birth.", "val.fix_errors": "Abeg correct di fields wey dem mark.",

  "net.online": "You don connect to EmergeNG", "net.offline": "You no get network. Emergency tools still dey.", "net.connecting": "E dey connect…",
  "net.server_down": "We no fit reach EmergeNG for now. Emergency tools still dey.", "net.syncing": "E dey sync your emergency report…",
  "net.restored": "Network don come back. E dey sync di emergency information wey dey wait…", "net.sync_error": "Sync no complete yet.",
  "notice.call_112": "If emergency happen, call 112. EmergeNG no dey make or monitor dat call.",
};
