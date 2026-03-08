import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = 'March 8, 2026'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Terms of Service & Liability Disclaimer</div>
        <div className="page-subtitle">Last updated: {LAST_UPDATED}</div>
      </div>

      <div className="alert alert-error" style={{ marginBottom: 24 }}>
        <div>
          <strong>IMPORTANT — READ CAREFULLY:</strong> CrisisGrid is NOT an emergency service.
          It is NOT a substitute for calling 911. In any life-threatening emergency,
          <strong> call 911 immediately.</strong>
        </div>
      </div>

      <div className="card" style={{ lineHeight: 1.8, fontSize: 14 }}>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using CrisisGrid ("the Service"), you ("User") agree to be bound by
            these Terms of Service in their entirety. If you do not agree with any part of these
            terms, you must not use the Service. Use of the Service constitutes acceptance of these
            terms and all policies incorporated herein by reference.
          </p>
        </Section>

        <Section title="2. Nature of Service — NOT an Emergency Service">
          <p>
            <strong>CrisisGrid is a volunteer community coordination tool only.</strong> It is
            explicitly NOT an official emergency management system, NOT affiliated with any
            government agency, and NOT a substitute for professional emergency services.
          </p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>CrisisGrid does not dispatch police, fire, or medical services.</li>
            <li>CrisisGrid does not guarantee any response to any request or task.</li>
            <li>CrisisGrid does not verify the accuracy of any information entered by users.</li>
            <li>CrisisGrid does not verify the identity, qualifications, or fitness of any user, including block captains.</li>
            <li>CrisisGrid does not guarantee system availability, especially during large-scale emergencies.</li>
          </ul>
        </Section>

        <Section title="3. DISCLAIMER OF LIABILITY — CRITICAL">
          <p style={{ background: '#fee2e2', padding: 16, borderRadius: 6, border: '1px solid #fca5a5', fontWeight: 500 }}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CRISISGRID, ITS OPERATORS,
            DEVELOPERS, CONTRIBUTORS, BLOCK CAPTAINS, AND ANY AFFILIATED PARTIES (COLLECTIVELY
            "SERVICE PROVIDERS") SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES OF ANY KIND ARISING FROM OR
            RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.
          </p>
          <p style={{ marginTop: 12 }}>
            This includes, without limitation, any damages resulting from:
          </p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>Injury, death, property damage, or loss of any kind occurring during or after an emergency event</li>
            <li>Failure of any user, volunteer, or block captain to respond to a task or check-in request</li>
            <li>Inaccurate, incomplete, or outdated information provided by any user</li>
            <li>System downtime, data loss, or technical failures at any time, including during active emergencies</li>
            <li>Unauthorized access to user data or account information</li>
            <li>Actions or omissions of any volunteer, block captain, or other user of the Service</li>
            <li>Reliance on any information, advice, or guidance provided through the Service</li>
            <li>Failure to reach any individual household during an emergency</li>
          </ul>
        </Section>

        <Section title="4. No Warranty">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. SERVICE PROVIDERS
            MAKE NO WARRANTY THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR
            ERROR-FREE, NOR THAT ANY DEFECTS WILL BE CORRECTED.
          </p>
        </Section>

        <Section title="5. User Responsibilities">
          <p>By using the Service, you agree that you:</p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>Will always call 911 in any life-threatening emergency, before using CrisisGrid</li>
            <li>Are solely responsible for the accuracy of information you submit, including household vulnerability data</li>
            <li>Will not use the Service for any unlawful purpose or in violation of any applicable law</li>
            <li>Will not submit false or misleading information about yourself or others</li>
            <li>Accept full personal responsibility for any actions you take in response to tasks or messages on the Service</li>
            <li>Understand that other users are volunteers with no professional training or obligation</li>
            <li>Will obtain appropriate permits, permissions, or professional help when required</li>
          </ul>
        </Section>

        <Section title="6. Block Captain Responsibilities and Limitations">
          <p>
            Block captains are self-identified volunteers. They are NOT trained emergency
            responders, NOT employees or agents of CrisisGrid, and NOT liable on behalf of
            CrisisGrid. By registering as a block captain, you additionally agree that you:
          </p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>Are acting as a private volunteer in a personal capacity only</li>
            <li>Have no authority to represent any government agency or official body</li>
            <li>Will direct all life-threatening situations to 911 immediately</li>
            <li>Accept personal responsibility for your own actions and omissions as a volunteer</li>
            <li>Have provided truthful and accurate information in your captain application</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            CrisisGrid does not verify captain credentials and makes no representations about
            the qualifications of any block captain.
          </p>
        </Section>

        <Section title="7. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless CrisisGrid and its operators,
            contributors, and affiliates from and against any and all claims, liabilities,
            damages, losses, costs, and expenses (including reasonable attorneys' fees) arising
            out of or in any way connected with your access to or use of the Service, your
            violation of these Terms, or your violation of any rights of another.
          </p>
        </Section>

        <Section title="8. Privacy & Data">
          <p>
            Household vulnerability data (medical conditions, languages, mobility limitations)
            is stored in the Service database. This data:
          </p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>Is visible to block captains in your designated zone during emergencies</li>
            <li>Is used solely for emergency coordination purposes</li>
            <li>Is not sold or shared with third parties</li>
            <li>May be lost in the event of technical failure</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            By registering, you consent to the storage and use of this data as described above.
            You may request deletion of your data at any time by contacting your block captain
            or the service operator.
          </p>
        </Section>

        <Section title="9. Governing Law & Dispute Resolution">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            state of Oregon, without regard to conflict of law principles. Any dispute arising
            under these Terms shall be resolved exclusively through binding arbitration under
            the rules of the American Arbitration Association.
          </p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>
            CrisisGrid reserves the right to modify these Terms at any time. Continued use of
            the Service after any modification constitutes your acceptance of the new Terms.
          </p>
        </Section>

        <div style={{ marginTop: 32, padding: '16px 20px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary in Plain English</div>
          <ul style={{ marginLeft: 20, fontSize: 13, color: 'var(--muted)' }}>
            <li>Call 911 first. Always. CrisisGrid is a helper tool, not an emergency service.</li>
            <li>CrisisGrid and its operators are not liable for anything that happens, period.</li>
            <li>Block captains are unpaid volunteers — they have no special legal obligation to you.</li>
            <li>Your data may be wrong, may be lost, and will be seen by your captain during crises.</li>
            <li>By using the Service, you accept all of these risks.</li>
          </ul>
        </div>

        <hr className="divider" />
        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Back</button>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>
            I understand — Register My Household
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--navy)' }}>{title}</div>
      {children}
    </div>
  )
}
