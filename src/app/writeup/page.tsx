import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Putting a SOAR layer between a SIEM detection and the firewall block · Scott's Lab",
  description:
    "Lab build log, September 2026. Wazuh detected floods on a pfSense WAN and blocked with no context. This build inserts enrichment, an allowlist, a score and a human gate, and records every outcome in DFIR-IRIS.",
};

const REPO = "https://github.com/schlangens/soar-lab";

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="h-section" style={{ marginTop: "2.5rem", marginBottom: "0.75rem", scrollMarginTop: "2rem" }}>
      {children}
    </h2>
  );
}

export default function Writeup() {
  return (
    <>
      <header className="container" style={{ padding: "1.5rem 0", borderBottom: "1px solid var(--border)", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <a href="/" className="mono" style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>← SOAR Lab</a>
        <div style={{ fontWeight: 600 }}>Scott&rsquo;s <span style={{ color: "var(--accent)" }}>Lab</span></div>
      </header>

      <main className="container" style={{ paddingBottom: "3rem" }}>
        <article style={{ maxWidth: "76ch" }}>
          <p className="kicker">Lab build log · September 2026 · Wazuh · Shuffle · n8n · DFIR-IRIS · pfSense</p>
          <h1 className="h-display" style={{ marginTop: "0.75rem", fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>Putting a SOAR layer between a SIEM detection and the firewall block</h1>
          <p className="mono" style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginTop: "0.75rem" }}>Scott Schlangen · scottslab.io · 12 min read · all addresses are documentation ranges</p>

          <div className="verdict" style={{ marginTop: "1.5rem" }}>
            <div className="verdict-t" style={{ color: "var(--accent)" }}>TL;DR</div>
            <p className="prose" style={{ margin: "0.5rem 0 0" }}>
              Wazuh was already detecting inbound floods on the pfSense WAN and blocking the source for 24 hours through an active response. The block fired with no context: the same rule treated a scanner and a large CDN the same way. This build inserts enrichment, an allowlist, a score and a human gate in front of that action, and records every outcome in a case manager. Everything below is running in the lab and was tested end to end.
            </p>
          </div>

          <H2 id="starting-point">The starting point</H2>
          <div className="prose" style={{ display: "grid", gap: "0.9rem" }}>
            <p>pfSense logs every blocked packet to syslog. Wazuh decodes those lines and two frequency rules watch them: twenty blocked packets from one source in thirty seconds (rule 100503, level 10) and fifty in sixty seconds (rule 100504, level 12). Both were wired to a server-side active response that SSHes to the firewall and adds the source to a <code className="mono">pfctl</code> table with a 24 hour timeout. It worked, and it had guardrails already: RFC1918 was excluded, Cloudflare and Tailscale ranges were suppressed, the torrent swarm port on the media server was carved out.</p>
            <p>The night before this build the response log showed why that was not enough. In twelve hours the rule had blocked Google, Meta, Fastly, Microsoft, Cloudflare and one of my own Linode servers, mixed in with genuine Censys and hosting-provider scanners. The Google hit was TCP 443 return traffic to a high port on the WAN address: out-of-state packets from a legitimate session, not an attack. The rule had no way to know the difference, and nobody was asked.</p>
          </div>

          <H2 id="pipeline">The pipeline</H2>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {[
              ["01", "Detect", "Wazuh", "pfSense filterlog. The moderate flood rule at level 10 now posts the alert as JSON to a Shuffle webhook instead of blocking. The severe flood rule still blocks directly as a fail-safe, so a Shuffle outage degrades to the old behaviour for the worst case only."],
              ["02", "Enrich", "Shuffle", "RDAP organisation, the Tor exit list, Spamhaus DROP and the lab's own 40,000-entry Wazuh IOC list, read through the Wazuh API so there is one source of truth. AbuseIPDB and VirusTotal join when keys are present. Feeds are cached in the worker for an hour; the Tor list started rate-limiting within the first hour of real traffic."],
              ["03", "Score", "Verdict", "Allowlist first, and it can veto any score: private ranges, CGNAT, Cloudflare, Tailscale control and DERP, my own servers, and an organisation match on RDAP for the big CDNs and clouds. Then the out-of-state check: source port 80 or 443 to a high destination port is return traffic. Then weighted signals: the IOC list, Tor, DROP, known-scanner organisations, AbuseIPDB confidence and VirusTotal votes. Seventy blocks, forty to sixty-nine escalates, anything lower closes only when the traffic shape is benign."],
              ["04", "Act", "Wazuh rules", "The verdict is posted back into Wazuh as an event: soar_verdict, action, source, score, the rule that started it and a reason. Three rules turn it into block (100530), close (100531) and escalate (100532) alerts. Only the block rule is wired to the pfSense response, so the timeout, the dedup cache and the audit trail all stay where they were. The verdict rules are excluded from the Shuffle integration, so a verdict can never trigger a second run."],
              ["05", "Record", "DFIR-IRIS", "Every block and escalation lands as an IRIS alert with the source IP as an ip-src IOC, the enrichment output and the Wazuh context. Blocks arrive High and already Closed with the action recorded. Escalations arrive Medium and New, with a one-click approve link served by n8n and a push to the analyst's phone."],
            ].map(([n, name, who, text]) => (
              <div key={n} className="stage">
                <div className="stage-n">{n} · {name.toUpperCase()} · {who}</div>
                <p className="prose" style={{ margin: "0.3rem 0 0" }}>{text}</p>
              </div>
            ))}
          </div>

          <H2 id="verdicts">Three outcomes, only one blocks</H2>
          <div className="prose" style={{ display: "grid", gap: "0.9rem" }}>
            <p><span className="verdict-t v-block">BLOCK</span> Score at or above the threshold and a public IP. Rule 100530 drives the existing response: <code className="mono">pfctl -t Blocked_IPs -T add</code>, WAN inbound only, 24 hour expiry. Because the rule is WAN inbound and pf evaluates state before rules, an established session survives a wrong block.</p>
            <p><span className="verdict-t v-close">CLOSE</span> Allowlisted range or organisation, or return traffic. Logged at level 5 for the audit trail. Nothing happens.</p>
            <p><span className="verdict-t v-esc">ESCALATE</span> No findings and not allowlisted, or a source in residential ISP space, where a friend&rsquo;s Plex client might live. An IRIS alert opens, the analyst gets a message, and the block waits for a human.</p>
          </div>
          <table className="ledger" style={{ marginTop: "1rem" }}>
            <thead><tr><th>Source</th><th>Signals</th><th>Score</th><th>Verdict</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td>142.251.117.132</td><td>Google LLC, source port 443 to a high port</td><td>0</td><td className="v-close">close</td><td>logged, no action</td></tr>
              <tr><td>185.220.101.100</td><td>on the IOC list (+40), Tor exit (+50)</td><td>90</td><td className="v-block">block</td><td>in the pfSense table within one second</td></tr>
              <tr><td>203.0.113.5</td><td>nothing found, RDAP 404</td><td>0</td><td className="v-esc">escalate</td><td>IRIS alert, analyst notified</td></tr>
            </tbody>
          </table>

          <H2 id="gate">The approval gate</H2>
          <div className="prose" style={{ display: "grid", gap: "0.9rem" }}>
            <p>An escalated alert is a decision the playbook declined to make. The analyst makes it by following a link; n8n does the rest.</p>
            <ol style={{ display: "grid", gap: "0.6rem", paddingLeft: "1.25rem", margin: 0 }}>
              <li><strong>Link.</strong> The escalation carries <code className="mono">GET /webhook/soar-approve?t=&lt;token&gt;&amp;ip=&lt;src&gt;&amp;rule=&lt;id&gt;</code>. The same link appears in the IRIS alert description and in the phone push.</li>
              <li><strong>Token and IP check.</strong> n8n compares the token against the stored secret and validates the IP as a public unicast address. Either failing returns 403 and the workflow stops.</li>
              <li><strong>Wazuh token.</strong> n8n authenticates to the Wazuh API and receives a short-lived JWT.</li>
              <li><strong>Post block verdict.</strong> n8n posts a block event with the reason &ldquo;analyst approved via approve link&rdquo;. Wazuh raises the block rule at score 100.</li>
              <li><strong>pfSense.</strong> The response adds the address to the block table in the same second. The analyst gets an OK, the block is visible in Wazuh with the approval reason, and the IRIS alert records the action.</li>
            </ol>
            <p>Tested with a wrong token (403, no side effects) and a right token (block on the firewall within one second). The approve path never touches pfSense directly; it can only ask Wazuh to raise the rule the automation already uses, so the firewall has one entry point.</p>
          </div>

          <H2 id="iris">IRIS: alert to case</H2>
          <div className="prose" style={{ display: "grid", gap: "0.9rem" }}>
            <p>Walkthrough of one escalation. The alert opens with verdict escalate, score 0, sources checked rdap, tor, spamhaus_drop and wazuh_cdb, no findings, RDAP 404 on the source. The analyst escalates the alert to a case and merges a related block from the same hour for context. Notes record what fired, what the playbook did and the assessment: the source is a documentation-range address from the test harness, so a benign test. Three tasks, four timeline events and one asset are attached, and the case summary states the outcome and a follow-up: extend the allowlist with documentation ranges so future harness runs close on their own.</p>
          </div>

          <H2 id="results">Results</H2>
          <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <div className="stat"><div className="stat-n">3 / 3</div><div className="stat-l">verdict paths tested end to end</div></div>
            <div className="stat"><div className="stat-n">&lt; 1 s</div><div className="stat-l">alert to pfSense block, automatic and approved alike</div></div>
            <div className="stat"><div className="stat-n">24 · 16 · 8</div><div className="stat-l">first 12 h report: blocks, verdicts, escalations</div></div>
          </div>

          <H2 id="lessons">What the build taught me</H2>
          <div className="prose" style={{ display: "grid", gap: "0.9rem" }}>
            <p><strong>Health checks are a false-positive source.</strong> The lab dashboard probes the media server&rsquo;s SSH port every thirty seconds. Each probe produced a &ldquo;connection reset&rdquo; alert, that rule was in the host&rsquo;s active-response trigger list, and Wazuh banned the dashboard host. The fix was a whitelist for the tailnet range and one rule fewer in the list. Every monitor is also an alert source.</p>
            <p><strong>Automation should know who it might hurt.</strong> The block table held Comcast, AT&amp;T, Verizon Wireless and Charter addresses: the ISPs friends stream Plex from. Those were unblocked, floods aimed at the Plex port are now suppressed before the response rules, and the playbook treats residential organisations as escalate-only.</p>
            <p><strong>Count the right thing.</strong> The old twelve-hour report said &ldquo;0 firewall blocks&rdquo; for months because it counted a rule below the logging threshold. The replacement counts the response log and the verdict rules, adds IRIS counts, and shows every time as UTC and Eastern.</p>
            <p><strong>Platform details that cost an hour each.</strong> Shuffle wraps every node result in a message envelope, so cross-node references are <code className="mono">$node.message.field</code>. Form-encoded bodies need real URL encoding; a raw plus in a phone number becomes a space. Public reputation feeds rate-limit fast once real alerts flow, so cache them. The Wazuh indexer listens on loopback only, so live counters go through the dashboard&rsquo;s console proxy.</p>
          </div>

          <H2 id="guardrails">Guardrails, in one place</H2>
          <ul className="prose" style={{ display: "grid", gap: "0.5rem", paddingLeft: "1.25rem", margin: 0 }}>
            <li>Private ranges, CGNAT, CDN and tunnel ranges and the media server are allowlisted before any scoring.</li>
            <li>Residential ISP space is never auto-blocked; it escalates.</li>
            <li>The block rule applies to WAN inbound only; established sessions survive.</li>
            <li>Verdict rules are excluded from the Shuffle integration, so a verdict cannot trigger a second run.</li>
            <li>A severe-flood rule still blocks directly as a fail-safe if the SOAR path is down.</li>
            <li>All blocks expire after 24 hours. Permanent blocks need a human.</li>
          </ul>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "2rem" }}>
            <a className="btn btn-primary" href="/#video">Watch the walkthrough</a>
            <a className="btn" href={REPO}>Code on GitHub</a>
            <a className="btn" href="/">Back to the project</a>
          </div>
          <H2 id="earlier">Where this build started</H2>
          <p>Three earlier posts carry the ground this one stands on. <a href="https://scottslab.io/posts/home-lab-siem-wazuh-custom-detection">The Wazuh SIEM build</a> is the detection side: sixteen hosts into one manager, about 60 custom rules, and the suppressions that made the console usable. <a href="https://scottslab.io/posts/infrastructure-security-hardening-firewall-ids-siem">The hardening pass</a> is where the false-positive problem was first measured, with 67 pfSense rules audited and the Zeek whitelists rewritten. <a href="https://scottslab.io/posts/ansible-ludus-homelab-infrastructure-as-code">The Ansible and Ludus post</a> is how the hosts here get built and rebuilt. Read those and the guardrails above will look less like caution and more like scar tissue.</p>
          <p className="mono" style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "1.5rem" }}>Public IPs, hostnames and internal identifiers are omitted from this article.</p>
        </article>
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
