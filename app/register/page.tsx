import {redirect} from "next/navigation";

/** New identities are registered in Citizen Hub before Internet Banking is provisioned in Bank Core. */
export default function RegisterPage(){
 redirect("https://hub.citizenbank.co.ls/register?next=%2Fbanking-onboarding");
}
