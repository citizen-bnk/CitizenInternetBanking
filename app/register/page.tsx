import AuthHero from '@/components/AuthHero';
import GuidedRegistration from '@/components/GuidedRegistration';
import DemoAccounts from '@/components/DemoAccounts';
import AccessButtons from '@/components/AccessButtons';
export default function RegisterPage(){return <main className="auth"><AuthHero/><div className="auth-form"><section className="box"><span className="access-eyebrow">ONE CITIZEN. MANY POSSIBILITIES.</span><h2>Create your Citizen profile</h2><p className="access-note">One question at a time. Complete service-specific checks when you need them.</p><GuidedRegistration/><AccessButtons/><DemoAccounts/><a className="access-return" href={process.env.NEXT_PUBLIC_WEBSITE_URL||'https://citizenbank.co.ls'}>← Back to Citizen Bank website</a></section></div></main>;}