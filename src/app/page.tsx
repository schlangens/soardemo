const REPO = "https://github.com/schlangens/soar-lab";

const EARLIER = [
  {
    kicker: "Detection · Wazuh",
    title: "Building a Home Lab SIEM: Wazuh with custom detection rules",
    href: "https://scottslab.io/posts/home-lab-siem-wazuh-custom-detection",
    text: "The detection side of this pipeline. Sixteen hosts into one Wazuh manager, about 60 custom rules, and the level-0 suppressions that took the console from hundreds of alerts a day to under twenty. The two active-response rules in that post are the ones this SOAR layer now sits in front of.",
  },
  {
    kicker: "Tuning · pfSense, Zeek, Wazuh",
    title: "Infrastructure hardening: firewall audit, IDS tuning, SIEM alert management",
    href: "https://scottslab.io/posts/infrastructure-security-hardening-firewall-ids-siem",
    text: "Where the false-positive problem was first measured. 67 pfSense rules audited and 21 WAN pass rules removed, Zeek C2 whitelists rewritten for roughly a 90 percent cut, and a batch of Wazuh rules with XML errors and colliding IDs fixed. Allowlist before you score is a habit from that pass.",
  },
  {
    kicker: "Automation · Ansible, Ludus",
    title: "Ansible and Ludus: the home lab as infrastructure as code",
    href: "https://scottslab.io/posts/ansible-ludus-homelab-infrastructure-as-code",
    text: "How the hosts in this lab get built and kept consistent. One control node, 14 hosts in nine inventory groups, one deployment role for Docker, UFW, systemd and health checks, and Ludus ranges from Packer templates. The reason a rebuild here is an afternoon, not a weekend.",
  },
];

const STAGES = [
  { n: "01", name: "Detect", who: "Wazuh", text: "pfSense filterlog is decoded on the manager. The moderate flood rule, level 10, posts the alert as JSON to a Shuffle webhook instead of blocking. A severe flood rule still blocks directly, as a fail-safe if the SOAR path is down." },
  { n: "02", name: "Enrich", who: "Shuffle", text: "RDAP organization, the Tor exit list, Spamhaus DROP and the lab's own 40,000-entry Wazuh IOC list, read through the Wazuh API. AbuseIPDB and VirusTotal join when keys are present. Feeds are cached for an hour." },
  { n: "03", name: "Score", who: "Shuffle", text: "Allowlist first: private ranges, CGNAT, CDN and tunnel ranges, the media server. Then an out-of-state check, because source port 443 to a high destination port is return traffic, not an attack. Only then do weighted signals become a score." },
  { n: "04", name: "Act", who: "Wazuh rules", text: "The verdict goes back into Wazuh as an event. Three rules turn it into block, close or escalate alerts, and only the block rule is wired to the existing pfSense response. One script, one 24 hour expiry, one audit trail." },
  { n: "05", name: "Record", who: "DFIR-IRIS", text: "Every block and escalation lands as an IRIS alert with the IOC, the enrichment and the Wazuh context. Escalations carry a one-click, token-gated approve link served by n8n and a push to the analyst's phone." },
];

const GATE = [
  ["Link", "The escalation carries GET /webhook/soar-approve?t=<token>&ip=<src>&rule=<id>. The same link is in the IRIS alert and the phone push."],
  ["Check", "n8n compares the token to the stored secret and validates the IP as public unicast. Either fails: 403, stop, no side effects."],
  ["Authenticate", "n8n obtains a short-lived JWT from the Wazuh API."],
  ["Post", "n8n posts a block verdict with the reason \"analyst approved via approve link\". Wazuh raises rule 100530 at score 100."],
  ["Block", "The response adds the address to the pfSense table in the same second. IRIS records the action next to the alert."],
];

export default function Page() {
  return (
    <>
      <header className="container" style={{ padding: "1.5rem 0", borderBottom: "1px solid var(--border)", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <a href="https://scottslab.io" className="mono" style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>← scottslab.io</a>
        <div style={{ fontWeight: 600 }}>Scott&rsquo;s <span style={{ color: "var(--accent)" }}>Lab</span></div>
      </header>

      <main className="container" style={{ paddingBottom: "3rem" }}>
        {/* Stage: the claim, with the walkthrough video below */}
        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "2rem", alignItems: "start" }} className="hero">
          <div style={{ maxWidth: "820px" }}>
            <p className="kicker">Lab build log · September 2026 · Wazuh · Shuffle · n8n · DFIR-IRIS · pfSense</p>
            <h1 className="h-display" style={{ marginTop: "0.75rem" }}>A SOAR layer between the SIEM detection and the firewall block</h1>
            <p className="prose" style={{ color: "var(--muted-foreground)", marginTop: "1rem", maxWidth: "62ch", fontSize: "1.05rem" }}>
              Wazuh was already blocking flood sources on the pfSense WAN for 24 hours. The block fired with no context: the same rule treated a scanner and a large CDN the same way, and one night it blocked Google, Meta and my own server. This build puts enrichment, an allowlist, a score and a human gate in front of that action, and records every outcome in a case manager.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
              <a className="btn btn-primary" href="#video">Watch the walkthrough · 1:26</a>
              <a className="btn" href={REPO}>Code on GitHub</a>
              <a className="btn" href="/writeup">Read the write-up</a>
            </div>
          </div>
        </section>

        <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginTop: "2.5rem" }}>
          <div className="stat"><div className="stat-n">3 / 3</div><div className="stat-l">verdict paths tested end to end: return traffic closed, Tor exit blocked, unknown source escalated</div></div>
          <div className="stat"><div className="stat-n">&lt; 1 s</div><div className="stat-l">from alert to the address in the pfSense block table, automatic and approved alike</div></div>
          <div className="stat"><div className="stat-n">24 · 16 · 8</div><div className="stat-l">first 12 hour report: firewall blocks, SOAR verdicts, escalations to an analyst</div></div>
        </div>

        <hr className="rule" />

        {/* Full video */}
        <section id="video">
          <p className="kicker">Walkthrough</p>
          <h2 className="h-section" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>Eighty-six seconds, one alert, three outcomes</h2>
          <figure className="shot">
            <video controls preload="metadata" poster="/media/soar-poster.jpg" aria-label="SOAR lab walkthrough, 86 seconds">
              <source src="/media/soar-video.mp4" type="video/mp4" />
            </video>
          </figure>
        </section>

        <hr className="rule" />

        {/* Pipeline: five bands, genuinely ordinal */}
        <section id="pipeline">
          <p className="kicker">The pipeline</p>
          <h2 className="h-section" style={{ marginTop: "0.5rem", marginBottom: "1.5rem" }}>Five stages, one alert</h2>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {STAGES.map((s) => (
              <div key={s.n} className="stage" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.35rem" }}>
                <div className="stage-n">{s.n} · {s.name.toUpperCase()} · {s.who}</div>
                <p className="prose" style={{ margin: 0, maxWidth: "70ch" }}>{s.text}</p>
              </div>
            ))}
          </div>
          <pre className="code" style={{ marginTop: "1.5rem" }}>{`pfSense syslog -> Wazuh (rule 100503, L10) -> integratord -> Shuffle webhook
                                                      |
        parse_alert -> wazuh_auth -> enrich_ip -> score_verdict
                                                      |
          +-------------------+-------------------+---+---------------------+
          | block             | close             | escalate                |
          v                   v                   v                         |
   POST /events          POST /events        iris_open_alert -> message_analyst -> log_escalation
   (rule 100530)         (rule 100531)                                (rule 100532)
          |
   pfsense-block AR -> pfctl -t Blocked_IPs -T add   (24 h, execd deletes on timeout)
          |
   iris_record_block (High, Closed)`}</pre>
        </section>

        <hr className="rule" />

        {/* Verdicts */}
        <section id="verdicts">
          <p className="kicker">Verdicts</p>
          <h2 className="h-section" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>Three outcomes. Only one blocks.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
            <div className="verdict"><div className="verdict-t v-block">BLOCK</div><p className="prose" style={{ margin: "0.5rem 0 0" }}>Score at or above the threshold and a public IP. Rule 100530 adds the address to the pfSense Blocked_IPs table, WAN inbound only, 24 hour expiry.</p></div>
            <div className="verdict"><div className="verdict-t v-close">CLOSE</div><p className="prose" style={{ margin: "0.5rem 0 0" }}>Allowlisted range or organization, or return traffic (source port 80/443 to a high port). Logged at a low level. Nothing happens.</p></div>
            <div className="verdict"><div className="verdict-t v-esc">ESCALATE</div><p className="prose" style={{ margin: "0.5rem 0 0" }}>No findings and not allowlisted, or residential ISP space where a friend&rsquo;s Plex client might live. IRIS alert, phone push, one-click approve link. A human decides.</p></div>
          </div>
          <table className="ledger" style={{ marginTop: "1.5rem" }}>
            <thead><tr><th>Source</th><th>Signals</th><th>Score</th><th>Verdict</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td>142.251.117.132</td><td>Google LLC, src port 443 to a high port</td><td>0</td><td className="v-close">close</td><td>logged, no action</td></tr>
              <tr><td>185.220.101.100</td><td>on the IOC list (+40), Tor exit (+50)</td><td>90</td><td className="v-block">block</td><td>in the pfSense table within one second</td></tr>
              <tr><td>203.0.113.5</td><td>nothing found, RDAP 404</td><td>0</td><td className="v-esc">escalate</td><td>IRIS alert 3, analyst notified</td></tr>
            </tbody>
          </table>
        </section>

        <hr className="rule" />

        {/* Approval gate */}
        <section id="gate">
          <p className="kicker">Human gate</p>
          <h2 className="h-section" style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>Escalate means a human decides</h2>
          <p className="prose" style={{ color: "var(--muted-foreground)", maxWidth: "70ch" }}>An escalated alert is a decision the playbook declined to make. The analyst makes it by following a link; n8n does the rest. The approve path never touches pfSense directly. It can only ask Wazuh to raise the rule the automation already uses, so the firewall has one entry point.</p>
          <ol style={{ display: "grid", gap: "0.75rem", paddingLeft: "1.25rem", marginTop: "1rem", maxWidth: "70ch" }}>
            {GATE.map(([t, d]) => (
              <li key={t}><span className="mono" style={{ color: "var(--accent)" }}>{t}.</span> <span className="prose">{d}</span></li>
            ))}
          </ol>
        </section>

        <hr className="rule" />

        {/* IRIS */}
        <section id="iris">
          <p className="kicker">Case management</p>
          <h2 className="h-section" style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>Alert to case in DFIR-IRIS</h2>
          <p className="prose" style={{ maxWidth: "70ch" }}>Block verdicts arrive as High and already Closed, with the action recorded. Escalations arrive as Medium and New, with the enrichment output, the Wazuh context (rule, agent, interface, traffic) and the approve link in the description, and the source IP as an ip-src IOC. One escalation, walked through: the analyst escalates the alert to a case and merges a related block from the same hour; notes record what fired, what the playbook did and the assessment; three tasks, four timeline events and one asset are attached; the summary states the outcome and the follow-up, which was to extend the allowlist with documentation ranges so harness runs close on their own.</p>
        </section>

        <hr className="rule" />

        {/* Write-up: what was learned */}
        <section id="writeup">
          <p className="kicker">Write-up</p>
          <h2 className="h-section" style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>What the build taught me</h2>
          <div className="prose" style={{ maxWidth: "70ch", display: "grid", gap: "0.9rem" }}>
            <p><strong>Guardrails before scoring.</strong> Private ranges, the tailnet, CDN and tunnel ranges and the media server are allowlisted before any signal is weighed. Residential ISP space is never auto-blocked: friends stream Plex from there, so it escalates instead. The block rule applies to WAN inbound only, so established sessions survive a wrong block, and every block expires after 24 hours.</p>
            <p><strong>Verdicts belong in the SIEM.</strong> Posting the verdict back as a Wazuh event, rather than calling the firewall from the playbook, kept one response script, one timeout, one dedup cache and one audit trail. Verdict rules are excluded from the Shuffle integration so a verdict can never trigger a second run.</p>
            <p><strong>Fail-safe and fail-open, on purpose.</strong> The severe flood still blocks directly if Shuffle is down. The moderate flood fails open to a logged alert. Both are deliberate, and I can argue either side.</p>
            <p><strong>Health checks are a false-positive source.</strong> The lab dashboard&rsquo;s 30-second TCP probe of the media server produced &ldquo;sshd: connection reset&rdquo; alerts, that rule was in the host&rsquo;s active-response list, and Wazuh banned the dashboard. The fix was a whitelist for the tailnet range and one rule fewer in the trigger list.</p>
            <p><strong>Count the right thing.</strong> The old 12 hour report said &ldquo;0 firewall blocks&rdquo; for months because it counted a rule below the logging threshold. The new report counts the response log and the verdict rules, and shows every time as UTC and Eastern.</p>
            <p><strong>Small platform lessons.</strong> Shuffle wraps every node result in a message envelope, so cross-node references are <code className="mono">$node.message.field</code>. Form-encoded bodies need real URL encoding; a raw plus in a phone number becomes a space. Public reputation feeds rate-limit fast once real alerts flow, so cache them.</p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
            <a className="btn" href={REPO}>Code, scrubbed, MIT</a>
            <a className="btn" href="https://scottslab.io/posts">More from the lab</a>
          </div>
          <p className="mono" style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "1.5rem" }}>All addresses on this page are documentation ranges or public infrastructure. Internal hostnames and identifiers are omitted.</p>
        </section>

        <hr className="rule" />

        {/* Earlier posts this build stands on */}
        <section id="earlier">
          <p className="kicker">Where this build started</p>
          <h2 className="h-section" style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>Three posts before this one</h2>
          <p className="prose" style={{ maxWidth: "70ch", color: "var(--muted-foreground)" }}>The SOAR layer only makes sense on top of the SIEM, the firewall tuning and the automation that came first. If you want the whole story, or you are building the same stack, start here.</p>
          <div className="earlier-grid">
            {EARLIER.map((e) => (
              <a key={e.href} className="earlier-card" href={e.href}>
                <div className="stage-n">{e.kicker.toUpperCase()}</div>
                <div className="earlier-title">{e.title}</div>
                <p className="prose" style={{ margin: 0, fontSize: "0.95rem", color: "var(--muted-foreground)" }}>{e.text}</p>
                <div className="mono earlier-more">Read the post →</div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="container" style={{ padding: "3rem 0", textAlign: "center", borderTop: "1px solid var(--border)", marginTop: "1rem" }}>
        <div className="footer-links">
          <a href="https://scottslab.io/about">about</a>
          <a href="https://scottslab.io/tooling">tooling</a>
          <a href="https://scottschlangen.com">portfolio</a>
          <a href="https://scottslab.io/newsletter">newsletter</a>
          <a href="https://x.com/scottslabio">@scottslabio</a>
          <a href="https://github.com/schlangens">github</a>
        </div>
        <div className="footer-copy">© Scott S.</div>
      </footer>
    </>
  );
}
