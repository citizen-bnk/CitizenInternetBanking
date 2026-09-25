import Icon from "./Icon";

export default function AuthHero() {
  return (
    <section className="auth-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="Citizen Bank" />
      <h1>Smarter banking.<br />A brighter tomorrow.</h1>
      <p>Talk to Citizen AI, or switch to classic banking — your accounts, payments and cards in one place.</p>
      <ul>
        <li><span className="ico"><Icon name="chat" size={18} /></span> Conversational banking in English, Sesotho and isiZulu</li>
        <li><span className="ico"><Icon name="globe" size={18} /></span> Send money across Lesotho, South Africa and beyond</li>
        <li><span className="ico"><Icon name="shield" size={18} /></span> Every payment waits for your confirmation</li>
      </ul>
      <p className="legal-banner">
        Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not currently carry on banking
        business. This is a pre-licensing demonstration of the proposed Citizen Bank.
      </p>
    </section>
  );
}
