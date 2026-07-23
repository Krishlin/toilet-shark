<title>Getting Your Booking Form Live</title>
<h1>Getting Your Booking Form Live</h1>
<p style="opacity:0.75;margin-top:-0.5em">A quick walkthrough for turning on the new booking form — takes about 10 minutes.</p>

<p>Right now your site's booking form is built, but it can't actually send you an email yet — it needs two things: <strong>a way to send email (Resend)</strong> and <strong>the new code uploaded to your site (Netlify)</strong>. Follow the steps below in order.</p>

<h2>Step 1 — Create a free Resend account</h2>
<p>Resend is the service that sends the booking emails to your inbox.</p>
<ol>
<li>Go to <a href="https://resend.com">resend.com</a> and click <strong>Sign Up</strong> (free plan is plenty for this).</li>
<li>Verify your email address when it asks.</li>
</ol>

<h2>Step 2 — Get your Resend API key</h2>
<p>No domain setup needed for now — we're using Resend's built-in test sender address (<code>onboarding@resend.dev</code>), so you can skip straight to the key.</p>
<ol>
<li>In Resend, go to <strong>API Keys</strong> → <strong>Create API Key</strong>.</li>
<li>Give it any name (e.g. "Toilet Shark website") and click Create.</li>
<li>Copy the key it shows you — <strong>you can only see it once</strong>, so paste it somewhere safe (a note, a password manager) until Step 3.</li>
</ol>

<h2>Step 3 — Add your environment variables in Netlify</h2>
<p>Environment variables are just settings that tell your site how to send emails, without putting private info directly in the code.</p>
<ol>
<li>Log in to <a href="https://app.netlify.com">app.netlify.com</a> and open your site.</li>
<li>Go to <strong>Site configuration</strong> → <strong>Environment variables</strong>.</li>
<li>Click <strong>Add a variable</strong> and add each of these:</li>
</ol>

<table style="border-collapse:collapse;width:100%;margin:1em 0">
<thead><tr style="text-align:left;border-bottom:1px solid #8884">
<th style="padding:6px 12px 6px 0">Name</th><th style="padding:6px 12px">Value</th><th style="padding:6px 12px">Notes</th>
</tr></thead>
<tbody>
<tr style="border-bottom:1px solid #8882">
<td style="padding:6px 12px 6px 0"><code>RESEND_API_KEY</code></td>
<td style="padding:6px 12px">the key you copied in Step 2</td>
<td style="padding:6px 12px">keep this private</td>
</tr>
<tr style="border-bottom:1px solid #8882">
<td style="padding:6px 12px 6px 0"><code>BOOKING_FROM</code></td>
<td style="padding:6px 12px"><code>Toilet Shark &lt;onboarding@resend.dev&gt;</code></td>
<td style="padding:6px 12px">this is Resend's shared test address — works with no domain setup</td>
</tr>
<tr style="border-bottom:1px solid #8882">
<td style="padding:6px 12px 6px 0"><code>BOOKING_TO</code></td>
<td style="padding:6px 12px">the email address(es) you want bookings sent to</td>
<td style="padding:6px 12px">separate multiple with a comma</td>
</tr>
<tr>
<td style="padding:6px 12px 6px 0"><code>NTFY_TOPIC</code></td>
<td style="padding:6px 12px">any hard-to-guess word, e.g. <code>toiletshark-bookings-8f2a</code></td>
<td style="padding:6px 12px">optional — gives you an instant phone notification for new bookings (via the free ntfy.sh app), not just email</td>
</tr>
</tbody>
</table>

<li>Click <strong>Save</strong>.</li>

<h3 style="margin-top:1.5em">Optional: set up instant phone notifications (ntfy)</h3>
<p>If you added <code>NTFY_TOPIC</code> above, you can get a push notification on your phone the second someone books — in addition to the email. No account, no login, totally free.</p>
<ol>
<li>On your phone, install the <strong>ntfy</strong> app: search "ntfy" on the <a href="https://apps.apple.com/us/app/ntfy/id1625396347">App Store (iPhone)</a> or <a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy">Google Play (Android)</a>.</li>
<li>Open the app and tap the <strong>+</strong> (subscribe to topic) button.</li>
<li>Type in the <em>exact same</em> topic name you used for <code>NTFY_TOPIC</code> in the table above (e.g. <code>toiletshark-bookings-8f2a</code>) and tap <strong>Subscribe</strong>.</li>
<li>Leave the app installed — it'll notify you in the background. That's it, no further setup.</li>
</ol>
<p style="opacity:0.7"><em>Tip: the topic name is effectively a secret password — anyone who knows it could see your booking alerts, so keep it as random/unguessable as the example, not something like "bookings".</em></p>

<h2>Step 4 — Upload the new site files to Netlify</h2>
<p>Same drag-and-drop method you've used before — nothing new here. Since your site isn't connected to GitHub, there's no separate "trigger deploy" button — dragging the folder in <em>is</em> the deploy, and it's what makes the environment variables from Step 3 actually take effect.</p>
<ol>
<li>I'll send you the updated site folder (with the new booking form code included).</li>
<li>Log in to <a href="https://app.netlify.com">app.netlify.com</a> and open your site.</li>
<li>Go to the <strong>Deploys</strong> tab.</li>
<li>Drag the folder onto the deploy area (where it says "Drag and drop your site output folder here") just like you normally do.</li>
<li>Wait for the upload to finish and the deploy to show <strong>Published</strong>.</li>
</ol>
<p style="opacity:0.7"><em>Or, if you'd rather not deal with the file transfer, just say the word and I'll deploy it for you directly.</em></p>

<h2>Step 5 — Test it</h2>
<ol>
<li>Open your live site, fill out the booking form yourself with a test entry, and submit it.</li>
<li>Check your inbox (and your phone, if you set up ntfy) for the booking email.</li>
</ol>

<hr style="margin:2em 0;opacity:0.3">
<p style="opacity:0.75"><strong>Stuck anywhere, or want me to just handle the upload for you?</strong> Just give me the go-ahead and I'll deploy Step 4 for you.</p>
<p style="opacity:0.6"><em>Note: right now emails send from Resend's shared <code>onboarding@resend.dev</code> address rather than your own domain. That's totally fine to run on — but down the line, if you want the emails to visibly come "from" your own business domain (better for branding and inbox trust), we can add domain verification. Just let me know and I'll walk you through it.</em></p>
