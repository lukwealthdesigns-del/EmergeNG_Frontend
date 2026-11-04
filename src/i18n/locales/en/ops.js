// Operations command-centre strings. Convention: keys prefixed "ops.".
export default {
  "ops.nav.overview": "Overview", "ops.nav.queue": "Incident queue", "ops.nav.map": "Live map", "ops.nav.analytics": "Analytics", "ops.nav.geo": "Geographic intelligence",
  "ops.nav.partners": "Partners", "ops.nav.notifications": "Notifications", "ops.nav.abuse": "Abuse & duplicates", "ops.nav.health": "System health", "ops.nav.audit": "Audit log",

  "ops.m.open": "Open incidents", "ops.m.critical": "Critical", "ops.m.high": "High priority", "ops.m.unassessed": "Awaiting assessment", "ops.m.awaiting_review": "Awaiting review",
  "ops.m.awaiting_assign": "Awaiting assignment", "ops.m.today": "Reported today", "ops.m.resolved_today": "Resolved today",
  "ops.m.partner_real": "Active partner referrals (live)", "ops.m.partner_sim": "Active partner referrals (simulated)", "ops.m.referrals_waiting": "Referrals awaiting acknowledgement",

  "ops.f.category": "Category", "ops.f.status": "Status", "ops.f.priority": "Priority", "ops.f.verification": "Verification", "ops.f.owner": "Owner", "ops.f.mine": "Assigned to me",
  "ops.f.unowned": "Unassigned", "ops.f.sort": "Sort", "ops.sort.priority": "Highest priority first", "ops.sort.oldest": "Oldest first", "ops.sort.newest": "Newest first",
  "ops.queue.total": "{n} incidents", "ops.queue.empty": "No incidents match these filters.", "ops.queue.search": "Search by reference or postcode",
  "ops.priority_queue": "Needs attention first", "ops.stale": "Data may be out of date", "ops.reason_optional": "Reason (optional)",

  "ops.live.connected": "Live", "ops.live.polling": "Updating every few seconds", "ops.live.reconnecting": "Reconnecting…", "ops.live.offline": "Not live",
  "ops.map.count": "{n} incidents shown", "ops.map.truncated": "Showing {n} incidents. Narrow the filters to see more detail.", "ops.map.window": "Time window", "ops.map.closed": "Include closed",
  "ops.map.stale": "Map data may be out of date.", "ops.map.precision_note": "Dashed circles show location uncertainty. Approximate positions are never shown as exact points.",

  "ops.actions": "Actions", "ops.move_to": "Move to", "ops.closure_reason": "Closure reason", "ops.reopen": "Reopen", "ops.escalate": "Escalate", "ops.flag_abuse": "Flag as abuse",
  "ops.set_priority": "Set priority", "ops.set_verification": "Set verification", "ops.assign": "Assign", "ops.assign_me": "Assign to me", "ops.assign_note": "Assigning records ownership inside EmergeNG. It does not dispatch anyone.",
  "ops.assignments": "Assignments", "ops.team": "Team", "ops.add_note": "Add note", "ops.notes": "Notes", "ops.vis.internal": "Internal only", "ops.vis.partner": "Visible to partner",
  "ops.concurrency": "This incident changed elsewhere. Refresh and try again.", "ops.possible_dup": "Possible duplicate", "ops.evidence": "Photos and evidence", "ops.extra_locations": "Additional locations",
  "ops.precision": "Location precision", "ops.user_postcode": "Postcode entered by reporter", "ops.system": "System", "ops.org": "Organisation",
  "ops.reported_note": "Everything on this page is reported by the person or by integrations. EmergeNG has not independently verified it.",
  "ops.offline_origin": "Submitted from an offline device", "ops.offline_delay": "Saved on the device {d} before it reached EmergeNG",

  "ops.sensitive": "Sensitive information", "ops.sensitive_note": "Revealing this is recorded in the audit log with your reason.", "ops.reveal_contact": "Reveal reporter contact", "ops.reveal_medical": "Reveal medical profile",
  "ops.medical_reason": "Reason for viewing medical information", "ops.no_contact": "No contact details were provided.",

  "ops.referrals": "Partner referrals", "ops.refer": "Refer to a partner", "ops.referral_note": "A referral sends information to the partner. It does not confirm that anyone is on the way.",
  "ops.share_contact": "Share reporter contact", "ops.share_description": "Share description", "ops.record_response": "Record partner response",

  "ops.an.total": "Incidents", "ops.an.trend": "Reports over time", "ops.an.pc_rate": "Postcode resolution", "ops.an.postcode": "Postcode lookup outcomes", "ops.an.durations": "Response times (recorded)",
  "ops.an.d_receipt": "Submitted → received", "ops.an.d_review": "Submitted → first review", "ops.an.d_resolve": "Submitted → resolved (recorded)", "ops.an.d_ack_real": "Referral → partner acknowledgement (live)", "ops.an.d_ack_sim": "Referral → acknowledgement (simulated)",
  "ops.definitions": "How these numbers are defined", "ops.integrations": "Integrations", "ops.not_configured": "Not configured", "ops.failures_hour": "{n} failures in the last hour",

  "ops.geo.sub": "Where reports come from, with small counts hidden to protect privacy.", "ops.geo.interp": "Counts reflect reports received, not the true number of emergencies.",
  "ops.geo.by_state": "Reports by state", "ops.geo.area": "Area", "ops.geo.suppressed": "Hidden (small count)", "ops.geo.suppress_note": "Areas with very few reports are hidden so individuals cannot be identified.",

  "ops.partners.sub": "Partner organisations and how each one is connected.", "ops.partners.sim_note": "Simulated partners never contact real responders. Their responses are not real.",
  "ops.notif.sub": "Delivery of emails and messages sent by EmergeNG. “Accepted by provider” does not mean delivered.",

  "ops.abuse.sub": "Review automatically detected abuse and possible duplicate reports.", "ops.abuse.note": "Signals are hints for a human reviewer. They are never proof, and no report is deleted automatically.",
  "ops.abuse.signals": "Abuse signals", "ops.abuse.dups": "Possible duplicates", "ops.abuse.none": "Nothing to review.", "ops.abuse.review": "Review", "ops.abuse.outcome": "Outcome",
  "ops.abuse.same_cat": "same category", "ops.abuse.confirm_dup": "Confirm duplicate", "ops.abuse.not_dup": "Not a duplicate", "ops.abuse.dup_note": "Confirming a duplicate links the reports; both remain on record.",

  "ops.queues": "Queues", "ops.readiness": "Production readiness", "ops.offline_sync": "Offline synchronisation",
  "ops.audit.sub": "Tamper-evident record of staff and system actions.", "ops.audit.verify": "Verify chain", "ops.audit.when": "When", "ops.audit.action": "Action", "ops.audit.actor": "Actor",
  "ops.audit.resource": "Resource", "ops.audit.outcome": "Outcome", "ops.audit.category": "Category",
};
